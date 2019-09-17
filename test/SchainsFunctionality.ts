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
         SchainsFunctionality1Contract,
         SchainsFunctionality1Instance,
         SchainsFunctionalityContract,
         SchainsFunctionalityInstance } from "../types/truffle-contracts";
import { gasMultiplier } from "./utils/command_line";

const SchainsFunctionality: SchainsFunctionalityContract = artifacts.require("./SchainsFunctionality");
const SchainsFunctionality1: SchainsFunctionality1Contract = artifacts.require("./SchainsFunctionality1");
const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const NodesFunctionality: NodesFunctionalityContract = artifacts.require("./NodesFunctionality");

chai.should();
chai.use(chaiAsPromised);

contract("SchainsFunctionality", ([owner, holder, validator]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let schainsFunctionality1: SchainsFunctionality1Instance;
    let schainsData: SchainsDataInstance;
    let nodesData: NodesDataInstance;
    let nodesFunctionality: NodesFunctionalityInstance;

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
            "SchainsFunctionality1",
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsData", schainsData.address);

        schainsFunctionality = await SchainsFunctionality.new(
            "SkaleManager",
            "SchainsData",
            contractManager.address,
            {from: owner, gas: 7900000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionality", schainsFunctionality.address);

        schainsFunctionality1 = await SchainsFunctionality1.new(
            "SchainsFunctionality",
            "SchainsData",
            contractManager.address,
            {from: owner, gas: 7000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionality1", schainsFunctionality1.address);
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
            await schainsFunctionality.addSchain(
                holder,
                3952894150981,
                "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "01" + "0000" + "d2",
                {from: owner})
                .should.be.eventually.rejectedWith("Not enough nodes to create Schain");
        });

        describe("when nodes are registered", async () => {

            beforeEach(async () => {
                const nodesCount = 129;
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
                const deposit = 3952894150981;

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
                expect(obtainedPart.eq(web3.utils.toBN(128))).be.true;
                expect(obtainedLifetime.eq(web3.utils.toBN(5))).be.true;
                expect(obtainedDeposit.eq(web3.utils.toBN(deposit))).be.true;
            });

            describe("when schain is created", async () => {

                beforeEach(async () => {
                    await schainsFunctionality.addSchain(
                        holder,
                        3952894150981,
                        "0x10" +
                        "0000000000000000000000000000000000000000000000000000000000000005" +
                        "01" +
                        "0000" +
                        "4432",
                        {from: owner});
                });

                it("should failed when create another schain with the same name", async () => {
                    await schainsFunctionality.addSchain(
                        holder,
                        3952894150981,
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
                    await schainsFunctionality.addSchain(
                        holder,
                        "0xDE0B6B3A7640000",
                        "0x10" +
                        "0000000000000000000000000000000000000000000000000000000000000005" +
                        "04" +
                        "0000" +
                        "4432",
                        {from: owner});
                });

                it("should failed when create another schain with the same name", async () => {
                    await schainsFunctionality.addSchain(
                        holder,
                        "0xDE0B6B3A7640000",
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

        it("should rotate 3 nodes on schain", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            let nodes;
            let i = 0;
            for (; i < 5; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
                await nodesData.addFractionalNode(i);
            }

            await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
            await nodesData.addFullNode(i++);
            await schainsFunctionality1.createGroupForSchain("bob", bobSchain, 5, 8);

            let fractionalSum = 0;
            for (; i < 9; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
                await nodesData.addFractionalNode(i);
                fractionalSum += i;
            }
            nodes = await schainsData.getNodesInGroup(bobSchain);
            for (let j = 0; j < 3; j++) {
                await nodesFunctionality.removeNodeByRoot(j);
                await schainsFunctionality.replaceNode(j);
            }
            let sum = 0;
            nodes = await schainsData.getNodesInGroup(bobSchain);
            for (let j = 5; j < nodes.length; j++) {
                sum += nodes[j].toNumber();
            }
            sum.should.be.equal(fractionalSum);
        });

        it("should rotate nodes on 2 schains", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            const vitalikSchain = "0xaf2caa1c2ca1d027f1ac823b529d0a67cd144264b2789fa2ea4d63a67c7103cc";
            let i = 0;
            let nodes;
            for (; i < 5; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
                await nodesData.addFractionalNode(i);
            }

            await schainsFunctionality1.createGroupForSchain("bob", bobSchain, 5, 8);
            await schainsFunctionality1.createGroupForSchain("vitalik", vitalikSchain, 5, 8);

            let fractionalSum = 0;
            for (; i < 7; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
                await nodesData.addFractionalNode(i);
                fractionalSum += i;
            }
            for (let j = 0; j < 2; j++) {
                await nodesFunctionality.removeNodeByRoot(j);
                await schainsFunctionality.replaceNode(j);
            }

            let bobSum = 0;
            nodes = await schainsData.getNodesInGroup(bobSchain);
            for (let j = nodes.length - 1; j >= 5; j--) {
                bobSum += nodes[j].toNumber();
            }

            let vitalikSum = 0;
            nodes = await schainsData.getNodesInGroup(vitalikSchain);
            for (let j = nodes.length - 1; j >= 5; j--) {
                vitalikSum += nodes[j].toNumber();
            }

            bobSum.should.be.equal(fractionalSum);
            vitalikSum.should.be.equal(fractionalSum);

        });

        it("should rotate node on full schain", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            const vitalikSchain = "0xaf2caa1c2ca1d027f1ac823b529d0a67cd144264b2789fa2ea4d63a67c7103cc";
            let i = 0;
            for (; i < 6; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
                await nodesData.addFullNode(i);
            }

            await schainsFunctionality1.createGroupForSchain("bob", bobSchain, 3, 1);
            await schainsFunctionality1.createGroupForSchain("vitalik", vitalikSchain, 3, 1);
            
            await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
            await nodesData.addFullNode(i++);
            
            for (; i < 15; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
                await nodesData.addFractionalNode(i);
            }
            
            await nodesFunctionality.removeNodeByRoot(0);
            const {logs} = await schainsFunctionality.replaceNode(0);
            for (let j = 0; j < logs.length; j++) {
                console.log(logs[j].args);
            }
            console.log(await nodesData.getActiveFullNodes());
            console.log(await schainsData.getNodesInGroup(bobSchain));
            console.log(await schainsData.getNodesInGroup(vitalikSchain));
            const rotatedNode = (await nodesData.getActiveFullNodes())[0].toNumber();
            rotatedNode.should.be.equal(6);

        });
    });
});
