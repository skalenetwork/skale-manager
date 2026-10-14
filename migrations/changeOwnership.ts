import {skaleContracts} from "@skalenetwork/skale-contracts-ethers-v6";
import {calculateGasSpent, contracts, isLocalNetwork, shouldCalculateGas} from "./deploy";
import {ethers} from "hardhat";
import {EoaSubmitter, getVersion, InstanceAdmin, InstanceAdminOptions, SafeSubmitter} from "@skalenetwork/upgrade-tools";
import {readFile} from "fs/promises";
import {execSync} from "child_process";

async function ensureAndLoadLocalAbi(version: string): Promise<Record<string, ReadonlyArray<object>>> {
    const fileName = `data/skale-manager-${version}-abi.json`;

    try {
        const fileContent = await readFile(fileName, "utf8");
        const abi = JSON.parse(fileContent) as Record<string, ReadonlyArray<object>>;
        console.log(`Loaded ABI file ${fileName} (${Object.keys(abi).length} contracts)`);
        return abi;
    } catch (error) {
        const fsError = error as NodeJS.ErrnoException;
        if (fsError.code !== "ENOENT") {
            throw error;
        }
    }

    console.log(`${fileName} does not exist, generating ABIs...`);
    execSync("yarn hardhat run scripts/generateAbi.ts", {stdio: "inherit"});

    const generatedFileContent = await readFile(fileName, "utf8");
    const generatedAbi = JSON.parse(generatedFileContent) as Record<string, ReadonlyArray<object>>;
    return generatedAbi;
}

async function main() {
    const contractsWithOwnershipToChange = contracts;
    let readonly = false;
    let renounceRoles = true;
    let testMode = false;
    let oldOwner: string;
    let submitter: EoaSubmitter | SafeSubmitter;
    const startBlock = await ethers.provider.getBlockNumber();
    const [owner] = await ethers.getSigners();

    if (!process.env.NEW_OWNER) {
        throw new Error("Please set NEW_OWNER env variable");
    }

    if (!process.env.TARGET) {
        throw new Error("Please set TARGET env variable");
    }

    // Set readonly variable if desired
    if (process.env.READONLY) {
        readonly = process.env.READONLY === "true";
    }

    if (process.env.TEST_MODE === "true") {
        readonly = false;
        renounceRoles = true;
        testMode = true;
    }

    if (process.env.REVOKE_ROLES) {
        renounceRoles = process.env.REVOKE_ROLES === "true";
    }

    if (process.env.MULTISIG_OWNER) {
        oldOwner = process.env.MULTISIG_OWNER;
        submitter = new SafeSubmitter(oldOwner);
    } else {
        oldOwner = owner.address;
        submitter = new EoaSubmitter();
    }

    const newOwner: string = process.env.NEW_OWNER;
    contractsWithOwnershipToChange.push("SkaleToken");

    const network = await skaleContracts.getNetworkByProvider(ethers.provider);
    const project = network.getProject("skale-manager");
    const instance = await project.getInstance(process.env.TARGET);

    // If test mode and local network, get version and set the local ABI manually to avoid inexistent ABIs
    if (testMode && await isLocalNetwork()) {
        const version = await getVersion();
        const abi = await ensureAndLoadLocalAbi(version);
        instance.abi = abi; // Set the ABI manually for test mode
    }

    await instance.getContract("SkaleToken"); // to ensure that the instance is initialized correctly
    const configs: InstanceAdminOptions = {
        newOwner,
        readonly,
        renounceRoles,
        testMode,
        oldOwner,
        submitter,
        rolesToCheck: [
            "LOCKER_MANAGER_ROLE",
            "BOUNTY_REDUCTION_ROLE",
            "CONSTANTS_HOLDER_MANAGER_ROLE",
            "DEBUGGER_ROLE",
            "COMPLIANCE_ROLE",
            "NODE_MANAGER_ROLE",
            "PAYMASTER_SETTER_ROLE",
            "SCHAIN_CREATOR_ROLE",
            "SCHAIN_TYPE_MANAGER_ROLE",
            "GENERATION_MANAGER_ROLE",
            "ADMIN_ROLE",
            "SCHAIN_REMOVAL_ROLE",
            "MINTER_ROLE",
            "PENALTY_SETTER_ROLE",
            "SYNC_MANAGER_ROLE",
            "DELEGATION_PERIOD_SETTER_ROLE",
            "FORGIVER_ROLE",
            "VALIDATOR_MANAGER_ROLE"
        ]
    }
    const admin = new InstanceAdmin(
        contractsWithOwnershipToChange.map(contract => ({name: contract})),
        configs,
        instance
    );
    await admin.executeOwnershipTransfer();

    if (await shouldCalculateGas()) {
        console.log("Calculating gas used by owner", owner.address);
        const endBlock = await ethers.provider.getBlockNumber();
        const gasUsed = await calculateGasSpent(startBlock, endBlock, owner.address);
        console.log(`Gas used by owner: ${gasUsed}`);
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
