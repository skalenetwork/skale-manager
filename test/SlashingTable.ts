import { ContractManager, SkaleManager, SlashingTable } from "../typechain";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import { deploySlashingTable } from "./tools/deploy/slashingTable";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

chai.should();
chai.use(chaiAsPromised);

describe("SlashingTable", () => {
    let owner: SignerWithAddress;
    let admin: SignerWithAddress;
    let hacker: SignerWithAddress;

    let contractManager: ContractManager;
    let skaleManager: SkaleManager;
    let slashingTable: SlashingTable;

    beforeEach(async () => {
        [owner, admin, hacker] = await ethers.getSigners();

        contractManager = await deployContractManager();
        skaleManager = await deploySkaleManager(contractManager);
        slashingTable = await deploySlashingTable(contractManager);

        await skaleManager.grantRole(await skaleManager.ADMIN_ROLE(), admin.address);
    });

    it("should allow only owner to call setPenalty", async() => {
        await slashingTable.connect(hacker).setPenalty("Bad D2", 5)
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await slashingTable.connect(admin).setPenalty("Bad D2", 5)
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await slashingTable.setPenalty("Bad D2", 5);
    });
});
