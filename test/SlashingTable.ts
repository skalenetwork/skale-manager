import { ContractManager, SkaleManagerInstance, SlashingTable } from "../types/truffle-contracts";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deployBounty } from "./tools/deploy/bounty";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import { deploySlashingTable } from "./tools/deploy/slashingTable";

chai.should();
chai.use(chaiAsPromised);

contract("SlashingTable", ([owner, admin, hacker]) => {
    let contractManager: ContractManager;
    let skaleManager: SkaleManagerInstance;
    let slashingTable: SlashingTable;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        skaleManager = await deploySkaleManager(contractManager);
        slashingTable = await deploySlashingTable(contractManager);

        await skaleManager.grantRole(await skaleManager.ADMIN_ROLE(), admin);
    });

    it("should allow only owner to call setPenalty", async() => {
        await slashingTable.setPenalty("Bad D2", 5, {from: hacker})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await slashingTable.setPenalty("Bad D2", 5, {from: admin})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await slashingTable.setPenalty("Bad D2", 5, {from: owner});
    });
});
