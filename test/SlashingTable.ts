import { ContractManager, SkaleManager, SlashingTable } from "../typechain-types";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import { deploySlashingTable } from "./tools/deploy/slashingTable";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { fastBeforeEach } from "./tools/mocha";

chai.should();
chai.use(chaiAsPromised);

describe("SlashingTable", () => {
    let owner: SignerWithAddress;
    let admin: SignerWithAddress;
    let hacker: SignerWithAddress;

    let contractManager: ContractManager;
    let skaleManager: SkaleManager;
    let slashingTable: SlashingTable;

    fastBeforeEach(async () => {
        [owner, admin, hacker] = await ethers.getSigners();

        contractManager = await deployContractManager();
        skaleManager = await deploySkaleManager(contractManager);
        slashingTable = await deploySlashingTable(contractManager);

        const PENALTY_SETTER_ROLE = await slashingTable.PENALTY_SETTER_ROLE();
        await slashingTable.grantRole(PENALTY_SETTER_ROLE, owner.address);
    });

    it("should allow only owner to call setPenalty", async() => {
        await slashingTable.connect(hacker).setPenalty("Bad D2", 5)
            .should.be.eventually.rejectedWith("PENALTY_SETTER_ROLE is required");
        await slashingTable.connect(admin).setPenalty("Bad D2", 5)
            .should.be.eventually.rejectedWith("PENALTY_SETTER_ROLE is required");
        await slashingTable.setPenalty("Bad D2", 5);
    });
});
