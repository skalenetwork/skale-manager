import { deployContractManager } from "../test/tools/deploy/contractManager";
import { deployValidatorService } from "../test/tools/deploy/delegation/validatorService";
import { deploySkaleManager } from "../test/tools/deploy/skaleManager";
import { ContractManager, Schains, SkaleManager, ValidatorService } from "../typechain-types";
import { deploySchains } from "../test/tools/deploy/schains";
import fs from 'fs';
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Event, Wallet } from "ethers";
import { getPublicKey, getValidatorIdSignature } from "../test/tools/signatures";
import { fastBeforeEach } from "../test/tools/mocha";
import { SchainType } from "../test/tools/types";
import { TypedEvent } from "../typechain-types/common";
import { SchainNodesEvent } from "../typechain-types/artifacts/@skalenetwork/skale-manager-interfaces/ISchains";

function findEvent<TargetEvent extends TypedEvent>(events: Event[] | undefined, eventName: string) {
    if (events) {
        const target = events.find((event) => event.event === eventName);
        if (target) {
            return target as TargetEvent;
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
    let richGuy: SignerWithAddress;

    let contractManager: ContractManager;
    let validatorService: ValidatorService;
    let skaleManager: SkaleManager;
    let schains: Schains;

    fastBeforeEach(async () => {
        [owner, richGuy, validator] = await ethers.getSigners();
        contractManager = await deployContractManager();
        validatorService = await deployValidatorService(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schains = await deploySchains(contractManager);
    });

    it("gas based on nodes amount", async () => {
        await validatorService.grantRole(await validatorService.VALIDATOR_MANAGER_ROLE(), owner.address);
        await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
        const validatorId = await validatorService.getValidatorId(validator.address);
        await validatorService.disableWhitelist();
        const maxNodesAmount = 1000;
        const etherAmount = ethers.utils.parseEther("10");
        const nodeAddresses: Wallet[] = [];
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

        const gasLimit = 12e6;
        const measurements = []
        for (let nodeId = 0; nodeId < maxNodesAmount; ++nodeId) {
            nodeAddresses.push(Wallet.createRandom().connect(ethers.provider));
            await richGuy.sendTransaction({to: nodeAddresses[nodeId].address, value: etherAmount});
            const signature = await getValidatorIdSignature(validatorId, nodeAddresses[nodeId]);
            await validatorService.connect(validator).linkNodeAddress(nodeAddresses[nodeId].address, signature);
            await skaleManager.connect(nodeAddresses[nodeId]).createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                getPublicKey(nodeAddresses[nodeId]),
                `d2-${nodeId}`, // name)
                "some.domain.name");

            const nodesAmount = nodeId + 1;
            if (nodesAmount >= 16) {
                const result = await (await schains.addSchainByFoundation(0, SchainType.SMALL, 0, `schain-${nodeId}`, owner.address, ethers.constants.AddressZero, [])).wait();
                const nodeInGroup = findEvent<SchainNodesEvent>(result.events, "SchainNodes").args?.nodesInGroup;
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
