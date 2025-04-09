import {skaleContracts} from "@skalenetwork/skale-contracts-ethers-v6";
import chalk from "chalk";
import {FetchRequest, JsonRpcProvider, resolveAddress} from "ethers";
import {Migrator} from "@skalenetwork/upgrade-tools/dist/src/migration/migrator"
import * as dotenv from "dotenv"
import {ethers, run} from "hardhat";
import {Client} from "@skalenetwork/upgrade-tools/dist/src/migration/clients/clientStrategyFactory";
import {getAbi, getVersion} from "@skalenetwork/upgrade-tools";
import {SkaleToken} from "../typechain-types";
import {promises as fs} from 'fs';
dotenv.config();

const contracts = [
    "ContractManager",

    "DelegationController",
    "DelegationPeriodManager",
    "Distributor",
    "Punisher",
    "SlashingTable",
    "TimeHelpers",
    "TokenState",
    "ValidatorService",
    "ConstantsHolder",
    "Nodes",
    "NodeRotation",
    "SchainsInternal",
    "Schains",
    "Decryption",
    "ECDH",
    "KeyStorage",
    "SkaleDKG",
    "SkaleVerifier",
    "SkaleManager",
    "BountyV2",
    "Wallets",
    "SyncManager",
    "PaymasterController"
];

function getContractKeyInAbiFile(contract: string) {
    return contract.replace(/([a-zA-Z])(?=[A-Z])/g, '$1_').toLowerCase();
}

async function main() {
    if (!process.env.TARGET) {
        console.log(chalk.red("Specify desired skale-manager instance"));
        console.log(chalk.red("Set instance alias or SkaleManager address to TARGET environment variable"));
        process.exit(1);
    }

    if (!process.env.ARCHIVE_NODE_ENDPOINT) {
        console.log(chalk.red("Specify desired archive node RPC endpoint"));
        console.log(chalk.red("Set archive node RPC endpoint to ARCHIVE_NODE_ENDPOINT environment variable"));
        process.exit(1);
    }
    if (await ethers.provider.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24") === "0x") {
        await run("erc1820");
    }
    // Change to desired Node
    const fetch = new FetchRequest(process.env.ARCHIVE_NODE_ENDPOINT);
    fetch.timeout = 180000;
    const provider = new JsonRpcProvider(fetch);
    const blockHash = (await provider.getBlock("latest"))?.hash;
    console.log(blockHash);
    console.log("Migrating from Block Number:", await provider.getBlockNumber());
    const network = await skaleContracts.getNetworkByProvider(provider);
    const project = network.getProject("skale-manager");
    const instance = await project.getInstance(process.env.TARGET);

    const migrator: Migrator = await Migrator.createFromProject(
        {
            name: "skale-manager",
            instance,
            version: await getVersion(),
            contractNamesToUpgrade: contracts
        },
        provider,
        undefined, // max number tx per block
        Client.GETH
    );

    // dump storage from instance contracts
    await migrator.dumpStorage();

    // deploy mock implementations of each contract = RayStorageSetter.sol
    await migrator.init();

    // will set values that contain old smart-contract addresses to the new addresses
    migrator.setDefaultValuesToUpdate();

    const contractManagerAddress = migrator.getContractNewAddress("ContractManager") as string;

    const skaleTokenAddress = await instance.getContractAddress("SkaleToken");
    const skaleTokenName = "SkaleToken";
    const skaleTokenFactory = await ethers.getContractFactory(skaleTokenName);
    const skaleToken = await skaleTokenFactory.deploy(contractManagerAddress, []) as unknown as SkaleToken;
    await skaleToken.waitForDeployment();
    console.log("Deploy", skaleTokenName, "at", await resolveAddress(skaleToken));

    // should switch references to old skale token by the new token
    migrator.addValueToUpdate(skaleTokenAddress, await skaleToken.getAddress());

    // triggers the migration of data to new contracts
    console.log("Starting data migration...")
    await migrator.migrateData();

    // upgrades contracts to new implementation
    console.log("Starting contract upgrades...")
    await migrator.upgrade();

    // Fetch all Transfer events and mints balances for the new token
    const BATCH_SIZE = 100_000;
    const latest = await provider.getBlockNumber();
    const balances = new Map<string, bigint>();

    for (let start = 0; start <= latest; start += BATCH_SIZE + 1) {
        const end = Math.min(start + BATCH_SIZE, latest);
        let attempts = 0;

        let logs;
        while (attempts < 5){
            try {
                logs = await provider.getLogs({
                    address: skaleTokenAddress,
                    fromBlock: start === 0 ? "0x0" : ethers.toBeHex(start),
                    toBlock: ethers.toBeHex(end),
                    // keccak256("Transfer(address,address,uint256)")
                    topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", null, null]
                });
                break;
            } catch (error) {
                attempts++;
                console.log("trying again. Attempt:", attempts);
            }
        }

        if (!logs) {
            throw Error("Could not get logs");
        }

        console.log(`Found ${logs.length} logs between block ${start} and ${end}.`);

        for (const log of logs) {
            const from = "0x" + log.topics[1].slice(-40)
            const to = "0x" + log.topics[2].slice(-40)
            const value = BigInt(log.data);

            console.log(from, "->", to, ":",value);

            if (from !== ethers.ZeroAddress) {
                if (balances.has(from)) {
                    balances.set(from, balances.get(from) as bigint - value)
                }
            }
            balances.set(to, (balances.get(to) ?? 0n) + value);
        }
    }
    for(const [address, balance] of balances.entries()) {
        try {
            const tx = await skaleToken.mint(address, balance, "0x", "0x");
            await tx.wait();
        } catch (error) {
            console.log("Failed to mint", balance, "to", address);
        }
        if (process.env.PRODUCTION) {
            //TODO: Burn in origin ?!..
        }
    }

    const outputObject: {[k: string]: unknown} = {};
    for (const name of contracts) {
        const contractKey = getContractKeyInAbiFile(name);
        const address = migrator.getContractNewAddress(name);
        outputObject[contractKey + "_address"] = address;
        const contract = await ethers.getContractAt(name, address!);
        outputObject[contractKey + "_abi"] = getAbi(contract.interface);
    }
    const contractKey = getContractKeyInAbiFile(skaleTokenName);
    outputObject[contractKey + "_address"] = await skaleToken.getAddress();
    outputObject[contractKey + "_abi"] = getAbi(skaleToken.interface);

    await fs.writeFile(
        `data/skale-manager-${instance.version as string}-${(await ethers.provider.getNetwork()).name}-abi.json`,
        JSON.stringify(outputObject, null, 4)
    );
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
