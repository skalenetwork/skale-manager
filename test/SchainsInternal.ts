import { ContractManager,
         Nodes,
         SchainsInternalMock,
         ValidatorService } from "../typechain";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import { BigNumber, PopulatedTransaction, Wallet } from "ethers";
import chai = require("chai");
import chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { deploySchainsInternalMock } from "./tools/deploy/test/schainsInternalMock";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { skipTime } from "./tools/time";
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

async function sendTransactionFromWallet(tx: PopulatedTransaction, signer: Wallet) {
    await signer.signTransaction(tx);
    return await signer.connect(ethers.provider).sendTransaction(tx);
}

function boolParser(res: string) {
    return "" + (res === '0x0000000000000000000000000000000000000000000000000000000000000001');
}

async function callFromWallet(tx: PopulatedTransaction, signer: Wallet, parser: (a: string) => string): Promise<string> {
    await signer.signTransaction(tx);
    return parser(await signer.connect(ethers.provider).call(tx));
}

function stringValue(value: string | null) {
    if (value) {
        return value;
    } else {
        return "";
    }
}

describe("SchainsInternal", () => {
    let owner: SignerWithAddress;
    let holder: SignerWithAddress;
    let nodeAddress: Wallet;

    let contractManager: ContractManager;
    let nodes: Nodes;
    let schainsInternal: SchainsInternalMock;
    let validatorService: ValidatorService;

    beforeEach(async () => {
        [owner, holder] = await ethers.getSigners();

        nodeAddress = new Wallet(String(privateKeys[1]));
        await owner.sendTransaction({to: nodeAddress.address, value: ethers.utils.parseEther("10000")});

        contractManager = await deployContractManager();
        nodes = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternalMock(contractManager);
        validatorService = await deployValidatorService(contractManager);

        // contract must be set in contractManager for proper work of allow modifier
        await contractManager.setContractsAddress("Schains", nodes.address);
        await contractManager.setContractsAddress("SchainsInternal", schainsInternal.address);
        await contractManager.setContractsAddress("SkaleManager", nodes.address);

        validatorService.connect(holder).registerValidator("D2", "D2 is even", 0, 0);
        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        const validatorIndex = await validatorService.getValidatorId(holder.address);
        await validatorService.enableValidator(validatorIndex);
        const signature = await getValidatorIdSignature(validatorIndex, nodeAddress);
        await validatorService.connect(holder).linkNodeAddress(nodeAddress.address, signature);

        const SCHAIN_TYPE_MANAGER_ROLE = await schainsInternal.SCHAIN_TYPE_MANAGER_ROLE();
        await schainsInternal.grantRole(SCHAIN_TYPE_MANAGER_ROLE, owner.address);

        await schainsInternal.addSchainType(1, 16);
        await schainsInternal.addSchainType(4, 16);
        await schainsInternal.addSchainType(128, 16);
        await schainsInternal.addSchainType(0, 2);
        await schainsInternal.addSchainType(32, 4);
    });

    it("should initialize schain", async () => {
        await schainsInternal.initializeSchain("TestSchain", holder.address, 5, 5);

        const schain = await schainsInternal.schains(stringValue(web3.utils.soliditySha3("TestSchain")));
        schain.name.should.be.equal("TestSchain");
        schain.owner.should.be.equal(holder.address);
        schain.lifetime.should.be.equal(5);
        schain.deposit.should.be.equal(5);
    });

    describe("on existing schain", async () => {
        const schainNameHash = stringValue(web3.utils.soliditySha3("TestSchain"));

        beforeEach(async () => {
            await schainsInternal.initializeSchain("TestSchain", holder.address, 5, 5);
            const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
            await nodes.createNode(nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "D2-01",
                    domainName: "some.domain.name"
                });
        });

        it("should register schain index for owner", async () => {
            await schainsInternal.setSchainIndex(schainNameHash, holder.address);

            const schain = await schainsInternal.schains(schainNameHash);
            schain.indexInOwnerList.should.be.equal(0);

            await schainsInternal.schainIndexes(holder.address, 0).should.eventually.equal(schainNameHash);
        });

        it("should be able to add schain to node", async () => {
            await schainsInternal.addSchainForNode(5, schainNameHash);
            await schainsInternal.getSchainHashesForNode(5).should.eventually.deep.equal([schainNameHash]);
            await schainsInternal.getSchainIdsForNode(5).should.eventually.deep.equal([schainNameHash]);
        });

        it("should set amount of resources that schains occupied", async () => {
            await schainsInternal.createGroupForSchain(schainNameHash, 1, 2);

            expect((await schainsInternal.schains(schainNameHash)).partOfNode).to.be.equal(2);
            const totalResources = await schainsInternal.sumOfSchainsResources();
            totalResources.should.be.equal(64);
        });

        it("should change schain lifetime", async () => {
            await schainsInternal.changeLifetime(schainNameHash, 7, 8);
            const schain = await schainsInternal.schains(schainNameHash);
            schain.lifetime.should.be.equal(12);
            schain.deposit.should.be.equal(13);
        });

        describe("on registered schain", async function() {
            const nodeIndex = 0;
            this.beforeEach(async () => {
                await schainsInternal.setSchainIndex(schainNameHash, holder.address);
                await schainsInternal.createGroupForSchain(schainNameHash, 1, 2);
            });

            it("should delete schain", async () => {
                await schainsInternal.removeSchain(schainNameHash, holder.address);
                const res = await schainsInternal.schains(schainNameHash);
                res.name.should.be.equal("");
            });

            it("should check group", async () => {
                const res = await schainsInternal.getNodesInGroup(schainNameHash);
                res.length.should.be.equal(1);
                res[0].toNumber().should.be.equal(0);
            });

            it("should delete group", async () => {
                await schainsInternal.deleteGroup(schainNameHash);
                const res = await schainsInternal.getNodesInGroup(schainNameHash);
                res.length.should.be.equal(0);
                await schainsInternal.getNodesInGroup(schainNameHash).should.be.eventually.empty;
            });

            it("should remove schain from node", async () => {
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                (await schainsInternal.getLengthOfSchainsForNode(nodeIndex)).should.be.equal(0);
            });

            it("should add another schain to the node and remove first correctly", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain")));
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain1")));
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal(
                    [stringValue(web3.utils.soliditySha3("NewSchain1")), stringValue(web3.utils.soliditySha3("NewSchain"))],
                );
            });

            it("should add a hole after deleting", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain1")));
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                (await schainsInternal.holesForNodes(nodeIndex, 0)).should.be.equal(1);
            });

            it("should add another hole after deleting", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain1")));
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                (await schainsInternal.holesForNodes(nodeIndex, 0)).should.be.equal(0);
                (await schainsInternal.holesForNodes(nodeIndex, 1)).should.be.equal(1);
            });

            it("should add another hole after deleting different order", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain1")));
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                (await schainsInternal.holesForNodes(nodeIndex, 0)).should.be.equal(0);
                (await schainsInternal.holesForNodes(nodeIndex, 1)).should.be.equal(1);
            });

            it("should add schain in a hole", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain1")));
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain2")));
                (await schainsInternal.holesForNodes(nodeIndex, 0)).should.be.equal(0);
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal(
                    [
                        "0x0000000000000000000000000000000000000000000000000000000000000000",
                        stringValue(web3.utils.soliditySha3("NewSchain2")),
                        stringValue(web3.utils.soliditySha3("NewSchain1")),
                    ],
                );
            });

            it("should add second schain in a hole", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain1")));
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain2")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain3")));
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal(
                    [
                        stringValue(web3.utils.soliditySha3("NewSchain3")),
                        stringValue(web3.utils.soliditySha3("NewSchain2")),
                        stringValue(web3.utils.soliditySha3("NewSchain1")),
                    ],
                );
            });

            it("should add third schain like new", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain1")));
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain2")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain3")));
                await schainsInternal.addSchainForNode(nodeIndex, stringValue(web3.utils.soliditySha3("NewSchain4")));
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal(
                    [
                        stringValue(web3.utils.soliditySha3("NewSchain3")),
                        stringValue(web3.utils.soliditySha3("NewSchain2")),
                        stringValue(web3.utils.soliditySha3("NewSchain1")),
                        stringValue(web3.utils.soliditySha3("NewSchain4")),
                    ],
                );
            });

            it("should get schain part of node", async () => {
                const part = await schainsInternal.getSchainsPartOfNode(schainNameHash);
                part.should.be.equal(2);
            });

            it("should return amount of created schains by user", async () => {
                (await schainsInternal.getSchainListSize(holder.address)).should.be.equal(1);
                (await schainsInternal.getSchainListSize(owner.address)).should.be.equal(0);
            });

            it("should get schains ids by user", async () => {
                await schainsInternal.getSchainHashesByAddress(holder.address).should.eventually.be.deep.equal([schainNameHash]);
                await schainsInternal.getSchainIdsByAddress(holder.address).should.eventually.be.deep.equal([schainNameHash]);
            });

            it("should return schains by node", async () => {
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal([schainNameHash]);
            });

            it("should return number of schains per node", async () => {
                const count = await schainsInternal.getLengthOfSchainsForNode(nodeIndex);
                count.should.be.equal(1);
            });

            it("should successfully move to placeOfSchainOnNode", async () => {
                const DEBUGGER_ROLE = await schainsInternal.DEBUGGER_ROLE();
                await schainsInternal.grantRole(DEBUGGER_ROLE, owner.address);
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
                const nodesCount = 15;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("2" + index.toString(16)).slice(-2);
                    await nodes.createNode(nodeAddress.address,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f0000" + hexIndex,
                            publicIp: "0x7f0000" + hexIndex,
                            publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                            name: "D2-" + hexIndex,
                            domainName: "some.domain.name"
                        }
                    );
                }
                const schainName2 = "TestSchain2";
                const schainNameHash2 = stringValue(web3.utils.soliditySha3(schainName2));
                await schainsInternal.initializeSchain(schainName2, holder.address, 5, 5);
                await schainsInternal.setSchainIndex(schainNameHash2, holder.address);
                await schainsInternal.createGroupForSchain(schainNameHash2, 16, 32);
                const res = await schainsInternal.getNodesInGroup(schainNameHash2);
                for (const index of res) {
                    await schainsInternal.removePlaceOfSchainOnNode(schainNameHash2, index);
                }
                for (const index of res) {
                    const place = await schainsInternal.findSchainAtSchainsForNode(index, schainNameHash2);
                    const lengthOfSchainsForNode = await schainsInternal.getLengthOfSchainsForNode(index);
                    place.toString().should.be.equal(lengthOfSchainsForNode.toString());
                }
                await schainsInternal.moveToPlaceOfSchainOnNode(schainNameHash2);
                for (const index of res) {
                    const place = await schainsInternal.findSchainAtSchainsForNode(index, schainNameHash2);
                    place.toString().should.be.equal("0");
                }
            });

        });

        it("should return list of schains", async () => {
            await schainsInternal.getSchains().should.eventually.deep.equal([schainNameHash]);
        });

        it("should check if schain name is available", async () => {
            await schainsInternal.isSchainNameAvailable("TestSchain").should.be.eventually.false;
            await schainsInternal.isSchainNameAvailable("D2WroteThisTest").should.be.eventually.true;
        });

        it("should check if schain is expired", async () => {
            await schainsInternal.isTimeExpired(schainNameHash).should.be.eventually.false;

            await skipTime(ethers, 6);

            await schainsInternal.isTimeExpired(schainNameHash).should.be.eventually.true;
        });

        it("should check if user is an owner of schain", async () => {
            await schainsInternal.isOwnerAddress(owner.address, schainNameHash).should.be.eventually.false;
            await schainsInternal.isOwnerAddress(holder.address, schainNameHash).should.be.eventually.true;
        });

        it("should set new number of schain types", async () => {
            (await schainsInternal.numberOfSchainTypes()).should.be.equal(5);
            await schainsInternal.connect(holder).setNumberOfSchainTypes(6).should.be.eventually.rejectedWith("SCHAIN_TYPE_MANAGER_ROLE is required");
            await schainsInternal.setNumberOfSchainTypes(6);
            (await schainsInternal.numberOfSchainTypes()).should.be.equal(6);
        });

        it("should add new type of schain", async () => {
            (await schainsInternal.numberOfSchainTypes()).should.be.equal(5);
            await schainsInternal.connect(holder).addSchainType(8, 16).should.be.eventually.rejectedWith("SCHAIN_TYPE_MANAGER_ROLE is required");
            await schainsInternal.addSchainType(8, 16);
            (await schainsInternal.numberOfSchainTypes()).should.be.equal(6);
            const resSchainType = await schainsInternal.schainTypes(6);
            resSchainType.partOfNode.should.be.equal(8);
            resSchainType.numberOfNodes.should.be.equal(16);
        });

        it("should remove type of schain", async () => {
            (await schainsInternal.numberOfSchainTypes()).should.be.equal(5);

            await schainsInternal.connect(holder).addSchainType(8, 16).should.be.eventually.rejectedWith("SCHAIN_TYPE_MANAGER_ROLE is required");
            await schainsInternal.addSchainType(8, 16);
            await schainsInternal.addSchainType(32, 16);

            (await schainsInternal.numberOfSchainTypes()).should.be.equal(7);

            let resSchainType = await schainsInternal.schainTypes(6);
            resSchainType.partOfNode.should.be.equal(8);
            resSchainType.numberOfNodes.should.be.equal(16);

            resSchainType = await schainsInternal.schainTypes(7);
            resSchainType.partOfNode.should.be.equal(32);
            resSchainType.numberOfNodes.should.be.equal(16);

            await schainsInternal.connect(holder).removeSchainType(6).should.be.eventually.rejectedWith("SCHAIN_TYPE_MANAGER_ROLE is required");
            await schainsInternal.removeSchainType(6);

            resSchainType = await schainsInternal.schainTypes(6);
            resSchainType.partOfNode.should.be.equal(0);
            resSchainType.numberOfNodes.should.be.equal(0);

            resSchainType = await schainsInternal.schainTypes(7);
            resSchainType.partOfNode.should.be.equal(32);
            resSchainType.numberOfNodes.should.be.equal(16);

            await schainsInternal.connect(holder).removeSchainType(7).should.be.eventually.rejectedWith("SCHAIN_TYPE_MANAGER_ROLE is required");
            await schainsInternal.removeSchainType(7);

            resSchainType = await schainsInternal.schainTypes(6);
            resSchainType.partOfNode.should.be.equal(0);
            resSchainType.numberOfNodes.should.be.equal(0);

            resSchainType = await schainsInternal.schainTypes(7);
            resSchainType.partOfNode.should.be.equal(0);
            resSchainType.numberOfNodes.should.be.equal(0);

            await schainsInternal.addSchainType(8, 16);
            await schainsInternal.addSchainType(32, 16);

            (await schainsInternal.numberOfSchainTypes()).should.be.equal(9);

            resSchainType = await schainsInternal.schainTypes(8);
            resSchainType.partOfNode.should.be.equal(8);
            resSchainType.numberOfNodes.should.be.equal(16);

            resSchainType = await schainsInternal.schainTypes(9);
            resSchainType.partOfNode.should.be.equal(32);
            resSchainType.numberOfNodes.should.be.equal(16);
        });

    });
});
