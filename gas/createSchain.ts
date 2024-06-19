import {deployContractManager} from "../test/tools/deploy/contractManager";
import {deployValidatorService} from "../test/tools/deploy/delegation/validatorService";
import {deploySkaleManager} from "../test/tools/deploy/skaleManager";
import {ContractManager, Schains, SkaleManager, ValidatorService} from "../typechain-types";
import {deploySchains} from "../test/tools/deploy/schains";
import fs from 'fs';
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import {ContractTransactionReceipt, EventLog, HDNodeWallet, Wallet} from "ethers";
import {getPublicKey, getValidatorIdSignature} from "../test/tools/signatures";
import {fastBeforeEach} from "../test/tools/mocha";
import {SchainType} from "../test/tools/types";

function findEvent(receipt: ContractTransactionReceipt | null, eventName: string) {
    if (receipt) {
        const log = receipt.logs.find((event) => event instanceof EventLog && event.eventName === eventName);
        if (log) {
            return log as EventLog;
        }
    }
    throw new Error("Event was not emitted");
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
        const etherAmount = ethers.parseEther("10");
        const nodeAddresses: HDNodeWallet[] = [];
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
                const result = await (await schains.addSchainByFoundation(0, SchainType.SMALL, 0, `schain-${nodeId}`, owner.address, ethers.ZeroAddress, [])).wait();
                if (!result) {
                    throw new Error("addSchainByFoundation was not mined");
                }
                const nodeInGroup = findEvent(result, "SchainNodes").args?.nodesInGroup;
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
                console.log("create schain on", nodesAmount, "nodes:\t", result.gasUsed, "gu");
                if (result.gasUsed > gasLimit) {
                    break;
                }
            }
        }

        fs.writeFileSync("createSchain.json", JSON.stringify(measurements, null, 4));
    })
});
