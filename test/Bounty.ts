import { ContractManagerInstance, BountyInstance, SkaleManagerInstance } from "../types/truffle-contracts";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deployBounty } from "./tools/deploy/bounty";
import * as chaiAsPromised from "chai-as-promised";
import * as chai from "chai";

chai.should();
chai.use(chaiAsPromised);

contract("Bounty", ([owner, admin, hacker]) => {
    let contractManager: ContractManagerInstance;
    let skaleManager: SkaleManagerInstance;
    let bountyContract: BountyInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        skaleManager = await deploySkaleManager(contractManager);
        bountyContract = await deployBounty(contractManager);

        await skaleManager.grantRole(await skaleManager.ADMIN_ROLE(), admin);
    });

    it("should allow only owner to call enableBountyReduction", async() => {
        await bountyContract.enableBountyReduction({from: hacker})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await bountyContract.enableBountyReduction({from: admin})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await bountyContract.enableBountyReduction({from: owner});
    });

    it("should allow only owner to call disableBountyReduction", async() => {
        await bountyContract.disableBountyReduction({from: hacker})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await bountyContract.disableBountyReduction({from: admin})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await bountyContract.disableBountyReduction({from: owner});
    });
});
