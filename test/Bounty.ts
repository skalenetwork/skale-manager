import {
    ContractManagerInstance,
    ConstantsHolderInstance,
    BountyV2Instance,
    NodesMockInstance
} from "../types/truffle-contracts";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployBounty } from "./tools/deploy/bounty";
import { skipTime, currentTime } from "./tools/time";
import * as chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import { deployNodesMock } from "./tools/deploy/test/nodesMock";

chai.should();
chai.use(chaiAsPromised);

contract("Bounty", ([owner, admin, hacker, validator]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let bountyContract: BountyV2Instance;
    let nodes: NodesMockInstance;

    const validatorId = 1;
    const ten18 = web3.utils.toBN(10).pow(web3.utils.toBN(18));
    const day = 60 * 60 * 24;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        constantsHolder = await deployConstantsHolder(contractManager);
        bountyContract = await deployBounty(contractManager);
        nodes = await deployNodesMock(contractManager);
        await contractManager.setContractsAddress("Nodes", nodes.address);

        await constantsHolder.setLaunchTimestamp((await currentTime(web3)));
        await constantsHolder.setPeriods(2592000, 3600, {from: owner});
    });

    // it("should allow only owner to call enableBountyReduction", async() => {
    //     await bountyContract.enableBountyReduction({from: hacker})
    //         .should.be.eventually.rejectedWith("Caller is not the owner");
    //     await bountyContract.enableBountyReduction({from: admin})
    //         .should.be.eventually.rejectedWith("Caller is not the owner");
    //     await bountyContract.enableBountyReduction({from: owner});
    // });

    // it("should allow only owner to call disableBountyReduction", async() => {
    //     await bountyContract.disableBountyReduction({from: hacker})
    //         .should.be.eventually.rejectedWith("Caller is not the owner");
    //     await bountyContract.disableBountyReduction({from: admin})
    //         .should.be.eventually.rejectedWith("Caller is not the owner");
    //     await bountyContract.disableBountyReduction({from: owner});
    // });

    // describe("when 10 nodes registered", async() => {
    //     const maxRewardPeriod = 60 * 60 * 24 * 30 + 60 * 60;
    //     const nodesCount = 10;

    //     beforeEach(async() => {
    //         await nodes.registerNodes(nodesCount);
    //     });

    //     it("5 year test for 10 nodes", async() => {
    //         const years = 5;
    //         const total = []
    //         for (let nodeIndex = 0; nodeIndex < nodesCount; ++nodeIndex) {
    //             total.push(0);
    //         }
    //         for (let month = 0; month < 12 * years; month++) {
    //             skipTime(web3, maxRewardPeriod);

    //             for (let nodeIndex = 0; nodeIndex < nodesCount; nodeIndex++) {
    //                 const bounty = web3.utils.toBN((await bountyContract.getBounty.call(nodeIndex, 0, 0))).div(ten18).toNumber();
    //                 total[nodeIndex] += bounty;
    //                 await bountyContract.getBounty(nodeIndex, 0, 0);

    //                 if (nodeIndex > 0) {
    //                     total[nodeIndex].should.be.equal(total[nodeIndex - 1]);
    //                 }
    //             }
    //         }
    //     });
    // });

    it("30 nodes by 1 each day", async () => {
        const nodesCount = 30;
        const result = new Map<number, object[]>();
        for (let i = 0; i < nodesCount; ++i) {
            await nodes.registerNodes(1);
            skipTime(web3, day);
            result.set(i, []);
        }
        let minBounty = Infinity;
        let maxBounty = 0;
        for (let month = 0; month < 12; ++month) {
            for (let nodeIndex = 0; nodeIndex < nodesCount; ++nodeIndex) {
                const bounty = web3.utils.toBN((await bountyContract.calculateBounty.call(nodeIndex))).div(ten18).toNumber();
                // total[nodeIndex] += bounty;
                await bountyContract.calculateBounty(nodeIndex);
                skipTime(web3, day);

                minBounty = Math.min(minBounty, bounty);
                maxBounty = Math.max(maxBounty, bounty);
                const timestamp = await currentTime(web3);
                result.get(nodeIndex)?.push({timestamp, bounty});
            }
        }
        // console.log(minBounty, maxBounty);
        // console.log(JSON.stringify(Array.from(result)));
    })
});
