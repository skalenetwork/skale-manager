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

import { BigNumber, Wallet } from "ethers";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
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

async function getValidatorIdSignature(validatorId: BigNumber, signer: Wallet) {
    const hash = web3.utils.soliditySha3(validatorId.toString());
    if (hash) {
        const signature = await web3.eth.accounts.sign(hash, signer.privateKey);
        return signature.signature;
    } else {
        return "";
    }
}

describe("NodesFunctionality", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let nodeAddress: Wallet;
    let nodeAddress2: Wallet;
    let holder: SignerWithAddress;

    let contractManager: ContractManager;
    let nodes: Nodes;
    let validatorService: ValidatorService;
    let constantsHolder: ConstantsHolder;
    let skaleToken: SkaleToken;
    let delegationController: DelegationController;

    beforeEach(async () => {
        [owner, validator, holder] = await ethers.getSigners();

        nodeAddress = new Wallet(String(privateKeys[2])).connect(ethers.provider);

        await owner.sendTransaction({to: nodeAddress.address, value: ethers.utils.parseEther("10000")});

        nodeAddress2 = new Wallet(String(privateKeys[3])).connect(ethers.provider);

        await owner.sendTransaction({to: nodeAddress2.address, value: ethers.utils.parseEther("10000")});

        contractManager = await deployContractManager();
        nodes = await deployNodes(contractManager);
        validatorService = await deployValidatorService(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        skaleToken = await deploySkaleToken(contractManager);
        delegationController = await deployDelegationController(contractManager);

        const skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);
        // await contractManager.setContractsAddress("Nodes", nodes.address);

        await validatorService.connect(validator).registerValidator("Validator", "D2", 0, 0);
        const validatorIndex = await validatorService.getValidatorId(validator.address);
        const signature1 = await getValidatorIdSignature(validatorIndex, nodeAddress);
        const signature2 = await getValidatorIdSignature(validatorIndex, nodeAddress2);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature1);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress2.address, signature2);

        const NODE_MANAGER_ROLE = await nodes.NODE_MANAGER_ROLE();
        await nodes.grantRole(NODE_MANAGER_ROLE, owner.address);

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
                domainName: "some.domain.name"
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
                domainName: "some.domain.name"
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
                domainName: "some.domain.name"
            }).should.be.eventually.rejectedWith("Public Key is incorrect");
    });

    it("should create node", async () => {
        const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
        await nodes.createNode(
            nodeAddress.address,
            {
                port: 8545,
                nonce: 0,
                ip: "0x7f000001",
                publicIp: "0x7f000001",
                publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                name: "D2",
                domainName: "some.domain.name"
            });

        const node = await nodes.nodes(0);
        node[0].should.be.equal("D2");
        node[1].should.be.equal("0x7f000001");
        node[2].should.be.equal("0x7f000001");
        node[3].should.be.equal(8545);
        (await nodes.getNodePublicKey(0))
            .should.be.deep.equal(["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')]);
    });

    describe("when node is created", async () => {
        const nodeId = 0;
        beforeEach(async () => {
            const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2",
                    domainName: "some.domain.name"
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

        it("should change IP", async () => {
            await nodes.connect(holder).changeIP(0, "0x7f000001", "0x00000000").should.be.eventually.rejectedWith("Caller is not an admin");
            await nodes.connect(owner).changeIP(0, "0x7f000001", "0x00000000").should.be.eventually.rejectedWith("IP address is zero or is not available");
            await nodes.connect(owner).changeIP(0, "0x00000000", "0x00000000").should.be.eventually.rejectedWith("IP address is zero or is not available");
            await nodes.connect(owner).changeIP(0, "0x7f000002", "0x7f000001").should.be.eventually.rejectedWith("IP address is not the same");
            expect(await nodes.getNodeIP(0)).to.equal("0x7f000001");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(false);
            await nodes.connect(owner).changeIP(0, "0x7f000002", "0x00000000");
            expect(await nodes.getNodeIP(0)).to.equal("0x7f000002");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(false);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(false);
            await nodes.connect(owner).changeIP(0, "0x7f000003", "0x00000000");
            expect(await nodes.getNodeIP(0)).to.equal("0x7f000003");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(false);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(false);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(true);
            await nodes.connect(owner).changeIP(0, "0x7f000001", "0x00000000");
            expect(await nodes.getNodeIP(0)).to.equal("0x7f000001");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(false);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(false);
            await nodes.connect(owner).changeIP(0, "0x7f000002", "0x7f000002");
            expect(await nodes.getNodeIP(0)).to.equal("0x7f000002");
            const res = await nodes.nodes(0);
            expect(res.publicIP).to.equal("0x7f000002");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(false);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(false);
        });

        it("should mark node as incompliant", async () => {
            await nodes.setNodeIncompliant(nodeId)
                .should.be.eventually.rejectedWith("COMPLIANCE_ROLE is required");
            await nodes.grantRole(await nodes.COMPLIANCE_ROLE(), owner.address);

            (await nodes.incompliant(nodeId)).should.be.equal(false);
            await nodes.setNodeIncompliant(nodeId);
            (await nodes.incompliant(nodeId)).should.be.equal(true);
        });

        it("should mark node as compliant", async () => {
            await nodes.grantRole(await nodes.COMPLIANCE_ROLE(), owner.address);
            await nodes.setNodeIncompliant(nodeId);

            (await nodes.incompliant(nodeId)).should.be.equal(true);
            await nodes.setNodeCompliant(nodeId);
            (await nodes.incompliant(nodeId)).should.be.equal(false);
        });
    });

    describe("when two nodes are created", async () => {
        beforeEach(async () => {
            const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2",
                    domainName: "some.domain.name"
                }); // name
                const pubKey2 = ec.keyFromPrivate(String(nodeAddress2.privateKey).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress2.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000002",
                    publicIp: "0x7f000002",
                    publicKey: ["0x" + pubKey2.x.toString('hex'), "0x" + pubKey2.y.toString('hex')],
                    name: "D3",
                    domainName: "some.domain.name"
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

        it("should change IP", async () => {
            await nodes.connect(holder).changeIP(0, "0x7f000001", "0x00000000").should.be.eventually.rejectedWith("Caller is not an admin");
            await nodes.connect(owner).changeIP(0, "0x7f000001", "0x00000000").should.be.eventually.rejectedWith("IP address is zero or is not available");
            await nodes.connect(owner).changeIP(0, "0x00000000", "0x00000000").should.be.eventually.rejectedWith("IP address is zero or is not available");
            await nodes.connect(owner).changeIP(0, "0x7f000002", "0x00000000").should.be.eventually.rejectedWith("IP address is zero or is not available");
            await nodes.connect(owner).changeIP(0, "0x7f000003", "0x7f000002").should.be.eventually.rejectedWith("IP address is not the same");
            await nodes.connect(holder).changeIP(1, "0x7f000002", "0x00000000").should.be.eventually.rejectedWith("Caller is not an admin");
            await nodes.connect(owner).changeIP(1, "0x7f000002", "0x00000000").should.be.eventually.rejectedWith("IP address is zero or is not available");
            await nodes.connect(owner).changeIP(1, "0x00000000", "0x00000000").should.be.eventually.rejectedWith("IP address is zero or is not available");
            await nodes.connect(owner).changeIP(1, "0x7f000001", "0x00000000").should.be.eventually.rejectedWith("IP address is zero or is not available");
            await nodes.connect(owner).changeIP(0, "0x7f000004", "0x7f000002").should.be.eventually.rejectedWith("IP address is not the same");
            expect(await nodes.getNodeIP(0)).to.equal("0x7f000001");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(false);
            await nodes.connect(owner).changeIP(0, "0x7f000003", "0x00000000");
            expect(await nodes.getNodeIP(0)).to.equal("0x7f000003");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(false);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(true);
            await nodes.connect(owner).changeIP(1, "0x7f000001", "0x00000000");
            expect(await nodes.getNodeIP(1)).to.equal("0x7f000001");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(false);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(true);
            await nodes.connect(owner).changeIP(0, "0x7f000002", "0x00000000");
            expect(await nodes.getNodeIP(0)).to.equal("0x7f000002");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(false);
            await nodes.connect(owner).changeIP(1, "0x7f000003", "0x7f000003");
            expect(await nodes.getNodeIP(1)).to.equal("0x7f000003");
            const res = await nodes.nodes(1);
            expect(res.publicIP).to.equal("0x7f000003");
            expect(await nodes.nodesIPCheck("0x7f000001")).to.equal(false);
            expect(await nodes.nodesIPCheck("0x7f000002")).to.equal(true);
            expect(await nodes.nodesIPCheck("0x7f000003")).to.equal(true);
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
            const CONSTANTS_HOLDER_MANAGER_ROLE = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
            await constantsHolder.grantRole(CONSTANTS_HOLDER_MANAGER_ROLE, owner.address);
            await constantsHolder.setMSR(amount * 5);
            const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
            await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
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

            const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2",
                    domainName: "some.domain.name"
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
            const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2",
                    domainName: "some.domain.name"
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
                    domainName: "some.domain.name"
                });

            const nodeIndexesBN = (await nodes.getValidatorNodeIndexes(validatorId));
            for (let i = 0; i < nodeIndexesBN.length; i++) {
                const nodeIndex = (await nodes.getValidatorNodeIndexes(validatorId))[i];
                nodeIndex.should.be.equal(i);
            }
        });
    });
});
