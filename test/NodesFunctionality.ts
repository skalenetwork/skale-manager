import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         NodesDataInstance,
         NodesFunctionalityInstance,
         ValidatorServiceInstance } from "../types/truffle-contracts";

import { deployContractManager } from "./utils/deploy/contractManager";
import { deployValidatorService } from "./utils/deploy/delegation/validatorService";
import { deployNodesData } from "./utils/deploy/nodesData";
import { deployNodesFunctionality } from "./utils/deploy/nodesFunctionality";
import { skipTime } from "./utils/time";

chai.should();
chai.use(chaiAsPromised);

contract("NodesFunctionality", ([owner, validator, nodeAddress, nodeAddress2]) => {
    let contractManager: ContractManagerInstance;
    let nodesData: NodesDataInstance;
    let nodesFunctionality: NodesFunctionalityInstance;
    let validatorService: ValidatorServiceInstance;
    const validatorId = 1;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        nodesData = await deployNodesData(contractManager);
        nodesFunctionality = await deployNodesFunctionality(contractManager);
        validatorService = await deployValidatorService(contractManager);

        await validatorService.registerValidator("Validator", "D2", 0, 0, {from: validator});
        const validatorIndex = await validatorService.getValidatorId(validator);
        let signature1 = await web3.eth.sign(web3.utils.soliditySha3(validatorIndex.toString()), nodeAddress);
        signature1 = (signature1.slice(130) === "00" ? signature1.slice(0, 130) + "1b" :
                (signature1.slice(130) === "01" ? signature1.slice(0, 130) + "1c" : signature1));
        let signature2 = await web3.eth.sign(web3.utils.soliditySha3(validatorIndex.toString()), nodeAddress2);
        signature2 = (signature2.slice(130) === "00" ? signature2.slice(0, 130) + "1b" :
                (signature2.slice(130) === "01" ? signature2.slice(0, 130) + "1c" : signature2));
        await validatorService.linkNodeAddress(nodeAddress, signature1, {from: validator});
        await validatorService.linkNodeAddress(nodeAddress2, signature2, {from: validator});
    });

    it("should fail to create node if ip is zero", async () => {
        await nodesFunctionality.createNode(
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
        await nodesFunctionality.createNode(
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
        await nodesFunctionality.createNode(
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
        await nodesFunctionality.createNode(
            nodeAddress,
            "0x01" +
            "2161" + // port
            "0000" + // nonce
            "7f000001" + // ip
            "7f000001" + // public ip
            "1122334455667788990011223344556677889900112233445566778899001122" +
            "1122334455667788990011223344556677889900112233445566778899001122" + // public key
            "6432");  // name

        const node = await nodesData.nodes(0);
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
            await nodesFunctionality.createNode(
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
            await nodesFunctionality.removeNode(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");
        });

        it("should fail to delete non active node", async () => {
            await nodesData.setNodeLeaving(0);

            await nodesFunctionality.removeNode(nodeAddress, 0)
                .should.be.eventually.rejectedWith("Node is not Active");
        });

        it("should delete node", async () => {
            await nodesFunctionality.removeNode(nodeAddress, 0);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
        });

        it("should fail to initiate exiting for non existing node", async () => {
            await nodesFunctionality.initExit(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");
        });

        it("should initiate exiting", async () => {
            await nodesFunctionality.initExit(nodeAddress, 0);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
        });

        it("should complete exiting", async () => {
            await nodesFunctionality.completeExit(validator, 1)
                .should.be.eventually.rejectedWith("Node does not exist for message sender");

            await nodesFunctionality.completeExit(nodeAddress, 0)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodesFunctionality.initExit(nodeAddress, 0);

            await nodesFunctionality.completeExit(nodeAddress, 0);
        });
    });

    describe("when two nodes are created", async () => {
        beforeEach(async () => {
            await nodesFunctionality.createNode(
                nodeAddress,
                "0x01" +
                "2161" + // port
                "0000" + // nonce
                "7f000001" + // ip
                "7f000001" + // public ip
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                "6432"); // name
            await nodesFunctionality.createNode(
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
            await nodesFunctionality.removeNode(nodeAddress, 0);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should delete second node", async () => {
            await nodesFunctionality.removeNode(nodeAddress2, 1);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should initiate exit from first node", async () => {
            await nodesFunctionality.initExit(nodeAddress, 0);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should initiate exit from second node", async () => {
            await nodesFunctionality.initExit(nodeAddress2, 1);

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should complete exiting from first node", async () => {
            await nodesFunctionality.completeExit(nodeAddress, 0)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodesFunctionality.initExit(nodeAddress, 0);

            await nodesFunctionality.completeExit(nodeAddress, 0);
        });

        it("should complete exiting from second node", async () => {
            await nodesFunctionality.completeExit(nodeAddress2, 1)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodesFunctionality.initExit(nodeAddress2, 1);

            await nodesFunctionality.completeExit(nodeAddress2, 1);
        });
    });

});
