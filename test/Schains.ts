import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ConstantsHolder,
         ContractManager,
         KeyStorage,
         Nodes,
         SchainsInternal,
         Schains,
         SkaleDKGTester,
         SkaleManager,
         ValidatorService,
         NodeRotation,
         Wallets} from "../typechain";

import { BigNumber } from "ethers";
import { skipTime, currentTime } from "./tools/time";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployKeyStorage } from "./tools/deploy/keyStorage";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodesTester } from "./tools/deploy/test/nodesTester";
import { deploySchainsInternalMock } from "./tools/deploy/test/schainsInternalMock";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleDKGTester } from "./tools/deploy/test/skaleDKGTester";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deployNodeRotation } from "./tools/deploy/nodeRotation";
import { ethers, web3 } from "hardhat";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { assert, expect } from "chai";
import { deployWallets } from "./tools/deploy/wallets";
import { makeSnapshot, applySnapshot } from "./tools/snapshot";

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

function stringValue(value: string | null) {
    if (value) {
        return value;
    } else {
        return "";
    }
}

function hexValue(value: string) {
    if (value.length % 2 === 0) {
        return value;
    } else {
        return "0" + value;
    }
}

describe("Schains", () => {
    let owner: SignerWithAddress;
    let holder: SignerWithAddress;
    let validator: SignerWithAddress;
    let nodeAddress: SignerWithAddress;
    let nodeAddress2: SignerWithAddress;
    let nodeAddress3: SignerWithAddress;

    let constantsHolder: ConstantsHolder;
    let contractManager: ContractManager;
    let schains: Schains;
    let schainsInternal: SchainsInternal;
    let nodes: Nodes;
    let validatorService: ValidatorService;
    let skaleDKG: SkaleDKGTester;
    let skaleManager: SkaleManager;
    let keyStorage: KeyStorage;
    let nodeRotation: NodeRotation;
    let wallets: Wallets;
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    let snapshot: number;
    let cleanContracts: number;

    before(async () => {
        [owner, holder, validator, nodeAddress, nodeAddress2, nodeAddress3] = await ethers.getSigners();

        contractManager = await deployContractManager();

        constantsHolder = await deployConstantsHolder(contractManager);
        nodes = await deployNodesTester(contractManager);
        await contractManager.setContractsAddress("Nodes", nodes.address);
        schainsInternal = await deploySchainsInternalMock(contractManager);
        await contractManager.setContractsAddress("SchainsInternal", schainsInternal.address);
        schains = await deploySchains(contractManager);
        validatorService = await deployValidatorService(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);
        keyStorage = await deployKeyStorage(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        nodeRotation = await deployNodeRotation(contractManager);
        wallets = await deployWallets(contractManager);

        await validatorService.connect(validator).registerValidator("D2", "D2 is even", 0, 0);
        const validatorIndex = await validatorService.getValidatorId(validator.address);
        await validatorService.enableValidator(validatorIndex);
        const signature = await getValidatorIdSignature(validatorIndex, nodeAddress);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature);
        const signature2 = await getValidatorIdSignature(validatorIndex, nodeAddress2);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress2.address, signature2);
        const signature3 = await getValidatorIdSignature(validatorIndex, nodeAddress3);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress3.address, signature3);
        await constantsHolder.setMSR(0);

        await schainsInternal.addSchainType(1, 16);
        await schainsInternal.addSchainType(4, 16);
        await schainsInternal.addSchainType(128, 16);
        await schainsInternal.addSchainType(0, 2);
        await schainsInternal.addSchainType(32, 4);
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    describe("should add schain", async () => {
        it("should fail when user does not have enough money", async () => {
            await schains.addSchain(
                holder.address,
                5,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "d2"])
            ).should.be.eventually.rejectedWith("Not enough money to create Schain");
        });

        it("should not allow everyone to create schains as the foundation", async () => {
            await schains.addSchainByFoundation(5, 1, 0, "d2", zeroAddress)
                .should.be.eventually.rejectedWith("Sender is not authorized to create schain");
        })

        it("should fail when schain type is wrong", async () => {
            await schains.addSchain(
                holder.address,
                5,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 6, 0, "d2"]),
            ).should.be.eventually.rejectedWith("Invalid type of schain");
        });

        it("should fail when data parameter is too short", async () => {
            await schains.addSchain(
                holder.address,
                5,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16"], [5, 6, 0])
            ).should.be.eventually.rejected;
        });

        it("should fail when schain name is Mainnet", async () => {
            const price = await schains.getSchainPrice(1, 5);
            await schains.addSchain(
                holder.address,
                price.toString(),
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "Mainnet"])
            ).should.be.eventually.rejectedWith("Schain name is not available");
        });

        it("should fail when nodes count is too low", async () => {
            const price = await schains.getSchainPrice(1, 5);
            await schains.addSchain(
                holder.address,
                price.toString(),
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "d2"])
            ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
        });

        describe("when 2 nodes are registered (Ivan test)", async () => {
            it("should create 2 nodes, and play with schains", async () => {
                const nodesCount = 2;
                const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                        "D2-" + hexIndex, // name
                        "somedomain.name");
                }

                const deposit = await schains.getSchainPrice(4, 5);

                await schains.addSchain(
                    owner.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

                await schains.addSchain(
                    owner.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d3"]));

                await schains.deleteSchain(
                    owner.address,
                    "d2");

                await schains.deleteSchain(
                    owner.address,
                    "d3");
                await schainsInternal.getActiveSchains(0).should.be.eventually.empty;
                await schainsInternal.getActiveSchains(1).should.be.eventually.empty;

                await nodes.initExit(0);
                await nodes.completeExit(0);
                await nodes.initExit(1);
                await nodes.completeExit(1);

                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("1" + index.toString(16)).slice(-2);
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                        "D2-" + hexIndex, // name
                        "somedomain.name");
                }

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d4"]));
            });
        });

        describe("when 2 nodes are registered (Node rotation test)", async () => {
            it("should create 2 nodes, and play with schains", async () => {
                const nodesCount = 2;
                const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                        "D2-" + hexIndex, // name
                        "somedomain.name");
                }

                const deposit = await schains.getSchainPrice(4, 5);

                const verificationVector = [{
                    x: {
                        a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                        b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417",
                    },
                    y: {
                        a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                        b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                    }
                }];

                const encryptedSecretKeyContribution: {share: string, publicKey: [string, string]}[] = [
                    {
                        share: "0x937c9c846a6fa7fd1984fe82e739ae37fcaa555c1dc0e8597c9f81b6a12f232f",
                        publicKey: [
                            "0xfdf8101e91bd658fa1cea6fdd75adb8542951ce3d251cdaa78f43493dad730b5",
                            "0x9d32d2e872b36aa70cdce544b550ebe96994de860b6f6ebb7d0b4d4e6724b4bf"
                        ]
                    },
                    {
                        share: "0x7232f27fdfe521f3c7997dbb1c15452b7f196bd119d915ce76af3d1a008e1810",
                        publicKey: [
                            "0x086ff076abe442563ae9b8938d483ae581f4de2ee54298b3078289bbd85250c8",
                            "0xdf956450d32f671e4a8ec1e584119753ff171e80a61465246bfd291e8dac3d77"
                        ]
                    }
                ];

                await schains.addSchain(
                    owner.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));
                let res1 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
                let res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d2")), res1[0]);
                assert.equal(res, true);
                await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3("d2")), {value: 1e20.toString()});
                await skaleDKG.connect(nodeAddress).broadcast(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[0],
                    verificationVector,
                    // the last symbol is spoiled in parameter below
                    encryptedSecretKeyContribution
                );
                res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d2")), res1[1]);
                assert.equal(res, true);
                await skaleDKG.connect(nodeAddress).broadcast(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[1],
                    verificationVector,
                    // the last symbol is spoiled in parameter below
                    encryptedSecretKeyContribution
                );

                res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")));
                assert.equal(res, true);

                res = await skaleDKG.connect(nodeAddress).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[0]
                );
                assert.equal(res, true);

                await skaleDKG.connect(nodeAddress).alright(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[0]
                );

                res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")));
                assert.equal(res, true);

                res = await skaleDKG.connect(nodeAddress).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[1]
                );
                assert.equal(res, true);

                await skaleDKG.connect(nodeAddress).alright(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[1]
                );

                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000011", // ip
                    "0x7f000011", // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "D2-11", // name
                    "somedomain.name");

                res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")));
                assert.equal(res, false);

                await skaleManager.connect(nodeAddress).nodeExit(0);
                res1 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
                const nodeRot = res1[1];
                res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d2")), nodeRot);
                assert.equal(res, true);
                res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d2")), res1[0]);
                assert.equal(res, true);
                await skaleDKG.connect(nodeAddress).broadcast(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[0],
                    verificationVector,
                    // the last symbol is spoiled in parameter below
                    encryptedSecretKeyContribution
                );
                res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d2")), res1[1]);
                assert.equal(res, true);
                await skaleDKG.connect(nodeAddress).broadcast(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[1],
                    verificationVector,
                    // the last symbol is spoiled in parameter below
                    encryptedSecretKeyContribution
                );

                res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")));
                assert.equal(res, true);

                res = await skaleDKG.connect(nodeAddress).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[0]
                );
                assert.equal(res, true);

                await skaleDKG.connect(nodeAddress).alright(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[0]
                );

                res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")));
                assert.equal(res, true);

                res = await skaleDKG.connect(nodeAddress).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[1]
                );
                assert.equal(res, true);

                await skaleDKG.connect(nodeAddress).alright(
                    stringValue(web3.utils.soliditySha3("d2")),
                    res1[1]
                );
            });
        });

        describe("when 4 nodes are registered", async () => {
            before(async () => {
                cleanContracts = await makeSnapshot();
                const nodesCount = 4;
                const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                        "D2-" + hexIndex, // name
                        "somedomain.name");
                }
            });

            after(async () => {
                await applySnapshot(cleanContracts);
            });

            it("should create 4 node schain", async () => {
                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]));

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;
            });

            it("should not create 4 node schain with 1 deleted node", async () => {
                await nodes.initExit(1);
                await nodes.completeExit(1);

                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"])
                ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
            });

            it("should not create 4 node schain with 1 In Maintenance node", async () => {
                await nodes.setNodeInMaintenance(2);

                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
            });

            it("should create 4 node schain with 1 From In Maintenance node", async () => {
                await nodes.setNodeInMaintenance(2);

                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");

                await nodes.removeNodeFromInMaintenance(2);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                );

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;
            });

            it("should not create 4 node schain on deleted node", async () => {
                const removedNode = 1;
                await nodes.initExit(removedNode);
                await nodes.completeExit(removedNode);

                const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000028", // ip
                    "0x7f000028", // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "D2-28", // name
                    "somedomain.name");

                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                );

                let nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));

                for (const node of nodesInGroup) {
                    node.should.be.not.equal(removedNode);
                }

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d3"]),
                );

                nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));

                for (const node of nodesInGroup) {
                    node.should.be.not.equal(removedNode);
                }

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d4"]),
                );

                nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d4")));

                for (const node of nodesInGroup) {
                    node.should.be.not.equal(removedNode);
                }

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d5"]),
                );

                nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d5")));

                for (const node of nodesInGroup) {
                    node.should.be.not.equal(removedNode);
                }
            });

            it("should create & delete 4 node schain", async () => {
                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                );

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;

                await schains.deleteSchain(
                    holder.address,
                    "d2",
                );

                await schainsInternal.getSchains().should.be.eventually.empty;
            });

            it("should allow the foundation to create schain without tokens", async () => {
                const schainCreator = holder;
                await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), schainCreator.address);
                await schains.connect(schainCreator).addSchainByFoundation(5, 5, 0, "d2", zeroAddress);

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(schainCreator.address, schainId).should.be.eventually.true;
            });

            it("should assign schain creator on different address", async () => {
                await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);
                await schains.addSchainByFoundation(5, 5, 0, "d2", holder.address);

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;
            });

        });

        describe("when 20 nodes are registered", async () => {
            before(async () => {
                cleanContracts = await makeSnapshot();
                const nodesCount = 20;
                const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                        "D2-" + hexIndex, // name
                        "somedomain.name");
                }
            });

            after(async () => {
                await applySnapshot(cleanContracts);
            });

            it("should create Medium schain", async () => {
                const deposit = await schains.getSchainPrice(3, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "d2"]),
                );

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
            });

            it("should not create another Medium schain", async () => {
                const deposit = await schains.getSchainPrice(3, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "d2"]),
                );

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "d3"]),
                ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
            });

            it("should assign schain creator on different address and create small schain", async () => {
                await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), holder.address);
                await schains.connect(holder).addSchainByFoundation(5, 1, 0, "d2", zeroAddress);

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;
            });

            it("should assign schain creator on different address and create medium schain", async () => {
                await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), holder.address);
                await schains.connect(holder).addSchainByFoundation(5, 2, 0, "d2", zeroAddress);

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;
            });

            it("should assign schain creator on different address and create large schain", async () => {
                await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), holder.address);
                await schains.connect(holder).addSchainByFoundation(5, 3, 0, "d2", zeroAddress);

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;
            });

            it("should be possible to create schain after initialization", async () => {
                await nodes.setNodeInMaintenance(0);
                await nodes.setNodeInMaintenance(1);
                await nodes.initExit(2);
                await nodes.completeExit(2);
                await nodes.initExit(3);
                await nodes.completeExit(3);

                await nodes.makeNodeVisible(0);
                await nodes.makeNodeVisible(1);
                await nodes.makeNodeVisible(2);
                await nodes.makeNodeVisible(3);

                await nodes.removeNodeFromSpaceToNodes(2);
                await nodes.removeNodeFromSpaceToNodes(3);

                const nodesInTree = await nodes.amountOfNodesFromPlaceInTree(128);
                nodesInTree.should.be.equal(18);

                await nodes.removeNodesFromPlace(128, nodesInTree.toNumber());

                await nodes.initializeSegmentTreeAndInvisibleNodes();

                await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), holder.address);
                await schains.connect(holder).addSchainByFoundation(5, 1, 0, "d2", zeroAddress);

                const nodesOfSchain = new Set();

                const nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));

                for(const nodeIn of nodesInGroup) {
                    if (!nodesOfSchain.has(nodeIn.toNumber())) {
                        nodesOfSchain.add(nodeIn.toNumber());
                    } else {
                        console.log("Node is already in set");
                        assert.fail("node is in set", "node should not be in set", "Schain created with on the same node at least 2 times");
                    }
                }
            });

            it("should be possible to delete schain after initialization", async () => {
                await nodes.setNodeInMaintenance(0);
                await nodes.setNodeInMaintenance(1);
                await nodes.initExit(2);
                await nodes.completeExit(2);
                await nodes.initExit(3);
                await nodes.completeExit(3);

                await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), holder.address);
                await schains.connect(holder).addSchainByFoundation(5, 1, 0, "d2", holder.address);

                const nodesOfSchain = new Set();

                const nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));

                for(const nodeIn of nodesInGroup) {
                    if (!nodesOfSchain.has(nodeIn.toNumber())) {
                        nodesOfSchain.add(nodeIn.toNumber());
                    } else {
                        console.log("Node is already in set");
                        assert.fail("node is in set", "node should not be in set", "Schain created with on the same node at least 2 times");
                    }
                }

                await nodes.makeNodeVisible(0);
                await nodes.makeNodeVisible(1);
                await nodes.makeNodeVisible(2);
                await nodes.makeNodeVisible(3);

                await nodes.removeNodeFromSpaceToNodes(2);
                await nodes.removeNodeFromSpaceToNodes(3);

                let nodesInTree = await nodes.amountOfNodesFromPlaceInTree(128);
                nodesInTree.should.be.equal(2);
                await nodes.removeNodesFromPlace(128, nodesInTree.toNumber());

                nodesInTree = await nodes.amountOfNodesFromPlaceInTree(127);
                nodesInTree.should.be.equal(16);
                await nodes.removeNodesFromPlace(127, nodesInTree.toNumber());

                await schainsInternal.removeSchainToExceptionNode(stringValue(web3.utils.soliditySha3("d2")));

                for(const nodeIn of nodesInGroup) {
                    await schainsInternal.removeNodeToLocked(nodeIn.toNumber());
                }

                await nodes.initializeSegmentTreeAndInvisibleNodes();

                const res = await skaleManager.connect(holder).deleteSchain("d2");
            });
        });

        describe("when nodes are registered", async () => {
            let nodesAreRegistered: number;
            before(async () => {
                cleanContracts = await makeSnapshot();
                const nodesCount = 16;
                const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                        "D2-" + hexIndex, // name
                        "somedomain.name");
                }
            });

            after(async () => {
                await applySnapshot(cleanContracts);
            });

            it("successfully create 1 type Of Schain", async () => {
                const deposit = await schains.getSchainPrice(1, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "d2"]),
                );

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;

                const obtainedSchains = await schainsInternal.schains(schainId);
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
                       obtainedBlock,
                       obtainedDeposit,
                       obtainedIndex] = schainsArray;

                obtainedSchainName.should.be.equal("d2");
                obtainedSchainOwner.should.be.equal(holder.address);
                obtainedPart.should.be.equal(1);
                obtainedLifetime.should.be.equal(5);
                obtainedDeposit.should.be.equal(deposit);
            });

            it("should add new type of Schain and create Schain", async () => {
                await schainsInternal.addSchainType(8, 16);
                const deposit = await schains.getSchainPrice(6, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 6, 0, "d2"]),
                );

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;

                const obtainedSchains = await schainsInternal.schains(schainId);
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
                       obtainedBlock,
                       obtainedDeposit,
                       obtainedIndex] = schainsArray;

                obtainedSchainName.should.be.equal("d2");
                obtainedSchainOwner.should.be.equal(holder.address);
                obtainedPart.should.be.equal(8);
                obtainedLifetime.should.be.equal(5);
                obtainedDeposit.should.be.equal(deposit);
            });

            it("should add another new type of Schain and create Schain", async () => {
                await schainsInternal.addSchainType(32, 16);
                const deposit = await schains.getSchainPrice(6, 5);

                await schains.addSchain(
                    holder.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 6, 0, "d2"]),
                );

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder.address, schainId).should.be.eventually.true;

                const obtainedSchains = await schainsInternal.schains(schainId);
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
                       obtainedBlock,
                       obtainedDeposit,
                       obtainedIndex] = schainsArray;

                obtainedSchainName.should.be.equal("d2");
                obtainedSchainOwner.should.be.equal(holder.address);
                obtainedPart.should.be.equal(32);
                obtainedLifetime.should.be.equal(5);
                obtainedDeposit.should.be.equal(deposit);
            });

            describe("when schain is created", async () => {
                before(async () => {
                    nodesAreRegistered = await makeSnapshot();
                    const deposit = await schains.getSchainPrice(1, 5);
                    await schains.addSchain(
                        holder.address,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "D2"]),
                    );
                });

                after(async () => {
                    await applySnapshot(nodesAreRegistered);
                });

                it("should failed when create another schain with the same name", async () => {
                    const deposit = await schains.getSchainPrice(1, 5);
                    await schains.addSchain(
                        holder.address,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "D2"]),
                    ).should.be.eventually.rejectedWith("Schain name is not available");
                });

                it("should be able to delete schain", async () => {
                    await schains.deleteSchain(
                        holder.address,
                        "D2",
                    );
                    await schainsInternal.getSchains().should.be.eventually.empty;
                });

                it("should check group", async () => {
                    const res = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("D2")));
                    res.length.should.be.equal(16);
                });

                it("should check node addresses", async () => {
                    expect(await schainsInternal.isNodeAddressesInGroup(stringValue(web3.utils.soliditySha3("D2")), nodeAddress.address)).be.true;
                    expect(await schainsInternal.isNodeAddressesInGroup(stringValue(web3.utils.soliditySha3("D2")), nodeAddress2.address)).be.false;
                });

                it("should delete group", async () => {
                    await schainsInternal.deleteGroup(stringValue(web3.utils.soliditySha3("D2")));
                    const res = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("D2")));
                    res.length.should.be.equal(0);
                    await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("D2"))).should.be.eventually.empty;
                });

                it("should fail on deleting schain if owner is wrong", async () => {
                    await schains.deleteSchain(
                        nodeAddress.address,
                        "D2",
                    ).should.be.eventually.rejectedWith("Message sender is not the owner of the Schain");
                });

            });

            describe("when test schain is created", async () => {

                before(async () => {
                    nodesAreRegistered = await makeSnapshot();
                    const deposit = await schains.getSchainPrice(4, 5);
                    await schains.addSchain(
                        holder.address,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "D2"]),
                    );
                });

                after(async () => {
                    await applySnapshot(nodesAreRegistered);
                });

                it("should failed when create another schain with the same name", async () => {
                    const deposit = await schains.getSchainPrice(4, 5);
                    await schains.addSchain(
                        holder.address,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "D2"]),
                    ).should.be.eventually.rejectedWith("Schain name is not available");
                });

                it("should be able to delete schain", async () => {

                    await schains.deleteSchain(
                        holder.address,
                        "D2",
                    );
                    await schainsInternal.getSchains().should.be.eventually.empty;
                });

                it("should fail on deleting schain if owner is wrong", async () => {

                    await schains.deleteSchain(
                        nodeAddress.address,
                        "D2",
                    ).should.be.eventually.rejectedWith("Message sender is not the owner of the Schain");
                });

            });

        });
    });

    describe("should calculate schain price", async () => {
        it("of tiny schain", async () => {
            const price = await schains.getSchainPrice(1, 5);
            const correctPrice = 3952894150981;

            price.should.be.equal(correctPrice);
        });

        it("of small schain", async () => {
            const price = await schains.getSchainPrice(2, 5);
            const correctPrice = 15811576603926;

            price.should.be.equal(correctPrice);
        });

        it("of medium schain", async () => {
            const price = await schains.getSchainPrice(3, 5);
            const correctPrice = 505970451325642;

            price.should.be.equal(correctPrice);
        });

        it("of test schain", async () => {
            const price = await schains.getSchainPrice(4, 5);
            const correctPrice = BigNumber.from("1000000000000000000");

            price.should.be.equal(correctPrice);
        });

        it("of medium test schain", async () => {
            const price = await schains.getSchainPrice(5, 5);
            const correctPrice = 31623153207852;

            price.should.be.equal(correctPrice);
        });

        it("should revert on wrong schain type", async () => {
            await schains.getSchainPrice(6, 5).should.be.eventually.rejectedWith("Invalid type of schain");
        });
    });

    describe("when 4 nodes, 2 schains and 2 additional nodes created", async () => {
        const ACTIVE = 0;
        const LEAVING = 1;
        const LEFT = 2;
        let nodeStatus;

        before(async () => {
            cleanContracts = await makeSnapshot();
            const deposit = await schains.getSchainPrice(5, 5);
            const nodesCount = 4;
            const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f0000" + hexIndex, // ip
                    "0x7f0000" + hexIndex, // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "D2-" + hexIndex, // name
                    "somedomain.name");
            }
            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );

            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d3"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );
            await skaleManager.connect(nodeAddress).createNode(
                8545, // port
                0, // nonce
                "0x7f000010", // ip
                "0x7f000010", // public ip
                ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                "D2-10", // name
                "somedomain.name");
            await skaleManager.connect(nodeAddress).createNode(
                8545, // port
                0, // nonce
                "0x7f000011", // ip
                "0x7f000011", // public ip
                ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                "D2-11", // name
                "somedomain.name");

        });

        after(async () => {
            await applySnapshot(cleanContracts);
        });

        it("should reject if node in maintenance call nodeExit", async () => {
            await nodes.setNodeInMaintenance(0);
            await skaleManager.connect(nodeAddress).nodeExit(0)
                .should.be.eventually.rejectedWith("Node should be Leaving");
        });

        it("should rotate 2 nodes consistently", async () => {
            const res1 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
            const res2 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            await skaleManager.connect(nodeAddress).nodeExit(0);
            const leavingTimeOfNode = (await nodeRotation.getLeavingHistory(0))[0].finishedRotation.toNumber();
            const _12hours = 43200;
            assert.equal(await currentTime(web3), leavingTimeOfNode-_12hours);
            const rotatedSchain = (await nodeRotation.getLeavingHistory(0))[0].schainIndex;
            const rotationForRotatedSchain = await nodeRotation.getRotation(rotatedSchain);
            rotationForRotatedSchain.newNodeIndex.should.be.not.equal(0);
            rotationForRotatedSchain.freezeUntil.should.be.not.equal(0);
            rotationForRotatedSchain.rotationCounter.should.be.not.equal(0);

            const activeSchain = await schainsInternal.getActiveSchain(0);
            const rotationForActiveSchain = await nodeRotation.getRotation(activeSchain);
            rotationForActiveSchain.nodeIndex.should.be.equal(0);
            rotationForActiveSchain.newNodeIndex.should.be.equal(0);
            rotationForActiveSchain.freezeUntil.should.be.not.equal(0);
            rotationForActiveSchain.rotationCounter.should.be.equal(0);

            const nodeRot = res1[3];
            const res = await skaleDKG.isBroadcastPossible(
                stringValue(web3.utils.soliditySha3("d3")), nodeRot);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );
            await skaleManager.connect(nodeAddress).nodeExit(1)
                .should.be.eventually.rejectedWith("Occupied by rotation on Schain");
            await skaleManager.connect(nodeAddress).nodeExit(0);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );

            const rotationForSecondRotatedSchain = await nodeRotation.getRotation(activeSchain);
            rotationForSecondRotatedSchain.newNodeIndex.should.be.not.equal(0);
            rotationForSecondRotatedSchain.freezeUntil.should.be.not.equal(0);
            rotationForSecondRotatedSchain.rotationCounter.should.be.not.equal(0);

            nodeStatus = await nodes.getNodeStatus(0);
            assert.equal(nodeStatus, LEFT);
            await skaleManager.connect(nodeAddress).nodeExit(0)
                .should.be.eventually.rejectedWith("Sender is not permitted to call this function");

            nodeStatus = await nodes.getNodeStatus(1);
            assert.equal(nodeStatus, ACTIVE);
            await skaleManager.connect(nodeAddress).nodeExit(1)
                .should.be.eventually.rejectedWith("Occupied by rotation on Schain");
            await skipTime(ethers, 43260);

            await skaleManager.connect(nodeAddress).nodeExit(1);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );
            nodeStatus = await nodes.getNodeStatus(1);
            assert.equal(nodeStatus, LEAVING);
            await skaleManager.connect(nodeAddress).nodeExit(1);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );
            nodeStatus = await nodes.getNodeStatus(1);
            assert.equal(nodeStatus, LEFT);
            await skaleManager.connect(nodeAddress).nodeExit(1)
                .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
        });

        it("should rotate node on the same position", async () => {
            const arrayD2 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
            const arrayD3 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            await skaleManager.connect(nodeAddress).nodeExit(0);
            const newArrayD3 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            let zeroPositionD3 = 0;
            let iter = 0;
            for (const nodeIndex of arrayD3) {
                if (nodeIndex.toNumber() === 0) {
                    zeroPositionD3 = iter;
                }
                iter++;
            }
            let exist4 = false;
            let exist5 = false;
            iter = 0;
            for (const nodeIndex of newArrayD3) {
                if (nodeIndex.toNumber() === 4) {
                    exist4 = true;
                }
                if (nodeIndex.toNumber() === 5) {
                    exist5 = true;
                }
                iter++;
            }
            assert.equal(exist4 && exist5, false);
            assert.equal(
                (exist5 && newArrayD3[zeroPositionD3].toNumber() === 5) ||
                (exist4 && newArrayD3[zeroPositionD3].toNumber() === 4),
                true
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );
            await skaleManager.connect(nodeAddress).nodeExit(0);
            const newArrayD2 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
            let zeroPositionD2 = 0;
            iter = 0;
            for (const nodeIndex of arrayD2) {
                if (nodeIndex.toNumber() === 0) {
                    zeroPositionD2 = iter;
                }
                iter++;
            }
            exist4 = false;
            exist5 = false;
            iter = 0;
            for (const nodeIndex of newArrayD2) {
                if (nodeIndex.toNumber() === 4) {
                    exist4 = true;
                }
                if (nodeIndex.toNumber() === 5) {
                    exist5 = true;
                }
                iter++;
            }
            assert.equal(exist4 && exist5, false);
            assert.equal(
                (exist5 && newArrayD2[zeroPositionD2].toNumber() === 5) ||
                (exist4 && newArrayD2[zeroPositionD2].toNumber() === 4),
                true
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );
            await skipTime(ethers, 43260);
            await skaleManager.connect(nodeAddress).nodeExit(1);
            const newNewArrayD3 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            let onePositionD3 = 0;
            iter = 0;
            for (const nodeIndex of arrayD3) {
                if (nodeIndex.toNumber() === 1) {
                    onePositionD3 = iter;
                }
                iter++;
            }
            exist4 = false;
            exist5 = false;
            iter = 0;
            for (const nodeIndex of newNewArrayD3) {
                if (nodeIndex.toNumber() === 4 && iter !== zeroPositionD3) {
                    exist4 = true;
                }
                if (nodeIndex.toNumber() === 5 && iter !== zeroPositionD3) {
                    exist5 = true;
                }
                iter++;
            }
            assert.equal(exist4 && exist5, false);
            assert.equal(
                (exist5 && newNewArrayD3[onePositionD3].toNumber() === 5) ||
                (exist4 && newNewArrayD3[onePositionD3].toNumber() === 4),
                true
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );
            await skaleManager.connect(nodeAddress).nodeExit(1);
            const newNewArrayD2 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
            let onePositionD2 = 0;
            iter = 0;
            for (const nodeIndex of arrayD2) {
                if (nodeIndex.toNumber() === 1) {
                    onePositionD2 = iter;
                }
                iter++;
            }
            exist4 = false;
            exist5 = false;
            iter = 0;
            for (const nodeIndex of newNewArrayD2) {
                if (nodeIndex.toNumber() === 4 && iter !== zeroPositionD2) {
                    exist4 = true;
                }
                if (nodeIndex.toNumber() === 5 && iter !== zeroPositionD2) {
                    exist5 = true;
                }
                iter++;
            }
            assert.equal(exist4 && exist5, false);
            assert.equal(
                (exist5 && newNewArrayD2[onePositionD2].toNumber() === 5) ||
                (exist4 && newNewArrayD2[onePositionD2].toNumber() === 4),
                true
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );
        });

        it("should allow to rotate if occupied node didn't rotated for 12 hours", async () => {
            await skaleManager.connect(nodeAddress).nodeExit(0);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );
            await skaleManager.connect(nodeAddress).nodeExit(1)
                .should.be.eventually.rejectedWith("Occupied by rotation on Schain");
            await skipTime(ethers, 43260);
            await skaleManager.connect(nodeAddress).nodeExit(1);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );

            await skaleManager.connect(nodeAddress).nodeExit(0)
                .should.be.eventually.rejectedWith("Occupied by rotation on Schain");

            nodeStatus = await nodes.getNodeStatus(1);
            assert.equal(nodeStatus, LEAVING);
            await skaleManager.connect(nodeAddress).nodeExit(1);
            nodeStatus = await nodes.getNodeStatus(1);
            assert.equal(nodeStatus, LEFT);
        });

        it("should not create schain with the same name after removing", async () => {
            const deposit = await schains.getSchainPrice(5, 5);
            await skaleManager.connect(nodeAddress).nodeExit(0);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );
            await skaleManager.connect(nodeAddress).nodeExit(0);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );
            await skaleManager.connect(holder).deleteSchainByRoot("d2")
                .should.be.eventually.rejectedWith("Caller is not an admin");
            await skaleManager.grantRole(await skaleManager.ADMIN_ROLE(), holder.address);
            await skaleManager.connect(holder).deleteSchainByRoot("d2");
            await skaleManager.connect(holder).deleteSchainByRoot("d3");
            await schainsInternal.getActiveSchains(0).should.be.eventually.empty;
            await schainsInternal.getActiveSchains(1).should.be.eventually.empty;
            await schainsInternal.getActiveSchains(2).should.be.eventually.empty;
            await schainsInternal.getActiveSchains(3).should.be.eventually.empty;
            await schainsInternal.getActiveSchains(4).should.be.eventually.empty;
            await schainsInternal.getActiveSchains(5).should.be.eventually.empty;
            let schainNameAvailable = await schainsInternal.isSchainNameAvailable("d2");
            assert.equal(schainNameAvailable, false);
            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
            ).should.be.eventually.rejectedWith("Schain name is not available");
            schainNameAvailable = await schainsInternal.isSchainNameAvailable("d3");
            assert.equal(schainNameAvailable, false);
            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d3"]),
            ).should.be.eventually.rejectedWith("Schain name is not available");
            schainNameAvailable = await schainsInternal.isSchainNameAvailable("d4");
            assert.equal(schainNameAvailable, true);
            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d4"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d4")),
            );
            const nodesInGroupBN = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d4")));
            const nodeInGroup = nodesInGroupBN.map((value: BigNumber) => value.toNumber())[0];
            await skaleManager.connect(nodeAddress).nodeExit(nodeInGroup);
        });

        it("should be possible to send broadcast", async () => {
            let res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, false);
            await skaleManager.connect(nodeAddress).nodeExit(0);
            const res1 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            const nodeRot = res1[3];
            res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, true);
            res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d3")), nodeRot);
            assert.equal(res, true);
        });

        it("should revert if dkg not finished", async () => {
            let res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, false);
            await skaleManager.connect(nodeAddress).nodeExit(0);
            const res1 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            const nodeRot = res1[3];
            res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, true);
            res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d3")), nodeRot);
            assert.equal(res, true);

            await skaleManager.connect(nodeAddress).nodeExit(1)
                .should.be.eventually.rejectedWith("Occupied by rotation on Schain");
            await skaleManager.connect(nodeAddress).nodeExit(0);

            await skipTime(ethers, 43260);

            await skaleManager.connect(nodeAddress).nodeExit(1)
                .should.be.eventually.rejectedWith("DKG did not finish on Schain");
        });

        it("should be possible to send broadcast", async () => {
            let res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, false);
            await skaleManager.connect(nodeAddress).nodeExit(0);
            const res1 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            const nodeRot = res1[3];
            res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, true);
            res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d3")), nodeRot);
            assert.equal(res, true);
            await skipTime(ethers, 43260);
            await skaleManager.connect(nodeAddress).nodeExit(0);

            await skaleManager.connect(nodeAddress).nodeExit(1)
                .should.be.eventually.rejectedWith("DKG did not finish on Schain");
        });

        it("should be possible to send broadcast", async () => {
            let res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, false);
            await skaleManager.connect(nodeAddress).nodeExit(0);
            const res1 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            const nodeRot = res1[3];
            res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, true);
            res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d3")), nodeRot);
            assert.equal(res, true);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );
            await skaleManager.connect(nodeAddress).nodeExit(1)
                .should.be.eventually.rejectedWith("Occupied by rotation on Schain");
            await skaleManager.connect(nodeAddress).nodeExit(0);
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );

            await skipTime(ethers, 43260);

            await skaleManager.connect(nodeAddress).nodeExit(1);
        });

        it("should be possible to process dkg after node rotation", async () => {
            let res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, false);
            await skaleManager.connect(nodeAddress).nodeExit(0);
            const res1 = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d3")));
            const nodeRot = res1[3];
            res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d3")), nodeRot);
            assert.equal(res, true);

            const verificationVector = [
                {
                    x: {
                        a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                        b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417",
                    },
                    y: {
                        a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                        b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                    }
                },
                {
                    x: {
                        a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                        b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417",
                    },
                    y: {
                        a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                        b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                    }
                },
                {
                    x: {
                        a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                        b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417",
                    },
                    y: {
                        a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                        b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                    }
                }
            ];

            const encryptedSecretKeyContribution: {share: string, publicKey: [string, string]}[] = [
                {
                    share: "0x937c9c846a6fa7fd1984fe82e739ae37fcaa555c1dc0e8597c9f81b6a12f232f",
                    publicKey: [
                        "0xfdf8101e91bd658fa1cea6fdd75adb8542951ce3d251cdaa78f43493dad730b5",
                        "0x9d32d2e872b36aa70cdce544b550ebe96994de860b6f6ebb7d0b4d4e6724b4bf"
                    ]
                },
                {
                    share: "0x7232f27fdfe521f3c7997dbb1c15452b7f196bd119d915ce76af3d1a008e1810",
                    publicKey: [
                        "0x086ff076abe442563ae9b8938d483ae581f4de2ee54298b3078289bbd85250c8",
                        "0xdf956450d32f671e4a8ec1e584119753ff171e80a61465246bfd291e8dac3d77"
                    ]
                },
                {
                    share: "0x7232f27fdfe521f3c7997dbb1c15452b7f196bd119d915ce76af3d1a008e1810",
                    publicKey: [
                        "0x086ff076abe442563ae9b8938d483ae581f4de2ee54298b3078289bbd85250c8",
                        "0xdf956450d32f671e4a8ec1e584119753ff171e80a61465246bfd291e8dac3d77"
                    ]
                },
                {
                    share: "0x7232f27fdfe521f3c7997dbb1c15452b7f196bd119d915ce76af3d1a008e1810",
                    publicKey: [
                        "0x086ff076abe442563ae9b8938d483ae581f4de2ee54298b3078289bbd85250c8",
                        "0xdf956450d32f671e4a8ec1e584119753ff171e80a61465246bfd291e8dac3d77"
                    ]
                }
            ];

            // let res10 = await keyStorage.getBroadcastedData(stringValue(web3.utils.soliditySha3("d3")), res1[0]);
            res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d3")), res1[0]);
            assert.equal(res, true);
            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3("d3")), {value: 1e20.toString()});
            await skaleDKG.connect(nodeAddress).broadcast(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[0],
                verificationVector,
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContribution
            );
            // res10 = await keyStorage.getBroadcastedData(stringValue(web3.utils.soliditySha3("d3")), res1[1]);
            res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d3")), res1[1]);
            assert.equal(res, true);
            await skaleDKG.connect(nodeAddress).broadcast(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[1],
                verificationVector,
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContribution
            );
            res = await skaleDKG.connect(nodeAddress).isBroadcastPossible(stringValue(web3.utils.soliditySha3("d3")), res1[2]);
            assert.equal(res, true);
            await skaleDKG.connect(nodeAddress).broadcast(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[2],
                verificationVector,
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContribution
            );
            await skaleDKG.connect(nodeAddress).broadcast(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[3],
                verificationVector,
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContribution
            );

            res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, true);

            res = await skaleDKG.connect(nodeAddress).isAlrightPossible(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[0]
            );
            assert.equal(res, true);

            await skaleDKG.connect(nodeAddress).alright(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[0]
            );

            res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, true);

            res = await skaleDKG.connect(nodeAddress).isAlrightPossible(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[1]
            );
            assert.equal(res, true);

            await skaleDKG.connect(nodeAddress).alright(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[1]
            );

            res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, true);

            res = await skaleDKG.connect(nodeAddress).isAlrightPossible(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[2]
            );
            assert.equal(res, true);

            await skaleDKG.connect(nodeAddress).alright(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[2]
            );

            res = await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d3")));
            assert.equal(res, true);

            res = await skaleDKG.connect(nodeAddress).isAlrightPossible(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[3]
            );
            assert.equal(res, true);

            await skaleDKG.connect(nodeAddress).alright(
                stringValue(web3.utils.soliditySha3("d3")),
                res1[3]
            );
        });
    });

    describe("when 6 nodes, 4 schains and 2 rotations(Kavun test)", async () => {

        before(async () => {
            cleanContracts = await makeSnapshot();
            const deposit = await schains.getSchainPrice(5, 5);
            const nodesCount = 6;
            const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f0000" + hexIndex, // ip
                    "0x7f0000" + hexIndex, // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "D2-" + hexIndex, // name
                    "somedomain.name");
            }
            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d1"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d1")),
            );

            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );

            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d3"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );

            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d4"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d4")),
            );

        });

        after(async () => {
            await applySnapshot(cleanContracts);
        });

        it("should rotate 1 node with 3 schains", async () => {
            let rotIndex = 7;
            let schainIds = await schainsInternal.getSchainIdsForNode(0);
            for(const index of Array(6).keys()) {
                const res = await schainsInternal.getSchainIdsForNode(index);
                if (res.length >= 3) {
                    rotIndex = index;
                    schainIds = res;
                    break;
                }
            }
            for (const schainId of Array.from(schainIds).reverse()) {
                await skaleManager.connect(nodeAddress).nodeExit(rotIndex);
                await skaleDKG.setSuccessfulDKGPublic(schainId);
            }
            await schainsInternal.getSchainIdsForNode(rotIndex).should.be.eventually.empty;
        });

        it("should rotate another 1 node with 4 schains", async () => {
            let rotIndex1 = 7;
            let schainIds1 = await schainsInternal.getSchainIdsForNode(0);
            for(const index of Array.from(Array(6).keys())) {
                const res = await schainsInternal.getSchainIdsForNode(index);
                if (res.length >= 3) {
                    rotIndex1 = index;
                    schainIds1 = res;
                    break;
                }
            }
            for (const schainId of Array.from(schainIds1).reverse()) {
                await skaleManager.connect(nodeAddress).nodeExit(rotIndex1);
                await skaleDKG.setSuccessfulDKGPublic(
                    schainId,
                );
            }
            await schainsInternal.getSchainIdsForNode(rotIndex1).should.be.eventually.empty;
            let rotIndex2 = 7;
            let schainIds2 = await schainsInternal.getSchainIdsForNode(0);
            for(const index of Array.from(Array(6).keys())) {
                if (await nodes.isNodeActive(index)) {
                    const res = await schainsInternal.getSchainIdsForNode(index);
                    if (res.length === 4) {
                        rotIndex2 = index;
                        schainIds2 = res;
                        break;
                    }
                }
            }

            await skipTime(ethers, 43260);
            for (const schainId of Array.from(schainIds2).reverse()) {
                await skaleManager.connect(nodeAddress).nodeExit(rotIndex2);
                await skaleDKG.setSuccessfulDKGPublic(
                    schainId,
                );
            }
            await schainsInternal.getSchainIdsForNode(rotIndex2).should.be.eventually.empty;
            await schainsInternal.getSchainIdsForNode(rotIndex1).should.be.eventually.empty;
        });
    });

    describe("when 8 nodes, 4 schains and 2 rotations(Kavun test)", async () => {

        before(async () => {
            cleanContracts = await makeSnapshot();
            const deposit = await schains.getSchainPrice(5, 5);
            const nodesCount = 6;
            const pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f0000" + hexIndex, // ip
                    "0x7f0000" + hexIndex, // public ip
                    ["0x" +  hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                    "D2-" + hexIndex, // name
                    "somedomain.name");
            }
            const pubKey2 = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
            await skaleManager.connect(nodeAddress2).createNode(
                8545, // port
                0, // nonce
                "0x7f0000ff", // ip
                "0x7f0000ff", // public ip
                ["0x" + hexValue(pubKey2.x.toString('hex')), "0x" + hexValue(pubKey2.y.toString('hex'))], // public key
                "D2-ff", // name
                "somedomain.name");
            const pubKey3 = ec.keyFromPrivate(String(privateKeys[5]).slice(2)).getPublic();
            await skaleManager.connect(nodeAddress3).createNode(
                8545, // port
                0, // nonce
                "0x7f0000fe", // ip
                "0x7f0000fe", // public ip
                ["0x" +  hexValue(pubKey3.x.toString('hex')), "0x" +  hexValue(pubKey3.y.toString('hex'))], // public key
                "D2-fe", // name
                "somedomain.name");
            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d1"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d1")),
            );

            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d2")),
            );

            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d3"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d3")),
            );

            await schains.addSchain(
                holder.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d4"]),
            );
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("d4")),
            );

        });

        after(async () => {
            await applySnapshot(cleanContracts);
        });

        it("should rotate 1 node with 3 schains", async () => {
            let rotIndex = 8;
            let schainIds = await schainsInternal.getSchainIdsForNode(0);
            for(const index of Array.from(Array(6).keys())) {
                const res = await schainsInternal.getSchainIdsForNode(index);
                if (res.length >= 3) {
                    rotIndex = index;
                    schainIds = res;
                    break;
                }
            }
            for (const schainId of Array.from(schainIds).reverse()) {
                if (rotIndex === 7) {
                    await skaleManager.connect(nodeAddress).nodeExit(rotIndex);
                } else if (rotIndex === 6) {
                    await skaleManager.connect(nodeAddress2).nodeExit(rotIndex);
                } else if (rotIndex < 6) {
                    await skaleManager.connect(nodeAddress).nodeExit(rotIndex);
                } else {
                    break;
                }
                await skaleDKG.setSuccessfulDKGPublic(
                    schainId,
                );
            }
            await schainsInternal.getSchainIdsForNode(rotIndex).should.be.eventually.empty;
        });

        it("should rotate another 1 node with 4 schains", async () => {
            let rotIndex1 = 8;
            let schainIds1 = await schainsInternal.getSchainIdsForNode(0);
            for(const index of Array.from(Array(6).keys())) {
                const res = await schainsInternal.getSchainIdsForNode(index);
                if (res.length >= 3) {
                    rotIndex1 = index;
                    schainIds1 = res;
                    break;
                }
            }
            for (const schainId of Array.from(schainIds1).reverse()) {
                if (rotIndex1 === 7) {
                    await skaleManager.connect(nodeAddress).nodeExit(rotIndex1);
                } else if (rotIndex1 === 6) {
                    await skaleManager.connect(nodeAddress2).nodeExit(rotIndex1);
                } else if (rotIndex1 < 6) {
                    await skaleManager.connect(nodeAddress).nodeExit(rotIndex1);
                } else {
                    break;
                }
                await skaleDKG.setSuccessfulDKGPublic(
                    schainId,
                );
            }
            await schainsInternal.getSchainIdsForNode(rotIndex1).should.be.eventually.empty;
            let rotIndex2 = 8;
            let schainIds2 = await schainsInternal.getSchainIdsForNode(0);
            for(const index of Array.from(Array(6).keys())) {
                if (await nodes.isNodeActive(index)) {
                    const res = await schainsInternal.getSchainIdsForNode(index);
                    if (res.length === 4) {
                        rotIndex2 = index;
                        schainIds2 = res;
                        break;
                    }
                }
            }

            await skipTime(ethers, 43260);
            for (const schainId of Array.from(schainIds2).reverse()) {
                if (rotIndex2 === 7) {
                    await skaleManager.connect(nodeAddress).nodeExit(rotIndex2);
                } else if (rotIndex2 === 6) {
                    await skaleManager.connect(nodeAddress2).nodeExit(rotIndex2);
                } else if (rotIndex2 < 6) {
                    await skaleManager.connect(nodeAddress).nodeExit(rotIndex2);
                } else {
                    break;
                }
                await skaleDKG.setSuccessfulDKGPublic(
                    schainId,
                );
            }
            await schainsInternal.getSchainIdsForNode(rotIndex2).should.be.eventually.empty;
            await schainsInternal.getSchainIdsForNode(rotIndex1).should.be.eventually.empty;
        });

        it("should rotate 7 node and unlink from Validator", async () => {
            const rotIndex = 6;
            const schainIds = await schainsInternal.getSchainIdsForNode(rotIndex);
            for (const schainId of Array.from(schainIds).reverse()) {
                const valId = await validatorService.getValidatorIdByNodeAddress(nodeAddress2.address);
                ((await validatorService.getValidatorIdByNodeAddress(nodeAddress2.address)).toString()).should.be.equal("1");
                await skaleManager.connect(nodeAddress2).nodeExit(rotIndex);
                await skaleDKG.setSuccessfulDKGPublic(
                    schainId,
                );
            }
            if (!(await nodes.isNodeLeft(rotIndex))) {
                await skaleManager.connect(nodeAddress2).nodeExit(rotIndex);
            }
            await validatorService.getValidatorIdByNodeAddress(nodeAddress2.address)
            .should.be.eventually.rejectedWith("Node address is not assigned to a validator");
            await schainsInternal.getSchainIdsForNode(rotIndex).should.be.eventually.empty;
        });

        it("should rotate 7 node from validator address", async () => {
            const rotatedNodeIndex = 6;
            const schainIds = await schainsInternal.getSchainIdsForNode(rotatedNodeIndex);
            for (const schainId of Array.from(schainIds).reverse()) {
                const validatorId = await validatorService.getValidatorIdByNodeAddress(nodeAddress2.address);
                validatorId.toString().should.be.equal("1");
                await skaleManager.connect(validator).nodeExit(rotatedNodeIndex);
                await skaleDKG.setSuccessfulDKGPublic(schainId);
            }
            if (!(await nodes.isNodeLeft(rotatedNodeIndex))) {
                await skaleManager.connect(validator).nodeExit(rotatedNodeIndex);
            }
            await validatorService.getValidatorIdByNodeAddress(nodeAddress2.address)
                .should.be.eventually.rejectedWith("Node address is not assigned to a validator");
            await schainsInternal.getSchainIdsForNode(rotatedNodeIndex).should.be.eventually.empty;
        });

        it("should rotate 7 node from contract owner address", async () => {
            const rotatedNodeIndex = 6;
            const schainIds = await schainsInternal.getSchainIdsForNode(rotatedNodeIndex);
            for (const schainId of Array.from(schainIds).reverse()) {
                const validatorId = await validatorService.getValidatorIdByNodeAddress(nodeAddress2.address);
                validatorId.toString().should.be.equal("1");
                await skaleManager.nodeExit(rotatedNodeIndex);
                await skaleDKG.setSuccessfulDKGPublic(schainId);
            }
            if (!(await nodes.isNodeLeft(rotatedNodeIndex))) {
                await skaleManager.nodeExit(rotatedNodeIndex);
            }
            await validatorService.getValidatorIdByNodeAddress(nodeAddress2.address)
                .should.be.eventually.rejectedWith("Node address is not assigned to a validator");
            await schainsInternal.getSchainIdsForNode(rotatedNodeIndex).should.be.eventually.empty;
        });

        it("should rotate 8 node and unlink from Validator", async () => {
            const rotIndex = 7;
            const schainIds = await schainsInternal.getSchainIdsForNode(rotIndex);
            for (const schainId of Array.from(schainIds).reverse()) {
                const valId = await validatorService.getValidatorIdByNodeAddress(nodeAddress3.address);
                ((await validatorService.getValidatorIdByNodeAddress(nodeAddress3.address)).toString()).should.be.equal("1");
                await skaleManager.connect(nodeAddress3).nodeExit(rotIndex);
                await skaleDKG.setSuccessfulDKGPublic(
                    schainId,
                );
            }
            if (!(await nodes.isNodeLeft(rotIndex))) {
                await skaleManager.connect(nodeAddress3).nodeExit(rotIndex);
            }
            await validatorService.getValidatorIdByNodeAddress(nodeAddress3.address)
            .should.be.eventually.rejectedWith("Node address is not assigned to a validator");
            await schainsInternal.getSchainIdsForNode(rotIndex).should.be.eventually.empty;
        });
    });
});
