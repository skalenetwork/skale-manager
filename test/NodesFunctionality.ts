import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         NodesInstance,
         ValidatorServiceInstance } from "../types/truffle-contracts";

import { deployContractManager } from "./utils/deploy/contractManager";
import { deployValidatorService } from "./utils/deploy/delegation/validatorService";
import { deployNodes } from "./utils/deploy/nodes";
import { skipTime } from "./utils/time";

chai.should();
chai.use(chaiAsPromised);

contract("NodesFunctionality", ([owner, validator, nodeAddress, nodeAddress2]) => {
    let contractManager: ContractManagerInstance;
    let nodes: NodesInstance;
    let validatorService: ValidatorServiceInstance;
    const validatorId = 1;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        nodes = await deployNodes(contractManager);
        validatorService = await deployValidatorService(contractManager);

        await validatorService.registerValidator("Validator", "D2", 0, 0, {from: validator});
        await validatorService.linkNodeAddress(nodeAddress, {from: validator});
        await validatorService.linkNodeAddress(nodeAddress2, {from: validator});
    });

    it("should fail to create node if ip is zero", async () => {
        await nodes.createNode(
            validator,
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
        await nodes.createNode(
        validator,
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
        await nodes.createNode(
            validator,
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
        await nodes.createNode(
            nodeAddress,
            "0x01" +
            "2161" + // port
            "0000" + // nonce
            "7f000001" + // ip
            "7f000001" + // public ip
            "1122334455667788990011223344556677889900112233445566778899001122" +
            "1122334455667788990011223344556677889900112233445566778899001122" + // public key
            "6432");  // name

        const node = await nodes.nodes(0);
        node[0].should.be.equal("d2");
        node[1].should.be.equal("0x7f000001");
        node[2].should.be.equal("0x7f000001");
        node[3].should.be.deep.equal(web3.utils.toBN(8545));
        node[4].should.be.equal(
            "0x1122334455667788990011223344556677889900112233445566778899001122" +
            "1122334455667788990011223344556677889900112233445566778899001122");
    });

    describe("when node is created", async () => {
        beforeEach(async () => {
            await nodes.createNode(
                nodeAddress,
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
            await nodes.removeNode(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");
        });

        it("should fail to delete non active node", async () => {
            await nodes.setNodeLeaving(0);

            await nodes.removeNode(nodeAddress, 0)
                .should.be.eventually.rejectedWith("Node is not Active");
        });

        it("should delete node", async () => {
            await nodes.removeNode(nodeAddress, 0);

            await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
        });

        it("should fail to initiate exiting for non existing node", async () => {
            await nodes.initExit(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");
        });

        it("should initiate exiting", async () => {
            await nodes.initExit(nodeAddress, 0);

            await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
        });

        it("should complete exiting", async () => {
            await nodes.completeExit(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");

            await nodes.completeExit(nodeAddress, 0)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodes.initExit(nodeAddress, 0);

            await nodes.completeExit(nodeAddress, 0);
        });
    });

    describe("when two nodes are created", async () => {
        beforeEach(async () => {
            await nodes.createNode(
                nodeAddress,
                "0x01" +
                "2161" + // port
                "0000" + // nonce
                "7f000001" + // ip
                "7f000001" + // public ip
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                "6432"); // name
            await nodes.createNode(
                nodeAddress2,
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
            await nodes.removeNode(nodeAddress, 0);

            await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should delete second node", async () => {
            await nodes.removeNode(nodeAddress2, 1);

            await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should initiate exit from first node", async () => {
            await nodes.initExit(nodeAddress, 0);

            await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should initiate exit from second node", async () => {
            await nodes.initExit(nodeAddress2, 1);

            await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should complete exiting from first node", async () => {
            await nodes.completeExit(nodeAddress, 0)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodes.initExit(nodeAddress, 0);

            await nodes.completeExit(nodeAddress, 0);
        });

        it("should complete exiting from second node", async () => {
            await nodes.completeExit(nodeAddress2, 1)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodes.initExit(nodeAddress2, 1);

            await nodes.completeExit(nodeAddress2, 1);
        });
    });

});
