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
    ValidatorService
} from "../typechain";
import { privateKeys } from "../test/tools/private-keys";
import * as elliptic from "elliptic";
import { deploySchains } from "../test/tools/deploy/schains";
import { deploySchainsInternal } from "../test/tools/deploy/schainsInternal";
import { deploySkaleDKGTester } from "../test/tools/deploy/test/skaleDKGTester";
import { deployNodes } from "../test/tools/deploy/nodes";
import { skipTime, currentTime } from "../test/tools/time";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers, web3 } from "hardhat";
import { BigNumber, BigNumberish, BytesLike, Event, Signer, Wallet } from "ethers";
import fs from 'fs';
import { assert } from "chai";

const ec = new elliptic.ec("secp256k1");

async function getValidatorIdSignature(validatorId: BigNumber, signer: Wallet) {
    const hash = web3.utils.soliditySha3(validatorId.toString());
    if (hash) {
        const signature = await web3.eth.accounts.sign(hash, signer.privateKey);
        return signature.signature;
    } else {
        return "";
    }
}

async function createNode(skaleManager: SkaleManager, node: Wallet, nodeId: number) {
    const publicKey = ec.keyFromPrivate(String(node.privateKey).slice(2)).getPublic();
    await skaleManager.connect(node).createNode(
        1, // port
        0, // nonce
        "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
        "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
        ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
        "d2-" + nodeId, // name)
        "some.domain.name"
    );
    console.log("Node", nodeId, "created")
}

async function getSpaceOfNode(nodes: Nodes, nodeId: number) {
    const res = await nodes.spaceOfNodes(nodeId.toString());
    return res.freeSpace;
}

async function countNodesWithFreeSpace(nodes: Nodes, freeSpace: number) {
    return (await nodes.countNodesWithFreeSpace(freeSpace.toString())).toString();
}

async function createSchain(schains: Schains, typeOfSchain: number, name: string, owner: Signer) {
    await schains.addSchainByFoundation(0, typeOfSchain.toString(), 0, name, await owner.getAddress());
    console.log("Schain", name, "with type", typeOfSchain, "created");
}

async function getNodesInSchain(schainsInternal: SchainsInternal, name: string) {
    const res = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3(name)));
    const arrOfNodes: string[] = [];
    res.forEach(element => {
        arrOfNodes.push(element.toString())
    });
    return arrOfNodes;
}

async function getRandomNodeInSchain(schainsInternal: SchainsInternal, name: string, exceptions: string[]) {
    const arrOfNodes = await getNodesInSchain(schainsInternal, name);
    let randomNumber = Math.floor(Math.random() * arrOfNodes.length).toString();
    let index = 0;
    while(exceptions.includes(randomNumber) && index < 100) {
        randomNumber = Math.floor(Math.random() * arrOfNodes.length).toString();
        index++;
    }
    if (exceptions.includes(randomNumber) && index === 100) {
        assert(false, "Could not get random node in schain not from exceptions");
    }
    return randomNumber;
}

async function finishDKG(skaleDKG: SkaleDKG, name: string) {
    await skaleDKG.setSuccessfulDKGPublic(stringValue(web3.utils.soliditySha3(name)));
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
    return (await schainsInternal.getNumberOfNodesInGroup(stringValue(web3.utils.soliditySha3(name)))).toString();
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
        stringValue(web3.utils.soliditySha3(name)),
        randomNode1,
        getRandomVerificationVector(t),
        getRandomSecretKeyContribution(parseInt(n, 10))
    );
    await skipTime(ethers, 1800);
    await skaleDKG.connect(node).complaint(
        stringValue(web3.utils.soliditySha3(name)),
        randomNode1,
        randomNode2
    );
}

async function setNodeInMaintenance(nodes: Nodes, node: Wallet, nodeId: string) {
    await nodes.connect(node).setNodeInMaintenance(nodeId);
    console.log("Set Node In Maintenance", nodeId);
}

async function removeNodeFromInMaintenance(nodes: Nodes, node: Wallet, nodeId: string) {
    await nodes.connect(node).removeNodeFromInMaintenance(nodeId);
    console.log("Remove Node From In Maintenance", nodeId);
}


function stringValue(value: string | null) {
    if (value) {
        return value;
    } else {
        return "";
    }
}

