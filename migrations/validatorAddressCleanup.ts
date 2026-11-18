/*
 * Temporary helper for the 1.15.0 upgrade. TODO: remove after 1.15.0 is deployed in post-deployment actions
 *
 * Before 1.15.0, ValidatorService._setValidatorAddress also wrote every validator address
 * into _nodeAddressToValidatorId, without adding it to _nodeAddresses. These entries let
 * validator addresses, including rotated-away ones, create nodes. 1.15.0 stops writing them.
 * This helper finds the existing ones so the upgrade can remove them with removeNodeAddress.
 *
 * The mapping is private, so the candidates are rebuilt from history:
 * - the registration address of every validator (read at its registration block),
 * - every ValidatorAddressChanged.newAddress,
 * - every RequestNewAddress previous and new address.
 * Each candidate is then checked on-chain. An entry is removed when the address is bound
 * to a validator but is not one of its linked node addresses, or when it is that
 * validator's current validator address.
 *
 * Settings (environment variables):
 * - LOGS_ENDPOINT: JSON-RPC endpoint for the history scan (eth_getLogs and archive eth_call).
 *   Defaults to the network the script runs on. Free endpoints that work:
 *   https://gateway.tenderly.co/public/mainnet (full range in one request),
 *   https://gateway.tenderly.co/public/base (at most 1000 blocks per request).
 *   Recommended: Infura free tier node allows 10k blocks per request, requires an API key
 * - LOGS_BLOCK_RANGE: number of blocks per eth_getLogs request. Default: the whole range in one request.
 *   If the endpoint rejects the range, the script stops with the endpoint's error.
 * - LOGS_CONCURRENCY: parallel eth_getLogs requests (default 1).
 * - LOGS_FROM_BLOCK: first block to scan. Required for instances not in DEPLOYMENT_BLOCKS.
 *   For known instances the map is used; a different value needs an interactive confirmation.
 */

import chalk from "chalk";
import {ethers} from "hardhat";
import {BaseContract, Contract, Filter, JsonRpcProvider, Log, Provider, getAddress} from "ethers";
import {createInterface} from "node:readline/promises";
import {isLocalNetwork} from "./deploy";

// Deployment block of the ValidatorService proxy of each known skale-manager instance
const DEPLOYMENT_BLOCKS = new Map<string, number>([
    // Ethereum mainnet
    [getAddress("0x840C8122433A5AA7ad60C1Bcdc36AB9DcCF761a5"), 10362576],
    // Base
    [getAddress("0xbC91DE62463AF6e4Cb066a4B3Ee0cd6dE4030adf"), 37701290]
]);

export interface NodeAddressEntry {
    validatorId: bigint;
    address: string;
}

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;
const PROGRESS_STEP_PERCENT = 5;

const sleep = (ms: number) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const withRetry = async <T>(call: () => Promise<T>, description: string): Promise<T> => {
    for (let attempt = 1; ; ++attempt) {
        try {
            return await call();
        } catch (error) {
            if (attempt >= MAX_ATTEMPTS) {
                throw new Error(`${description} failed after ${MAX_ATTEMPTS} attempts: ${String(error)}`);
            }
            await sleep(RETRY_DELAY_MS);
        }
    }
};

const getLogsProvider = async (): Promise<Provider> => {
    if (!process.env.LOGS_ENDPOINT) {
        return ethers.provider; // Default to the hardhat network the script runs on
    }
    const provider = new JsonRpcProvider(process.env.LOGS_ENDPOINT, undefined, {batchMaxCount: 1});
    const [logsChainId, chainId] = await Promise.all([
        withRetry(async () => (await provider.getNetwork()).chainId, "LOGS_ENDPOINT chain id"),
        (await ethers.provider.getNetwork()).chainId
    ]);
    if (logsChainId !== chainId) {
        throw new Error(`LOGS_ENDPOINT is on chain ${logsChainId}, the upgrade runs on chain ${chainId}`);
    }
    return provider;
};

const confirm = async (question: string) => {
    if (!process.stdin.isTTY) {
        throw new Error(`${question} No terminal to confirm in`);
    }
    const terminal = createInterface({input: process.stdin, output: process.stdout});
    try {
        return (await terminal.question(`${question} (y/n) `)).trim().toLowerCase() === "y";
    } finally {
        terminal.close();
    }
};

