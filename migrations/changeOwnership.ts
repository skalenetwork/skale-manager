import {skaleContracts} from "@skalenetwork/skale-contracts-ethers-v6";
import {contracts} from "./deploy";
import {ethers} from "hardhat";
import {EoaSubmitter, InstanceAdmin, InstanceAdminOptions, SafeSubmitter} from "@skalenetwork/upgrade-tools";

async function main() {
    const contractsWithOwnershipToChange = contracts;
    let readonly = false;
    let revokeRoles = true;
    let testMode = false;
    let oldOwner: string;
    let submitter: EoaSubmitter | SafeSubmitter;

    if (!process.env.NEW_OWNER) {
        throw new Error("Please set NEW_OWNER env variable");
    }

    if (!process.env.TARGET) {
        throw new Error("Please set TARGET env variable");
    }

    if (process.env.READONLY) {
        readonly = process.env.READONLY === "true";
    }

    if (process.env.TEST_MODE === "true") {
        readonly = false;
        revokeRoles = true;
        testMode = true;
    }

    if (process.env.REVOKE_ROLES) {
        revokeRoles = process.env.REVOKE_ROLES === "true";
    }

    // Set readonly variable if desired

    if (process.env.MULTISIG_OWNER) {
        oldOwner = process.env.MULTISIG_OWNER;
        submitter = new SafeSubmitter(oldOwner);
    } else {
        oldOwner = (await ethers.getSigners())[0].address;
        submitter = new EoaSubmitter();
    }

    const newOwner: string = process.env.NEW_OWNER;
    contractsWithOwnershipToChange.push("SkaleToken");

    const network = await skaleContracts.getNetworkByProvider(ethers.provider);
    const project = network.getProject("skale-manager");
    const instance = await project.getInstance(process.env.TARGET);
    const configs: InstanceAdminOptions = {
        newOwner,
        readonly,
        revokeRoles,
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
    const admin = new InstanceAdmin(instance, contractsWithOwnershipToChange, configs);
    await admin.executeOwnershipTransfer();
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
