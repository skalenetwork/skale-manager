import chalk from "chalk";
import {ethers} from "hardhat";
import {verify} from '@skalenetwork/upgrade-tools';
import {skaleContracts} from "@skalenetwork/skale-contracts-ethers-v6";
import {ContractManager} from "../typechain-types";

const OWNER_PARAMETER = "OWNER";

async function getSkaleManagerInstance() {
    if (!process.env.TARGET) {
        console.log(chalk.red("Specify desired skale-manager instance"));
        console.log(chalk.red("Set instance alias or SkaleManager address to TARGET environment variable"));
        process.exit(1);
    }
    const network = await skaleContracts.getNetworkByProvider(ethers.provider);
    const project = network.getProject("skale-manager");
    return await project.getInstance(process.env.TARGET);
}

async function transferOwnership(skaleToken: any, newOwner: string, currentOwner: string) {
    const DEFAULT_ADMIN_ROLE = await skaleToken.DEFAULT_ADMIN_ROLE();

    console.log(`Granting DEFAULT_ADMIN_ROLE to new owner: ${newOwner}`);
    await (await skaleToken.grantRole(DEFAULT_ADMIN_ROLE, newOwner)).wait();

    console.log(`Revoking DEFAULT_ADMIN_ROLE from current owner: ${currentOwner}`);
    await (await skaleToken.renounceRole(DEFAULT_ADMIN_ROLE, currentOwner)).wait();

    console.log(`Ownership transfer complete. Previous owner no longer has admin access.`);
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const owner = process.env[OWNER_PARAMETER];

    if (!owner) {
        console.log(chalk.red(`OWNER environment variable is required`));
        console.log(chalk.red(`Set the owner address who will have admin access to the SkaleToken`));
        process.exit(1);
    }

    const instance = await getSkaleManagerInstance();
    const contractManager = await instance.getContract("ContractManager") as ContractManager;
    const contractManagerAddress = await contractManager.getAddress();

    const skaleTokenName = "SkaleTokenL2";
    console.log(`Deploying ${skaleTokenName}`);
    console.log(`Owner will be set to: ${owner}`);
    const skaleTokenFactory = await ethers.getContractFactory(skaleTokenName);
    const skaleToken = await skaleTokenFactory.deploy(contractManagerAddress, []);
    await skaleToken.waitForDeployment();
    const skaleTokenAddress = await skaleToken.getAddress();
    console.log(`${skaleTokenName} deployed at:`, skaleTokenAddress);

    console.log(`Registering ${skaleTokenName} in ContractManager`);
    await (await contractManager.setContractsAddress(skaleTokenName, skaleToken)).wait();

    console.log("Granting MINTER_ROLE for Optimism predeployed contract");
    const MINTER_ROLE = await skaleToken.MINTER_ROLE();
    const optimismL2BridgeAddress = "0x4200000000000000000000000000000000000010";
    await (await skaleToken.grantRole(MINTER_ROLE, optimismL2BridgeAddress)).wait();

    const deployerAddress = await deployer.getAddress();
    await transferOwnership(skaleToken, owner, deployerAddress);

    console.log("Verify contract");
    await verify(skaleTokenName, skaleTokenAddress);

    console.log("Done");
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
