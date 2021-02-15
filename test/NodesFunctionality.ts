import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractManager,
         Nodes,
         SkaleToken,
         ValidatorService,
         DelegationController,
         ConstantsHolder} from "../typechain";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import { skipTime } from "./tools/time";

import { BigNumber } from "ethers";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deployNodesTester } from "./tools/deploy/test/nodesTester";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deploySkaleManagerMock } from "./tools/deploy/test/skaleManagerMock";
import { ethers, web3 } from "hardhat";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { assert, expect } from "chai";


chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

async function getValidatorIdSignature(validatorId: BigNumber, signer: SignerWithAddress) {
    const hash = web3.utils.soliditySha3(validatorId.toString());
    if (hash) {
        let signature = await web3.eth.sign(hash, signer.address);
        signature = (
            signature.slice(130) === "00" ?
            signature.slice(0, 130) + "1b" :
            (
                signature.slice(130) === "01" ?
                signature.slice(0, 130) + "1c" :
                signature
            )
        );
        return signature;
    } else {
        return "";
    }
}

describe("NodesFunctionality", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let nodeAddress: SignerWithAddress;
    let nodeAddress2: SignerWithAddress;
    let holder: SignerWithAddress;

    let contractManager: ContractManager;
    let nodes: Nodes;
    let validatorService: ValidatorService;
    let constantsHolder: ConstantsHolder;
    let skaleToken: SkaleToken;
    let delegationController: DelegationController;

    beforeEach(async () => {
        [owner, validator, nodeAddress, nodeAddress2, holder] = await ethers.getSigners();

        contractManager = await deployContractManager();
        nodes = await deployNodesTester(contractManager);
        validatorService = await deployValidatorService(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        skaleToken = await deploySkaleToken(contractManager);
        delegationController = await deployDelegationController(contractManager);

        const skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);
        await contractManager.setContractsAddress("Nodes", nodes.address);

        await validatorService.connect(validator).registerValidator("Validator", "D2", 0, 0);
        const validatorIndex = await validatorService.getValidatorId(validator.address);
        const signature1 = await getValidatorIdSignature(validatorIndex, nodeAddress);
        const signature2 = await getValidatorIdSignature(validatorIndex, nodeAddress2);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature1);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress2.address, signature2);
    });

    it("should fail to create node if ip is zero", async () => {
        const pubKey = ec.keyFromPrivate(String(privateKeys[1]).slice(2)).getPublic();
        await nodes.createNode(
            validator.address,
            {
                port: 8545,
                nonce: 0,
                ip: "0x00000000",
                publicIp: "0x7f000001",
                publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                name: "D2",
                domainName: "somedomain.name"
            }).should.be.eventually.rejectedWith("IP address is zero or is not available");
    });

    it("should fail to create node if port is zero", async () => {
        const pubKey = ec.keyFromPrivate(String(privateKeys[1]).slice(2)).getPublic();
        await nodes.createNode(
            validator.address,
            {
                port: 0,
                nonce: 0,
                ip: "0x7f000001",
                publicIp: "0x7f000001",
                publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                name: "D2",
                domainName: "somedomain.name"
            }).should.be.eventually.rejectedWith("Port is zero");
    });

    it("should fail to create node if public Key is incorrect", async () => {
        const pubKey = ec.keyFromPrivate(String(privateKeys[1]).slice(2)).getPublic();
        await nodes.createNode(
            validator.address,
            {
                port: 8545,
                nonce: 0,
                ip: "0x7f000001",
                publicIp: "0x7f000001",
                publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex').slice(1) + "0"],
                name: "D2",
                domainName: "somedomain.name"
            }).should.be.eventually.rejectedWith("Public Key is incorrect");
    });

    it("should create node", async () => {
        const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        await nodes.createNode(
            nodeAddress.address,
            {
                port: 8545,
                nonce: 0,
                ip: "0x7f000001",
                publicIp: "0x7f000001",
                publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                name: "D2",
                domainName: "somedomain.name"
            });

        const node = await nodes.nodes(0);
        node[0].should.be.equal("D2");
        node[1].should.be.equal("0x7f000001");
        node[2].should.be.equal("0x7f000001");
        node[3].should.be.equal(8545);
        (await nodes.getNodePublicKey(0))
            .should.be.deep.equal(["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')]);
    });

    it("should test initialize function", async () => {
        const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        for(let i = 0; i < 20; i++) {
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f" + ("000000" + i.toString(16)).slice(-6),
                    publicIp: "0x7f" + ("000000" + i.toString(16)).slice(-6),
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2" + i,
                    domainName: "somedomain.name"
                });
        }

        let nodesInTree = await nodes.amountOfNodesInTree();
        nodesInTree.should.be.equal(20);

        await nodes.setNodeInMaintenance(0);
        await nodes.setNodeInMaintenance(1);
        await nodes.initExit(2);
        await nodes.completeExit(2);
        await nodes.initExit(3);
        await nodes.completeExit(3);

        // remove nodes from invisible map and from tree
        await nodes.makeNodeVisible(0);
        await nodes.makeNodeVisible(1);
        await nodes.makeNodeVisible(2);
        await nodes.makeNodeVisible(3);

        await nodes.removeNodeFromSpaceToNodes(2);
        await nodes.removeNodeFromSpaceToNodes(3);

        nodesInTree = await nodes.amountOfNodesInTree();
        nodesInTree.should.be.equal(18);

        await nodes.removeNodesFromTree(nodesInTree.toNumber());

        nodesInTree = await nodes.amountOfNodesInTree();
        nodesInTree.should.be.equal(0);

        await nodes.initializeSegmentTreeAndInvisibleNodes();

        nodesInTree = await nodes.amountOfNodesInTree();
        nodesInTree.should.be.equal(16);

        await (await nodes.spaceOfNodes(0)).freeSpace.should.be.equal(128);
        await (await nodes.spaceOfNodes(1)).freeSpace.should.be.equal(128);
        await (await nodes.spaceOfNodes(2)).freeSpace.should.be.equal(0);
        await (await nodes.spaceOfNodes(3)).freeSpace.should.be.equal(0);

        for (let i = 4; i < 16; i++) {
            await (await nodes.spaceToNodes(128, i)).toNumber().should.be.equal(i);
        }

        await (await nodes.spaceToNodes(128, 0)).toNumber().should.be.equal(19);
        await (await nodes.spaceToNodes(128, 1)).toNumber().should.be.equal(18);
        await (await nodes.spaceToNodes(128, 2)).toNumber().should.be.equal(17);
        await (await nodes.spaceToNodes(128, 3)).toNumber().should.be.equal(16);
    });

    describe("when node is created", async () => {
        beforeEach(async () => {
            const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2",
                    domainName: "somedomain.name"
                });
        });

        it("should fail to delete non active node", async () => {
            await nodes.completeExit(0)
                .should.be.eventually.rejectedWith("Node is not Leaving");
        });

        it("should delete node", async () => {
            await nodes.initExit(0);
            await nodes.completeExit(0);

            (await nodes.numberOfActiveNodes()).should.be.equal(0);
        });

        it("should initiate exiting", async () => {
            await nodes.initExit(0);

            (await nodes.numberOfActiveNodes()).should.be.equal(0);
        });

        it("should complete exiting", async () => {

            await nodes.completeExit(0)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodes.initExit(0);

            await nodes.completeExit(0);
        });
    });

    describe("when two nodes are created", async () => {
        beforeEach(async () => {
            const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2",
                    domainName: "somedomain.name"
                }); // name
                const pubKey2 = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress2.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000002",
                    publicIp: "0x7f000002",
                    publicKey: ["0x" + pubKey2.x.toString('hex'), "0x" + pubKey2.y.toString('hex')],
                    name: "D3",
                    domainName: "somedomain.name"
                }); // name
        });

        it("should delete first node", async () => {
            await nodes.initExit(0);
            await nodes.completeExit(0);

            (await nodes.numberOfActiveNodes()).should.be.equal(1);
        });

        it("should delete second node", async () => {
            await nodes.initExit(1);
            await nodes.completeExit(1);

            (await nodes.numberOfActiveNodes()).should.be.equal(1);
        });

        it("should initiate exit from first node", async () => {
            await nodes.initExit(0);

            (await nodes.numberOfActiveNodes()).should.be.equal(1);
        });

        it("should initiate exit from second node", async () => {
            await nodes.initExit(1);

            (await nodes.numberOfActiveNodes()).should.be.equal(1);
        });

        it("should complete exiting from first node", async () => {
            await nodes.completeExit(0)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodes.initExit(0);

            await nodes.completeExit(0);
        });

        it("should complete exiting from second node", async () => {
            await nodes.completeExit(1)
                .should.be.eventually.rejectedWith("Node is not Leaving");

            await nodes.initExit(1);

            await nodes.completeExit(1);
        });
    });

    describe("when holder has enough tokens", async () => {
        const validatorId = 1;
        let amount: number;
        let delegationPeriod: number;
        let info: string;
        const month = 60 * 60 * 24 * 31;
        beforeEach(async () => {
            amount = 100;
            delegationPeriod = 2;
            info = "NICE";
            await skaleToken.mint(holder.address, 200, "0x", "0x");
            await skaleToken.mint(nodeAddress.address, 200, "0x", "0x");
            await constantsHolder.setMSR(amount * 5);
        });

        it("should not allow to create node if new epoch isn't started", async () => {
            await validatorService.enableValidator(validatorId);
            await delegationController.connect(holder).delegate(validatorId, amount, delegationPeriod, info);
            const delegationId = 0;
            await delegationController.connect(validator).acceptPendingDelegation(delegationId);

            await nodes.checkPossibilityCreatingNode(nodeAddress.address)
                .should.be.eventually.rejectedWith("Validator must meet the Minimum Staking Requirement");
        });

        it("should allow to create node if new epoch is started", async () => {
            await validatorService.enableValidator(validatorId);
            await delegationController.connect(holder).delegate(validatorId, amount, delegationPeriod, info);
            const delegationId = 0;
            await delegationController.connect(validator).acceptPendingDelegation(delegationId);
            await skipTime(ethers, month);

            await nodes.checkPossibilityCreatingNode(nodeAddress.address)
                .should.be.eventually.rejectedWith("Validator must meet the Minimum Staking Requirement");

            await constantsHolder.setMSR(amount);

            // now it should not reject
            await nodes.checkPossibilityCreatingNode(nodeAddress.address);

            const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2",
                    domainName: "somedomain.name"
                });
            const nodeIndex = (await nodes.getValidatorNodeIndexes(validatorId))[0];
            nodeIndex.should.be.equal(0);
        });

        it("should allow to create 2 nodes", async () => {
            const validator3 = nodeAddress;
            await validatorService.enableValidator(validatorId);
            await delegationController.connect(holder).delegate(validatorId, amount, delegationPeriod, info);
            const delegationId1 = 0;
            await delegationController.connect(validator).acceptPendingDelegation(delegationId1);
            await delegationController.connect(validator3).delegate(validatorId, amount, delegationPeriod, info);
            const delegationId2 = 1;
            await delegationController.connect(validator).acceptPendingDelegation(delegationId2);

            await skipTime(ethers, 2678400); // 31 days
            await nodes.checkPossibilityCreatingNode(nodeAddress.address)
                .should.be.eventually.rejectedWith("Validator must meet the Minimum Staking Requirement");

            await constantsHolder.setMSR(amount);

            await nodes.checkPossibilityCreatingNode(nodeAddress.address);
            const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2",
                    domainName: "somedomain.name"
                });

            await nodes.checkPossibilityCreatingNode(nodeAddress.address);
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000002",
                    publicIp: "0x7f000002",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D3",
                    domainName: "somedomain.name"
                });

            const nodeIndexesBN = (await nodes.getValidatorNodeIndexes(validatorId));
            for (let i = 0; i < nodeIndexesBN.length; i++) {
                const nodeIndex = (await nodes.getValidatorNodeIndexes(validatorId))[i];
                nodeIndex.should.be.equal(i);
            }
        });
    });
});
