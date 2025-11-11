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

async function main() {
    const [deployer] = await ethers.getSigners();
    const owner = process.env[OWNER_PARAMETER] || await ethers.resolveAddress(deployer);

    if (!process.env[OWNER_PARAMETER]) {
        console.log(chalk.yellow(`OWNER is not set`));
        console.log(chalk.yellow(`Using deployer address: ${owner}`));
    }

    const instance = await getSkaleManagerInstance();
    const contractManager = await instance.getContract("ContractManager") as ContractManager;
    const contractManagerAddress = await contractManager.getAddress();

    const skaleTokenName = "SkaleToken";
    console.log(`Deploying ${skaleTokenName}`);
    const skaleTokenFactory = await ethers.getContractFactory(skaleTokenName);
    const skaleToken = await skaleTokenFactory.deploy(contractManagerAddress, []);
    await skaleToken.waitForDeployment();
    const skaleTokenAddress = await skaleToken.getAddress();
    console.log(`${skaleTokenName} deployed at:`, skaleTokenAddress);

    console.log(`Registering ${skaleTokenName} in ContractManager`);
    await (await contractManager.setContractsAddress(skaleTokenName, skaleToken)).wait();

    console.log("Granting MINTER_ROLE to SkaleManager");
    const skaleManagerAddress = await contractManager.getContract("SkaleManager");
    await (await skaleToken.grantRole(await skaleToken.MINTER_ROLE(), skaleManagerAddress)).wait();

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
