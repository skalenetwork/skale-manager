import { ContractManager,
         Nodes,
         SchainsInternalMock,
         ValidatorService } from "../typechain";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import { Wallet } from "ethers";
import chai = require("chai");
import chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsInternalMock } from "./tools/deploy/test/schainsInternalMock";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { skipTime } from "./tools/time";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { fastBeforeEach } from "./tools/mocha";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);


describe("SchainsInternal", () => {
    let owner: SignerWithAddress;
    let holder: SignerWithAddress;
    let nodeAddress: Wallet;

    let contractManager: ContractManager;
    let nodes: Nodes;
    let schainsInternal: SchainsInternalMock;
    let validatorService: ValidatorService;

    fastBeforeEach(async () => {
        [owner, holder] = await ethers.getSigners();

        nodeAddress = new Wallet(String(privateKeys[1])).connect(ethers.provider);
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
        const signature = await nodeAddress.signMessage(
            ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(
                    ["uint"],
                    [validatorIndex]
                )
            )
        );
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

        const schain = await schainsInternal.schains(ethers.utils.solidityKeccak256(["string"], ["TestSchain"]));
        schain.name.should.be.equal("TestSchain");
        schain.owner.should.be.equal(holder.address);
        schain.lifetime.should.be.equal(5);
        schain.deposit.should.be.equal(5);
    });

    it("should increase generation number", async () => {
        const generationBefore = await schainsInternal.currentGeneration();
        await schainsInternal.grantRole(await schainsInternal.GENERATION_MANAGER_ROLE(), owner.address);

        await schainsInternal.newGeneration();

        const generationAfter = await schainsInternal.currentGeneration();

        generationBefore.add(1).should.be.equal(generationAfter);
    });

    it("should allow to switch generation only to generation manager", async () => {
        await schainsInternal.newGeneration()
            .should.eventually.rejectedWith("GENERATION_MANAGER_ROLE is required");
    })

    it("should set generation to schain", async () => {
        let generation = await schainsInternal.currentGeneration();
        await schainsInternal.grantRole(await schainsInternal.GENERATION_MANAGER_ROLE(), owner.address);

        const generation0Name = "Generation 0";
        const generation1Name = "Generation 1";
        const generation0Hash = ethers.utils.solidityKeccak256(["string"], [generation0Name]);
        const generation1Hash = ethers.utils.solidityKeccak256(["string"], [generation1Name]);
        await schainsInternal.initializeSchain(generation0Name, holder.address, 5, 5);
        (await schainsInternal.getGeneration(generation0Hash)).should.be.equal(generation);

        await schainsInternal.newGeneration();
        generation = generation.add(1);

        await schainsInternal.initializeSchain(generation1Name, holder.address, 5, 5);
        (await schainsInternal.getGeneration(generation1Hash)).should.be.equal(generation);
    });

    it("should not return generation for non existing schain", async () => {
        await schainsInternal.getGeneration("0xd2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2")
            .should.be.eventually.rejectedWith("The schain does not exist");
    })

    describe("on existing schain", async () => {
        const schainNameHash = ethers.utils.solidityKeccak256(["string"], ["TestSchain"]);

        fastBeforeEach(async () => {
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

        describe("on registered schain", async () => {
            const nodeIndex = 0;
            const numberOfNewSchains = 5
            const newSchainNames = [...Array(numberOfNewSchains).keys()].map((index) => "newSchain" + index);
            const newSchainHashes = newSchainNames.map((schainName) => ethers.utils.solidityKeccak256(["string"], [schainName]));

            fastBeforeEach(async () => {
                await schainsInternal.createGroupForSchain(schainNameHash, 1, 2);

                for (const schainName of newSchainNames) {
                    await schainsInternal.initializeSchain(schainName, owner.address, 5, 5);
                }
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
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.be.eventually.empty;
            });

            it("should add another schain to the node and remove first correctly", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[0]);
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[1]);
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal(
                    [newSchainHashes[1], newSchainHashes[0]],
                );
            });

            it("should add a hole after deleting", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[0]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[1]);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                (await schainsInternal.holesForNodes(nodeIndex, 0)).should.be.equal(1);
            });

            it("should add another hole after deleting", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[0]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[1]);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                (await schainsInternal.holesForNodes(nodeIndex, 0)).should.be.equal(0);
                (await schainsInternal.holesForNodes(nodeIndex, 1)).should.be.equal(1);
            });

            it("should add another hole after deleting different order", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[0]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[1]);
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                (await schainsInternal.holesForNodes(nodeIndex, 0)).should.be.equal(0);
                (await schainsInternal.holesForNodes(nodeIndex, 1)).should.be.equal(1);
            });

            it("should add schain in a hole", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[0]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[1]);
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[2]);
                (await schainsInternal.holesForNodes(nodeIndex, 0)).should.be.equal(0);
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal(
                    [
                        "0x0000000000000000000000000000000000000000000000000000000000000000",
                        newSchainHashes[2],
                        newSchainHashes[1],
                    ],
                );
            });

            it("should add second schain in a hole", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[0]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[1]);
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[2]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[3]);
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal(
                    [
                        newSchainHashes[3],
                        newSchainHashes[2],
                        newSchainHashes[1],
                    ],
                );
            });

            it("should add third schain like new", async () => {
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[0]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[1]);
                await schainsInternal.removeSchainForNode(nodeIndex, 0);
                await schainsInternal.removeSchainForNode(nodeIndex, 1);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[2]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[3]);
                await schainsInternal.addSchainForNode(nodeIndex, newSchainHashes[4]);
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal(
                    [
                        newSchainHashes[3],
                        newSchainHashes[2],
                        newSchainHashes[1],
                        newSchainHashes[4],
                    ],
                );
            });

            it("should get schain part of node", async () => {
                const part = await schainsInternal.getSchainsPartOfNode(schainNameHash);
                part.should.be.equal(2);
            });

            it("should return amount of created schains by user", async () => {
                (await schainsInternal.getSchainListSize(holder.address)).should.be.equal(1);
                (await schainsInternal.getSchainListSize(owner.address)).should.be.equal(numberOfNewSchains);
            });

            it("should get schains ids by user", async () => {
                await schainsInternal.getSchainHashesByAddress(holder.address).should.eventually.be.deep.equal([schainNameHash]);
                await schainsInternal.getSchainIdsByAddress(holder.address).should.eventually.be.deep.equal([schainNameHash]);
            });

            it("should return schains by node", async () => {
                await schainsInternal.getSchainHashesForNode(nodeIndex).should.eventually.be.deep.equal([schainNameHash]);
            });

            it("should return number of schains per node", async () => {
                (await schainsInternal.checkSchainOnNode(nodeIndex, schainNameHash)).should.be.equal(true);
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
