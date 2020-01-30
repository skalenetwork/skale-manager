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
         SkaleDKGInstance,
         SkaleManagerContract,
         SkaleManagerInstance,
         StringUtilsContract,
         StringUtilsInstance } from "../types/truffle-contracts";

import BigNumber from "bignumber.js";
import { gasMultiplier } from "./utils/command_line";
import { skipTime } from "./utils/time";

const SchainsFunctionality: SchainsFunctionalityContract = artifacts.require("./SchainsFunctionality");
const SchainsFunctionalityInternal: SchainsFunctionalityInternalContract =
    artifacts.require("./SchainsFunctionalityInternal");
const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const NodesFunctionality: NodesFunctionalityContract = artifacts.require("./NodesFunctionality");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");
const StringUtils: StringUtilsContract = artifacts.require("./StringUtils");
const SkaleManager: SkaleManagerContract = artifacts.require("./SkaleManager");

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
    let stringUtils: StringUtilsInstance;
    let skaleManager: SkaleManagerInstance;

    beforeEach(async () => {
        if (await web3.eth.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24") === "0x") {
            await web3.eth.sendTransaction({ from: "0x7E6CE355Ca303EAe3a858c172c3cD4CeB23701bc", to: "0xa990077c3205cbDf861e17Fa532eeB069cE9fF96", value: "80000000000000000"});
            await web3.eth.sendSignedTransaction("0xf90a388085174876e800830c35008080b909e5608060405234801561001057600080fd5b506109c5806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a5576000357c010000000000000000000000000000000000000000000000000000000090048063a41e7d5111610078578063a41e7d51146101d4578063aabbb8ca1461020a578063b705676514610236578063f712f3e814610280576100a5565b806329965a1d146100aa5780633d584063146100e25780635df8122f1461012457806365ba36c114610152575b600080fd5b6100e0600480360360608110156100c057600080fd5b50600160a060020a038135811691602081013591604090910135166102b6565b005b610108600480360360208110156100f857600080fd5b5035600160a060020a0316610570565b60408051600160a060020a039092168252519081900360200190f35b6100e06004803603604081101561013a57600080fd5b50600160a060020a03813581169160200135166105bc565b6101c26004803603602081101561016857600080fd5b81019060208101813564010000000081111561018357600080fd5b82018360208201111561019557600080fd5b803590602001918460018302840111640100000000831117156101b757600080fd5b5090925090506106b3565b60408051918252519081900360200190f35b6100e0600480360360408110156101ea57600080fd5b508035600160a060020a03169060200135600160e060020a0319166106ee565b6101086004803603604081101561022057600080fd5b50600160a060020a038135169060200135610778565b61026c6004803603604081101561024c57600080fd5b508035600160a060020a03169060200135600160e060020a0319166107ef565b604080519115158252519081900360200190f35b61026c6004803603604081101561029657600080fd5b508035600160a060020a03169060200135600160e060020a0319166108aa565b6000600160a060020a038416156102cd57836102cf565b335b9050336102db82610570565b600160a060020a031614610339576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b6103428361092a565b15610397576040805160e560020a62461bcd02815260206004820152601a60248201527f4d757374206e6f7420626520616e204552433136352068617368000000000000604482015290519081900360640190fd5b600160a060020a038216158015906103b85750600160a060020a0382163314155b156104ff5760405160200180807f455243313832305f4143434550545f4d4147494300000000000000000000000081525060140190506040516020818303038152906040528051906020012082600160a060020a031663249cb3fa85846040518363ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018083815260200182600160a060020a0316600160a060020a031681526020019250505060206040518083038186803b15801561047e57600080fd5b505afa158015610492573d6000803e3d6000fd5b505050506040513d60208110156104a857600080fd5b5051146104ff576040805160e560020a62461bcd02815260206004820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e74657266616365604482015290519081900360640190fd5b600160a060020a03818116600081815260208181526040808320888452909152808220805473ffffffffffffffffffffffffffffffffffffffff19169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db15391a450505050565b600160a060020a03818116600090815260016020526040812054909116151561059a5750806105b7565b50600160a060020a03808216600090815260016020526040902054165b919050565b336105c683610570565b600160a060020a031614610624576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b81600160a060020a031681600160a060020a0316146106435780610646565b60005b600160a060020a03838116600081815260016020526040808220805473ffffffffffffffffffffffffffffffffffffffff19169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a43509190a35050565b600082826040516020018083838082843780830192505050925050506040516020818303038152906040528051906020012090505b92915050565b6106f882826107ef565b610703576000610705565b815b600160a060020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffffffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b600080600160a060020a038416156107905783610792565b335b905061079d8361092a565b156107c357826107ad82826108aa565b6107b85760006107ba565b815b925050506106e8565b600160a060020a0390811660009081526020818152604080832086845290915290205416905092915050565b6000808061081d857f01ffc9a70000000000000000000000000000000000000000000000000000000061094c565b909250905081158061082d575080155b1561083d576000925050506106e8565b61084f85600160e060020a031961094c565b909250905081158061086057508015155b15610870576000925050506106e8565b61087a858561094c565b909250905060018214801561088f5750806001145b1561089f576001925050506106e8565b506000949350505050565b600160a060020a0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff1615156108f2576108eb83836107ef565b90506106e8565b50600160a060020a03808316600081815260208181526040808320600160e060020a0319871684529091529020549091161492915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6040517f01ffc9a7000000000000000000000000000000000000000000000000000000008082526004820183905260009182919060208160248189617530fa90519096909550935050505056fea165627a7a72305820377f4a2d4301ede9949f163f319021a6e9c687c292a5e2b2c4734c126b524e6c00291ba01820182018201820182018201820182018201820182018201820182018201820a01820182018201820182018201820182018201820182018201820182018201820");
        }
        contractManager = await ContractManager.new({from: owner});

        constantsHolder = await ConstantsHolder.new(
            contractManager.address,
            {from: owner, gas: 8000000});
        await contractManager.setContractsAddress("Constants", constantsHolder.address);

        nodesData = await NodesData.new(
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

        stringUtils = await StringUtils.new();
        await contractManager.setContractsAddress("StringUtils", stringUtils.address);

        skaleManager = await SkaleManager.new(contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SkaleManager", skaleManager.address);

    });

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
    //         const price = new BigNumber(await schainsFunctionality.getSchainPrice(1, 5));
    //         await schainsFunctionality.addSchain(
    //             holder,
    //             price.toString(),
    //             "0x10" + "0000000000000000000000000000000000000000000000000000000000000005" + "01" + "0000" + "d2",
    //             {from: owner})
    //             .should.be.eventually.rejectedWith("Not enough nodes to create Schain");
    //     });

    //     describe("when 2 nodes are registered (Ivan test)", async () => {
    //         it("should create 2 nodes, and play with schains", async () => {
    //             const nodesCount = 2;
    //             for (const index of Array.from(Array(nodesCount).keys())) {
    //                 const hexIndex = ("0" + index.toString(16)).slice(-2);
    //                 await nodesFunctionality.createNode(validator,
    //                     "0x00" +
    //                     "2161" +
    //                     "0000" +
    //                     "7f0000" + hexIndex +
    //                     "7f0000" + hexIndex +
    //                     "1122334455667788990011223344556677889900112233445566778899001122" +
    //                     "1122334455667788990011223344556677889900112233445566778899001122" +
    //                     "d2" + hexIndex);
    //             }

    //             const deposit = await schainsFunctionality.getSchainPrice(4, 5);

    //             await schainsFunctionality.addSchain(
    //                 owner,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "04" +
    //                 "0000" +
    //                 "6432",
    //                 {from: owner});

    //             await schainsFunctionality.addSchain(
    //                 owner,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "04" +
    //                 "0000" +
    //                 "6433",
    //                 {from: owner});

    //             await schainsFunctionality.deleteSchain(
    //                 owner,
    //                 "d2",
    //                 {from: owner});

    //             await schainsFunctionality.deleteSchain(
    //                 owner,
    //                 "d3",
    //                 {from: owner});

    //             await nodesFunctionality.removeNodeByRoot(0, {from: owner});
    //             await nodesFunctionality.removeNodeByRoot(1, {from: owner});

    //             for (const index of Array.from(Array(nodesCount).keys())) {
    //                 const hexIndex = ("1" + index.toString(16)).slice(-2);
    //                 await nodesFunctionality.createNode(validator,
    //                     "0x00" +
    //                     "2161" +
    //                     "0000" +
    //                     "7f0000" + hexIndex +
    //                     "7f0000" + hexIndex +
    //                     "1122334455667788990011223344556677889900112233445566778899001122" +
    //                     "1122334455667788990011223344556677889900112233445566778899001122" +
    //                     "d2" + hexIndex);
    //             }

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "04" +
    //                 "0000" +
    //                 "6434",
    //                 {from: owner});
    //         });
    //     });

    //     describe("when 4 nodes are registered", async () => {
    //         beforeEach(async () => {
    //             const nodesCount = 4;
    //             for (const index of Array.from(Array(nodesCount).keys())) {
    //                 const hexIndex = ("0" + index.toString(16)).slice(-2);
    //                 await nodesFunctionality.createNode(validator,
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

    //         it("should create 4 node schain", async () => {
    //             const deposit = await schainsFunctionality.getSchainPrice(5, 5);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "05" +
    //                 "0000" +
    //                 "6432",
    //                 {from: owner});

    //             const schains = await schainsData.getSchains();
    //             schains.length.should.be.equal(1);
    //             const schainId = schains[0];

    //             await schainsData.isOwnerAddress(holder, schainId).should.be.eventually.true;
    //         });

    //         it("should not create 4 node schain with 1 deleted node", async () => {
    //             await nodesFunctionality.removeNodeByRoot(1);

    //             const deposit = await schainsFunctionality.getSchainPrice(5, 5);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "05" +
    //                 "0000" +
    //                 "6432",
    //                 {from: owner}).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
    //         });

    //         it("should not create 4 node schain on deleted node", async () => {
    //             let data = await nodesData.getNodesWithFreeSpace(32);
    //             const removedNode = 1;
    //             await nodesFunctionality.removeNodeByRoot(removedNode);

    //             data = await nodesData.getNodesWithFreeSpace(32);

    //             await nodesFunctionality.createNode(validator,
    //                     "0x00" +
    //                     "2161" +
    //                     "0000" +
    //                     "7f000028" +
    //                     "7f000028" +
    //                     "1122334455667788990011223344556677889900112233445566778899001122" +
    //                     "1122334455667788990011223344556677889900112233445566778899001122" +
    //                     "d228");

    //             const deposit = await schainsFunctionality.getSchainPrice(5, 5);

    //             data = await nodesData.getNodesWithFreeSpace(32);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "05" +
    //                 "0000" +
    //                 "6432",
    //                 {from: owner});

    //             let nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));

    //             for (const node of nodesInGroup) {
    //                 expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
    //             }

    //             data = await nodesData.getNodesWithFreeSpace(32);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "05" +
    //                 "0000" +
    //                 "6433",
    //                 {from: owner});

    //             nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d3"));

    //             for (const node of nodesInGroup) {
    //                 expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
    //             }

    //             data = await nodesData.getNodesWithFreeSpace(32);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "05" +
    //                 "0000" +
    //                 "6434",
    //                 {from: owner});

    //             nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d4"));

    //             for (const node of nodesInGroup) {
    //                 expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
    //             }

    //             data = await nodesData.getNodesWithFreeSpace(32);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "05" +
    //                 "0000" +
    //                 "6435",
    //                 {from: owner});

    //             nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d5"));

    //             for (const node of nodesInGroup) {
    //                 expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
    //             }
    //         });

    //         it("should create & delete 4 node schain", async () => {
    //             const deposit = await schainsFunctionality.getSchainPrice(5, 5);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "05" +
    //                 "0000" +
    //                 "6432",
    //                 {from: owner});

    //             const schains = await schainsData.getSchains();
    //             schains.length.should.be.equal(1);
    //             const schainId = schains[0];

    //             await schainsData.isOwnerAddress(holder, schainId).should.be.eventually.true;

    //             await schainsFunctionality.deleteSchain(
    //                 holder,
    //                 "d2",
    //                 {from: owner});

    //             await schainsData.getSchains().should.be.eventually.empty;
    //         });
    //     });

    //     describe("when 20 nodes are registered", async () => {
    //         beforeEach(async () => {
    //             const nodesCount = 20;
    //             for (const index of Array.from(Array(nodesCount).keys())) {
    //                 const hexIndex = ("0" + index.toString(16)).slice(-2);
    //                 await nodesFunctionality.createNode(validator,
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

    //         it("should create Medium schain", async () => {
    //             const deposit = await schainsFunctionality.getSchainPrice(3, 5);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "03" +
    //                 "0000" +
    //                 "6432",
    //                 {from: owner});

    //             const schains = await schainsData.getSchains();
    //             schains.length.should.be.equal(1);
    //         });

    //         it("should not create another Medium schain", async () => {
    //             const deposit = await schainsFunctionality.getSchainPrice(3, 5);

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "03" +
    //                 "0000" +
    //                 "6432",
    //                 {from: owner});

    //             await schainsFunctionality.addSchain(
    //                 holder,
    //                 deposit,
    //                 "0x10" +
    //                 "0000000000000000000000000000000000000000000000000000000000000005" +
    //                 "03" +
    //                 "0000" +
    //                 "6433",
    //                 {from: owner},
    //             ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
    //         });
    //     });

    //     describe("when nodes are registered", async () => {

    //         beforeEach(async () => {
    //             const nodesCount = 16;
    //             for (const index of Array.from(Array(nodesCount).keys())) {
    //                 const hexIndex = ("0" + index.toString(16)).slice(-2);
    //                 await nodesFunctionality.createNode(validator,
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
    //             const deposit = await schainsFunctionality.getSchainPrice(1, 5);

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
    //             expect(obtainedPart.eq(web3.utils.toBN(1))).be.true;
    //             expect(obtainedLifetime.eq(web3.utils.toBN(5))).be.true;
    //             expect(obtainedDeposit.eq(web3.utils.toBN(deposit))).be.true;
    //         });

    //         describe("when schain is created", async () => {

    //             beforeEach(async () => {
    //                 const deposit = await schainsFunctionality.getSchainPrice(1, 5);
    //                 await schainsFunctionality.addSchain(
    //                     holder,
    //                     deposit,
    //                     "0x10" +
    //                     "0000000000000000000000000000000000000000000000000000000000000005" +
    //                     "01" +
    //                     "0000" +
    //                     "4432",
    //                     {from: owner});
    //             });

    //             it("should failed when create another schain with the same name", async () => {
    //                 const deposit = await schainsFunctionality.getSchainPrice(1, 5);
    //                 await schainsFunctionality.addSchain(
    //                     holder,
    //                     deposit,
    //                     "0x10" +
    //                     "0000000000000000000000000000000000000000000000000000000000000005" +
    //                     "01" +
    //                     "0000" +
    //                     "4432",
    //                     {from: owner})
    //                     .should.be.eventually.rejectedWith("Schain name is not available");
    //             });

    //             it("should be able to delete schain", async () => {
    //                 await schainsFunctionality.deleteSchain(
    //                     holder,
    //                     "D2",
    //                     {from: owner});
    //                 await schainsData.getSchains().should.be.eventually.empty;
    //             });

    //             it("should fail on deleting schain if owner is wrong", async () => {
    //                 await schainsFunctionality.deleteSchain(
    //                     validator,
    //                     "D2",
    //                     {from: owner})
    //                     .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
    //             });

    //         });

    //         describe("when test schain is created", async () => {

    //             beforeEach(async () => {
    //                 const deposit = await schainsFunctionality.getSchainPrice(4, 5);
    //                 await schainsFunctionality.addSchain(
    //                     holder,
    //                     deposit,
    //                     "0x10" +
    //                     "0000000000000000000000000000000000000000000000000000000000000005" +
    //                     "04" +
    //                     "0000" +
    //                     "4432",
    //                     {from: owner});
    //             });

    //             it("should failed when create another schain with the same name", async () => {
    //                 const deposit = await schainsFunctionality.getSchainPrice(4, 5);
    //                 await schainsFunctionality.addSchain(
    //                     holder,
    //                     deposit,
    //                     "0x10" +
    //                     "0000000000000000000000000000000000000000000000000000000000000005" +
    //                     "04" +
    //                     "0000" +
    //                     "4432",
    //                     {from: owner})
    //                     .should.be.eventually.rejectedWith("Schain name is not available");
    //             });

    //             it("should be able to delete schain", async () => {

    //                 await schainsFunctionality.deleteSchain(
    //                     holder,
    //                     "D2",
    //                     {from: owner});
    //                 await schainsData.getSchains().should.be.eventually.empty;
    //             });

    //             it("should fail on deleting schain if owner is wrong", async () => {

    //                 await schainsFunctionality.deleteSchain(
    //                     validator,
    //                     "D2",
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

    describe("when node removed from schain", async () => {
        // it("should decrease number of nodes in schain", async () => {
        //     const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
        //     const numberOfNodes = 5;
        //     for (let i = 0; i < numberOfNodes; i++) {
        //         await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //         // await nodesData.addFractionalNode(i);
        //     }
        //     await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, numberOfNodes, 8);
        //     await schainsFunctionalityInternal.removeNodeFromSchain(3, bobSchain);
        //     const gottenNodesInGroup = await schainsData.getNodesInGroup(bobSchain);
        //     const nodesAfterRemoving = [];
        //     for (const node of gottenNodesInGroup) {
        //         nodesAfterRemoving.push(node.toNumber());
        //     }
        //     nodesAfterRemoving.indexOf(3).should.be.equal(-1);
        // });

        // it("should rotate 3 nodes on schain", async () => {
        //     const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
        //     let nodes;
        //     let i = 0;
        //     for (; i < 5; i++) {
        //         await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //         // await nodesData.addFractionalNode(i);
        //     }

        //     // await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     // await nodesData.addFullNode(i++);
        //     await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, 5, 8);

        //     for (; i < 8; i++) {
        //         await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //         // await nodesData.addFractionalNode(i);
        //     }
        //     nodes = await schainsData.getNodesInGroup(bobSchain);
        //     for (let j = 0; j < 3; j++) {
        //         await schainsFunctionality.rotateNode(j, schainId);
        //     }

        //     nodes = await schainsData.getNodesInGroup(bobSchain);
        //     nodes = nodes.map((value) => value.toNumber());
        //     nodes.sort();
        //     nodes.should.be.deep.equal([3, 4, 5, 6, 7]);
        // });

        describe("when 16 nodes and 2 schains and 2 additional nodes created", async () => {
            const ACTIVE = 0;
            const LEAVING = 1;
            const LEFT = 2;
            let nodeStatus;
            beforeEach(async () => {
                const deposit = await schainsFunctionality.getSchainPrice(2, 5);
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
                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "02" +
                    "0000" +
                    "6432",
                    {from: owner});
                await schainsFunctionality.addSchain(
                    holder,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "02" +
                    "0000" +
                    "6433",
                    {from: owner});
                await nodesFunctionality.createNode(validator, "100000000000000000000",
                    "0x00" +
                    "2161" +
                    "0000" +
                    "7f000010" +
                    "7f000010" +
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "d210");
                await nodesFunctionality.createNode(validator, "100000000000000000000",
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
                .should.be.eventually.rejectedWith("You cannot rotate on Schain d3, occupied by Node 0");
                await skaleManager.nodeExit(0, {from: validator});
                nodeStatus = (await nodesData.getNodeStatus(0)).toNumber();
                assert.equal(nodeStatus, LEFT);
                await skaleManager.nodeExit(0, {from: validator})
                    .should.be.eventually.rejectedWith("There are no running Schains on the Node");

                nodeStatus = (await nodesData.getNodeStatus(1)).toNumber();
                assert.equal(nodeStatus, ACTIVE);
                await skaleManager.nodeExit(1, {from: validator});
                
                nodeStatus = (await nodesData.getNodeStatus(1)).toNumber();
                assert.equal(nodeStatus, LEAVING);
                await skaleManager.nodeExit(1, {from: validator});
                nodeStatus = (await nodesData.getNodeStatus(1)).toNumber();
                assert.equal(nodeStatus, LEFT);
                await skaleManager.nodeExit(1, {from: validator})
                    .should.be.eventually.rejectedWith("There are no running Schains on the Node");
            });

            it("should allow to rotate if occupied node didn't rotated for 12 hours", async () => {
                await skaleManager.nodeExit(0, {from: validator});
                await skaleManager.nodeExit(1, {from: validator})
                    .should.be.eventually.rejectedWith("You cannot rotate on Schain d3, occupied by Node 0");
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

        // it("should rotate nodes on 2 schains", async () => {
        //     const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
        //     const vitalikSchain = "0xaf2caa1c2ca1d027f1ac823b529d0a67cd144264b2789fa2ea4d63a67c7103cc";
        //     let i = 0;
        //     let nodes;
        //     for (; i < 5; i++) {
        //         await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //         // await nodesData.addFractionalNode(i);
        //     }

        //     await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, 5, 8);
        //     await schainsFunctionalityInternal.createGroupForSchain("vitalik", vitalikSchain, 5, 8);

        //     for (; i < 7; i++) {
        //         await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //         // await nodesData.addFractionalNode(i);
        //     }
        //     for (let j = 0; j < 2; j++) {
        //         await nodesFunctionality.removeNodeByRoot(j);
        //         for (const schainId of schainIds) {
        //             await schainsFunctionality.rotateNode(j, schainId);
        //         }
        //     }

        //     nodes = await schainsData.getNodesInGroup(bobSchain);
        //     nodes = nodes.map((value) => value.toNumber());
        //     nodes.sort();
        //     nodes.should.be.deep.equal([2, 3, 4, 5, 6]);

        //     nodes = await schainsData.getNodesInGroup(vitalikSchain);
        //     nodes = nodes.map((value) => value.toNumber());
        //     nodes.sort();

        //     nodes.should.be.deep.equal([2, 3, 4, 5, 6]);
        // });

        // it("should rotate node on full schain", async () => {
        //     const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
        //     const vitalikSchain = "0xaf2caa1c2ca1d027f1ac823b529d0a67cd144264b2789fa2ea4d63a67c7103cc";
        //     let i = 0;
        //     for (; i < 6; i++) {
        //         await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //         // await nodesData.addFullNode(i);
        //     }

        //     await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, 3, 128);
        //     await schainsFunctionalityInternal.createGroupForSchain("vitalik", vitalikSchain, 3, 128);

        //     await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //     // await nodesData.addFullNode(i++);

        //     // for (; i < 15; i++) {
        //     //     await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        //     //     // await nodesData.addFractionalNode(i);
        //     // }

        //     await nodesFunctionality.removeNodeByRoot(0);
        //     const tx = await schainsFunctionality.rotateNode(0, schainId);
        //     const rotatedNode = tx.logs[0].args.newNode.toNumber();
        //     rotatedNode.should.be.equal(6);

        // });

        // it("should rotate on medium test schain", async () => {
        //     const bobSchain = "0x38e47a7b719dce63662aeaf43440326f551b8a7ee198cee35cb5d517f2d296a2";
        //     const indexOfNodeToRotate = 4;
        //     for (let i = 0; i < 4; i++) {
        //         await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //         // await nodesData.addFullNode(i);
        //     }
        //     await schainsFunctionalityInternal.createGroupForSchain("bob", bobSchain, 4, 4);

        //     await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
        //     // await nodesData.addFullNode(indexOfNodeToRotate);
        //     await nodesFunctionality.removeNodeByRoot(0);
        //     const tx = await schainsFunctionality.rotateNode(0, schainId);
        //     const rotatedNode = tx.logs[0].args.newNode.toNumber();
        //     rotatedNode.should.be.equal(indexOfNodeToRotate);

        // });
    });
});
