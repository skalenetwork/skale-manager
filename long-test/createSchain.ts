import { deployContractManager } from "../test/tools/deploy/contractManager";
import { deployValidatorService } from "../test/tools/deploy/delegation/validatorService";
import { deploySkaleManager } from "../test/tools/deploy/skaleManager";
import { deploySchainsInternal } from "../test/tools/deploy/schainsInternal";
import { ContractManager, Schains, SkaleManager, ValidatorService } from "../typechain";
import { privateKeys } from "../test/tools/private-keys";
import { deploySchains } from "../test/tools/deploy/schains";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Event, Wallet } from "ethers";
import { SchainsInternal } from "../typechain/SchainsInternal";
import { getPublicKey, getValidatorIdSignature } from "../test/tools/signatures";
import { SchainType } from "../test/tools/types";

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

describe("Schain creation test", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let nodeAddress: Wallet

    let contractManager: ContractManager;
    let validatorService: ValidatorService;
    let skaleManager: SkaleManager;
    let schains: Schains;
    let schainsInternal: SchainsInternal;

    beforeEach(async () => {
        [owner, validator] = await ethers.getSigners();
        nodeAddress = new Wallet(String(privateKeys[2])).connect(ethers.provider);
        await owner.sendTransaction({to: nodeAddress.address, value: ethers.utils.parseEther("10000")});
        contractManager = await deployContractManager();

        validatorService = await deployValidatorService(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schains = await deploySchains(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
    });

    it("create and delete medium schains", async () => {
        await validatorService.grantRole(await validatorService.VALIDATOR_MANAGER_ROLE(), owner.address);
        await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
        const validatorId = await validatorService.getValidatorId(validator.address);
        await validatorService.disableWhitelist();
        const signature = await getValidatorIdSignature(validatorId, nodeAddress);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature);
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);
        const maxNodesAmount = 20;
        for (let nodeId = 0; nodeId < maxNodesAmount; ++nodeId) {
            await skaleManager.connect(nodeAddress).createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                getPublicKey(nodeAddress), // public key
                "d2-" + nodeId, // name)
                "some.domain.name"
            );
        }
        for (let tries = 0; tries < 10; tries++) {
            const type = SchainType.MEDIUM;
            console.log(type);
            for (let try1 = 0; try1 < 32; try1++) {
                const result = await (await schains.addSchainByFoundation(0, type, 0, "schain-" + tries + try1, owner.address, ethers.constants.AddressZero, "0x")).wait();
                const nodeInGroup = findEvent(result.events, "SchainNodes").args?.nodesInGroup;
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
                console.log("create schain-" + tries + try1, result.gasUsed.toNumber(), "gu");
            }

            for (let try2 = 0; try2 < 32; try2++) {
                const resDel = await (await skaleManager.deleteSchain("schain-" + tries + try2)).wait();
                console.log("delete schain-" + tries + try2, resDel.gasUsed.toNumber(), "gu");
            }
        }
    });

    it("create and delete schains", async () => {
        await validatorService.grantRole(await validatorService.VALIDATOR_MANAGER_ROLE(), owner.address);
        await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
        const validatorId = await validatorService.getValidatorId(validator.address);
        await validatorService.disableWhitelist();
        const signature = await getValidatorIdSignature(validatorId, nodeAddress);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature);
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);
        const maxNodesAmount = 20;
        for (let nodeId = 0; nodeId < maxNodesAmount; ++nodeId) {
            await skaleManager.connect(nodeAddress).createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                getPublicKey(nodeAddress), // public key
                "d2-" + nodeId, // name)
                "some.domain.name"
            );
        }
        for(let tries = 0; tries < 200; tries++) {
            const type = Math.floor(Math.random() * 2) + 1;
            console.log(type);
            const result = await (await schains.addSchainByFoundation(0, type, 0, "schain-" + tries, owner.address, ethers.constants.AddressZero, "0x")).wait();
            const nodeInGroup = findEvent(result.events, "SchainNodes").args?.nodesInGroup;
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

            console.log("create schain-" + tries, result.gasUsed.toNumber(), "gu");
            const resDel = await (await skaleManager.deleteSchain("schain-" + tries)).wait();
            console.log("delete schain-" + tries, resDel.gasUsed.toNumber(), "gu");
        }
    });
});