function findEvent(events: Event[] | undefined, eventName: string) {
    if (events) {
        const target = events.find((event) => event.event === eventName);
        if (target) {
            return target;
        } else {
            throw new Error("Event was not emitted");
        }
    } else {
        throw new Error("Event was not emitted");
    }
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

    beforeEach(async () => {
        [owner, validator] = await ethers.getSigners();

        node = new Wallet(String(privateKeys[2])).connect(ethers.provider);

        await owner.sendTransaction({to: node.address, value: ethers.utils.parseEther("10000")});

        contractManager = await deployContractManager();

        contractManager = await deployContractManager();
        skaleDKG = await deploySkaleDKGTester(contractManager);

        nodes = await deployNodes(contractManager);
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

        const SCHAIN_TYPE_MANAGER_ROLE = await schainsInternal.SCHAIN_TYPE_MANAGER_ROLE();
        await schainsInternal.grantRole(SCHAIN_TYPE_MANAGER_ROLE, owner.address);

        await schainsInternal.addSchainType(1, 16);
        await schainsInternal.addSchainType(4, 16);
        await schainsInternal.addSchainType(128, 16);
        await schainsInternal.addSchainType(0, 2);
        await schainsInternal.addSchainType(32, 4);
    });

    it("random test", async () => {
        const nodesAmount = 17;
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        for (let nodeId = 0; nodeId < nodesAmount; ++nodeId) {
            await createNode(skaleManager, node, nodeId);
            await getSpaceOfNode(nodes, nodeId);
        }
        await createSchain(schains, 1, "A", owner);
        await getNodesInSchain(schainsInternal, "A");
        console.log(await countNodesWithFreeSpace(nodes, 128));
        console.log(await countNodesWithFreeSpace(nodes, 0));

        // const numberOfSchains = 64;
        // for (let schainNumber = 0; schainNumber < numberOfSchains; schainNumber++) {
        //     const result = await (await schains.addSchainByFoundation(0, 1, 0, "schain-" + schainNumber, owner.address)).wait();
        //     await skaleDKG.setSuccessfulDKGPublic(
        //         stringValue(web3.utils.soliditySha3("schain-" + schainNumber))
        //     );
        //     console.log("create", schainNumber + 1, "schain on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
        // }

        // const gasLimit = 12e6;
        // const rotIndex = Math.floor(Math.random() * nodesAmount);
        // const schainHashes = await schainsInternal.getSchainHashesForNode(rotIndex);
        // console.log("Rotation for node", rotIndex);
        // console.log("Will process", schainHashes.length, "rotations");
        // const gas = [];
        // for (let i = 0; i < schainHashes.length; i++) {
        //     const estimatedGas = await skaleManager.estimateGas.nodeExit(rotIndex);
        //     console.log("Estimated gas on nodeExit", estimatedGas.toNumber());
        //     const overrides = {
        //         gasLimit: estimatedGas.toNumber()
        //     }
        //     const result = await (await skaleManager.connect(node).nodeExit(rotIndex, overrides)).wait();
        //     // console.log("Gas limit was:", result);
        //     console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
        //     gas.push(result.gasUsed.toNumber());
        //     if (result.gasUsed.toNumber() > gasLimit) {
        //         break;
        //     }
        //     await skaleDKG.setSuccessfulDKGPublic(
        //         schainHashes[schainHashes.length - i - 1]
        //     );
        // }
    });

    // it("max node rotation on 17 nodes", async () => {
    //     const validatorId = 1;

    //     await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
    //     await validatorService.disableWhitelist();
    //     const signature = await getValidatorIdSignature(validatorId, node);
    //     await validatorService.connect(validator).linkNodeAddress(node.address, signature);
    //     await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

    //     const nodesAmount = 16;
    //     const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
    //     for (let nodeId = 0; nodeId < nodesAmount; ++nodeId) {
    //         await skaleManager.connect(node).createNode(
    //             1, // port
    //             0, // nonce
    //             "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
    //             "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
    //             ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
    //             "d2-" + nodeId, // name)
    //             "some.domain.name"
    //         );
    //     }

    //     const numberOfSchains = 128;
    //     for (let schainNumber = 0; schainNumber < numberOfSchains; schainNumber++) {
    //         const result = await (await schains.addSchainByFoundation(0, 1, 0, "schain-" + schainNumber, owner.address)).wait();
    //         const nodeInGroup = findEvent(result.events, "SchainNodes").args?.nodesInGroup;
    //             console.log("Nodes in Schain:");
    //             const setOfNodes = new Set();
    //             for (const nodeOfSchain of nodeInGroup) {
    //                 if (!setOfNodes.has(nodeOfSchain.toNumber())) {
    //                     setOfNodes.add(nodeOfSchain.toNumber());
    //                 } else {
    //                     console.log("Node", nodeOfSchain.toNumber(), "already exist");
    //                     process.exit();
    //                 }
    //                 console.log(nodeOfSchain.toNumber());
    //             }
    //         await skaleDKG.setSuccessfulDKGPublic(
    //             stringValue(web3.utils.soliditySha3("schain-" + schainNumber))
    //         );
    //         console.log("create", schainNumber + 1, "schain on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
    //     }

    //     // await schains.addSchainByFoundation(0, 1, 0, "schain-128", owner)
    //     //     .should.be.eventually.rejectedWith("Not enough nodes to create Schain");

    //     await skaleManager.connect(node).createNode(
    //         1, // port
    //         0, // nonce
    //         "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // ip
    //         "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // public ip
    //         ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
    //         "d2-16", // name)
    //         "some.domain.name"
    //     );

    //     const gasLimit = 12e6;
    //     const rotIndex = Math.floor(Math.random() * nodesAmount);
    //     const schainHashes = await schainsInternal.getSchainHashesForNode(rotIndex);
    //     console.log("Rotation for node", rotIndex);
    //     console.log("Will process", schainHashes.length, "rotations");
    //     const gas = [];
    //     for (let i = 0; i < schainHashes.length; i++) {
    //         const estimatedGas = await skaleManager.estimateGas.nodeExit(rotIndex);
    //         const overrides = {
    //             gasLimit: Math.ceil(estimatedGas.toNumber() * 1.1)
    //         }
    //         console.log("Estimated gas on nodeExit", overrides.gasLimit);
    //         const result = await (await skaleManager.connect(node).nodeExit(rotIndex, overrides)).wait();
    //         // console.log("Gas limit was:", result);
    //         console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
    //         gas.push(result.gasUsed.toNumber());
    //         if (result.gasUsed.toNumber() > gasLimit) {
    //             break;
    //         }
    //         await skaleDKG.setSuccessfulDKGPublic(
    //             schainHashes[schainHashes.length - i - 1]
    //         );
    //     }
    // });

    // it("random rotation on dynamically creating schains", async () => {
    //     const validatorId = 1;

    //     await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
    //     await validatorService.disableWhitelist();
    //     const signature = await getValidatorIdSignature(validatorId, node);
    //     await validatorService.connect(validator).linkNodeAddress(node.address, signature);
    //     await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

    //     const maxNodesAmount = 1000;
    //     const gasLimit = 12e6;
    //     const measurementsSchainCreation = [];
    //     const measurementsRotation = [];
    //     const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
    //     const exitedNode = new Set();
    //     for (let nodeId = 0; nodeId < maxNodesAmount; ++nodeId) {
    //         await skaleManager.connect(node).createNode(
    //             1, // port
    //             0, // nonce
    //             "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
    //             "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
    //             ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
    //             "d2-" + nodeId, // name)
    //             "some.domain.name"
    //         );

    //         const nodesAmount = nodeId + 1;
    //         if (nodesAmount >= 16) {
    //             const result = await (await schains.addSchainByFoundation(0, 1, 0, "schain-" + nodeId, owner.address)).wait();
    //             await skaleDKG.setSuccessfulDKGPublic(
    //                 stringValue(web3.utils.soliditySha3("schain-" + nodeId))
    //             );
    //             console.log("create schain on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");

    //             measurementsSchainCreation.push({nodesAmount, gasUsed: result.gasUsed.toNumber()});
    //             if (result.gasUsed.toNumber() > gasLimit) {
    //                 break;
    //             }
    //         }
    //         if (nodesAmount >= 155) {
    //             let rotIndex = Math.floor(Math.random() * nodesAmount);
    //             while (exitedNode.has(rotIndex)) {
    //                 rotIndex = Math.floor(Math.random() * nodesAmount);
    //             }
    //             const schainHashes = await schainsInternal.getSchainHashesForNode(rotIndex);
    //             console.log("Rotation for node", rotIndex);
    //             console.log("Will process", schainHashes.length, "rotations");
    //             const gas = [];
    //             for (let i = 0; i < schainHashes.length; i++) {
    //                 const estimatedGas = await skaleManager.estimateGas.nodeExit(rotIndex);
    //                 console.log("Estimated gas on nodeExit", estimatedGas.toNumber());
    //                 const overrides = {
    //                     gasLimit: estimatedGas.toNumber()
    //                 }
    //                 const result = await (await skaleManager.connect(node).nodeExit(rotIndex, overrides)).wait();
    //                 // console.log("Gas limit was:", result);
    //                 console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
    //                 gas.push(result.gasUsed.toNumber());
    //                 if (result.gasUsed.toNumber() > gasLimit) {
    //                     break;
    //                 }
    //                 await skaleDKG.setSuccessfulDKGPublic(
    //                     schainHashes[schainHashes.length - i - 1]
    //                 );
    //             }
    //             skipTime(ethers, 43260);
    //             exitedNode.add(rotIndex);
    //             measurementsRotation.push({nodesAmount, gasUsedArray: gas});
    //         }

    //     }

    //     fs.writeFileSync("createSchain.json", JSON.stringify(measurementsSchainCreation, null, 4));
    // })
});
