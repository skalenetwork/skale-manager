import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
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
         BountyV2Instance} from "../types/truffle-contracts";

// import BigNumber from "bignumber.js";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

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
import { deployTimeHelpers } from "./tools/deploy/delegation/timeHelpers";

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
    let bountyContract: BountyV2Instance;

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
        await skaleToken.mint(owner, premined, "0x", "0x");
        await constantsHolder.setMSR(5);
        await constantsHolder.setLaunchTimestamp(await currentTime(web3)); // to allow bounty withdrawing
        await bountyContract.enableBountyReduction();
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
        const day = 60 * 60 * 24;
        const month = 31 * day;
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
            const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
            await skaleManager.createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                "d2", // name
                {from: nodeAddress});

            await nodesContract.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
            (await nodesContract.getNodePort(0)).toNumber().should.be.equal(8545);
        });

        it("should not allow to create node if validator became untrusted", async () => {
            skipTime(web3, 2592000);
            await constantsHolder.setMSR(100);

            await validatorService.disableValidator(validatorId, {from: owner});
            const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
            await skaleManager.createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                "d2", // name
                {from: nodeAddress})
                .should.be.eventually.rejectedWith("Validator is not authorized to create a node");
            await validatorService.enableValidator(validatorId, {from: owner});
            await skaleManager.createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                "d2", // name
                {from: nodeAddress});
        });

        describe("when node is created", async () => {

            beforeEach(async () => {
                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "d2", // name
                    {from: nodeAddress});
            });

            it("should fail to init exiting of someone else's node", async () => {
                await skaleManager.nodeExit(0, {from: hacker})
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
            });

            it("should reject if node in maintenance call nodeExit", async () => {
                await nodesContract.setNodeInMaintenance(0);
                await skaleManager.nodeExit(0, {from: nodeAddress})
                    .should.be.eventually.rejectedWith("Node should be Leaving");
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

            // TODO: IMPORTANT! Enable after the formula update
            // it("should pay bounty according to the schedule", async () => {
            //     const timeHelpers = await deployTimeHelpers(contractManager);

            //     await bountyContract.disableBountyReduction();

            //     const timelimit = 300 * 1000;
            //     const start = Date.now();
            //     const launch = (await constantsHolder.launchTimestamp()).toNumber();
            //     const launchMonth = (await timeHelpers.timestampToMonth(launch)).toNumber();
            //     const ten18 = web3.utils.toBN(10).pow(web3.utils.toBN(18));

            //     const schedule = [
            //         385000000,
            //         346500000,
            //         308000000,
            //         269500000,
            //         231000000,
            //         192500000
            //     ]
            //     for (let bounty = schedule[schedule.length - 1] / 2; bounty > 1; bounty /= 2) {
            //         for (let i = 0; i < 3; ++i) {
            //             schedule.push(bounty);
            //         }
            //     }

            //     let mustBePaid = web3.utils.toBN(0);
            //     skipTime(web3, month);
            //     for (let year = 0; year < schedule.length && (Date.now() - start) < 0.9 * timelimit; ++year) {
            //         for (let monthIndex = 0; monthIndex < 12; ++monthIndex) {
            //             const monthEnd = (await timeHelpers.monthToTimestamp(launchMonth + 12 * year + monthIndex + 1)).toNumber();
            //             if (await currentTime(web3) < monthEnd) {
            //                 skipTime(web3, monthEnd - await currentTime(web3) - day);
            //                 await skaleManager.getBounty(0, {from: nodeAddress});
            //             }
            //         }
            //         const bountyWasPaid = web3.utils.toBN(await skaleToken.balanceOf(distributor.address));
            //         mustBePaid = mustBePaid.add(web3.utils.toBN(Math.floor(schedule[year])));

            //         bountyWasPaid.div(ten18).sub(mustBePaid).abs().toNumber().should.be.lessThan(35); // 35 because of rounding errors in JS
            //     }
            // });
        });

        describe("when two nodes are created", async () => {

            beforeEach(async () => {
                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "d2", // name
                    {from: nodeAddress});
                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000002", // ip
                    "0x7f000002", // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "d3", // name
                    {from: nodeAddress});
            });

            it("should fail to initiate exiting of first node from another account", async () => {
                await skaleManager.nodeExit(0, {from: hacker})
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
            });

            it("should fail to initiate exiting of second node from another account", async () => {
                await skaleManager.nodeExit(1, {from: hacker})
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
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
        });

        describe("when 18 nodes are in the system", async () => {

            const verdict = {
                toNodeIndex: 1,
                downtime: 0,
                latency: 50
            };

            beforeEach(async () => {
                await skaleToken.transfer(validator, "0x3635c9adc5dea00000", {from: owner});
                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                for (let i = 0; i < 18; ++i) {
                    await skaleManager.createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                        "d2-" + i, // name
                        {from: nodeAddress});
                }

            });

            it("should fail to create schain if validator doesn't meet MSR", async () => {
                await constantsHolder.setMSR(delegatedAmount + 1);
                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "d2", // name
                    {from: nodeAddress}).should.be.eventually.rejectedWith("Validator must meet the Minimum Staking Requirement");
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
                        await skaleDKG.setSuccessfulDKGPublic(
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
                        await skaleDKG.setSuccessfulDKGPublic(
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

                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                for (let i = 0; i < 32; ++i) {
                    await skaleManager.createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
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

                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                for (let i = 0; i < 16; ++i) {
                    await skaleManager.createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
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
