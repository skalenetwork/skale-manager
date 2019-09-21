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
                await nodesFunctionality.removeNodeByRoot(0);

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
                await nodesFunctionality.removeNodeByRoot(0);

                await nodesFunctionality.createNode(validator, "100000000000000000000",
                        "0x00" +
                        "2161" +
                        "0000" +
                        "7f000005" + //hexIndex +
                        "7f000005" + //hexIndex +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "d205"); //+ hexIndex);

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
                
                let nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));

                let zeroNodeInArray = false;

                for (let i = 0; i < nodesInGroup.length; i++) {
                    zeroNodeInArray = (web3.utils.toBN(nodesInGroup[i]).toString() == "0" ? true : false);
                }

                zeroNodeInArray.should.be.equal(false);

                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6433",
                    {from: owner});
                
                nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));

                zeroNodeInArray = false;
                
                for (let i = 0; i < nodesInGroup.length; i++) {
                    zeroNodeInArray = (web3.utils.toBN(nodesInGroup[i]).toString() == "0" ? true : false);
                }

                zeroNodeInArray.should.be.equal(false);
                
                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6434",
                    {from: owner});

                nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));

                zeroNodeInArray = false;
                
                for (let i = 0; i < nodesInGroup.length; i++) {
                    zeroNodeInArray = (web3.utils.toBN(nodesInGroup[i]).toString() == "0" ? true : false);
                }

                zeroNodeInArray.should.be.equal(false);
                
                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "05" +
                    "0000" +
                    "6435",
                    {from: owner});

                nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));

                zeroNodeInArray = false;
                
                for (let i = 0; i < nodesInGroup.length; i++) {
                    zeroNodeInArray = (web3.utils.toBN(nodesInGroup[i]).toString() == "0" ? true : false);
                }

                zeroNodeInArray.should.be.equal(false);
            });
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

});
