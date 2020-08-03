import {
    ContractManagerInstance,
    BountyInstance,
    NodesInstance,
    SkaleManagerInstance,
    SkaleTokenInstance,
    ValidatorServiceInstance,
} from "../types/truffle-contracts";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deployBounty } from "./tools/deploy/bounty";
import { skipTime, currentTime } from "./tools/time";
import * as chaiAsPromised from "chai-as-promised";
import * as chai from "chai";

chai.should();
chai.use(chaiAsPromised);

contract("Bounty", ([owner, admin, hacker, validator]) => {
    let contractManager: ContractManagerInstance;
    let skaleManager: SkaleManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let validatorService: ValidatorServiceInstance;
    let bountyContract: BountyInstance;
    let nodesContract: NodesInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        skaleManager = await deploySkaleManager(contractManager);
        skaleToken = await deploySkaleToken(contractManager);
        validatorService = await deployValidatorService(contractManager);
        bountyContract = await deployBounty(contractManager);
        nodesContract = await deployNodes(contractManager);

        await skaleManager.grantRole(await skaleManager.ADMIN_ROLE(), admin);
        const bountyPoolSize = "2310000000" + "0".repeat(18);
        await skaleToken.mint(skaleManager.address, bountyPoolSize, "0x", "0x");
        await validatorService.registerValidator("Validator1", "D2 is even", 0, 0, {from: validator});
        const validator1Id = await validatorService.getValidatorId(validator);
        await validatorService.enableValidator(validator1Id, {from: owner});
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

    describe("when 10 nodes registered", async() => {
        const rewardPeriod = 60 * 60 * 24 * 30;

        beforeEach(async() => {
            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await nodesContract.createNode(validator,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                        name: "d2" + hexIndex
                    });
            }
        });

        it("should get bounty after reward period", async() => {
            await skaleManager.getBounty(0, {from: validator}).should.be.eventually.rejectedWith("Not time for bounty");
            skipTime(web3, rewardPeriod);
            const balanceBefore = await skaleToken.balanceOf(validator);
            // console.log(balanceBefore.toString());
            await skaleManager.getBounty(0, {from: validator});
            const balanceAfter = await skaleToken.balanceOf(validator);
            // console.log(balanceAfter.toString());
        });
    });
});