const getFromBlock = async (validatorServiceAddress: string) => {
    const knownBlock = DEPLOYMENT_BLOCKS.get(getAddress(validatorServiceAddress));
    const setting = process.env.LOGS_FROM_BLOCK;
    const requestedBlock = setting === undefined ? undefined : Number(setting);
    if (requestedBlock !== undefined && (!Number.isSafeInteger(requestedBlock) || requestedBlock < 0)) {
        throw new Error(`LOGS_FROM_BLOCK must be a block number, got "${setting}"`);
    }
    if (knownBlock === undefined) {
        if (requestedBlock === undefined) {
            throw new Error(
                `Deployment block of ValidatorService ${validatorServiceAddress} is unknown, set LOGS_FROM_BLOCK`
            );
        }
        return requestedBlock;
    }
    if (requestedBlock === undefined || requestedBlock === knownBlock) {
        return knownBlock;
    }
    const override = await confirm(
        `ValidatorService ${validatorServiceAddress} was deployed at block ${knownBlock}.` +
        ` Are you sure you want to override it with LOGS_FROM_BLOCK=${requestedBlock}?`
    );
    return override ? requestedBlock : knownBlock;
};

class ProgressReporter {
    private nextReport: number;
    private fromBlock: number;
    private toBlock: number;

    constructor(fromBlock: number, toBlock: number) {
        this.fromBlock = fromBlock;
        this.toBlock = toBlock;
        this.nextReport = PROGRESS_STEP_PERCENT;
    }

    report(scannedUpTo: number) {
        const percent = 100 * (scannedUpTo - this.fromBlock + 1) / (this.toBlock - this.fromBlock + 1);
        if (percent >= this.nextReport) {
            console.log(chalk.gray(`  scanned ${Math.floor(percent)}% (up to block ${scannedUpTo})`));
            this.nextReport = (Math.floor(percent / PROGRESS_STEP_PERCENT) + 1) * PROGRESS_STEP_PERCENT;
        }
    }
}

const scanRanges = async (
    provider: Provider,
    filter: Filter,
    fromBlock: number,
    toBlock: number,
    range: number,
    concurrency: number
) => {
    const chunks: [number, number][] = [];
    for (let start = fromBlock; start <= toBlock; start += range) {
        chunks.push([start, Math.min(start + range - 1, toBlock)]);
    }
    const results: Log[][] = new Array(chunks.length);
    const progress = new ProgressReporter(fromBlock, toBlock);
    let next = 0;
    let done = 0;
    const worker = async () => {
        while (next < chunks.length) {
            const index = next++;
            const [start, end] = chunks[index];
            results[index] = await withRetry(
                () => provider.getLogs({...filter, fromBlock: start, toBlock: end}),
                `eth_getLogs for blocks ${start}-${end} (LOGS_BLOCK_RANGE=${range})`
            );
            progress.report(fromBlock + Math.floor((toBlock - fromBlock) * ++done / chunks.length));
        }
    };
    await Promise.all(Array.from({length: concurrency}, worker));
    return results.flat();
};

const scanLogs = (provider: Provider, filter: Filter, fromBlock: number, toBlock: number) => {
    const range = process.env.LOGS_BLOCK_RANGE === undefined
        ? toBlock - fromBlock + 1
        : Number(process.env.LOGS_BLOCK_RANGE);
    const concurrency = Number(process.env.LOGS_CONCURRENCY ?? "1");
    if (!Number.isSafeInteger(range) || range < 1) {
        throw new Error(`LOGS_BLOCK_RANGE must be a positive integer, got "${process.env.LOGS_BLOCK_RANGE}"`);
    }
    if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
        throw new Error(`LOGS_CONCURRENCY must be a positive integer, got "${process.env.LOGS_CONCURRENCY}"`);
    }
    console.log(`Scanning blocks ${fromBlock}-${toBlock} in ranges of ${range} blocks, concurrency ${concurrency}`);
    return scanRanges(provider, filter, fromBlock, toBlock, range, concurrency);
};

