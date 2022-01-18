import { deployContractManager } from "../test/tools/deploy/contractManager";
import { deployValidatorService } from "../test/tools/deploy/delegation/validatorService";
import { deploySkaleManager } from "../test/tools/deploy/skaleManager";
import { deploySchainsInternal } from "../test/tools/deploy/schainsInternal";
import { ContractManager, Schains, SchainsInternal, SkaleManager, ValidatorService } from "../typechain";
import { privateKeys } from "../test/tools/private-keys";
import { deploySchains } from "../test/tools/deploy/schains";
import fs from 'fs';
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Event, Wallet } from "ethers";
import { getPublicKey, getValidatorIdSignature } from "../test/tools/signatures";
import { fastBeforeEach } from "../test/tools/mocha";
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

describe("createSchains", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let nodeAddress: Wallet

    let contractManager: ContractManager;
    let validatorService: ValidatorService;
    let skaleManager: SkaleManager;
    let schains: Schains;
    let schainsInternal: SchainsInternal;

    fastBeforeEach(async () => {
        [owner, validator] = await ethers.getSigners();
        nodeAddress = new Wallet(String(privateKeys[2])).connect(ethers.provider);
        await owner.sendTransaction({to: nodeAddress.address, value: ethers.utils.parseEther("10000")});
        contractManager = await deployContractManager();

        validatorService = await deployValidatorService(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schains = await deploySchains(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
    });

    it("gas based on nodes amount", async () => {
        await validatorService.grantRole(await validatorService.VALIDATOR_MANAGER_ROLE(), owner.address);
        await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
        const validatorId = await validatorService.getValidatorId(validator.address);
        await validatorService.disableWhitelist();
        const signature = await getValidatorIdSignature(validatorId, nodeAddress);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature);
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

        const maxNodesAmount = 1000;
        const gasLimit = 12e6;
        const measurements = []
        for (let nodeId = 0; nodeId < maxNodesAmount; ++nodeId) {
            await skaleManager.connect(nodeAddress).createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                getPublicKey(nodeAddress),
                "d2-" + nodeId, // name)
                "some.domain.name");

            const nodesAmount = nodeId + 1;
            if (nodesAmount >= 16) {
                const result = await (await schains.addSchainByFoundation(0, SchainType.SMALL, 0, "schain-" + nodeId, owner.address, ethers.constants.AddressZero, "0x")).wait();
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

                measurements.push({nodesAmount, gasUsed: result.gasUsed});
                console.log("create schain on", nodesAmount, "nodes:\t", result.gasUsed.toNumber(), "gu");
                if (result.gasUsed.toNumber() > gasLimit) {
                    break;
                }
            }
        }

        fs.writeFileSync("createSchain.json", JSON.stringify(measurements, null, 4));
    })
});
