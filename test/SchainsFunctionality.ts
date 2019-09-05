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

    describe("when kekeke", async () => {
        // it("should lalala", async () => {
        //     const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
        //     let schains;
        //     await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Michael", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Jason", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Andrew", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Peter", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Mathew", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addFractionalNode(0);
        //     await nodesData.addFractionalNode(1);
        //     await nodesData.addFractionalNode(2);
        //     await nodesData.addFractionalNode(3);
        //     await nodesData.addFractionalNode(4);
        //     await nodesData.addFullNode(5);
        //     await schainsFunctionality1.createGroupForSchain("bob", bobSchain, 5, 8);
        //     await nodesData.addNode(holder, "Howard", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Denis", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Robert", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addFractionalNode(6);
        //     await nodesData.addFractionalNode(7);
        //     await nodesData.addFractionalNode(8);
        //     schains = await schainsData.getNodesInGroup(bobSchain);
        //     console.log(schains);
        //     await nodesFunctionality.removeNodeByRoot(0);
        //     await nodesFunctionality.removeNodeByRoot(1);
        //     await nodesFunctionality.removeNodeByRoot(2);
        //     await schainsFunctionality1.rotateNode(0);
        //     // console.log(log.tx);
        //     schains = await schainsData.getNodesInGroup(bobSchain);
        //     console.log(schains);

        // });


        it("should lalala", async () => {
            const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
            let schains;
            for (let i = 0; i < 5; i++) {
                await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
                await nodesData.addFractionalNode(i);
            }

            await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
            await nodesData.addFullNode(5);
            await schainsFunctionality1.createGroupForSchain("bob", bobSchain, 5, 8);
            
            for (let i = 6; i < 9; i++) {
                await nodesData.addFractionalNode(i);
            }
            
            await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
            schains = await schainsData.getNodesInGroup(bobSchain);
            console.log(schains);
            for (let i = 0; i < 3; i++) {
                await nodesFunctionality.removeNodeByRoot(i);
                await schainsFunctionality1.rotateNode(i);
            }
            schains = await schainsData.getNodesInGroup(bobSchain);
            for (let i = schains.length; i > 5; i--) {
                console.log(i)
            }
            console.log(schains);

            console.log(await nodesData.getActiveFractionalNodes());
            console.log(await nodesData.getActiveFullNodes());

        });
        // it("should nanana", async () => {
        //     const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
        //     let index = 0;
        //     await nodesData.addNode(holder, "Michael", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Jason", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addNode(holder, "Donald", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     await nodesData.addFullNode(index++);
        //     await nodesData.addFractionalNode(index++);
        //     await nodesData.addFullNode(index++);
        //     // console.log(index);
        //     await schainsFunctionality1.createGroupForSchain("bob", bobSchain, 2, 1);
        //     console.log(await schainsData.getNodesInGroup(bobSchain));

        // })
    })

    // describe("should add schain", async () => {
    //     it("should fail when money are not enough", async () => {
    //         await schainsFunctionality.addSchain(
    //             holder,
    //             5,
    //             "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "01" + "0000" + "d2",
    //             {from: owner})
    //             .should.be.eventually.rejectedWith("Not enough money to create Schain");
    //     });

    //     it("should fail when schain type is wrong", async () => {
    //         await schainsFunctionality.addSchain(
    //             holder,
    //             5,
    //             "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "06" + "0000" + "d2",
    //             {from: owner})
    //             .should.be.eventually.rejectedWith("Invalid type of Schain");
    //     });

    //     it("should fail when data parameter is too short", async () => {
    //         await schainsFunctionality.addSchain(
    //             holder,
    //             5,
    //             "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "06" + "0000",
    //             {from: owner}).
    //             should.be.eventually.rejectedWith("Incorrect bytes data config");
    //     });

    //     it("should fail when nodes count is too low", async () => {
    //         await schainsFunctionality.addSchain(
    //             holder,
    //             3952894150981,
    //             "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "01" + "0000" + "d2",
    //             {from: owner})
    //             .should.be.eventually.rejectedWith("Not enough nodes to create Schain");
    //     });

    //     describe("when nodes are registered", async () => {

    //         beforeEach(async () => {
    //             const nodesCount = 129;
    //             for (const index of Array.from(Array(nodesCount).keys())) {
    //                 const hexIndex = ("0" + index.toString(16)).slice(-2);
    //                 await nodesFunctionality.createNode(validator, "100000000000000000000",
    //                     "0x00" +
    //                     "2161" +
    //                     "0000" +
    //                     "7f0000" + hexIndex +
    //                     "7f0000" + hexIndex +
    //                     "1122334455667788990011223344556677889900112233445566778899001122" +
    //                     "1122334455667788990011223344556677889900112233445566778899001122" +
    //                     "d2" + hexIndex);
    //             }
    //         });

    //         it("successfully", async () => {
    //             const deposit = 3952894150981;

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "01" +
    //                 "0000" +
    //                 "6432",
    //                 {from: owner});

    //             const schains = await schainsData.getSchains();
    //             schains.length.should.be.equal(1);
    //             const schainId = schains[0];

    //             await schainsData.isOwnerAddress(holder, schainId).should.be.eventually.true;

    //             const obtainedSchains = await schainsData.schains(schainId);
    //             const schainsArray = Array(8);
    //             for (const index of Array.from(Array(8).keys())) {
    //                 schainsArray[index] = obtainedSchains[index];
    //             }

    //             const [obtainedSchainName,
    //                    obtainedSchainOwner,
    //                    obtainedIndexInOwnerList,
    //                    obtainedPart,
    //                    obtainedLifetime,
    //                    obtainedStartDate,
    //                    obtainedDeposit,
    //                    obtainedIndex] = schainsArray;

    //             obtainedSchainName.should.be.equal("d2");
    //             obtainedSchainOwner.should.be.equal(holder);
    //             expect(obtainedPart.eq(web3.utils.toBN(128))).be.true;
    //             expect(obtainedLifetime.eq(web3.utils.toBN(5))).be.true;
    //             expect(obtainedDeposit.eq(web3.utils.toBN(deposit))).be.true;
    //         });

    //         describe("when schain is created", async () => {

    //             beforeEach(async () => {
    //                 await schainsFunctionality.addSchain(
    //                     holder,
    //                     3952894150981,
    //                     "0x10" +
    //                     "0000000000000000000000000000000000000000000000000000000000000005" +
    //                     "01" +
    //                     "0000" +
    //                     "d2",
    //                     {from: owner});
    //             });

    //             it("should failed when create another schain with the same name", async () => {
    //                 await schainsFunctionality.addSchain(
    //                     holder,
    //                     3952894150981,
    //                     "0x10" +
    //                     "0000000000000000000000000000000000000000000000000000000000000005" +
    //                     "01" +
    //                     "0000" +
    //                     "d2",
    //                     {from: owner})
    //                     .should.be.eventually.rejectedWith("Schain name is not available");
    //             });

    //             it("should be able to delete schain", async () => {
    //                 await schainsFunctionality.deleteSchain(
    //                     holder,
    //                     "0x9ad263ae43881ba28ed7ce1c8d76614d2b21b3756573ad348964cdde6b3ae6df",
    //                     {from: owner});
    //                 await schainsData.getSchains().should.be.eventually.empty;
    //             });

    //             it("should fail on deleting schain if owner is wrong", async () => {
    //                 await schainsFunctionality.deleteSchain(
    //                     validator,
    //                     "0x9ad263ae43881ba28ed7ce1c8d76614d2b21b3756573ad348964cdde6b3ae6df",
    //                     {from: owner})
    //                     .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
    //             });

    //         });

    //         describe("when test schain is created", async () => {

    //             beforeEach(async () => {
    //                 await schainsFunctionality.addSchain(
    //                     holder,
    //                     "0xDE0B6B3A7640000",
    //                     "0x10" +
    //                     "0000000000000000000000000000000000000000000000000000000000000005" +
    //                     "04" +
    //                     "0000" +
    //                     "d2",
    //                     {from: owner});
    //             });

    //             it("should failed when create another schain with the same name", async () => {
    //                 await schainsFunctionality.addSchain(
    //                     holder,
    //                     "0xDE0B6B3A7640000",
    //                     "0x10" +
    //                     "0000000000000000000000000000000000000000000000000000000000000005" +
    //                     "04" +
    //                     "0000" +
    //                     "d2",
    //                     {from: owner})
    //                     .should.be.eventually.rejectedWith("Schain name is not available");
    //             });

    //             it("should be able to delete schain", async () => {

    //                 await schainsFunctionality.deleteSchain(
    //                     holder,
    //                     "0x9ad263ae43881ba28ed7ce1c8d76614d2b21b3756573ad348964cdde6b3ae6df",
    //                     {from: owner});
    //                 await schainsData.getSchains().should.be.eventually.empty;
    //             });

    //             it("should fail on deleting schain if owner is wrong", async () => {

    //                 await schainsFunctionality.deleteSchain(
    //                     validator,
    //                     "0x9ad263ae43881ba28ed7ce1c8d76614d2b21b3756573ad348964cdde6b3ae6df",
    //                     {from: owner})
    //                     .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
    //             });

    //         });

    //     });
    // });

    // describe("should calculate schain price", async () => {
    //     it("of tiny schain", async () => {
    //         const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(1, 5));
    //         const correctPrice = web3.utils.toBN(3952894150981);

    //         expect(price.eq(correctPrice)).to.be.true;
    //     });

    //     it("of small schain", async () => {
    //         const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(2, 5));
    //         const correctPrice = web3.utils.toBN(63246306415705);

    //         expect(price.eq(correctPrice)).to.be.true;
    //     });

    //     it("of medium schain", async () => {
    //         const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(3, 5));
    //         const correctPrice = web3.utils.toBN(505970451325642);

    //         expect(price.eq(correctPrice)).to.be.true;
    //     });

    //     it("of test schain", async () => {
    //         const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(4, 5));
    //         const correctPrice = web3.utils.toBN(1000000000000000000);

    //         expect(price.eq(correctPrice)).to.be.true;
    //     });

    //     it("of medium test schain", async () => {
    //         const price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(5, 5));
    //         const correctPrice = web3.utils.toBN(31623153207852);

    //         expect(price.eq(correctPrice)).to.be.true;
    //     });

    //     it("should revert on wrong schain type", async () => {
    //         await schainsFunctionality.getSchainPrice(6, 5).should.be.eventually.rejectedWith("Bad schain type");
    //     });
    // });

});
