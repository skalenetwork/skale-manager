import { deployContractManager } from "../test/tools/deploy/contractManager";
import { deployValidatorService } from "../test/tools/deploy/delegation/validatorService";
import { deploySkaleManager } from "../test/tools/deploy/skaleManager";
import {
    ContractManagerInstance,
    SchainsInstance,
    SchainsInternalInstance,
    SkaleDKGTesterInstance,
    SkaleManagerInstance,
    ValidatorServiceInstance
} from "../types/truffle-contracts";
import { privateKeys } from "../test/tools/private-keys";
import * as elliptic from "elliptic";
import { deploySchains } from "../test/tools/deploy/schains";
import { deploySchainsInternal } from "../test/tools/deploy/schainsInternal";
import { deploySkaleDKGTester } from "../test/tools/deploy/test/skaleDKGTester";
import { skipTime, currentTime } from "../test/tools/time";
import fs from 'fs';

const ec = new elliptic.ec("secp256k1");

contract("createSchains", ([owner, validator, node]) => {
    let contractManager: ContractManagerInstance;
    let validatorService: ValidatorServiceInstance;
    let skaleManager: SkaleManagerInstance;
    let schains: SchainsInstance;
    let schainsInternal: SchainsInternalInstance;
    let skaleDKG: SkaleDKGTesterInstance;

    beforeEach(async () => {
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

        await validatorService.registerValidator("Validator", "", 0, 0, {from: validator});
        await validatorService.disableWhitelist();
        let signature = await web3.eth.sign(web3.utils.soliditySha3(validatorId.toString()), node);
        signature = (signature.slice(130) === "00" ? signature.slice(0, 130) + "1b" :
                (signature.slice(130) === "01" ? signature.slice(0, 130) + "1c" : signature));
        await validatorService.linkNodeAddress(node, signature, {from: validator});
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner);

        const nodesAmount = 16;
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        for (let nodeId = 0; nodeId < nodesAmount; ++nodeId) {
            await skaleManager.createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
                "d2-" + nodeId, // name)
                "somedomain.name",
            {from: node});
        }

        const numberOfSchains = 64;
        for (let schainNumber = 0; schainNumber < numberOfSchains; schainNumber++) {
            const result = await schains.addSchainByFoundation(0, 1, 0, "schain-" + schainNumber, owner);
            await skaleDKG.setSuccesfulDKGPublic(
                web3.utils.soliditySha3("schain-" + schainNumber)
            );
            console.log("create", schainNumber + 1, "schain on", nodesAmount, "nodes:\t", result.receipt.gasUsed, "gu");
        }

        await skaleManager.createNode(
            1, // port
            0, // nonce
            "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // ip
            "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // public ip
            ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
            "d2-16", // name)
            "somedomain.name",
        {from: node});

        const gasLimit = 12e6;
        const rotIndex = Math.floor(Math.random() * nodesAmount);
        const schainIds = await schainsInternal.getSchainIdsForNode(rotIndex);
        console.log("Rotation for node", rotIndex);
        console.log("Will process", schainIds.length, "rotations");
        const gas = [];
        for (let i = 0; i < schainIds.length; i++) {
            const result = await skaleManager.nodeExit(rotIndex, {from: node});
            console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.receipt.gasUsed, "gu");
            gas.push(result.receipt.gasUsed);
            if (result.receipt.gasUsed > gasLimit) {
                break;
            }
            await skaleDKG.setSuccesfulDKGPublic(
                schainIds[schainIds.length - i - 1]
            );
        }
    });

    it("max node rotation on 17 nodes", async () => {
        const validatorId = 1;

        await validatorService.registerValidator("Validator", "", 0, 0, {from: validator});
        await validatorService.disableWhitelist();
        let signature = await web3.eth.sign(web3.utils.soliditySha3(validatorId.toString()), node);
        signature = (signature.slice(130) === "00" ? signature.slice(0, 130) + "1b" :
                (signature.slice(130) === "01" ? signature.slice(0, 130) + "1c" : signature));
        await validatorService.linkNodeAddress(node, signature, {from: validator});
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner);

        const nodesAmount = 16;
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        for (let nodeId = 0; nodeId < nodesAmount; ++nodeId) {
            await skaleManager.createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
                "d2-" + nodeId, // name)
                "somedomain.name",
            {from: node});
        }

        const numberOfSchains = 128;
        for (let schainNumber = 0; schainNumber < numberOfSchains; schainNumber++) {
            const result = await schains.addSchainByFoundation(0, 1, 0, "schain-" + schainNumber, owner);
            await skaleDKG.setSuccesfulDKGPublic(
                web3.utils.soliditySha3("schain-" + schainNumber)
            );
            console.log("create", schainNumber + 1, "schain on", nodesAmount, "nodes:\t", result.receipt.gasUsed, "gu");
        }

        // await schains.addSchainByFoundation(0, 1, 0, "schain-128", owner)
        //     .should.be.eventually.rejectedWith("Not enough nodes to create Schain");

        await skaleManager.createNode(
            1, // port
            0, // nonce
            "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // ip
            "0x7f" + ("000000" + Number(16).toString(16)).slice(-6), // public ip
            ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
            "d2-16", // name)
            "somedomain.name",
        {from: node});

        const gasLimit = 12e6;
        const rotIndex = Math.floor(Math.random() * nodesAmount);
        const schainIds = await schainsInternal.getSchainIdsForNode(rotIndex);
        console.log("Rotation for node", rotIndex);
        console.log("Will process", schainIds.length, "rotations");
        const gas = [];
        for (let i = 0; i < schainIds.length; i++) {
            const result = await skaleManager.nodeExit(rotIndex, {from: node});
            console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.receipt.gasUsed, "gu");
            gas.push(result.receipt.gasUsed);
            if (result.receipt.gasUsed > gasLimit) {
                break;
            }
            await skaleDKG.setSuccesfulDKGPublic(
                schainIds[schainIds.length - i - 1]
            );
        }
    });

    it("random rotation on dynamically creating schains", async () => {
        const validatorId = 1;

        await validatorService.registerValidator("Validator", "", 0, 0, {from: validator});
        await validatorService.disableWhitelist();
        let signature = await web3.eth.sign(web3.utils.soliditySha3(validatorId.toString()), node);
        signature = (signature.slice(130) === "00" ? signature.slice(0, 130) + "1b" :
                (signature.slice(130) === "01" ? signature.slice(0, 130) + "1c" : signature));
        await validatorService.linkNodeAddress(node, signature, {from: validator});
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner);

        const maxNodesAmount = 1000;
        const gasLimit = 12e6;
        const measurementsSchainCreation = [];
        const measurementsRotation = [];
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        const exitedNode = new Set();
        for (let nodeId = 0; nodeId < maxNodesAmount; ++nodeId) {
            await skaleManager.createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
                "d2-" + nodeId, // name)
                "somedomain.name",
            {from: node});

            const nodesAmount = nodeId + 1;
            if (nodesAmount >= 16) {
                const result = await schains.addSchainByFoundation(0, 1, 0, "schain-" + nodeId, owner);
                await skaleDKG.setSuccesfulDKGPublic(
                    web3.utils.soliditySha3("schain-" + nodeId)
                );
                console.log("create schain on", nodesAmount, "nodes:\t", result.receipt.gasUsed, "gu");
                measurementsSchainCreation.push({nodesAmount, gasUsed: result.receipt.gasUsed});
                if (result.receipt.gasUsed > gasLimit) {
                    break;
                }
            }
            if (nodesAmount >= 155) {
                let rotIndex = Math.floor(Math.random() * nodesAmount);
                while (exitedNode.has(rotIndex)) {
                    rotIndex = Math.floor(Math.random() * nodesAmount);
                }
                const schainIds = await schainsInternal.getSchainIdsForNode(rotIndex);
                console.log("Rotation for node", rotIndex);
                console.log("Will process", schainIds.length, "rotations");
                const gas = [];
                for (let i = 0; i < schainIds.length; i++) {
                    const result = await skaleManager.nodeExit(rotIndex, {from: node});
                    console.log("" + (i + 1) + "", "Rotation on", nodesAmount, "nodes:\t", result.receipt.gasUsed, "gu");
                    gas.push(result.receipt.gasUsed);
                    if (result.receipt.gasUsed > gasLimit) {
                        break;
                    }
                    await skaleDKG.setSuccesfulDKGPublic(
                        schainIds[schainIds.length - i - 1]
                    );
                }
                skipTime(web3, 43260);
                exitedNode.add(rotIndex);
                measurementsRotation.push({nodesAmount, gasUsedArray: gas});
            }

        }

        fs.writeFileSync("createSchain.json", JSON.stringify(measurementsSchainCreation, null, 4));
    })
});
