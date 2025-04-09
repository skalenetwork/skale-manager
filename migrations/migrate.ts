import {skaleContracts} from "@skalenetwork/skale-contracts-ethers-v6";
import chalk from "chalk";
import {JsonRpcProvider, resolveAddress} from "ethers";
import {Migrator} from "@skalenetwork/upgrade-tools/dist/src/migration/migrator"
import * as dotenv from "dotenv"
import {ethers} from "hardhat";
import {Client} from "@skalenetwork/upgrade-tools/dist/src/migration/clients/clientStrategyFactory";
import {getVersion} from "@skalenetwork/upgrade-tools";
import {SkaleToken} from "../typechain-types";
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
]

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

    // Change to desired Node
    const provider = new JsonRpcProvider(process.env.ARCHIVE_NODE_ENDPOINT);
    const blockHash = (await provider.getBlock("latest"))?.hash;
    console.log(blockHash);
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
    const BATCH_SIZE = 500_000;
    const latest = await provider.getBlockNumber();
    const balances = new Map<string, bigint>();

    for (let start = 0; start <= latest; start += BATCH_SIZE + 1) {
        const end = Math.min(start + BATCH_SIZE, latest);

        const logs = await provider.getLogs({
            address: skaleTokenAddress,
            fromBlock: start === 0 ? "0x0" : ethers.toBeHex(start),
            toBlock: ethers.toBeHex(end),
            topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", null, null]
        });

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
        const tx = await skaleToken.mint(address, balance, "0x", "0x");
        await tx.wait();

        if (process.env.PRODUCTION) {
            //TODO: Burn in origin if production ?!..
        }
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
