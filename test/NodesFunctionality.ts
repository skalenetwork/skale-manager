import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ConstantsHolderContract,
         ConstantsHolderInstance,
         ContractManagerContract,
         ContractManagerInstance,
         NodesDataContract,
         NodesDataInstance,
         NodesFunctionalityContract,
         NodesFunctionalityInstance } from "../types/truffle-contracts";

import { gasMultiplier } from "./utils/command_line";
import { skipTime } from "./utils/time";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const NodesFunctionality: NodesFunctionalityContract = artifacts.require("./NodesFunctionality");

chai.should();
chai.use(chaiAsPromised);

contract("NodesFunctionality", ([owner, validator]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let nodesData: NodesDataInstance;
    let nodesFunctionality: NodesFunctionalityInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});

        constantsHolder = await ConstantsHolder.new(
            contractManager.address,
            {from: owner, gas: 8000000});
        await contractManager.setContractsAddress("Constants", constantsHolder.address);

        nodesData = await NodesData.new(
            5,
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("NodesData", nodesData.address);

        nodesFunctionality = await NodesFunctionality.new(
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("NodesFunctionality", nodesFunctionality.address);
    });

    it("should fail to create node if no money", async () => {
        await nodesFunctionality.createNode(validator, 5, "0x11")
            .should.be.eventually.rejectedWith("Not enough money to create Node");
    });

    it("should fail to create node if ip is zero", async () => {
        await nodesFunctionality.createNode(
            validator,
            "0x56bc75e2d63100000",
            "0x01" +
            "2161" + // port
            "0000" + // nonce
            "00000000" + // ip
            "7f000001" + // public ip
            "1122334455667788990011223344556677889900112233445566778899001122" +
            "1122334455667788990011223344556677889900112233445566778899001122" + // public key
            "d2") // name
            .should.be.eventually.rejectedWith("IP address is zero or is not available");
    });

    it("should fail if data string is too short", async () => {
        await nodesFunctionality.createNode(
        validator,
        "0x56bc75e2d63100000",
        "0x01" +
        "2161" + // port
        "0000" + // nonce
        "00000000" + // ip
        "7f000001" + // public ip
        "1122334455667788990011223344556677889900112233445566778899001122" +
        "1122334455667788990011223344556677889900112233445566778899001122") // public key
        .should.be.eventually.rejectedWith("Incorrect bytes data config");
    });

    it("should fail to create node if port is zero", async () => {
        await nodesFunctionality.createNode(
            validator,
            "0x56bc75e2d63100000",
            "0x01" +
            "0000" + // port
            "0000" + // nonce
            "7f000001" + // ip
            "7f000001" + // public ip
            "1122334455667788990011223344556677889900112233445566778899001122" +
            "1122334455667788990011223344556677889900112233445566778899001122" + // public key
            "d2") // name
            .should.be.eventually.rejectedWith("Port is zero");
    });

    it("should create node", async () => {
        await nodesFunctionality.createNode(
            validator,
            "0x56bc75e2d63100000",
            "0x01" +
            "2161" + // port
            "0000" + // nonce
            "7f000001" + // ip
            "7f000001" + // public ip
            "1122334455667788990011223344556677889900112233445566778899001122" +
            "1122334455667788990011223344556677889900112233445566778899001122" + // public key
            "6432"); // name

        const node = await nodesData.nodes(0);
        node[0].should.be.equal("d2");
        node[1].should.be.equal("0x7f000001");
        node[2].should.be.equal("0x7f000001");
        node[3].should.be.deep.equal(web3.utils.toBN(8545));
        node[4].should.be.equal(
            "0x1122334455667788990011223344556677889900112233445566778899001122" +
            "1122334455667788990011223344556677889900112233445566778899001122");
        node[8].should.be.deep.equal(web3.utils.toBN(0));
    });

    describe("when node is created", async () => {
        beforeEach(async () => {
            await nodesFunctionality.createNode(
                validator,
                "0x56bc75e2d63100000",
                "0x01" +
                "2161" + // port
                "0000" + // nonce
                "7f000001" + // ip
                "7f000001" + // public ip
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                "6432"); // name
        });

        it("should fail to delete non existing node", async () => {
            await nodesFunctionality.removeNode(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");
        });

        it("should fail to delete non active node", async () => {
            await nodesData.setNodeLeaving(0);

            await nodesFunctionality.removeNode(validator, 0)
                .should.be.eventually.rejectedWith("Node is not Active");
        });

        it("should delete node", async () => {
            await nodesFunctionality.removeNode(validator, 0);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
        });

        it("should fail to wethdraw deposit for non existing node", async () => {
            await nodesFunctionality.initWithdrawDeposit(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");

            await nodesFunctionality.initWithdrawDeposit(owner, 0)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");
        });

        it("should init withdrawing deposit", async () => {
            await nodesFunctionality.initWithdrawDeposit(validator, 0);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
        });

        it("should complete withdrawing deposit", async () => {
            await nodesFunctionality.completeWithdrawDeposit(owner, 0)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");

            await nodesFunctionality.completeWithdrawDeposit(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");

            await nodesFunctionality.completeWithdrawDeposit(validator, 0)
                .should.be.eventually.rejectedWith("Node is no Leaving");

            await nodesFunctionality.initWithdrawDeposit(validator, 0);

            await nodesFunctionality.completeWithdrawDeposit(validator, 0)
                .should.be.eventually.rejectedWith("eaving period is not expired");

            skipTime(web3, 5);

            await nodesFunctionality.completeWithdrawDeposit(validator, 0);

            const node = await nodesData.nodes(0);
            node[8].should.be.deep.equal(web3.utils.toBN(2));
        });
    });

    describe("when two nodes are created", async () => {
        beforeEach(async () => {
            await nodesFunctionality.createNode(
                validator,
                "0x56bc75e2d63100000",
                "0x01" +
                "2161" + // port
                "0000" + // nonce
                "7f000001" + // ip
                "7f000001" + // public ip
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                "6432"); // name
            await nodesFunctionality.createNode(
                validator,
                "0x56bc75e2d63100000",
                "0x01" +
                "2161" + // port
                "0000" + // nonce
                "7f000002" + // ip
                "7f000002" + // public ip
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                "6433"); // name
        });

        it("should delete first node", async () => {
            await nodesFunctionality.removeNode(validator, 0);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should delete second node", async () => {
            await nodesFunctionality.removeNode(validator, 1);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should init withdrawing deposit from first node", async () => {
            await nodesFunctionality.initWithdrawDeposit(validator, 0);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should init withdrawing deposit from second node", async () => {
            await nodesFunctionality.initWithdrawDeposit(validator, 1);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should complete withdrawing deposit from first node", async () => {
            await nodesFunctionality.completeWithdrawDeposit(owner, 0)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");

            await nodesFunctionality.completeWithdrawDeposit(validator, 0)
                .should.be.eventually.rejectedWith("Node is no Leaving");

            await nodesFunctionality.initWithdrawDeposit(validator, 0);

            await nodesFunctionality.completeWithdrawDeposit(validator, 0)
                .should.be.eventually.rejectedWith("eaving period is not expired");

            skipTime(web3, 5);

            await nodesFunctionality.completeWithdrawDeposit(validator, 0);

            const node = await nodesData.nodes(0);
            node[8].should.be.deep.equal(web3.utils.toBN(2));
        });

        it("should complete withdrawing deposit from second node", async () => {
            await nodesFunctionality.completeWithdrawDeposit(owner, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");

            await nodesFunctionality.completeWithdrawDeposit(validator, 1)
                .should.be.eventually.rejectedWith("Node is no Leaving");

            await nodesFunctionality.initWithdrawDeposit(validator, 1);

            await nodesFunctionality.completeWithdrawDeposit(validator, 1)
                .should.be.eventually.rejectedWith("eaving period is not expired");

            skipTime(web3, 5);

            await nodesFunctionality.completeWithdrawDeposit(validator, 1);

            const node = await nodesData.nodes(1);
            node[8].should.be.deep.equal(web3.utils.toBN(2));
        });
    });
});
