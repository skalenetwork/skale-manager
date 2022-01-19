import { deployContractManager } from "../test/tools/deploy/contractManager";
import { deployValidatorService } from "../test/tools/deploy/delegation/validatorService";
import { deploySkaleManager } from "../test/tools/deploy/skaleManager";
import {
    ContractManager,
    Nodes,
    Schains,
    SchainsInternal,
    SkaleDKG,
    SkaleDKGTester,
    SkaleManager,
    ValidatorService,
    Wallets
} from "../typechain";
import { privateKeys } from "../test/tools/private-keys";
import { deploySchains } from "../test/tools/deploy/schains";
import { deploySchainsInternal } from "../test/tools/deploy/schainsInternal";
import { deploySkaleDKGTester } from "../test/tools/deploy/test/skaleDKGTester";
import { deployNodes } from "../test/tools/deploy/nodes";
import { deployWallets } from "../test/tools/deploy/wallets";
import { skipTime } from "../test/tools/time";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";
import { BigNumberish, BytesLike, Event, Signer, Wallet } from "ethers";
import { assert } from "chai";
import { getPublicKey, getValidatorIdSignature } from "../test/tools/signatures";
import { stringKeccak256 } from "../test/tools/hashes";
import { fastBeforeEach } from "../test/tools/mocha";
import { SchainType } from "../test/tools/types";

async function createNode(skaleManager: SkaleManager, node: Wallet, nodeId: number) {
    await skaleManager.connect(node).createNode(
        1, // port
        0, // nonce
        "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
        "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
        getPublicKey(node), // public key
        "d2-" + nodeId, // name)
        "some.domain.name"
    );
    console.log("Node", nodeId, "created")
}

async function getFreeSpaceOfNode(nodes: Nodes, nodeId: number) {
    const res = await nodes.spaceOfNodes(nodeId.toString());
    return res.freeSpace;
}

async function getIndexInSpaceMap(nodes: Nodes, nodeId: number) {
    const res = await nodes.spaceOfNodes(nodeId.toString());
    return res.indexInSpaceMap.toString();
}

async function getSpaceToNodes(nodes: Nodes, space: number, index: number) {
    return (await nodes.spaceToNodes(space.toString(), index.toString())).toString();
}

async function checkNodeSpace(nodes: Nodes, nodeId: number) {
    const freeSpace = await getFreeSpaceOfNode(nodes, nodeId);
    const index = await getIndexInSpaceMap(nodes, nodeId);
    const posNode = await getSpaceToNodes(nodes, freeSpace, parseInt(index, 10));
    assert(posNode.toString() === nodeId.toString(), "Not equal node ID");
}

async function checkSpaceToNodes(nodes: Nodes, space: number, length: number) {
    for (let i = 0; i < length; i++) {
        const posNode = await getSpaceToNodes(nodes, space, i);
        const freeSpace = await getFreeSpaceOfNode(nodes, parseInt(posNode, 10));
        const index = await getIndexInSpaceMap(nodes, parseInt(posNode, 10));
        assert(freeSpace === space, "Incorrect freeSpace");
        assert(index === i.toString(), "Incorrect index");
    }
}

async function countNodesWithFreeSpace(nodes: Nodes, freeSpace: number) {
    return (await nodes.countNodesWithFreeSpace(freeSpace.toString())).toString();
}

async function checkTreeAndSpaceToNodesPart(nodes: Nodes, space: number) {
    const countNodes = await countNodesWithFreeSpace(nodes, space);
    const countNodesPlus = (space === 128 ? "0" : await countNodesWithFreeSpace(nodes, space + 1));
    await checkSpaceToNodes(nodes, space, parseInt(countNodes, 10) - parseInt(countNodesPlus, 10));
}

async function checkTreeAndSpaceToNodes(nodes: Nodes) {
    const numberOfActiveNodes = (await nodes.numberOfActiveNodes()).toString();
    const nodesInTree = await countNodesWithFreeSpace(nodes, 0);
    assert(numberOfActiveNodes === nodesInTree, "Incorrect number of active nodes and nodes in tree");
    for (let i = 0; i <= 128; i++) {
        await checkTreeAndSpaceToNodesPart(nodes, i);
    }
}

