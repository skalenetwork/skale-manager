import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ConstantsHolderContract,
         ConstantsHolderInstance,
         ContractManagerContract,
         ContractManagerInstance,
         NodesDataContract,
         NodesDataInstance,
         NodesFunctionalityContract,
         NodesFunctionalityInstance,
         SchainsDataContract,
         SchainsDataInstance,
         SchainsFunctionalityContract,
         SchainsFunctionalityInstance,
         SchainsFunctionalityInternalContract,
         SchainsFunctionalityInternalInstance,
         SkaleDKGContract,
         SkaleDKGInstance } from "../types/truffle-contracts";

import BigNumber from "bignumber.js";
import { gasMultiplier } from "./utils/command_line";

const SchainsFunctionality: SchainsFunctionalityContract = artifacts.require("./SchainsFunctionality");
const SchainsFunctionalityInternal: SchainsFunctionalityInternalContract =
    artifacts.require("./SchainsFunctionalityInternal");
const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const NodesFunctionality: NodesFunctionalityContract = artifacts.require("./NodesFunctionality");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");

chai.should();
chai.use(chaiAsPromised);

contract("SchainsFunctionality", ([owner, holder, validator]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let schainsFunctionalityInternal: SchainsFunctionalityInternalInstance;
    let schainsData: SchainsDataInstance;
    let nodesData: NodesDataInstance;
    let nodesFunctionality: NodesFunctionalityInstance;
    let skaleDKG: SkaleDKGInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});

        constantsHolder = await ConstantsHolder.new(
            contractManager.address,
            {from: owner, gas: 8000000});
        await contractManager.setContractsAddress("Constants", constantsHolder.address);

        nodesData = await NodesData.new(
            5260000,
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("NodesData", nodesData.address);

        nodesFunctionality = await NodesFunctionality.new(
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("NodesFunctionality", nodesFunctionality.address);

        schainsData = await SchainsData.new(
            "SchainsFunctionalityInternal",
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsData", schainsData.address);

        schainsFunctionality = await SchainsFunctionality.new(
            "SkaleManager",
            "SchainsData",
            contractManager.address,
            {from: owner, gas: 7900000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionality", schainsFunctionality.address);

        schainsFunctionalityInternal = await SchainsFunctionalityInternal.new(
            "SchainsFunctionality",
            "SchainsData",
            contractManager.address,
            {from: owner, gas: 7000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionalityInternal", schainsFunctionalityInternal.address);

        skaleDKG = await SkaleDKG.new(contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);
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
                    await nodesFunctionality.createNode(validator, "100000000000000000000",
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
                    await nodesFunctionality.createNode(validator, "100000000000000000000",
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
                    await nodesFunctionality.createNode(validator, "100000000000000000000",
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

                await nodesFunctionality.createNode(validator, "100000000000000000000",
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
                    await nodesFunctionality.createNode(validator, "100000000000000000000",
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
                    await nodesFunctionality.createNode(validator, "100000000000000000000",
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

    describe("when node removed from schain", async () => {
        it("should decrease number of nodes in schain", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            const numberOfNodes = 5;
            for (let i = 0; i < numberOfNodes; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
                // await nodesData.addFractionalNode(i);
            }
            await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, numberOfNodes, 8);
            await schainsFunctionalityInternal.removeNodeFromSchain(3, bobSchain);
            const gottenNodesInGroup = await schainsData.getNodesInGroup(bobSchain);
            const nodesAfterRemoving = [];
            for (const node of gottenNodesInGroup) {
                nodesAfterRemoving.push(node.toNumber());
            }
            nodesAfterRemoving.indexOf(3).should.be.equal(-1);
        });

        it("should rotate 3 nodes on schain", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            let nodes;
            let i = 0;
            for (; i < 5; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
                // await nodesData.addFractionalNode(i);
            }

            // await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
            // await nodesData.addFullNode(i++);
            await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, 5, 8);

            for (; i < 8; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
                // await nodesData.addFractionalNode(i);
            }
            nodes = await schainsData.getNodesInGroup(bobSchain);
            for (let j = 0; j < 3; j++) {
                await nodesFunctionality.removeNodeByRoot(j);
                const schainIds = await schainsData.getSchainIdsForNode(j);
                for (const schainId of schainIds) {
                    await schainsFunctionality.rotateNode(j, schainId);
                }
            }

            nodes = await schainsData.getNodesInGroup(bobSchain);
            nodes = nodes.map((value) => value.toNumber());
            nodes.sort();
            nodes.should.be.deep.equal([3, 4, 5, 6, 7]);
        });

        it("should rotate nodes on 2 schains", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            const vitalikSchain = "0xaf2caa1c2ca1d027f1ac823b529d0a67cd144264b2789fa2ea4d63a67c7103cc";
            let i = 0;
            let nodes;
            for (; i < 5; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
                // await nodesData.addFractionalNode(i);
            }

            await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, 5, 8);
            await schainsFunctionalityInternal.createGroupForSchain("vitalik", vitalikSchain, 5, 8);

            for (; i < 7; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
                // await nodesData.addFractionalNode(i);
            }
            for (let j = 0; j < 2; j++) {
                await nodesFunctionality.removeNodeByRoot(j);
                const schainIds = await schainsData.getSchainIdsForNode(j);
                for (const schainId of schainIds) {
                    await schainsFunctionality.rotateNode(j, schainId);
                }
            }

            nodes = await schainsData.getNodesInGroup(bobSchain);
            nodes = nodes.map((value) => value.toNumber());
            nodes.sort();
            nodes.should.be.deep.equal([2, 3, 4, 5, 6]);

            nodes = await schainsData.getNodesInGroup(vitalikSchain);
            nodes = nodes.map((value) => value.toNumber());
            nodes.sort();

            nodes.should.be.deep.equal([2, 3, 4, 5, 6]);
        });

        it("should rotate node on full schain", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            const vitalikSchain = "0xaf2caa1c2ca1d027f1ac823b529d0a67cd144264b2789fa2ea4d63a67c7103cc";
            let i = 0;
            for (; i < 6; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
                // await nodesData.addFullNode(i);
            }

            await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, 3, 128);
            await schainsFunctionalityInternal.createGroupForSchain("vitalik", vitalikSchain, 3, 128);

            await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
            // await nodesData.addFullNode(i++);

            // for (; i < 15; i++) {
            //     await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
            //     // await nodesData.addFractionalNode(i);
            // }

            await nodesFunctionality.removeNodeByRoot(0);
            const schainId = (await schainsData.getSchainIdsForNode(0))[0];
            const tx = await schainsFunctionality.rotateNode(0, schainId);
            const rotatedNode = tx.logs[0].args.newNode.toNumber();
            rotatedNode.should.be.equal(6);

        });

        it("should rotate on medium test schain", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            const indexOfNodeToRotate = 4;
            for (let i = 0; i < 4; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
                // await nodesData.addFullNode(i);
            }
            await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, 4, 4);

            await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
            // await nodesData.addFullNode(indexOfNodeToRotate);
            await nodesFunctionality.removeNodeByRoot(0);
            const schainId = (await schainsData.getSchainIdsForNode(0))[0];
            const tx = await schainsFunctionality.rotateNode(0, schainId);
            const rotatedNode = tx.logs[0].args.newNode.toNumber();
            rotatedNode.should.be.equal(indexOfNodeToRotate);

        });
    });
});
