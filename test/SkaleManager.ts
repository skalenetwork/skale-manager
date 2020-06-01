import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ConstantsHolderInstance,
         ContractManagerInstance,
         DelegationControllerInstance,
         DistributorInstance,
         MonitorsDataInstance,
         NodesInstance,
         SchainsDataInstance,
         SchainsFunctionalityInstance,
         SkaleManagerInstance,
         SkaleTokenInstance,
         ValidatorServiceInstance} from "../types/truffle-contracts";

import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployDistributor } from "./tools/deploy/delegation/distributor";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployMonitorsData } from "./tools/deploy/monitorsData";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsData } from "./tools/deploy/schainsData";
import { deploySchainsFunctionality } from "./tools/deploy/schainsFunctionality";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { skipTime } from "./tools/time";

chai.should();
chai.use(chaiAsPromised);

contract("SkaleManager", ([owner, validator, developer, hacker, nodeAddress]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let nodesContract: NodesInstance;
    let skaleManager: SkaleManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let monitorsData: MonitorsDataInstance;
    let schainsData: SchainsDataInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let validatorService: ValidatorServiceInstance;
    let delegationController: DelegationControllerInstance;
    let distributor: DistributorInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        nodesContract = await deployNodes(contractManager);
        monitorsData = await deployMonitorsData(contractManager);
        schainsData = await deploySchainsData(contractManager);
        schainsFunctionality = await deploySchainsFunctionality(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);
        distributor = await deployDistributor(contractManager);

        const prefix = "0x000000000000000000000000";
        const premined = "100000000000000000000000000";
        await skaleToken.mint(skaleManager.address, premined, "0x", "0x");
        await skaleToken.mint(owner, premined, "0x", "0x");
        await constantsHolder.setMSR(5);
        await constantsHolder.setLaunchTimestamp(0); // to allow bounty withdrawing
    });

    it("should fail to process token fallback if sent not from SkaleToken", async () => {
        await skaleManager.tokensReceived(hacker, validator, developer, 5, "0x11", "0x11", {from: validator}).
            should.be.eventually.rejectedWith("Message sender is invalid");
    });

    it("should transfer ownership", async () => {
        await skaleManager.transferOwnership(hacker, {from: hacker})
            .should.be.eventually.rejectedWith("Ownable: caller is not the owner");

        await skaleManager.transferOwnership(hacker, {from: owner});

        await skaleManager.owner().should.be.eventually.equal(hacker);
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
            await monitorsData.isGroupActive(web3.utils.soliditySha3(0)).should.be.eventually.true;
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
                    .should.be.eventually.rejectedWith("Node does not exist for message sender");
            });

            it("should initiate exiting", async () => {
                await skaleManager.nodeExit(0, {from: nodeAddress});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;
            });

            it("should remove the node", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNode(0, {from: nodeAddress});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNodeByRoot(0, {from: owner});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
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
                    .should.be.eventually.rejectedWith("Node does not exist for message sender");
            });

            it("should fail to initiate exiting of second node from another account", async () => {
                await skaleManager.nodeExit(1, {from: hacker})
                    .should.be.eventually.rejectedWith("Node does not exist for message sender");
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

                await skaleManager.deleteNode(0, {from: nodeAddress});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the second node", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNode(1, {from: nodeAddress});

                await nodesContract.isNodeLeft(1).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the first node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNodeByRoot(0, {from: owner});

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the second node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNodeByRoot(1, {from: owner});

                await nodesContract.isNodeLeft(1).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should check several monitoring periods", async () => {
                const verdict1 = {
                    toNodeIndex: 1,
                    downtime: 0,
                    latency: 50
                };
                const verdict2 = {
                    toNodeIndex: 0,
                    downtime: 0,
                    latency: 50
                };
                skipTime(web3, 3400);
                let txSendVerdict1 = await skaleManager.sendVerdict(0, verdict1, {from: nodeAddress});

                let blocks = await monitorsData.getLastReceivedVerdictBlock(1);
                txSendVerdict1.receipt.blockNumber.should.be.equal(blocks.toNumber());

                skipTime(web3, 200);
                let txGetBounty1 = await skaleManager.getBounty(0, {from: nodeAddress});
                let txGetBounty2 = await skaleManager.getBounty(1, {from: nodeAddress});

                blocks = await monitorsData.getLastBountyBlock(0);
                txGetBounty1.receipt.blockNumber.should.be.equal(blocks.toNumber());
                blocks = await monitorsData.getLastBountyBlock(1);
                txGetBounty2.receipt.blockNumber.should.be.equal(blocks.toNumber());

                skipTime(web3, 3400);
                txSendVerdict1 = await skaleManager.sendVerdict(0, verdict1, {from: nodeAddress});
                const txSendVerdict2 = await skaleManager.sendVerdict(1, verdict2, {from: nodeAddress});

                blocks = await monitorsData.getLastReceivedVerdictBlock(1);
                txSendVerdict1.receipt.blockNumber.should.be.equal(blocks.toNumber());
                blocks = await monitorsData.getLastReceivedVerdictBlock(0);
                txSendVerdict2.receipt.blockNumber.should.be.equal(blocks.toNumber());

                skipTime(web3, 200);
                txGetBounty1 = await skaleManager.getBounty(0, {from: nodeAddress});
                txGetBounty2 = await skaleManager.getBounty(1, {from: nodeAddress});

                blocks = await monitorsData.getLastBountyBlock(0);
                txGetBounty1.receipt.blockNumber.should.be.equal(blocks.toNumber());
                blocks = await monitorsData.getLastBountyBlock(1);
                txGetBounty2.receipt.blockNumber.should.be.equal(blocks.toNumber());
            });
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

            it("should fail to send monitor verdict from not node owner", async () => {
                await skaleManager.sendVerdict(0, verdict, {from: hacker})
                    .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            });

            it("should fail to send monitor verdict if send it too early", async () => {
                await skaleManager.sendVerdict(0, verdict, {from: nodeAddress});
                const lengthOfMetrics = await monitorsData.getLengthOfMetrics(web3.utils.soliditySha3(1), {from: owner});
                lengthOfMetrics.toNumber().should.be.equal(0);
            });

            it("should fail to send monitor verdict if sender node does not exist", async () => {
                await skaleManager.sendVerdict(18, verdict, {from: nodeAddress})
                    .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            });

            it("should send monitor verdict", async () => {
                skipTime(web3, 3400);
                await skaleManager.sendVerdict(0, verdict, {from: nodeAddress});

                await monitorsData.verdicts(web3.utils.soliditySha3(1), 0, 0)
                    .should.be.eventually.deep.equal(web3.utils.toBN(0));
                await monitorsData.verdicts(web3.utils.soliditySha3(1), 0, 1)
                    .should.be.eventually.deep.equal(web3.utils.toBN(50));
            });

            it("should send monitor verdicts", async () => {
                skipTime(web3, 3400);
                const arr = [
                    {
                        toNodeIndex: 1,
                        downtime: 0,
                        latency: 50
                    },
                    {
                        toNodeIndex: 2,
                        downtime: 0,
                        latency: 50
                    },
                ]
                const txSendVerdict = await skaleManager.sendVerdicts(0, arr, {from: nodeAddress});

                let blocks = await monitorsData.getLastReceivedVerdictBlock(1);
                txSendVerdict.receipt.blockNumber.should.be.equal(blocks.toNumber());

                blocks = await monitorsData.getLastReceivedVerdictBlock(2);
                txSendVerdict.receipt.blockNumber.should.be.equal(blocks.toNumber());

                await monitorsData.verdicts(web3.utils.soliditySha3(1), 0, 0)
                    .should.be.eventually.deep.equal(web3.utils.toBN(0));
                await monitorsData.verdicts(web3.utils.soliditySha3(1), 0, 1)
                    .should.be.eventually.deep.equal(web3.utils.toBN(50));
                await monitorsData.verdicts(web3.utils.soliditySha3(2), 0, 0)
                    .should.be.eventually.deep.equal(web3.utils.toBN(0));
                await monitorsData.verdicts(web3.utils.soliditySha3(2), 0, 1)
                    .should.be.eventually.deep.equal(web3.utils.toBN(50));
            });

            describe("when monitor verdict is received", async () => {
                let blockNum: number;
                beforeEach(async () => {
                    skipTime(web3, 3400);
                    const txSendVerdict = await skaleManager.sendVerdict(0, verdict, {from: nodeAddress});
                    blockNum = txSendVerdict.receipt.blockNumber;
                });

                it("should store verdict block", async () => {
                    const blocks = await monitorsData.getLastReceivedVerdictBlock(1);
                    blockNum.should.be.equal(blocks.toNumber());
                })

                it("should fail to get bounty if sender is not owner of the node", async () => {
                    await skaleManager.getBounty(1, {from: hacker})
                        .should.be.eventually.rejectedWith("Node does not exist for Message sender");
                });

                it("should get bounty", async () => {
                    skipTime(web3, 200);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    // const bounty = web3.utils.toBN("893061271147690900777");
                    const bounty = web3.utils.toBN("1250285779606767261088");

                    const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

                    const blocks = await monitorsData.getLastBountyBlock(1);
                    txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());

                    skipTime(web3, month); // can withdraw bounty only next month

                    await distributor.withdrawBounty(validatorId, validator, {from: validator});
                    await distributor.withdrawFee(validator, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });
            });

            describe("when monitor verdict with downtime is received", async () => {
                let blockNum: number;
                beforeEach(async () => {
                    skipTime(web3, 3400);
                    const verdictWithDowntime = {
                        toNodeIndex: 1,
                        downtime: 1,
                        latency: 50,
                    };
                    const txSendVerdict = await skaleManager.sendVerdict(0, verdictWithDowntime, {from: nodeAddress});
                    blockNum = txSendVerdict.receipt.blockNumber;
                });

                it("should store verdict block", async () => {
                    const blocks = await monitorsData.getLastReceivedVerdictBlock(1);
                    blockNum.should.be.equal(blocks.toNumber());
                });

                it("should fail to get bounty if sender is not owner of the node", async () => {
                    await skaleManager.getBounty(1, {from: hacker})
                        .should.be.eventually.rejectedWith("Node does not exist for Message sender");
                });

                it("should get bounty", async () => {
                    skipTime(web3, 200);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    // const bounty = web3.utils.toBN("893019925718471100273");

                    const bounty = web3.utils.toBN("1250227896005859540382");

                    const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

                    const blocks = await monitorsData.getLastBountyBlock(1);
                    txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());

                    skipTime(web3, month); // can withdraw bounty only next month

                    await distributor.withdrawBounty(validatorId, validator, {from: validator});
                    await distributor.withdrawFee(validator, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });

                it("should get bounty after break", async () => {
                    skipTime(web3, 500);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    // const bounty = web3.utils.toBN("893019925718471100273");
                    const bounty = web3.utils.toBN("1250227896005859540382");

                    const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

                    const blocks = await monitorsData.getLastBountyBlock(1);
                    txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());

                    skipTime(web3, month); // can withdraw bounty only next month

                    await distributor.withdrawBounty(validatorId, validator, {from: validator});
                    await distributor.withdrawFee(validator, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).toString(10)).to.be.equal(bounty.toString(10));
                });

                it("should get bounty after big break", async () => {
                    skipTime(web3, 800);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    const bounty = web3.utils.toBN("1250112128804044098969");

                    const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

                    const blocks = await monitorsData.getLastBountyBlock(1);
                    txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());

                    skipTime(web3, month); // can withdraw bounty only next month

                    await distributor.withdrawBounty(validatorId, validator, {from: validator});
                    await distributor.withdrawFee(validator, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });
            });

            describe("when monitor verdict with latency is received", async () => {
                let blockNum: number;
                beforeEach(async () => {
                    skipTime(web3, 3400);
                    const verdictWithLatency = {
                        toNodeIndex: 1,
                        downtime: 0,
                        latency: 20000,
                    };
                    const txSendverdict = await skaleManager.sendVerdict(0, verdictWithLatency, {from: nodeAddress});
                    blockNum = txSendverdict.receipt.blockNumber;
                });

                it("should store verdict block", async () => {
                    const blocks = await monitorsData.getLastReceivedVerdictBlock(1);
                    blockNum.should.be.equal(blocks.toNumber());
                });

                it("should fail to get bounty if sender is not owner of the node", async () => {
                    await skaleManager.getBounty(1, {from: hacker})
                        .should.be.eventually.rejectedWith("Node does not exist for Message sender");
                });

                it("should get bounty", async () => {
                    skipTime(web3, 200);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    const bounty = web3.utils.toBN("1250285779606767261088");

                    const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

                    const blocks = await monitorsData.getLastBountyBlock(1);
                    txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());

                    skipTime(web3, month); // can withdraw bounty only next month

                    await distributor.withdrawBounty(validatorId, validator, {from: validator});
                    await distributor.withdrawFee(validator, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });

                it("should get bounty after break", async () => {
                    skipTime(web3, 500);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    const bounty = web3.utils.toBN("1250285779606767261088");

                    const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

                    const blocks = await monitorsData.getLastBountyBlock(1);
                    txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());

                    skipTime(web3, month); // can withdraw bounty only next month

                    await distributor.withdrawBounty(validatorId, validator, {from: validator});
                    await distributor.withdrawFee(validator, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).toString(10)).to.be.equal(bounty.toString(10));
                });

                it("should get bounty after big break", async () => {
                    skipTime(web3, 800);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    const bounty = web3.utils.toBN("1250170012404951819675");

                    const txGetBounty = await skaleManager.getBounty(1, {from: nodeAddress});

                    const blocks = await monitorsData.getLastBountyBlock(1);
                    txGetBounty.receipt.blockNumber.should.be.equal(blocks.toNumber());

                    skipTime(web3, month); // can withdraw bounty only next month

                    await distributor.withdrawBounty(validatorId, validator, {from: validator});
                    await distributor.withdrawFee(validator, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });
            });

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

                    const schain = await schainsData.schains(web3.utils.soliditySha3("d2"));
                    schain[0].should.be.equal("d2");
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
                    });

                    it("should fail to delete schain if sender is not owner of it", async () => {
                        await skaleManager.deleteSchain("d2", {from: hacker})
                            .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
                    });

                    it("should delete schain", async () => {
                        await skaleManager.deleteSchain("d2", {from: developer});

                        await schainsData.getSchains().should.be.eventually.empty;
                    });

                    it("should delete schain after deleting node", async () => {
                        const nodes = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));
                        await skaleManager.deleteNode(nodes[0], {from: nodeAddress});
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
                            .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
                    });

                    it("should delete schain by root", async () => {
                        await skaleManager.deleteSchainByRoot("d3", {from: owner});

                        await schainsData.getSchains().should.be.eventually.empty;
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

                    const schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
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

                    const schain2 = await schainsData.schains(web3.utils.soliditySha3("d3"));
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

                        await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(1));
                    });

                    it("should delete second schain", async () => {
                        await skaleManager.deleteSchain("d3", {from: developer});

                        await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(1));
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

                let price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(1, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        1, // type of schain
                        0, // nonce
                        "d2"]), // name
                    {from: developer});

                let schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
                price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(2, 5));

                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        2, // type of schain
                        0, // nonce
                        "d2"]), // name
                    {from: developer});

                schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
                price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(3, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        3, // type of schain
                        0, // nonce
                        "d2"]), // name
                    {from: developer});

                schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
                price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(4, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        4, // type of schain
                        0, // nonce
                        "d2"]), // name
                    {from: developer});

                schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
                price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(5, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        5, // type of schain
                        0, // nonce
                        "d2"]), // name
                    {from: developer});

                schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
            });
        });
    });
});