async function createSchain(schains: Schains, typeOfSchain: SchainType, name: string, owner: Signer) {
    await schains.addSchainByFoundation(0, typeOfSchain, 0, name, await owner.getAddress(), ethers.constants.AddressZero, []);
    console.log("Schain", name, "with type", typeOfSchain, "created");
}

async function getNodesInSchain(schainsInternal: SchainsInternal, name: string) {
    const res = await schainsInternal.getNodesInGroup(stringKeccak256(name));
    const arrOfNodes: string[] = [];
    res.forEach(element => {
        arrOfNodes.push(element.toString())
    });
    return arrOfNodes;
}

async function getRandomNodeInSchain(schainsInternal: SchainsInternal, name: string, exceptions: string[]) {
    const arrOfNodes = await getNodesInSchain(schainsInternal, name);
    let randomNumber = Math.floor(Math.random() * arrOfNodes.length).toString();
    let node = arrOfNodes[parseInt(randomNumber, 10)];
    let index = 0;
    while(exceptions.includes(node) && index < 100) {
        randomNumber = Math.floor(Math.random() * arrOfNodes.length).toString();
        node = arrOfNodes[parseInt(randomNumber, 10)];
        index++;
    }
    if (exceptions.includes(node) && index === 100) {
        assert(false, "Could not get random node in schain not from exceptions");
    }
    return node;
}

async function finishDKG(skaleDKG: SkaleDKG, name: string) {
    await skaleDKG.setSuccessfulDKGPublic(stringKeccak256(name));
    console.log("DKG successful finished");
}

function getRandomVerificationVector(t: number): { x: { a: BigNumberish, b: BigNumberish }, y: { a: BigNumberish, b: BigNumberish } }[] {
    const verificationVectorPart = {
        x: {
            a: "0x2603b519d8eacb84244da4f264a888b292214ed2d2fad9368bc12c2a9a5a5f25",
            b: "0x2d8b197411929589919db23a989c1fd619a53a47db14dab3fd952490c7bf0615"
        },
        y: {
            a: "0x2e99d40faf53cc640065fa674948a0a9b169c303afc5d061bac6ef4c7c1fc400",
            b: "0x1b9afd2c7c3aeb9ef31f357491d4f1c2b889796297460facaa81ce8c15c3680"
        }
    };
    const verificationVectorNew = [];
    for (let i = 0; i < t; i++) {
        verificationVectorNew.push(verificationVectorPart);
    }
    return verificationVectorNew;
}

function getRandomSecretKeyContribution(n: number): { publicKey: [BytesLike, BytesLike], share: BytesLike }[] {
    const secretKeyContributionsPart: {share: string, publicKey: [string, string]} = {
        share: "0xc54860dc759e1c6095dfaa33e0b045fc102551e654cec47c7e1e9e2b33354ca6",
        publicKey: [
            "0xf676847eeff8f52b6f22c8b590aed7f80c493dfa2b7ec1cff3ae3049ed15c767",
            "0xe5c51a3f401c127bde74fefce07ed225b45e7975fccf4a10c12557ae8036653b"
        ]
    };
    const secretKeyContributions = [];
    for (let i = 0; i < n; i++) {
        secretKeyContributions.push(secretKeyContributionsPart);
    }
    return secretKeyContributions;
}

async function getNumberOfNodesInGroup(schainsInternal: SchainsInternal, name: string) {
    return (await schainsInternal.getNumberOfNodesInGroup(stringKeccak256(name))).toString();
}

