import { deployContractManager } from "../test/tools/deploy/contractManager";
import { deployValidatorService } from "../test/tools/deploy/delegation/validatorService";
import { deploySkaleManager } from "../test/tools/deploy/skaleManager";
import {
    ContractManager,
    Schains,
    SchainsInternal,
    SkaleDKGTester,
    SkaleManager,
    ValidatorService
} from "../typechain";
import { privateKeys } from "../test/tools/private-keys";
import * as elliptic from "elliptic";
import { deploySchains } from "../test/tools/deploy/schains";
import { deploySchainsInternal } from "../test/tools/deploy/schainsInternal";
import { deploySkaleDKGTester } from "../test/tools/deploy/test/skaleDKGTester";
import { skipTime, currentTime } from "../test/tools/time";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers, web3 } from "hardhat";
import { BigNumberish, Event } from "ethers";
import fs from 'fs';

const ec = new elliptic.ec("secp256k1");

async function getValidatorIdSignature(validatorId: BigNumberish, signer: SignerWithAddress) {
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

describe("createSchains", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let node: SignerWithAddress;

    let contractManager: ContractManager;
    let validatorService: ValidatorService;
    let skaleManager: SkaleManager;
    let schains: Schains;
    let schainsInternal: SchainsInternal;
    let skaleDKG: SkaleDKGTester;

    beforeEach(async () => {
        [owner, validator, node] = await ethers.getSigners();
        contractManager = await deployContractManager();

        contractManager = await deployContractManager();
        skaleDKG = await deploySkaleDKGTester(contractManager);

        validatorService = await deployValidatorService(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);
    });

    it("64 node rotations on 17 nodes", async () => {
        const validatorId = 1;

        await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
        await validatorService.disableWhitelist();
        const signature = await getValidatorIdSignature(validatorId, node);
        await validatorService.connect(validator).linkNodeAddress(node.address, signature);
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

        const nodesAmount = 16;
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        for (let nodeId = 0; nodeId < nodesAmount; ++nodeId) {
            await skaleManager.connect(node).createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
                "d2-" + nodeId, // name)
                "some.domain.name"
            );
        }

        const numberOfSchains = 64;
        for (let schainNumber = 0; schainNumber < numberOfSchains; schainNumber++) {
            const result = await (await schains.addSchainByFoundation(0, 1, 0, "schain-" + schainNumber, owner.address)).wait();
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("schain-" + schainNumber))
            );
            console.log("create", schainNumber + 1, "schain on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
        }

        await skaleManager.connect(node).createNode(
            1, // port
            0, // nonce
            "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // ip
            "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // public ip
            ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
            "d2-16", // name)
            "some.domain.name"
        );

        const gasLimit = 12e6;
        const rotIndex = Math.floor(Math.random() * nodesAmount);
        const schainHashes = await schainsInternal.getSchainHashesForNode(rotIndex);
        console.log("Rotation for node", rotIndex);
        console.log("Will process", schainHashes.length, "rotations");
        const gas = [];
        for (let i = 0; i < schainHashes.length; i++) {
            const estimatedGas = await skaleManager.estimateGas.nodeExit(rotIndex);
            console.log("Estimated gas on nodeExit", estimatedGas.toNumber());
            const overrides = {
                gasLimit: estimatedGas.toNumber()
            }
            const result = await (await skaleManager.connect(node).nodeExit(rotIndex, overrides)).wait();
            // console.log("Gas limit was:", result);
            console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
            gas.push(result.gasUsed.toNumber());
            if (result.gasUsed.toNumber() > gasLimit) {
                break;
            }
            await skaleDKG.setSuccessfulDKGPublic(
                schainHashes[schainHashes.length - i - 1]
            );
        }
    });

    it.only("max node rotation on 17 nodes", async () => {
        const validatorId = 1;

        await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
        await validatorService.disableWhitelist();
        const signature = await getValidatorIdSignature(validatorId, node);
        await validatorService.connect(validator).linkNodeAddress(node.address, signature);
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

        const nodesAmount = 16;
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        for (let nodeId = 0; nodeId < nodesAmount; ++nodeId) {
            await skaleManager.connect(node).createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
                "d2-" + nodeId, // name)
                "some.domain.name"
            );
        }

        const numberOfSchains = 128;
        for (let schainNumber = 0; schainNumber < numberOfSchains; schainNumber++) {
            const result = await (await schains.addSchainByFoundation(0, 1, 0, "schain-" + schainNumber, owner.address)).wait();
            const nodeInGroup = findEvent(result.events, "SchainNodes").args?.nodesInGroup;
                console.log("Nodes in Schain:");
                const setOfNodes = new Set();
                for (const nodeOfSchain of nodeInGroup) {
                    if (!setOfNodes.has(nodeOfSchain.toNumber())) {
                        setOfNodes.add(nodeOfSchain.toNumber());
                    } else {
                        console.log("Node", nodeOfSchain.toNumber(), "already exist");
                        process.exit();
                    }
                    console.log(nodeOfSchain.toNumber());
                }
            await skaleDKG.setSuccessfulDKGPublic(
                stringValue(web3.utils.soliditySha3("schain-" + schainNumber))
            );
            console.log("create", schainNumber + 1, "schain on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
        }

        // await schains.addSchainByFoundation(0, 1, 0, "schain-128", owner)
        //     .should.be.eventually.rejectedWith("Not enough nodes to create Schain");

        await skaleManager.connect(node).createNode(
            1, // port
            0, // nonce
            "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // ip
            "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // public ip
            ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
            "d2-16", // name)
            "some.domain.name"
        );

        const gasLimit = 12e6;
        const rotIndex = Math.floor(Math.random() * nodesAmount);
        const schainHashes = await schainsInternal.getSchainHashesForNode(rotIndex);
        console.log("Rotation for node", rotIndex);
        console.log("Will process", schainHashes.length, "rotations");
        const gas = [];
        for (let i = 0; i < schainHashes.length; i++) {
            const estimatedGas = await skaleManager.estimateGas.nodeExit(rotIndex);
            const overrides = {
                gasLimit: Math.ceil(estimatedGas.toNumber() * 1.1)
            }
            console.log("Estimated gas on nodeExit", overrides.gasLimit);
            const result = await (await skaleManager.connect(node).nodeExit(rotIndex, overrides)).wait();
            // console.log("Gas limit was:", result);
            console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
            gas.push(result.gasUsed.toNumber());
            if (result.gasUsed.toNumber() > gasLimit) {
                break;
            }
            await skaleDKG.setSuccessfulDKGPublic(
                schainHashes[schainHashes.length - i - 1]
            );
        }
    });

    it("random rotation on dynamically creating schains", async () => {
        const validatorId = 1;

        await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
        await validatorService.disableWhitelist();
        const signature = await getValidatorIdSignature(validatorId, node);
        await validatorService.connect(validator).linkNodeAddress(node.address, signature);
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

        const maxNodesAmount = 1000;
        const gasLimit = 12e6;
        const measurementsSchainCreation = [];
        const measurementsRotation = [];
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        const exitedNode = new Set();
        for (let nodeId = 0; nodeId < maxNodesAmount; ++nodeId) {
            await skaleManager.connect(node).createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
                "d2-" + nodeId, // name)
                "some.domain.name"
            );

            const nodesAmount = nodeId + 1;
            if (nodesAmount >= 16) {
                const result = await (await schains.addSchainByFoundation(0, 1, 0, "schain-" + nodeId, owner.address)).wait();
                await skaleDKG.setSuccessfulDKGPublic(
                    stringValue(web3.utils.soliditySha3("schain-" + nodeId))
                );
                console.log("create schain on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");

                measurementsSchainCreation.push({nodesAmount, gasUsed: result.gasUsed.toNumber()});
                if (result.gasUsed.toNumber() > gasLimit) {
                    break;
                }
            }
            if (nodesAmount >= 155) {
                let rotIndex = Math.floor(Math.random() * nodesAmount);
                while (exitedNode.has(rotIndex)) {
                    rotIndex = Math.floor(Math.random() * nodesAmount);
                }
                const schainHashes = await schainsInternal.getSchainHashesForNode(rotIndex);
                console.log("Rotation for node", rotIndex);
                console.log("Will process", schainHashes.length, "rotations");
                const gas = [];
                for (let i = 0; i < schainHashes.length; i++) {
                    const estimatedGas = await skaleManager.estimateGas.nodeExit(rotIndex);
                    console.log("Estimated gas on nodeExit", estimatedGas.toNumber());
                    const overrides = {
                        gasLimit: estimatedGas.toNumber()
                    }
                    const result = await (await skaleManager.connect(node).nodeExit(rotIndex, overrides)).wait();
                    // console.log("Gas limit was:", result);
                    console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
                    gas.push(result.gasUsed.toNumber());
                    if (result.gasUsed.toNumber() > gasLimit) {
                        break;
                    }
                    await skaleDKG.setSuccessfulDKGPublic(
                        schainHashes[schainHashes.length - i - 1]
                    );
                }
                skipTime(ethers, 43260);
                exitedNode.add(rotIndex);
                measurementsRotation.push({nodesAmount, gasUsedArray: gas});
            }

        }

        fs.writeFileSync("createSchain.json", JSON.stringify(measurementsSchainCreation, null, 4));
    })
});
