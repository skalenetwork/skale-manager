/*
 * Post-upgrade actions for 1.15.0. Run after the upgrade batch is executed.
 * TODO: remove after 1.15.0 is deployed.
 *
 * Removes the _nodeAddressToValidatorId entries that versions before 1.15.0 wrote for validator
 * addresses (see validatorAddressCleanup.ts). It runs after the upgrade, so no new entries can
 * appear in between, and a failing call can only revert this batch, never the upgrade.
 *
 * Usage:
 *   TARGET=<SkaleManager address or alias> yarn hardhat run migrations/postUpgrade.ts --network <network>
 * The transactions are sent by the owner of the ValidatorService proxy: directly when it is an EOA,
 * as a Safe transaction when it is a Safe. Log scan settings are described in validatorAddressCleanup.ts.
 */

import chalk from "chalk";
import {promises as fs} from "fs";
import {ethers, network} from "hardhat";
import {Contract, Transaction, getAddress} from "ethers";
import {getAdminAddress} from "@openzeppelin/upgrades-core";
import {EoaSubmitter, SafeSubmitter, Submitter, getVersion} from "@skalenetwork/upgrade-tools";
import {skaleContracts} from "@skalenetwork/skale-contracts-ethers-v6";
import {collectValidatorAddressNodeEntries} from "./validatorAddressCleanup";

const getSkaleManagerInstance = async () => {
    if (!process.env.TARGET) {
        throw new Error("Set TARGET to the SkaleManager address or the instance alias");
    }
    const skaleNetwork = await skaleContracts.getNetworkByProvider(ethers.provider);
    return await skaleNetwork.getProject("skale-manager").getInstance(process.env.TARGET);
};

const getSubmitter = async (validatorService: Contract): Promise<Submitter> => {
    const proxyAdmin = new ethers.Contract(
        await getAdminAddress(ethers.provider, await validatorService.getAddress()),
        ["function owner() view returns (address)"],
        ethers.provider
    );
    const owner = getAddress(await proxyAdmin.owner());
    if (!await validatorService.hasRole(await validatorService.DEFAULT_ADMIN_ROLE(), owner)) {
        throw new Error(`${owner} owns the ValidatorService proxy but cannot call removeNodeAddress`);
    }
    if (await ethers.provider.getCode(owner) !== "0x") {
        console.log(`Owner ${owner} is a contract, submitting to the Safe`);
        return new SafeSubmitter(owner);
    }
    const [signer] = await ethers.getSigners();
    if (getAddress(signer.address) !== owner) {
        throw new Error(`Owner ${owner} is an EOA, run the script with its key`);
    }
    return new EoaSubmitter();
};

async function main() {
    const instance = await getSkaleManagerInstance();
    const skaleManager = await instance.getContract("SkaleManager") as Contract;
    const version = await getVersion();
    const deployedVersion = await skaleManager.version();
    if (deployedVersion !== version) {
        throw new Error(`Deployed version is ${deployedVersion}, run this script after the upgrade to ${version}`);
    }
    const validatorService = await instance.getContract("ValidatorService") as Contract;

    const entries = await collectValidatorAddressNodeEntries(validatorService);
    if (entries.length === 0) {
        console.log(chalk.green("Nothing to remove"));
        return;
    }
    const validatorServiceAddress = await validatorService.getAddress();
    const transactions = entries.map(({validatorId, address}) => Transaction.from({
        to: validatorServiceAddress,
        data: validatorService.interface.encodeFunctionData("removeNodeAddress", [validatorId, address])
    }));
    const filename = `data/post-upgrade-transactions-${version}-${network.name}.json`;
    await fs.writeFile(filename, JSON.stringify(transactions, null, 4));
    console.log(`Transactions are saved to ${filename}`);

    await (await getSubmitter(validatorService)).submit(transactions);
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
