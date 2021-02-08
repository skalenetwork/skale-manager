import { deployContractManager } from "../test/tools/deploy/contractManager";
import { deployValidatorService } from "../test/tools/deploy/delegation/validatorService";
import { deploySkaleManager } from "../test/tools/deploy/skaleManager";
import { ContractManager, SchainsInstance, SkaleManagerInstance, ValidatorService } from "../types/truffle-contracts";
import { privateKeys } from "../test/tools/private-keys";
import * as elliptic from "elliptic";
import { deploySchains } from "../test/tools/deploy/schains";
import fs from 'fs';

const ec = new elliptic.ec("secp256k1");

contract("createSchains", ([owner, validator, node]) => {
    let contractManager: ContractManager;
    let validatorService: ValidatorService;
    let skaleManager: SkaleManagerInstance;
    let schains: SchainsInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        validatorService = await deployValidatorService(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schains = await deploySchains(contractManager);
    });

    it("gas based on nodes amount", async () => {
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
        const measurements = []
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
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
                measurements.push({nodesAmount, gasUsed: result.receipt.gasUsed});
                console.log("create schain on", nodesAmount, "nodes:\t", result.receipt.gasUsed, "gu");
                if (result.receipt.gasUsed > gasLimit) {
                    break;
                }
            }
        }

        fs.writeFileSync("createSchain.json", JSON.stringify(measurements, null, 4));
    })
});
