import { deployContractManager } from "../test/tools/deploy/contractManager";
import { deployValidatorService } from "../test/tools/deploy/delegation/validatorService";
import { deploySkaleManager } from "../test/tools/deploy/skaleManager";
import { ContractManager, Schains, SkaleManager, ValidatorService } from "../typechain";
import { privateKeys } from "../test/tools/private-keys";
import * as elliptic from "elliptic";
import { deploySchains } from "../test/tools/deploy/schains";
import fs from 'fs';
import { ethers, web3 } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumberish } from "ethers";

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

describe("createSchains", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let node: SignerWithAddress;

    let contractManager: ContractManager;
    let validatorService: ValidatorService;
    let skaleManager: SkaleManager;
    let schains: Schains;

    beforeEach(async () => {
        [owner, validator, node] = await ethers.getSigners();
        contractManager = await deployContractManager();

        validatorService = await deployValidatorService(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schains = await deploySchains(contractManager);
    });

    it("gas based on nodes amount", async () => {
        const validatorId = 1;

        await validatorService.connect(validator).registerValidator("Validator", "", 0, 0);
        await validatorService.disableWhitelist();
        const signature = await getValidatorIdSignature(validatorId, node);
        await validatorService.connect(validator).linkNodeAddress(node.address, signature);
        await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address);

        const maxNodesAmount = 1000;
        const gasLimit = 12e6;
        const measurements = []
        const publicKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        for (let nodeId = 0; nodeId < maxNodesAmount; ++nodeId) {
            await skaleManager.connect(node).createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + nodeId.toString(16)).slice(-6), // public ip
                ["0x" + publicKey.x.toString('hex'), "0x" + publicKey.y.toString('hex')], // public key
                "d2-" + nodeId, // name)
                "somedomain.name");

            const nodesAmount = nodeId + 1;
            if (nodesAmount >= 16) {
                const result = await (await schains.addSchainByFoundation(0, 1, 0, "schain-" + nodeId, owner.address)).wait();
                measurements.push({nodesAmount, gasUsed: result.gasUsed});
                console.log("create schain on", nodesAmount, "nodes:\t", result.gasUsed, "gu");
                if (result.gasUsed.toNumber() > gasLimit) {
                    break;
                }
            }
        }

        fs.writeFileSync("createSchain.json", JSON.stringify(measurements, null, 4));
    })
});
