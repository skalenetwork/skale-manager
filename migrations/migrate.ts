import {skaleContracts} from "@skalenetwork/skale-contracts-ethers-v6";
import chalk from "chalk";
import {FetchRequest, JsonRpcProvider, resolveAddress} from "ethers";
import {Migrator} from "@skalenetwork/upgrade-tools/dist/src/migration/migrator"
import {ethers, run, upgrades} from "hardhat";
import {Client} from "@skalenetwork/upgrade-tools/dist/src/migration/clients/clientStrategyFactory";
import {getAbi, getVersion} from "@skalenetwork/upgrade-tools";
import {ContractManager, SchainsInternalMigrator, SkaleToken} from "../typechain-types";
import {promises as fs} from 'fs';

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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    if (!process.env.BLOCK_HASH) {
        console.log(chalk.red("Specify Block Hash to migrate from in .env BLOCK_HASH"));
        process.exit(1);
    }
    if (await ethers.provider.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24") === "0x") {
        await run("erc1820");
    }
    // Change to desired Node
    const owner = (await ethers.getSigners())[0];
    const fetch = new FetchRequest(process.env.ARCHIVE_NODE_ENDPOINT);
    fetch.timeout = 180000;
    const provider = new JsonRpcProvider(fetch);
    const blockHash = (await provider.getBlock(process.env.BLOCK_HASH))?.hash;
    console.log("Migrating from:", blockHash);
    if (!blockHash || blockHash == null) {
        throw new Error("Failed to get block with hash " + process.env.BLOCK_HASH);
    }
    const network = await skaleContracts.getNetworkByProvider(provider);
    const project = network.getProject("skale-manager");
    const instance = await project.getInstance(process.env.TARGET);
    let total = BigInt(0);
    for(const contract of contracts){
        const ceil = ethers.parseEther("5");
        const balance = await provider.getBalance(await instance.getContractAddress(contract));
        total += balance > ceil ? ceil : balance;
    }
    console.log(`Going to require ~${ethers.formatEther(total + ethers.parseEther("1"))} ETH for migration.`)
    const ownerBalance = await provider.getBalance(owner.address);
    if (total + ethers.parseEther("1") > ownerBalance) {
        console.log(`Owner has only ${ethers.formatEther(ownerBalance)}ETH. Required at least: ${ethers.formatEther(total + ethers.parseEther("1"))}`);
        console.log("ABORTING.");
        process.exit(1);
    }

    const oldcontractManager = await instance.getContract("ContractManager") as unknown as ContractManager;
    if (owner.address != await oldcontractManager.owner()) {
        console.log("This script requires the old SkaleManager owner to be the same as the account running this script.");
        console.log("ABORTING.");
        process.exit(1);
    }
    const ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

    const raw = await provider.getStorage(oldcontractManager, ADMIN_SLOT);
    const proxyAdminAddress = ethers.getAddress(`0x${raw.slice(26)}`);
    const proxyAdmin = new ethers.Contract(
        proxyAdminAddress,
        [
            "function owner() view returns (address)"
        ],
        provider
    );

    const proxyAdminOwner = await proxyAdmin.owner();
    if (proxyAdminOwner != owner.address) {
        // Note that this is not strictly required in every situation.
        // the account running this script will be the controller of the upgrades after contracts are migrated.
        // We want to ensure it's the same it was before, in this particular situation
        console.log("This script requires the ProxyAdmin owner to be the same as the account running this script.");
        console.log("ABORTING.");
        process.exit(1);
    }

    console.log("Starting...");

    const migrator: Migrator = await Migrator.createFromProject(
        {
            name: "skale-manager",
            instance,
            version: await getVersion(),
            contractNamesToUpgrade: contracts
        },
        provider,
        undefined, // max number tx per block
        blockHash,
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
    const latest = (await provider.getBlock(process.env.BLOCK_HASH))?.number ?? await provider.getBlockNumber();
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
    console.log("Migration success!! Changing schain owners..");

    // Change address of Schains we own - Testnet only
    if (process.env.OLD_SCHAINS_OWNER && process.env.NEW_SCHAINS_OWNER) {
        const setterFactory = await ethers.getContractFactory("SchainsInternalMigrator");
        const setter = await upgrades.upgradeProxy(migrator.getContractNewAddress("SchainsInternal")!, setterFactory);
        await setter.waitForDeployment();
        await setter.deploymentTransaction()?.wait(2);
        await delay(30000);
        const tx = await (setter.connect(owner) as unknown as SchainsInternalMigrator).changeSchainsOwner(process.env.OLD_SCHAINS_OWNER, process.env.NEW_SCHAINS_OWNER);
        await tx.wait();

        const internalFactory = await ethers.getContractFactory("SchainsInternal");
        const internal = await upgrades.upgradeProxy(migrator.getContractNewAddress("SchainsInternal")!, internalFactory);
        await internal.waitForDeployment();
        await internal.deploymentTransaction()?.wait(2);
        await delay(30000);
    }
    console.log("Migration success!! Verifying contracts..");


    if (!process.env.ETHERSCAN) {
        console.log("ETHERSCAN key is not set, not verifying.");
        return;
    }
    await migrator.verify();
    console.log("Success!!");
    console.log("Use", blockHash, " for MAINNET migration");
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