async function rotateOnDKG(schainsInternal: SchainsInternal, name: string, skaleDKG: SkaleDKG, node: Wallet, skipNode: string = "") {
    let randomNode1 = await getRandomNodeInSchain(schainsInternal, name, []);
    let randomNode2 = await getRandomNodeInSchain(schainsInternal, name, [randomNode1]);
    if (skipNode !== "") {
        const arrOfNodes = await getNodesInSchain(schainsInternal, name);
        if (!arrOfNodes.includes(skipNode)) {
            assert(false, "SkipNode is not in Schain");
        }
        randomNode1 = await getRandomNodeInSchain(schainsInternal, name, [skipNode]);
        randomNode2 = skipNode;
    }
    const n = await getNumberOfNodesInGroup(schainsInternal, name);
    const t = (parseInt(n, 10) * 2 + 1) / 3;
    await skaleDKG.connect(node).broadcast(
        stringKeccak256(name),
        randomNode1,
        getRandomVerificationVector(t),
        getRandomSecretKeyContribution(parseInt(n, 10))
    );
    await skipTime(1800);
    await skaleDKG.connect(node).complaint(
        stringKeccak256(name),
        randomNode1,
        randomNode2
    );
    console.log("Rotated node", randomNode2);
}

async function rechargeSchainWallet(wallets: Wallets, name: string, owner: Signer) {
    await wallets.connect(owner).rechargeSchainWallet(stringKeccak256(name), {value: 1e20.toString()});
}

async function setNodeInMaintenance(nodes: Nodes, node: Wallet, nodeId: string) {
    await nodes.connect(node).setNodeInMaintenance(nodeId);
    console.log("Set Node In Maintenance", nodeId);
}

async function removeNodeFromInMaintenance(nodes: Nodes, node: Wallet, nodeId: string) {
    await nodes.connect(node).removeNodeFromInMaintenance(nodeId);
    console.log("Remove Node From In Maintenance", nodeId);
}

async function nodeExit(skaleManager: SkaleManager, node: Wallet, nodeId: string) {
    await skaleManager.connect(node).nodeExit(nodeId);
    console.log("Exited node", nodeId);
}

async function deleteSchain(skaleManager: SkaleManager, name: string, owner: Signer) {
    await skaleManager.connect(owner).deleteSchain(name);
    console.log("Schain deleted", name);
}

