import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ConstantsHolderInstance,
         ContractManagerInstance,
         DelegationControllerInstance,
         DelegationPeriodManagerInstance,
         DistributorInstance,
         MonitorsInstance,
         NodesInstance,
         SchainsInternalInstance,
         SchainsInstance,
         SkaleDKGTesterInstance,
         SkaleManagerInstance,
         SkaleTokenInstance,
         ValidatorServiceInstance,
         BountyInstance} from "../types/truffle-contracts";

// import BigNumber from "bignumber.js";

import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deploySkaleDKGTester } from "./tools/deploy/test/skaleDKGTester";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployDelegationPeriodManager } from "./tools/deploy/delegation/delegationPeriodManager";
import { deployDistributor } from "./tools/deploy/delegation/distributor";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployMonitors } from "./tools/deploy/monitors";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { skipTime, currentTime } from "./tools/time";
import { deployBounty } from "./tools/deploy/bounty";
import BigNumber from "bignumber.js";

chai.should();
chai.use(chaiAsPromised);

contract("SkaleManager", ([owner, validator, developer, hacker, nodeAddress]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let nodesContract: NodesInstance;
    let skaleManager: SkaleManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let monitors: MonitorsInstance;
    let schainsInternal: SchainsInternalInstance;
    let schains: SchainsInstance;
    let validatorService: ValidatorServiceInstance;
    let delegationController: DelegationControllerInstance;
    let delegationPeriodManager: DelegationPeriodManagerInstance;
    let distributor: DistributorInstance;
    let skaleDKG: SkaleDKGTesterInstance;
    let bountyContract: BountyInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        nodesContract = await deployNodes(contractManager);
        monitors = await deployMonitors(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);
        delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
        distributor = await deployDistributor(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);
	bountyContract = await deployBounty(contractManager);

        const premined = "100000000000000000000000000";
        const bountyPoolSize = "2310000000" + "0".repeat(18);
        await skaleToken.mint(skaleManager.address, bountyPoolSize, "0x", "0x");
        await skaleToken.mint(owner, premined, "0x", "0x");
        await constantsHolder.setMSR(5);
        await constantsHolder.setLaunchTimestamp(await currentTime(web3)); // to allow bounty withdrawing
        await bountyContract.enableBountyReduction();
        await constantsHolder.setFirstDelegationsMonth(0);
    });

    it("should fail to process token fallback if sent not from SkaleToken", async () => {
        await skaleManager.tokensReceived(hacker, validator, developer, 5, "0x11", "0x11", {from: validator}).
            should.be.eventually.rejectedWith("Message sender is invalid");
    });

    it("should transfer ownership", async () => {
        await skaleManager.grantRole(await skaleManager.DEFAULT_ADMIN_ROLE(), hacker , {from: hacker})
            .should.be.eventually.rejectedWith("AccessControl: sender must be an admin to grant");

        await skaleManager.grantRole(await skaleManager.DEFAULT_ADMIN_ROLE(), hacker, {from: owner});

        await skaleManager.hasRole(await skaleManager.DEFAULT_ADMIN_ROLE(), hacker).should.be.eventually.true;
    });

    describe("when validator has delegated SKALE tokens", async () => {
        const validatorId = 1;
        const month = 60 * 60 * 24 * 31;
        const delegatedAmount = 1e7;

        beforeEach(async () => {
            await validatorService.registerValidator("D2", "D2 is even", 150, 0, {from: validator});
            const validatorIndex = await validatorService.getValidatorId(validator);
            let signature = await web3.eth.sign(web3.utils.soliditySha3(validatorIndex.toString()), nodeAddress);
            signature = (signature.slice(130) === "00" ? signature.slice(0, 130) + "1b" :
                (signature.slice(130) === "01" ? signature.slice(0, 130) + "1c" : signature));
            await validatorService.linkNodeAddress(nodeAddress, signature, {from: validator});

            await skaleToken.transfer(validator, 10 * delegatedAmount, {from: owner});
            await validatorService.enableValidator(validatorId, {from: owner});
            await delegationPeriodManager.setDelegationPeriod(12, 200);
            await delegationController.delegate(validatorId, delegatedAmount, 12, "Hello from D2", {from: validator});
            const delegationId = 0;
            await delegationController.acceptPendingDelegation(delegationId, {from: validator});

            skipTime(web3, month);
        });

        it("should create a node", async () => {
            await skaleManager.createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x1122334455667788990011223344556677889900112233445566778899001122",
                 "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                "d2", // name
                {from: nodeAddress});

            await nodesContract.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
            (await nodesContract.getNodePort(0)).toNumber().should.be.equal(8545);
        });

        it("should not allow to create node if validator became untrusted", async () => {
            skipTime(web3, 2592000);
            await constantsHolder.setMSR(100);

            await validatorService.disableValidator(validatorId, {from: owner});
            await skaleManager.createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x1122334455667788990011223344556677889900112233445566778899001122",
                 "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                "d2", // name
                {from: nodeAddress})
                .should.be.eventually.rejectedWith("Validator is not authorized to create a node");
            await validatorService.enableValidator(validatorId, {from: owner});
            await skaleManager.createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x1122334455667788990011223344556677889900112233445566778899001122",
                 "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                "d2", // name
                {from: nodeAddress});
        });

        describe("when node is created", async () => {

            beforeEach(async () => {
                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x1122334455667788990011223344556677889900112233445566778899001122",
                     "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                    "d2", // name
                    {from: nodeAddress});
            });

            it("should fail to init exiting of someone else's node", async () => {
                await skaleManager.nodeExit(0, {from: hacker})
                    .should.be.eventually.rejectedWith("Validator address does not exist");
            });

            it("should initiate exiting", async () => {
                await skaleManager.nodeExit(0, {from: nodeAddress});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;
            });

            it("should remove the node", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                const lastBlock = await monitors.getLastBountyBlock(0);

                await skaleManager.nodeExit(0, {from: nodeAddress});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                expect((await monitors.getLastBountyBlock(0)).eq(lastBlock)).to.be.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.nodeExit(0, {from: owner});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should pay bounty according to the schedule", async () => {
                await bountyContract.disableBountyReduction();
                let rewardPeriod = (await constantsHolder.rewardPeriod()).toNumber();
                if (rewardPeriod < month) {
                    await constantsHolder.setPeriods(month, 300);
                    rewardPeriod = (await constantsHolder.rewardPeriod()).toNumber();
                }
                const timelimit = 300;
                const start = Date.now();
                const launch = (await constantsHolder.launchTimestamp()).toNumber();
                const yearLength = (await bountyContract.STAGE_LENGTH()).toNumber();
                const ten18 = web3.utils.toBN(10).pow(web3.utils.toBN(18));

                const schedule = [
                    385000000,
                    346500000,
                    308000000,
                    269500000,
                    231000000,
                    192500000
                ]
                for (let bounty = schedule[schedule.length - 1] / 2; bounty > 1; bounty /= 2) {
                    for (let i = 0; i < 3; ++i) {
                        schedule.push(bounty);
                    }
                }

                let mustBePaid = web3.utils.toBN(0);
                for (let year = 0; year < schedule.length && Date.now() < 0.9 * timelimit; ++year) {
                    do {
                        skipTime(web3, rewardPeriod);
                        await skaleManager.getBounty(0, {from: nodeAddress});
                    } while (await currentTime(web3) + rewardPeriod < launch + (year + 1) * yearLength);

                    const bountyWasPaid = web3.utils.toBN(await skaleToken.balanceOf(distributor.address));
                    mustBePaid = mustBePaid.add(web3.utils.toBN(Math.floor(schedule[year])));

                    bountyWasPaid.div(ten18).sub(mustBePaid).abs().toNumber().should.be.lessThan(35); // 35 because of rounding errors in JS
                }
            });
        });

        describe("when two nodes are created", async () => {

            beforeEach(async () => {
                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x1122334455667788990011223344556677889900112233445566778899001122",
                     "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                    "d2", // name
                    {from: nodeAddress});
                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000002", // ip
                    "0x7f000002", // public ip
                    ["0x1122334455667788990011223344556677889900112233445566778899001122",
                     "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                    "d3", // name
                    {from: nodeAddress});
            });

            it("should fail to initiate exiting of first node from another account", async () => {
                await skaleManager.nodeExit(0, {from: hacker})
                    .should.be.eventually.rejectedWith("Validator address does not exist");
            });

            it("should fail to initiate exiting of second node from another account", async () => {
                await skaleManager.nodeExit(1, {from: hacker})
                    .should.be.eventually.rejectedWith("Validator address does not exist");
            });

            it("should initiate exiting of first node", async () => {
                await skaleManager.nodeExit(0, {from: nodeAddress});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;
            });

            it("should initiate exiting of second node", async () => {
                await skaleManager.nodeExit(1, {from: nodeAddress});

                await nodesContract.isNodeLeft(1).should.be.eventually.true;
            });

            it("should remove the first node", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.nodeExit(0, {from: nodeAddress});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the second node", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.nodeExit(1, {from: nodeAddress});

                await nodesContract.isNodeLeft(1).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the first node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.nodeExit(0, {from: owner});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the second node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.nodeExit(1, {from: owner});

                await nodesContract.isNodeLeft(1).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            // it("should check several monitoring periods", async () => {
            //     const verdict1 = {
            //         toNodeIndex: 1,
            //         downtime: 0,
            //         latency: 50
            //     };
            //     const verdict2 = {
            //         toNodeIndex: 0,
            //         downtime: 0,
            //         latency: 50
            //     };
            //     skipTime(web3, 3400);
            //     let txSendVerdict1 = await skaleManager.sendVerdict(0, verdict1, {from: nodeAddress});

            //     let blocks = await monitors.getLastReceivedVerdictBlock(1);
            //     txSendVerdict1.receipt.blockNumber.should.be.equal(blocks.toNumber());

            //     skipTime(web3, 200);
            //     let txGetBounty1 = await skaleManager.getBounty(0, {from: nodeAddress});
            //     let txGetBounty2 = await skaleManager.getBounty(1, {from: nodeAddress});

            //     blocks = await monitors.getLastBountyBlock(0);
            //     txGetBounty1.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //     blocks = await monitors.getLastBountyBlock(1);
            //     txGetBounty2.receipt.blockNumber.should.be.equal(blocks.toNumber());

            //     skipTime(web3, 3400);
            //     txSendVerdict1 = await skaleManager.sendVerdict(0, verdict1, {from: nodeAddress});
            //     const txSendVerdict2 = await skaleManager.sendVerdict(1, verdict2, {from: nodeAddress});

            //     blocks = await monitors.getLastReceivedVerdictBlock(1);
            //     txSendVerdict1.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //     blocks = await monitors.getLastReceivedVerdictBlock(0);
            //     txSendVerdict2.receipt.blockNumber.should.be.equal(blocks.toNumber());

            //     skipTime(web3, 200);
            //     txGetBounty1 = await skaleManager.getBounty(0, {from: nodeAddress});
            //     txGetBounty2 = await skaleManager.getBounty(1, {from: nodeAddress});

            //     blocks = await monitors.getLastBountyBlock(0);
            //     txGetBounty1.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //     blocks = await monitors.getLastBountyBlock(1);
            //     txGetBounty2.receipt.blockNumber.should.be.equal(blocks.toNumber());
            // });

            // it("Alex test", async () => {
            //     skipTime(web3, 3600);
            //     let txGetBounty1 = await skaleManager.getBounty(0, {from: nodeAddress});
            //     let txGetBounty2 = await skaleManager.getBounty(1, {from: nodeAddress});

            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(0))).length.should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(0)))[0].toNumber().should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(1))).length.should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(1)))[0].toNumber().should.be.equal(0);

            //     skipTime(web3, 3600);
            //     txGetBounty1 = await skaleManager.getBounty(0, {from: nodeAddress});
            //     txGetBounty2 = await skaleManager.getBounty(1, {from: nodeAddress});

            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(0))).length.should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(0)))[0].toNumber().should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(1))).length.should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(1)))[0].toNumber().should.be.equal(0);

            //     skipTime(web3, 3600);
            //     txGetBounty1 = await skaleManager.getBounty(0, {from: nodeAddress});
            //     txGetBounty2 = await skaleManager.getBounty(1, {from: nodeAddress});

            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(0))).length.should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(0)))[0].toNumber().should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(1))).length.should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(1)))[0].toNumber().should.be.equal(0);

            //     skipTime(web3, 3600);
            //     txGetBounty1 = await skaleManager.getBounty(0, {from: nodeAddress});
            //     txGetBounty2 = await skaleManager.getBounty(1, {from: nodeAddress});

            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(0))).length.should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(0)))[0].toNumber().should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(1))).length.should.be.equal(1);
            //     (await monitors.getNodesInGroup(web3.utils.soliditySha3(1)))[0].toNumber().should.be.equal(0);

            // });
        });



        describe("when 18 nodes are in the system", async () => {

            const verdict = {
                toNodeIndex: 1,
                downtime: 0,
                latency: 50
            };

            beforeEach(async () => {
                await skaleToken.transfer(validator, "0x3635c9adc5dea00000", {from: owner});

                for (let i = 0; i < 18; ++i) {
                    await skaleManager.createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x1122334455667788990011223344556677889900112233445566778899001122",
                         "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                        "d2-" + i, // name
                        {from: nodeAddress});
                }

            });

            async function getMaximumBountyAmount(timestamp: number, nodesAmount: number) {
                const ten18 = web3.utils.toBN("1" + "0".repeat(18));
                const bountyPoolSize = web3.utils.toBN("2310000000" + "0".repeat(18));
                const yearLength = (await bountyContract.STAGE_LENGTH()).toNumber();
                const rewardPeriod = (await constantsHolder.rewardPeriod()).toNumber();

                const networkLaunchTimestamp = (await constantsHolder.launchTimestamp()).toNumber();
                if (timestamp < networkLaunchTimestamp) {
                    return web3.utils.toBN(0);
                }

                function getBountyForYear(yearIndex: number) {
                    const schedule = [
                        385000000,
                        346500000,
                        308000000,
                        269500000,
                        231000000,
                        192500000
                    ]
                    if (yearIndex < schedule.length) {
                        return web3.utils.toBN(schedule[yearIndex]).mul(ten18);
                    } else {
                        let bounty = web3.utils.toBN(schedule[schedule.length - 1]).mul(ten18);
                        for (let i = 0; i < Math.floor((yearIndex - schedule.length) / 3) + 1; ++i) {
                            bounty = bounty.divn(2);
                        }
                        return bounty;
                    }
                }

                const year = Math.floor((timestamp - networkLaunchTimestamp) / yearLength);
                const yearEnd = networkLaunchTimestamp + (year + 1) * yearLength;
                const rewardsAmount = Math.floor((yearEnd - timestamp) / rewardPeriod) + 1;

                return getBountyForYear(year).divn(nodesAmount).divn(rewardsAmount);
            }

            async function calculateBounty(timestamp: number, nodesAmount: number, nodeId: number, metrics: {downtime: number, latency: number}) {
                let bounty = await getMaximumBountyAmount(timestamp, nodesAmount);
                if (!await bountyContract.bountyReduction()) {
                    return bounty;
                }
                const checkTime = (await constantsHolder.checkTime()).toNumber();
                const rewardPeriod = (await constantsHolder.rewardPeriod()).toNumber();
                const deltaPeriod = (await constantsHolder.deltaPeriod()).toNumber();
                const bountyDeadlineTimestamp = (await nodesContract.getNodeLastRewardDate(nodeId)).toNumber() + rewardPeriod + deltaPeriod;
                let downtime = checkTime * metrics.downtime;
                if (timestamp > bountyDeadlineTimestamp) {
                    downtime += timestamp - bountyDeadlineTimestamp;
                }
                const downtimeThreshold = Math.floor((rewardPeriod - deltaPeriod) / 30 / checkTime) * checkTime;
                const latencyThreshold = (await constantsHolder.allowableLatency()).toNumber();

                if (downtime > downtimeThreshold) {
                    const penalty = bounty
                        .muln(Math.floor(downtime / checkTime))
                        .divn(Math.floor((rewardPeriod - deltaPeriod) / checkTime));

                    bounty = bounty.sub(penalty);
                }

                if (metrics.latency > latencyThreshold) {
                    bounty = bounty.muln(latencyThreshold).divn(metrics.latency);
                }

                return bounty;
            }

            it("should fail to create schain if validator doesn't meet MSR", async () => {
                await constantsHolder.setMSR(delegatedAmount + 1);

                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x1122334455667788990011223344556677889900112233445566778899001122",
                     "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                    "d2", // name
                    {from: nodeAddress}).should.be.eventually.rejectedWith("Validator must meet the Minimum Staking Requirement");
            });

            // it("should fail to send monitor verdict from not node owner", async () => {
            //     await skaleManager.sendVerdict(0, verdict, {from: hacker})
            //         .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            // });

            // it("should fail to send monitor verdict if send it too early", async () => {
            //     await skaleManager.sendVerdict(0, verdict, {from: nodeAddress});
            //     const lengthOfMetrics = await monitors.getLengthOfMetrics(web3.utils.soliditySha3(1), {from: owner});
            //     lengthOfMetrics.toNumber().should.be.equal(0);
            // });

            // it("should fail to send monitor verdict if sender node does not exist", async () => {
            //     await skaleManager.sendVerdict(18, verdict, {from: nodeAddress})
            //         .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            // });

            // it("should send monitor verdict", async () => {
            //     skipTime(web3, 3400);
            //     await skaleManager.sendVerdict(0, verdict, {from: nodeAddress});

            //     await monitors.verdicts(web3.utils.soliditySha3(1), 0, 0)
            //         .should.be.eventually.deep.equal(web3.utils.toBN(0));
            //     await monitors.verdicts(web3.utils.soliditySha3(1), 0, 1)
            //         .should.be.eventually.deep.equal(web3.utils.toBN(50));
            // });

            // it("should send monitor verdicts", async () => {
            //     skipTime(web3, 3400);
            //     const arr = [
            //         {
            //             toNodeIndex: 1,
            //             downtime: 0,
            //             latency: 50
            //         },
            //         {
            //             toNodeIndex: 2,
            //             downtime: 0,
            //             latency: 50
            //         },
            //     ]
            //     const txSendVerdict = await skaleManager.sendVerdicts(0, arr, {from: nodeAddress});

            //     let blocks = await monitors.getLastReceivedVerdictBlock(1);
            //     txSendVerdict.receipt.blockNumber.should.be.equal(blocks.toNumber());

            //     blocks = await monitors.getLastReceivedVerdictBlock(2);
            //     txSendVerdict.receipt.blockNumber.should.be.equal(blocks.toNumber());

            //     await monitors.verdicts(web3.utils.soliditySha3(1), 0, 0)
            //         .should.be.eventually.deep.equal(web3.utils.toBN(0));
            //     await monitors.verdicts(web3.utils.soliditySha3(1), 0, 1)
            //         .should.be.eventually.deep.equal(web3.utils.toBN(50));
            //     await monitors.verdicts(web3.utils.soliditySha3(2), 0, 0)
            //         .should.be.eventually.deep.equal(web3.utils.toBN(0));
            //     await monitors.verdicts(web3.utils.soliditySha3(2), 0, 1)
            //         .should.be.eventually.deep.equal(web3.utils.toBN(50));
            // });

            // describe("when monitor verdict is received", async () => {
            //     let blockNum: number;
            //     beforeEach(async () => {
            //         skipTime(web3, 3400);
            //         const txSendVerdict = await skaleManager.sendVerdict(0, verdict, {from: nodeAddress});
            //         blockNum = txSendVerdict.receipt.blockNumber;
            //     });

            //     it("should store verdict block", async () => {
            //         const blocks = await monitors.getLastReceivedVerdictBlock(1);
            //         blockNum.should.be.equal(blocks.toNumber());
            //     })

            //     it("should fail to get bounty if sender is not owner of the node", async () => {
            //         await skaleManager.getBounty(1, {from: hacker})
            //             .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            //     });

            //     it("should estimate bounty", async () => {
            //         const estimatedBounty = web3.utils.toBN(await bountyContract.calculateNormalBounty(0));
            //         const bounty = await getMaximumBountyAmount(await currentTime(web3), 18);
            //         estimatedBounty.toString(10).should.be.equal(bounty.toString(10));
            //     });

            //     it("should get bounty", async () => {
            //         skipTime(web3, 200);
            //         const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});
            //         const blocks = await monitors.getLastBountyBlock(1);
            //         txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //         const estimatedBounty = await calculateBounty(
            //             (await web3.eth.getBlock(txGetBounty.receipt.blockNumber)).timestamp,
            //             18,
            //             0,
            //             verdict
            //         );

            //         skipTime(web3, month); // can withdraw bounty only next month
            //         skipTime(web3, 3 * month); // bounty is locked for 3 months after network launch

            //         await distributor.withdrawBounty(validatorId, validator, {from: validator});
            //         await distributor.withdrawFee(validator, {from: validator});

            //         const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         const bountyPaid = balanceAfter.sub(balanceBefore);
            //         bountyPaid.toString(16).should.be.equal(estimatedBounty.toString(16));
            //     });
            // });

            // describe("when monitor verdict with downtime is received", async () => {
            //     let blockNum: number;
            //     const verdictWithDowntime = {
            //         toNodeIndex: 1,
            //         downtime: 1,
            //         latency: 50,
            //     };
            //     beforeEach(async () => {
            //         skipTime(web3, 3400);
            //         const txSendVerdict = await skaleManager.sendVerdict(0, verdictWithDowntime, {from: nodeAddress});
            //         blockNum = txSendVerdict.receipt.blockNumber;
            //     });

            //     it("should store verdict block", async () => {
            //         const blocks = await monitors.getLastReceivedVerdictBlock(1);
            //         blockNum.should.be.equal(blocks.toNumber());
            //     });

            //     it("should fail to get bounty if sender is not owner of the node", async () => {
            //         await skaleManager.getBounty(1, {from: hacker})
            //             .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            //     });

            //     it("should get bounty", async () => {
            //         skipTime(web3, 200);
            //         const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

            //         const blocks = await monitors.getLastBountyBlock(1);
            //         txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //         const estimatedBounty = await calculateBounty(
            //             (await web3.eth.getBlock(txGetBounty.receipt.blockNumber)).timestamp,
            //             18,
            //             0,
            //             verdictWithDowntime
            //         );

            //         skipTime(web3, month); // can withdraw bounty only next month
            //         skipTime(web3, 3 * month); // bounty is locked for 3 months after network launch

            //         await distributor.withdrawBounty(validatorId, validator, {from: validator});
            //         await distributor.withdrawFee(validator, {from: validator});

            //         const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         balanceAfter.sub(balanceBefore).toString(10).should.be.equal(estimatedBounty.toString(10));
            //     });

            //     it("should get bounty after break", async () => {
            //         skipTime(web3, 500);
            //         const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

            //         const blocks = await monitors.getLastBountyBlock(1);
            //         txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //         const estimatedBounty = await calculateBounty(
            //             (await web3.eth.getBlock(txGetBounty.receipt.blockNumber)).timestamp,
            //             18,
            //             0,
            //             verdictWithDowntime
            //         );

            //         skipTime(web3, month); // can withdraw bounty only next month
            //         skipTime(web3, 3 * month); // bounty is locked for 3 months after network launch

            //         await distributor.withdrawBounty(validatorId, validator, {from: validator});
            //         await distributor.withdrawFee(validator, {from: validator});

            //         const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         balanceAfter.sub(balanceBefore).toString(16).should.be.equal(estimatedBounty.toString(16));
            //     });

            //     it("should get bounty after big break", async () => {
            //         skipTime(web3, 800);
            //         const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

            //         const blocks = await monitors.getLastBountyBlock(1);
            //         txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //         const estimatedBounty = await calculateBounty(
            //             (await web3.eth.getBlock(txGetBounty.receipt.blockNumber)).timestamp,
            //             18,
            //             0,
            //             verdictWithDowntime
            //         );

            //         skipTime(web3, month); // can withdraw bounty only next month
            //         skipTime(web3, 3 * month); // bounty is locked for 3 months after network launch

            //         await distributor.withdrawBounty(validatorId, validator, {from: validator});
            //         await distributor.withdrawFee(validator, {from: validator});

            //         const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         balanceAfter.sub(balanceBefore).toString(10).should.be.equal(estimatedBounty.toString(10));
            //     });
            // });

            // describe("when monitor verdict with latency is received", async () => {
            //     let blockNum: number;
            //     const verdictWithLatency = {
            //         toNodeIndex: 1,
            //         downtime: 0,
            //         latency: 200000,
            //     };
            //     beforeEach(async () => {
            //         skipTime(web3, 3400);
            //         const txSendverdict = await skaleManager.sendVerdict(0, verdictWithLatency, {from: nodeAddress});
            //         blockNum = txSendverdict.receipt.blockNumber;
            //     });

            //     it("should store verdict block", async () => {
            //         const blocks = await monitors.getLastReceivedVerdictBlock(1);
            //         blockNum.should.be.equal(blocks.toNumber());
            //     });

            //     it("should fail to get bounty if sender is not owner of the node", async () => {
            //         await skaleManager.getBounty(1, {from: hacker})
            //             .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            //     });

            //     it("should get bounty", async () => {
            //         skipTime(web3, 200);
            //         const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

            //         const blocks = await monitors.getLastBountyBlock(1);
            //         txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //         const estimatedBounty = await calculateBounty(
            //             (await web3.eth.getBlock(txGetBounty.receipt.blockNumber)).timestamp,
            //             18,
            //             0,
            //             verdictWithLatency
            //         );

            //         skipTime(web3, month); // can withdraw bounty only next month
            //         skipTime(web3, 3 * month); // bounty is locked for 3 months after network launch

            //         await distributor.withdrawBounty(validatorId, validator, {from: validator});
            //         await distributor.withdrawFee(validator, {from: validator});

            //         const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         balanceAfter.sub(balanceBefore).toString(10).should.be.equal(estimatedBounty.toString(10));
            //     });

            //     it("should get bounty after break", async () => {
            //         skipTime(web3, 500);
            //         const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

            //         const blocks = await monitors.getLastBountyBlock(1);
            //         txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //         const estimatedBounty = await calculateBounty(
            //             (await web3.eth.getBlock(txGetBounty.receipt.blockNumber)).timestamp,
            //             18,
            //             0,
            //             verdictWithLatency
            //         );

            //         skipTime(web3, month); // can withdraw bounty only next month
            //         skipTime(web3, 3 * month); // bounty is locked for 3 months after network launch

            //         await distributor.withdrawBounty(validatorId, validator, {from: validator});
            //         await distributor.withdrawFee(validator, {from: validator});

            //         const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         balanceAfter.sub(balanceBefore).toString(10).should.be.equal(estimatedBounty.toString(10));
            //     });

            //     it("should get bounty after big break", async () => {
            //         skipTime(web3, 800);
            //         const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

            //         const blocks = await monitors.getLastBountyBlock(1);
            //         txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());
            //         const estimatedBounty = await calculateBounty(
            //             (await web3.eth.getBlock(txGetBounty.receipt.blockNumber)).timestamp,
            //             18,
            //             0,
            //             verdictWithLatency
            //         );

            //         skipTime(web3, month); // can withdraw bounty only next month
            //         skipTime(web3, 3 * month); // bounty is locked for 3 months after network launch

            //         await distributor.withdrawBounty(validatorId, validator, {from: validator});
            //         await distributor.withdrawFee(validator, {from: validator});

            //         const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

            //         balanceAfter.sub(balanceBefore).toString(10).should.be.equal(estimatedBounty.toString(10));
            //     });
            // });

            describe("when developer has SKALE tokens", async () => {
                beforeEach(async () => {
                    skaleToken.transfer(developer, "0x3635c9adc5dea00000", {from: owner});
                });

                it("should create schain", async () => {
                    await skaleToken.send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            5, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        {from: developer});

                    const schain = await schainsInternal.schains(web3.utils.soliditySha3("d2"));
                    schain[0].should.be.equal("d2");
                });

                it("should not create schain if schain admin set too low schain lifetime", async () => {
                    const SECONDS_TO_YEAR = 31622400;
                    constantsHolder.setMinimalSchainLifetime(SECONDS_TO_YEAR);
                    await skaleToken.send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            0, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        {from: developer})
                        .should.be.eventually.rejectedWith("Minimal schain lifetime should be satisfied");

                    constantsHolder.setMinimalSchainLifetime(4);
                    await skaleToken.send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            5, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        {from: developer});

                    const schain = await schainsInternal.schains(web3.utils.soliditySha3("d2"));
                    schain[0].should.be.equal("d2");
                });


                it("should not allow to create schain if certain date has not reached", async () => {
                    const unreacheableDate = new BigNumber(Math.pow(2,256)-1);
                    await constantsHolder.setSchainCreationTimeStamp(unreacheableDate);
                    await skaleToken.send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            4, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        {from: developer})
                        .should.be.eventually.rejectedWith("It is not a time for creating Schain");
                });

                describe("when schain is created", async () => {
                    beforeEach(async () => {
                        await skaleToken.send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                                5, // lifetime
                                3, // type of schain
                                0, // nonce
                                "d2"]), // name
                            {from: developer});
                        await skaleDKG.setSuccesfulDKGPublic(
                            web3.utils.soliditySha3("d2"),
                        );
                    });

                    it("should fail to delete schain if sender is not owner of it", async () => {
                        await skaleManager.deleteSchain("d2", {from: hacker})
                            .should.be.eventually.rejectedWith("Message sender is not the owner of the Schain");
                    });

                    it("should delete schain", async () => {
                        await skaleManager.deleteSchain("d2", {from: developer});

                        await schainsInternal.getSchains().should.be.eventually.empty;
                    });

                    it("should delete schain after deleting node", async () => {
                        const nodes = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));
                        await skaleManager.nodeExit(nodes[0], {from: nodeAddress});
                        await skaleDKG.setSuccesfulDKGPublic(
                            web3.utils.soliditySha3("d2"),
                        );
                        await skaleManager.deleteSchain("d2", {from: developer});
                    });
                });

                describe("when another schain is created", async () => {
                    beforeEach(async () => {
                        await skaleToken.send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                                5, // lifetime
                                3, // type of schain
                                0, // nonce
                                "d3"]), // name
                            {from: developer});
                    });

                    it("should fail to delete schain if sender is not owner of it", async () => {
                        await skaleManager.deleteSchain("d3", {from: hacker})
                            .should.be.eventually.rejectedWith("Message sender is not the owner of the Schain");
                    });

                    it("should delete schain by root", async () => {
                        await skaleManager.deleteSchainByRoot("d3", {from: owner});

                        await schainsInternal.getSchains().should.be.eventually.empty;
                    });
                });
            });
        });

        describe("when 32 nodes are in the system", async () => {
            beforeEach(async () => {
                await constantsHolder.setMSR(3);

                for (let i = 0; i < 32; ++i) {
                    await skaleManager.createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x1122334455667788990011223344556677889900112233445566778899001122",
                         "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                        "d2-" + i, // name
                        {from: nodeAddress});
                }
            });

            describe("when developer has SKALE tokens", async () => {
                beforeEach(async () => {
                    await skaleToken.transfer(developer, "0x3635C9ADC5DEA000000", {from: owner});
                });

                it("should create 2 medium schains", async () => {
                    await skaleToken.send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            5, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        {from: developer});

                    const schain1 = await schainsInternal.schains(web3.utils.soliditySha3("d2"));
                    schain1[0].should.be.equal("d2");

                    await skaleToken.send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            5, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d3"]), // name
                        {from: developer});

                    const schain2 = await schainsInternal.schains(web3.utils.soliditySha3("d3"));
                    schain2[0].should.be.equal("d3");
                });

                describe("when schains are created", async () => {
                    beforeEach(async () => {
                        await skaleToken.send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                                5, // lifetime
                                3, // type of schain
                                0, // nonce
                                "d2"]), // name
                            {from: developer});

                        await skaleToken.send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                                5, // lifetime
                                3, // type of schain
                                0, // nonce
                                "d3"]), // name
                            {from: developer});
                    });

                    it("should delete first schain", async () => {
                        await skaleManager.deleteSchain("d2", {from: developer});

                        await schainsInternal.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(1));
                    });

                    it("should delete second schain", async () => {
                        await skaleManager.deleteSchain("d3", {from: developer});

                        await schainsInternal.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(1));
                    });
                });
            });
        });
        describe("when 16 nodes are in the system", async () => {

            it("should create 16 nodes & create & delete all types of schain", async () => {

                await skaleToken.transfer(validator, "0x32D26D12E980B600000", {from: owner});

                for (let i = 0; i < 16; ++i) {
                    await skaleManager.createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x1122334455667788990011223344556677889900112233445566778899001122",
                         "0x1122334455667788990011223344556677889900112233445566778899001122"], // public key
                        "d2-" + i, // name
                        {from: nodeAddress});
                    }

                await skaleToken.transfer(developer, "0x3635C9ADC5DEA000000", {from: owner});

                let price = web3.utils.toBN(await schains.getSchainPrice(1, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        1, // type of schain
                        0, // nonce
                        "d2"]), // name
                    {from: developer});

                let schain1 = await schainsInternal.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsInternal.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
                price = web3.utils.toBN(await schains.getSchainPrice(2, 5));

                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        2, // type of schain
                        0, // nonce
                        "d3"]), // name
                    {from: developer});

                schain1 = await schainsInternal.schains(web3.utils.soliditySha3("d3"));
                schain1[0].should.be.equal("d3");

                await skaleManager.deleteSchain("d3", {from: developer});

                await schainsInternal.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
                price = web3.utils.toBN(await schains.getSchainPrice(3, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        3, // type of schain
                        0, // nonce
                        "d4"]), // name
                    {from: developer});

                schain1 = await schainsInternal.schains(web3.utils.soliditySha3("d4"));
                schain1[0].should.be.equal("d4");

                await skaleManager.deleteSchain("d4", {from: developer});

                await schainsInternal.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
                price = web3.utils.toBN(await schains.getSchainPrice(4, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        4, // type of schain
                        0, // nonce
                        "d5"]), // name
                    {from: developer});

                schain1 = await schainsInternal.schains(web3.utils.soliditySha3("d5"));
                schain1[0].should.be.equal("d5");

                await skaleManager.deleteSchain("d5", {from: developer});

                await schainsInternal.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
                price = web3.utils.toBN(await schains.getSchainPrice(5, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        5, // type of schain
                        0, // nonce
                        "d6"]), // name
                    {from: developer});

                schain1 = await schainsInternal.schains(web3.utils.soliditySha3("d6"));
                schain1[0].should.be.equal("d6");

                await skaleManager.deleteSchain("d6", {from: developer});

                await schainsInternal.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
            });
        });
    });
});