export const collectValidatorAddressNodeEntries = async (
    validatorServiceContract: BaseContract
): Promise<NodeAddressEntry[]> => {
    const provider = await getLogsProvider();
    const validatorServiceAddress = await validatorServiceContract.getAddress();
    const validatorService = new Contract(validatorServiceAddress, validatorServiceContract.interface, provider);

    // For local dev networks, let it search from block 0.
    if(await isLocalNetwork()) DEPLOYMENT_BLOCKS.set(getAddress(validatorServiceAddress), 0);

    const fromBlock = await getFromBlock(validatorServiceAddress);
    const toBlock = await withRetry(() => provider.getBlockNumber(), "eth_blockNumber");
    const atToBlock = {blockTag: toBlock};

    const eventNames = ["ValidatorRegistered", "ValidatorAddressChanged", "RequestNewAddress"];
    const topics = eventNames.map((name) => {
        const event = validatorService.interface.getEvent(name);
        if (!event) {
            throw new Error(`ValidatorService ABI has no ${name} event`);
        }
        return event.topicHash;
    });
    const logs = (await scanLogs(
        provider,
        {address: validatorServiceAddress, topics: [topics]},
        fromBlock,
        toBlock
    )).sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);

    // Replay every validator address in order, starting from the registration address
    const history = new Map<bigint, string[]>();
    const candidates = new Set<string>();
    for (const log of logs) {
        const event = validatorService.interface.parseLog(log);
        if (!event) {
            continue;
        }
        const validatorId = BigInt(event.args.validatorId);
        if (event.name === "ValidatorRegistered") {
            if (history.has(validatorId)) {
                throw new Error(`Validator ${validatorId} is registered twice`);
            }
            const validator = await withRetry(
                () => validatorService.getValidator(validatorId, {blockTag: log.blockNumber}),
                `getValidator(${validatorId}) at block ${log.blockNumber}`
            );
            history.set(validatorId, [getAddress(validator.validatorAddress)]);
        } else if (event.name === "ValidatorAddressChanged") {
            const addresses = history.get(validatorId);
            if (!addresses) {
                throw new Error(`Address of validator ${validatorId} changed before its registration`);
            }
            addresses.push(getAddress(event.args.newAddress));
        } else if (event.name === "RequestNewAddress") {
            candidates.add(getAddress(event.args.previousAddress));
            candidates.add(getAddress(event.args.newAddress));
        }
    }

    // The scan must have seen every validator, and the replay must end at the current address
    const numberOfValidators = BigInt(await withRetry(
        () => validatorService.numberOfValidators(atToBlock),
        "numberOfValidators"
    ));
    if (BigInt(history.size) !== numberOfValidators) {
        throw new Error(`Found ${history.size} ValidatorRegistered events, expected ${numberOfValidators}`);
    }
    const currentAddresses = new Map<string, bigint>();
    for (let validatorId = 1n; validatorId <= numberOfValidators; ++validatorId) {
        const addresses = history.get(validatorId);
        if (!addresses) {
            throw new Error(`No ValidatorRegistered event for validator ${validatorId}`);
        }
        const validator = await withRetry(
            () => validatorService.getValidator(validatorId, atToBlock),
            `getValidator(${validatorId})`
        );
        const currentAddress = getAddress(validator.validatorAddress);
        if (addresses[addresses.length - 1] !== currentAddress) {
            throw new Error(`Replayed address of validator ${validatorId} does not match ${currentAddress}`);
        }
        currentAddresses.set(currentAddress, validatorId);
        addresses.forEach((address) => candidates.add(address));
    }

    // Keep the entries written by _setValidatorAddress
    const nodeAddresses = new Map<bigint, Set<string>>();
    const entries: NodeAddressEntry[] = [];
    for (const address of [...candidates].sort()) {
        const validatorId = BigInt(await withRetry(
            () => validatorService.getValidatorIdByNodeAddressWithoutRevert(address, atToBlock),
            `getValidatorIdByNodeAddressWithoutRevert(${address})`
        ));
        if (validatorId === 0n) {
            continue;
        }
        if (!nodeAddresses.has(validatorId)) {
            const linked: string[] = await withRetry(
                () => validatorService.getNodeAddresses(validatorId, atToBlock),
                `getNodeAddresses(${validatorId})`
            );
            nodeAddresses.set(validatorId, new Set(linked.map((linkedAddress) => getAddress(linkedAddress))));
        }
        const isCurrent = currentAddresses.get(address) === validatorId;
        const isLinked = nodeAddresses.get(validatorId)?.has(address) ?? false;
        if (isLinked && !isCurrent) {
            if (currentAddresses.has(address)) {
                console.log(chalk.yellow(
                    `${address} is a validator address and a linked node address of validator ${validatorId}, kept`
                ));
            }
            continue;
        }
        entries.push({validatorId, address});
        console.log(`removeNodeAddress(${validatorId}, ${address}): ${isCurrent ? "current" : "former"} validator address`);
    }
    console.log(chalk.green(`${entries.length} node address entries of validator addresses to remove, state at block ${toBlock}`));
    return entries.sort((a, b) => Number(a.validatorId - b.validatorId) || a.address.localeCompare(b.address));
};
