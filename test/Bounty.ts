import {
    ContractManagerInstance,
    ConstantsHolderInstance,
    BountyV2Instance,
    NodesMockInstance
} from "../types/truffle-contracts";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployBounty } from "./tools/deploy/bounty";
import { skipTime, currentTime, months } from "./tools/time";
import * as chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import { deployNodesMock } from "./tools/deploy/test/nodesMock";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployTimeHelpers } from "./tools/deploy/delegation/timeHelpers";

chai.should();
chai.use(chaiAsPromised);

contract("Bounty", ([owner, admin, hacker, validator]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let bountyContract: BountyV2Instance;
    let nodes: NodesMockInstance;

    const ten18 = web3.utils.toBN(10).pow(web3.utils.toBN(18));
    const day = 60 * 60 * 24;
    const month = 31 * day;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        constantsHolder = await deployConstantsHolder(contractManager);
        bountyContract = await deployBounty(contractManager);
        nodes = await deployNodesMock(contractManager);
        await contractManager.setContractsAddress("Nodes", nodes.address);

        await constantsHolder.setLaunchTimestamp((await currentTime(web3)));
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

    describe("when validator is registered and has active delegations", async () => {
        const validatorId = 1;
        beforeEach(async () => {
            const skaleToken = await deploySkaleToken(contractManager);
            const delegationController = await deployDelegationController(contractManager);
            const validatorService = await deployValidatorService(contractManager);
            await skaleToken.mint(validator, ten18.muln(1e6).toString(), "0x", "0x");
            await validatorService.registerValidator("Validator", "", 150, 1e6 + 1, {from: validator});
            await validatorService.enableValidator(validatorId);
            await delegationController.delegate(validatorId, ten18.muln(1e6).toString(), 3, "", {from: validator});
            await delegationController.acceptPendingDelegation(0, {from: validator});
            skipTime(web3, month);
        });

        describe("when 10 nodes registered", async() => {
            const maxRewardPeriod = 60 * 60 * 24 * 30 + 60 * 60;
            const nodesCount = 10;

            beforeEach(async() => {
                await nodes.registerNodes(nodesCount, validatorId);
            });

            // TODO: update
            // it("5 year test for 10 nodes", async() => {
            //     const years = 5;
            //     const total = []
            //     for (let nodeIndex = 0; nodeIndex < nodesCount; ++nodeIndex) {
            //         total.push(0);
            //     }
            //     for (let currentMonth = 0; currentMonth < 12 * years; currentMonth++) {
            //         skipTime(web3, maxRewardPeriod);

            //         for (let nodeIndex = 0; nodeIndex < nodesCount; nodeIndex++) {
            //             const bounty = web3.utils.toBN((await bountyContract.calculateBounty.call(nodeIndex))).div(ten18).toNumber();
            //             total[nodeIndex] += bounty;
            //             await bountyContract.calculateBounty(nodeIndex);

            //             if (nodeIndex > 0) {
            //                 total[nodeIndex].should.be.equal(total[nodeIndex - 1]);
            //             }
            //         }
            //     }
            // });
        });

        // this test was used to manually check bounty distribution

        // it("30 nodes by 1 each day", async () => {
        //     const nodesCount = 30;
        //     const result = new Map<number, object[]>();
        //     const queue = []
        //     for (let i = 0; i < nodesCount; ++i) {
        //         await nodes.registerNodes(1, validatorId);
        //         console.log("Node", i, "is registered", new Date(await currentTime(web3) * 1000))
        //         skipTime(web3, day);
        //         result.set(i, []);
        //         queue.push({nodeId: i, getBountyTimestamp: (await bountyContract.getNextRewardTimestamp(i)).toNumber()})
        //     }
        //     let minBounty = Infinity;
        //     let maxBounty = 0;
        //     const startTime = await currentTime(web3);
        //     queue.sort((a, b) => {
        //         return b.getBountyTimestamp - a.getBountyTimestamp;
        //     });
        //     for (let timestamp = startTime; timestamp < startTime + 365 * day; timestamp = await currentTime(web3)) {
        //         const nodeInfo: {nodeId: number, getBountyTimestamp: number} | undefined = queue.pop();
        //         assert(nodeInfo !== undefined);
        //         if (nodeInfo) {
        //             const nodeId = nodeInfo.nodeId;
        //             if (timestamp < nodeInfo.getBountyTimestamp) {
        //                 skipTime(web3, nodeInfo.getBountyTimestamp - timestamp);
        //                 timestamp = await currentTime(web3)
        //             }
        //             console.log("Node", nodeId, new Date(await currentTime(web3) * 1000))
        //             const bounty = web3.utils.toBN((await bountyContract.calculateBounty.call(nodeId))).div(ten18).toNumber();
        //             // total[nodeIndex] += bounty;
        //             await bountyContract.calculateBounty(nodeId);
        //             await nodes.changeNodeLastRewardDate(nodeId);

        //             nodeInfo.getBountyTimestamp = (await bountyContract.getNextRewardTimestamp(nodeId)).toNumber();
        //             queue.push(nodeInfo)
        //             queue.sort((a, b) => {
        //                 return b.getBountyTimestamp - a.getBountyTimestamp;
        //             });

        //             minBounty = Math.min(minBounty, bounty);
        //             maxBounty = Math.max(maxBounty, bounty);
        //             result.get(nodeId)?.push({timestamp, bounty});
        //         } else {
        //             assert(false, "Internal error");
        //         }
        //     }
        //     console.log(minBounty, maxBounty);
        //     console.log(JSON.stringify(Array.from(result)));
        //     const epochs = []
        //     const timeHelpers = await deployTimeHelpers(contractManager);
        //     for (let i = 0; i < 30; ++i) {
        //         epochs.push((await timeHelpers.monthToTimestamp(i)).toNumber())
        //     }
        //     console.log(JSON.stringify(Array.from(epochs)));
        // })
    });
});
