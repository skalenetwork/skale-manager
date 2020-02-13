import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         NodesDataInstance,
         NodesFunctionalityInstance,
         SchainsDataInstance,
         SchainsFunctionalityInstance,
         SchainsFunctionalityInternalInstance,
         SkaleManagerInstance,
         ValidatorServiceInstance } from "../types/truffle-contracts";

import BigNumber from "bignumber.js";
import { skipTime } from "./utils/time";

import { deployContractManager } from "./utils/deploy/contractManager";
import { deployValidatorService } from "./utils/deploy/delegation/validatorService";
import { deployNodesData } from "./utils/deploy/nodesData";
import { deployNodesFunctionality } from "./utils/deploy/nodesFunctionality";
import { deploySchainsData } from "./utils/deploy/schainsData";
import { deploySchainsFunctionality } from "./utils/deploy/schainsFunctionality";
import { deploySchainsFunctionalityInternal } from "./utils/deploy/schainsFunctionalityInternal";
import { deploySkaleManager } from "./utils/deploy/skaleManager";

chai.should();
chai.use(chaiAsPromised);

contract("SchainsFunctionality", ([owner, holder, validator]) => {
    let contractManager: ContractManagerInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let schainsFunctionalityInternal: SchainsFunctionalityInternalInstance;
    let schainsData: SchainsDataInstance;
    let nodesData: NodesDataInstance;
    let nodesFunctionality: NodesFunctionalityInstance;
    let validatorService: ValidatorServiceInstance;
    let skaleManager: SkaleManagerInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodesData = await deployNodesData(contractManager);
        nodesFunctionality = await deployNodesFunctionality(contractManager);
        schainsData = await deploySchainsData(contractManager);
        schainsFunctionality = await deploySchainsFunctionality(contractManager);
        schainsFunctionalityInternal = await deploySchainsFunctionalityInternal(contractManager);
        validatorService = await deployValidatorService(contractManager);
        skaleManager = await deploySkaleManager(contractManager);

        validatorService.registerValidator("D2", validator, "D2 is even", 0, 0);
    });

    describe("should add schain", async () => {
        it("should fail when money are not enough", async () => {
            await schainsFunctionality.addSchain(
                holder,
                5,
                "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "01" + "0000" + "d2",
                {from: owner})
                .should.be.eventually.rejectedWith("Not enough money to create Schain");
        });

        it("should fail when schain type is wrong", async () => {
            await schainsFunctionality.addSchain(
                holder,
                5,
                "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "06" + "0000" + "d2",
                {from: owner})
                .should.be.eventually.rejectedWith("Invalid type of Schain");
        });

        it("should fail when data parameter is too short", async () => {
            await schainsFunctionality.addSchain(
                holder,
                5,
                "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "06" + "0000",
                {from: owner}).
                should.be.eventually.rejectedWith("Incorrect bytes data config");
        });

        it("should fail when nodes count is too low", async () => {
            const price = new BigNumber(await schainsFunctionality.getSchainPrice(1, 5));
            await schainsFunctionality.addSchain(
                holder,
                price.toString(),
                "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "01" + "0000" + "d2",
                {from: owner})
                .should.be.eventually.rejectedWith("Not enough nodes to create Schain");
        });

        describe("when 2 nodes are registered (Ivan test)", async () => {
            it("should create 2 nodes, and play with schains", async () => {
                const nodesCount = 2;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodesFunctionality.createNode(validator,
                        "0x00" +
                        "2161" +
                        "0000" +
                        "7f0000" + hexIndex +
                        "7f0000" + hexIndex +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "d2" + hexIndex);
                }

                const deposit = await schainsFunctionality.getSchainPrice(4, 5);

                await schainsFunctionality.addSchain(
                    owner,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "04" +
                    "0000" +
                    "6432",
                    {from: owner});

                await schainsFunctionality.addSchain(
                    owner,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "04" +
                    "0000" +
                    "6433",
                    {from: owner});

                await schainsFunctionality.deleteSchain(
                    owner,
                    "d2",
                    {from: owner});

                await schainsFunctionality.deleteSchain(
                    owner,
                    "d3",
                    {from: owner});

                await nodesFunctionality.removeNodeByRoot(0, {from: owner});
                await nodesFunctionality.removeNodeByRoot(1, {from: owner});

                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("1" + index.toString(16)).slice(-2);
                    await nodesFunctionality.createNode(validator,
                        "0x00" +
                        "2161" +
                        "0000" +
                        "7f0000" + hexIndex +
                        "7f0000" + hexIndex +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "d2" + hexIndex);
                }

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "04" +
                    "0000" +
                    "6434",
                    {from: owner});
            });
        });

        describe("when 4 nodes are registered", async () => {
            beforeEach(async () => {
                const nodesCount = 4;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodesFunctionality.createNode(validator,
                        "0x00" +
                        "2161" +
                        "0000" +
                        "7f0000" + hexIndex +
                        "7f0000" + hexIndex +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "d2" + hexIndex);
                }
            });

            it("should create 4 node schain", async () => {
                const deposit = await schainsFunctionality.getSchainPrice(5, 5);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6432",
                    {from: owner});

                const schains = await schainsData.getSchains();
                schains.length.should.be.equal(1);
                const schainId = schains[0];

                await schainsData.isOwnerAddress(holder, schainId).should.be.eventually.true;
            });

            it("should not create 4 node schain with 1 deleted node", async () => {
                await nodesFunctionality.removeNodeByRoot(1);

                const deposit = await schainsFunctionality.getSchainPrice(5, 5);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6432",
                    {from: owner}).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
            });

            it("should not create 4 node schain on deleted node", async () => {
                let data = await nodesData.getNodesWithFreeSpace(32);
                const removedNode = 1;
                await nodesFunctionality.removeNodeByRoot(removedNode);

                data = await nodesData.getNodesWithFreeSpace(32);

                await nodesFunctionality.createNode(validator,
                        "0x00" +
                        "2161" +
                        "0000" +
                        "7f000028" +
                        "7f000028" +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "d228");

                const deposit = await schainsFunctionality.getSchainPrice(5, 5);

                data = await nodesData.getNodesWithFreeSpace(32);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6432",
                    {from: owner});

                let nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));

                for (const node of nodesInGroup) {
                    expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
                }

                data = await nodesData.getNodesWithFreeSpace(32);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6433",
                    {from: owner});

                nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d3"));

                for (const node of nodesInGroup) {
                    expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
                }

                data = await nodesData.getNodesWithFreeSpace(32);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6434",
                    {from: owner});

                nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d4"));

                for (const node of nodesInGroup) {
                    expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
                }

                data = await nodesData.getNodesWithFreeSpace(32);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6435",
                    {from: owner});

                nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d5"));

                for (const node of nodesInGroup) {
                    expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
                }
            });

            it("should create & delete 4 node schain", async () => {
                const deposit = await schainsFunctionality.getSchainPrice(5, 5);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6432",
                    {from: owner});

                const schains = await schainsData.getSchains();
                schains.length.should.be.equal(1);
                const schainId = schains[0];

                await schainsData.isOwnerAddress(holder, schainId).should.be.eventually.true;

                await schainsFunctionality.deleteSchain(
                    holder,
                    "d2",
                    {from: owner});

                await schainsData.getSchains().should.be.eventually.empty;
            });
        });

        describe("when 20 nodes are registered", async () => {
            beforeEach(async () => {
                const nodesCount = 20;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodesFunctionality.createNode(validator,
                        "0x00" +
                        "2161" +
                        "0000" +
                        "7f0000" + hexIndex +
                        "7f0000" + hexIndex +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "d2" + hexIndex);
                }
            });

            it("should create Medium schain", async () => {
                const deposit = await schainsFunctionality.getSchainPrice(3, 5);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "03" +
                    "0000" +
                    "6432",
                    {from: owner});

                const schains = await schainsData.getSchains();
                schains.length.should.be.equal(1);
            });

            it("should not create another Medium schain", async () => {
                const deposit = await schainsFunctionality.getSchainPrice(3, 5);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "03" +
                    "0000" +
                    "6432",
                    {from: owner});

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "03" +
                    "0000" +
                    "6433",
                    {from: owner},
                ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
            });
        });

        describe("when nodes are registered", async () => {

            beforeEach(async () => {
                const nodesCount = 16;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodesFunctionality.createNode(validator,
                        "0x00" +
                        "2161" +
                        "0000" +
                        "7f0000" + hexIndex +
                        "7f0000" + hexIndex +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "d2" + hexIndex);
                }
            });

            it("successfully", async () => {
                const deposit = await schainsFunctionality.getSchainPrice(1, 5);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "01" +
                    "0000" +
                    "6432",
                    {from: owner});

                const schains = await schainsData.getSchains();
                schains.length.should.be.equal(1);
                const schainId = schains[0];

                await schainsData.isOwnerAddress(holder, schainId).should.be.eventually.true;

                const obtainedSchains = await schainsData.schains(schainId);
                const schainsArray = Array(8);
                for (const index of Array.from(Array(8).keys())) {
                    schainsArray[index] = obtainedSchains[index];
                }

                const [obtainedSchainName,
                       obtainedSchainOwner,
                       obtainedIndexInOwnerList,
                       obtainedPart,
                       obtainedLifetime,
                       obtainedStartDate,
                       obtainedDeposit,
                       obtainedIndex] = schainsArray;

                obtainedSchainName.should.be.equal("d2");
                obtainedSchainOwner.should.be.equal(holder);
                expect(obtainedPart.eq(web3.utils.toBN(1))).be.true;
                expect(obtainedLifetime.eq(web3.utils.toBN(5))).be.true;
                expect(obtainedDeposit.eq(web3.utils.toBN(deposit))).be.true;
            });

            describe("when schain is created", async () => {

                beforeEach(async () => {
                    const deposit = await schainsFunctionality.getSchainPrice(1, 5);
                    await schainsFunctionality.addSchain(
                        holder,
                        deposit,
                        "0x10" +
                        "0000000000000000000000000000000000000000000000000000000000000005" +
                        "01" +
                        "0000" +
                        "4432",
                        {from: owner});
                });

                it("should failed when create another schain with the same name", async () => {
                    const deposit = await schainsFunctionality.getSchainPrice(1, 5);
                    await schainsFunctionality.addSchain(
                        holder,
                        deposit,
                        "0x10" +
                        "0000000000000000000000000000000000000000000000000000000000000005" +
                        "01" +
                        "0000" +
                        "4432",
                        {from: owner})
                        .should.be.eventually.rejectedWith("Schain name is not available");
                });

                it("should be able to delete schain", async () => {
                    await schainsFunctionality.deleteSchain(
                        holder,
                        "D2",
                        {from: owner});
                    await schainsData.getSchains().should.be.eventually.empty;
                });

                it("should fail on deleting schain if owner is wrong", async () => {
                    await schainsFunctionality.deleteSchain(
                        validator,
                        "D2",
                        {from: owner})
                        .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
                });

            });

            describe("when test schain is created", async () => {

                beforeEach(async () => {
                    const deposit = await schainsFunctionality.getSchainPrice(4, 5);
                    await schainsFunctionality.addSchain(
                        holder,
                        deposit,
                        "0x10" +
                        "0000000000000000000000000000000000000000000000000000000000000005" +
                        "04" +
                        "0000" +
                        "4432",
                        {from: owner});
                });

                it("should failed when create another schain with the same name", async () => {
                    const deposit = await schainsFunctionality.getSchainPrice(4, 5);
                    await schainsFunctionality.addSchain(
                        holder,
                        deposit,
                        "0x10" +
                        "0000000000000000000000000000000000000000000000000000000000000005" +
                        "04" +
                        "0000" +
                        "4432",
                        {from: owner})
                        .should.be.eventually.rejectedWith("Schain name is not available");
                });

                it("should be able to delete schain", async () => {

                    await schainsFunctionality.deleteSchain(
                        holder,
                        "D2",
                        {from: owner});
                    await schainsData.getSchains().should.be.eventually.empty;
                });

                it("should fail on deleting schain if owner is wrong", async () => {

                    await schainsFunctionality.deleteSchain(
                        validator,
                        "D2",
                        {from: owner})
                        .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
                });

            });

        });
    });

    describe("should calculate schain price", async () => {
        it("of tiny schain", async () => {
            const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(1, 5));
            const correctPrice = web3.utils.toBN(3952894150981);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("of small schain", async () => {
            const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(2, 5));
            const correctPrice = web3.utils.toBN(63246306415705);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("of medium schain", async () => {
            const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(3, 5));
            const correctPrice = web3.utils.toBN(505970451325642);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("of test schain", async () => {
            const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(4, 5));
            const correctPrice = web3.utils.toBN(1000000000000000000);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("of medium test schain", async () => {
            const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(5, 5));
            const correctPrice = web3.utils.toBN(31623153207852);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("should revert on wrong schain type", async () => {
            await schainsFunctionality.getSchainPrice(6, 5).should.be.eventually.rejectedWith("Bad schain type");
        });
    });

    describe("when 4 nodes, 2 schains and 2 additional nodes created", async () => {
        const ACTIVE = 0;
        const LEAVING = 1;
        const LEFT = 2;
        let nodeStatus;
        beforeEach(async () => {
            const deposit = await schainsFunctionality.getSchainPrice(5, 5);
            const nodesCount = 4;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await nodesFunctionality.createNode(validator,
                    "0x00" +
                    "2161" +
                    "0000" +
                    "7f0000" + hexIndex +
                    "7f0000" + hexIndex +
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "d2" + hexIndex);
            }
            await schainsFunctionality.addSchain(
                holder,
                deposit,
                "0x10" +
                "0000000000000000000000000000000000000000000000000000000000000005" +
                "05" +
                "0000" +
                "6432",
                {from: owner});
            await schainsFunctionality.addSchain(
                holder,
                deposit,
                "0x10" +
                "0000000000000000000000000000000000000000000000000000000000000005" +
                "05" +
                "0000" +
                "6433",
                {from: owner});
            await nodesFunctionality.createNode(validator,
                "0x00" +
                "2161" +
                "0000" +
                "7f000010" +
                "7f000010" +
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "d210");
            await nodesFunctionality.createNode(validator,
                "0x00" +
                "2161" +
                "0000" +
                "7f000011" +
                "7f000011" +
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "d211");

        });

        it("should rotate 2 nodes consistently", async () => {
            await skaleManager.nodeExit(0, {from: validator});
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("You cannot rotate on Schain d2, occupied by Node 0");
            await skaleManager.nodeExit(0, {from: validator});
            nodeStatus = (await nodesData.getNodeStatus(0)).toNumber();
            assert.equal(nodeStatus, LEFT);
            await skaleManager.nodeExit(0, {from: validator})
                .should.be.eventually.rejectedWith("Node is not Leaving");

            nodeStatus = (await nodesData.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, ACTIVE);
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("You cannot rotate on Schain d2, occupied by Node 0");
            skipTime(web3, 43260);

            await skaleManager.nodeExit(1, {from: validator});
            nodeStatus = (await nodesData.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, LEAVING);
            await skaleManager.nodeExit(1, {from: validator});
            nodeStatus = (await nodesData.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, LEFT);
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("Node is not Leaving");
        });

        it("should allow to rotate if occupied node didn't rotated for 12 hours", async () => {
            await skaleManager.nodeExit(0, {from: validator});
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("You cannot rotate on Schain d2, occupied by Node 0");
            skipTime(web3, 43260);
            await skaleManager.nodeExit(1, {from: validator});

            await skaleManager.nodeExit(0, {from: validator})
                .should.be.eventually.rejectedWith("You cannot rotate on Schain d3, occupied by Node 1");

            nodeStatus = (await nodesData.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, LEAVING);
            await skaleManager.nodeExit(1, {from: validator});
            nodeStatus = (await nodesData.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, LEFT);
        });
    });

});