describe("Tree test", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let node: Wallet;

    let contractManager: ContractManager;
    let validatorService: ValidatorService;
    let skaleManager: SkaleManager;
    let nodes: Nodes;
    let schains: Schains;
    let schainsInternal: SchainsInternal;
    let skaleDKG: SkaleDKGTester;
    let wallets: Wallets;

    fastBeforeEach(async () => {
        [owner, validator] = await ethers.getSigners();

        node = new Wallet(String(privateKeys[2])).connect(ethers.provider);

        await owner.sendTransaction({to: node.address, value: ethers.utils.parseEther("10000")});

        contractManager = await deployContractManager();

        contractManager = await deployContractManager();
        skaleDKG = await deploySkaleDKGTester(contractManager);

        nodes = await deployNodes(contractManager);
        wallets = await deployWallets(contractManager);
        validatorService = await deployValidatorService(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

        await validatorService.connect(validator).registerValidator("Validator", "D2", 0, 0);
        const validatorIndex = await validatorService.getValidatorId(validator.address);
        const signature1 = await getValidatorIdSignature(validatorIndex, node);
        await validatorService.connect(validator).linkNodeAddress(node.address, signature1);
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        await validatorService.enableValidator(validatorIndex);
    });

    describe("when 15 nodes were created", () => {
        fastBeforeEach(async () => {
            const nodesAmount = 15;
            for (let nodeId = 0; nodeId < nodesAmount; ++nodeId) {
                await createNode(skaleManager, node, nodeId);
            }
        });

        it("Strange test", async () => {
            let nodesAmount = 15;
            for (let i = 0; i < 10; i++) {
                const name = "A" + i;
                const nodeIndex = 2 + 3 * i;
                for (let nodeId = nodesAmount; nodeId < nodesAmount + 3; ++nodeId) {
                    await createNode(skaleManager, node, nodeId);
                }
                nodesAmount += 3;
                for (let i2 = 0; i2 < 3; i2++) {
                    await createSchain(schains, SchainType.SMALL, name + i2, owner);
                    console.log(await getNodesInSchain(schainsInternal, name + i2));
                    // await nodeExit(skaleManager, node, (nodeIndex + i2).toString()); - revert
                    await setNodeInMaintenance(nodes, node, (nodeIndex + i2).toString());
                    await deleteSchain(skaleManager, name + i2, owner);
                    await removeNodeFromInMaintenance(nodes, node, (nodeIndex + i2).toString());
                    await nodeExit(skaleManager, node, (nodeIndex + i2).toString());
                }
                // await createSchain(schains, SchainType.SMALL, "B", owner); - revert
                await checkTreeAndSpaceToNodes(nodes);
            }
        });

        describe("when 16 nodes were created", () => {
            fastBeforeEach(async () => {
                await createNode(skaleManager, node, 15);
            });

            it("successful schain creation", async () => {
                await createSchain(schains, SchainType.SMALL, "A", owner);
                await finishDKG(skaleDKG, "A");
                await checkTreeAndSpaceToNodes(nodes);
            });

            it("schain creation after schain deletion", async () => {
                await createSchain(schains, SchainType.SMALL, "A", owner);
                console.log(await getNodesInSchain(schainsInternal, "A"));
                await setNodeInMaintenance(nodes, node, "0");
                await rechargeSchainWallet(wallets, "A", owner);
                await rotateOnDKG(schainsInternal, "A", skaleDKG, node, "1");
                console.log(await getNodesInSchain(schainsInternal, "A"));
                await createNode(skaleManager, node, 16);
                await deleteSchain(skaleManager, "A", owner);
                await removeNodeFromInMaintenance(nodes, node, "0");
                await createSchain(schains, SchainType.SMALL, "B", owner);
                console.log(await getNodesInSchain(schainsInternal, "B"));
                await finishDKG(skaleDKG, "B");
                await checkTreeAndSpaceToNodes(nodes);
            });

            it("nodeExit after rotation", async () => {
                await createSchain(schains, SchainType.SMALL, "A", owner);
                console.log(await getNodesInSchain(schainsInternal, "A"));
                await rechargeSchainWallet(wallets, "A", owner);
                await rotateOnDKG(schainsInternal, "A", skaleDKG, node, "10");
                console.log(await getNodesInSchain(schainsInternal, "A"));
                await createNode(skaleManager, node, 16);
                await deleteSchain(skaleManager, "A", owner);
                await nodeExit(skaleManager, node, "10");
                await createSchain(schains, SchainType.SMALL, "B", owner);
                console.log(await getNodesInSchain(schainsInternal, "B"));
                await checkTreeAndSpaceToNodes(nodes);
            });

            it("nodeExit after rotation and in_maintenance", async () => {
                await createSchain(schains, SchainType.SMALL, "A", owner);
                console.log(await getNodesInSchain(schainsInternal, "A"));
                await setNodeInMaintenance(nodes, node, "10");
                await rechargeSchainWallet(wallets, "A", owner);
                await rotateOnDKG(schainsInternal, "A", skaleDKG, node, "10");
                console.log(await getNodesInSchain(schainsInternal, "A"));
                await createNode(skaleManager, node, 16);
                await deleteSchain(skaleManager, "A", owner);
                await removeNodeFromInMaintenance(nodes, node, "10");
                await nodeExit(skaleManager, node, "10");
                await createSchain(schains, SchainType.SMALL, "B", owner);
                console.log(await getNodesInSchain(schainsInternal, "B"));
                await checkTreeAndSpaceToNodes(nodes);
            });

            it("nodeExit after rotation 2", async () => {
                await createSchain(schains, SchainType.SMALL, "A", owner);
                console.log(await getNodesInSchain(schainsInternal, "A"));
                await rechargeSchainWallet(wallets, "A", owner);
                await rotateOnDKG(schainsInternal, "A", skaleDKG, node, "10");
                console.log(await getNodesInSchain(schainsInternal, "A"));
                await createNode(skaleManager, node, 16);
                await deleteSchain(skaleManager, "A", owner);
                await nodeExit(skaleManager, node, "9");
                await createSchain(schains, SchainType.SMALL, "B", owner);
                console.log(await getNodesInSchain(schainsInternal, "B"));
                await checkTreeAndSpaceToNodes(nodes);
            });

            describe("when 17 nodes were created", () => {
                fastBeforeEach(async () => {
                    await createNode(skaleManager, node, 16);
                })

                it("successful schain creation after rotation", async () => {
                    await createSchain(schains, SchainType.SMALL, "A", owner);
                    await rechargeSchainWallet(wallets, "A", owner);
                    await rotateOnDKG(schainsInternal, "A", skaleDKG, node);
                    await finishDKG(skaleDKG, "A");
                    await checkTreeAndSpaceToNodes(nodes);
                });

                it("successful schain creation after unsuccessful creation", async () => {
                    await createSchain(schains, SchainType.SMALL, "A", owner);
                    await rechargeSchainWallet(wallets, "A", owner);
                    await rotateOnDKG(schainsInternal, "A", skaleDKG, node);
                    await createSchain(schains, SchainType.SMALL, "B", owner);
                    await finishDKG(skaleDKG, "B");
                    await checkTreeAndSpaceToNodes(nodes);
                });

                describe("when 18 nodes were created", () => {
                    fastBeforeEach(async () => {
                        await createNode(skaleManager, node, 17);
                    });

                    it("schain creation with node in maintenance", async () => {
                        await setNodeInMaintenance(nodes, node, "0");
                        await setNodeInMaintenance(nodes, node, "1");
                        await createSchain(schains, SchainType.SMALL, "A", owner);
                        await rechargeSchainWallet(wallets, "A", owner);
                        console.log(await getNodesInSchain(schainsInternal, "A"));
                        await rotateOnDKG(schainsInternal, "A", skaleDKG, node);
                        console.log(await getNodesInSchain(schainsInternal, "A"));
                        await removeNodeFromInMaintenance(nodes, node, "0");
                        await removeNodeFromInMaintenance(nodes, node, "1");
                        await createSchain(schains, SchainType.SMALL, "B", owner);
                        await finishDKG(skaleDKG, "B");
                        await checkTreeAndSpaceToNodes(nodes);
                    });

                    it("schain creation with node in maintenance", async () => {
                        await createSchain(schains, SchainType.SMALL, "A", owner);
                        await rechargeSchainWallet(wallets, "A", owner);
                        console.log(await getNodesInSchain(schainsInternal, "A"));
                        await rotateOnDKG(schainsInternal, "A", skaleDKG, node);
                        console.log(await getNodesInSchain(schainsInternal, "A"));
                        await rotateOnDKG(schainsInternal, "A", skaleDKG, node);
                        console.log(await getNodesInSchain(schainsInternal, "A"));
                        await setNodeInMaintenance(nodes, node, "0");
                        await setNodeInMaintenance(nodes, node, "1");
                        await createSchain(schains, SchainType.SMALL, "B", owner);
                        await rechargeSchainWallet(wallets, "B", owner);
                        console.log(await getNodesInSchain(schainsInternal, "B"));
                        await rotateOnDKG(schainsInternal, "B", skaleDKG, node);
                        console.log(await getNodesInSchain(schainsInternal, "B"));
                        await removeNodeFromInMaintenance(nodes, node, "0");
                        await createSchain(schains, SchainType.SMALL, "C", owner);
                        await finishDKG(skaleDKG, "C");
                        console.log(await getNodesInSchain(schainsInternal, "C"));
                        await createSchain(schains, SchainType.SMALL, "D", owner);
                        await rechargeSchainWallet(wallets, "D", owner);
                        console.log(await getNodesInSchain(schainsInternal, "D"));
                        await rotateOnDKG(schainsInternal, "D", skaleDKG, node);
                        console.log(await getNodesInSchain(schainsInternal, "D"));
                        await removeNodeFromInMaintenance(nodes, node, "1");
                        await createSchain(schains, SchainType.SMALL, "E", owner);
                        await finishDKG(skaleDKG, "E");
                        console.log(await getNodesInSchain(schainsInternal, "E"));
                        await checkTreeAndSpaceToNodes(nodes);
                    });
                });
            });
        });
    });
});
