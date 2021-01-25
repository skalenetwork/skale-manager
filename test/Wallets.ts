import { ContractManagerInstance, SchainsInstance, SchainsInternalContract, SkaleManagerInstance, ValidatorServiceInstance, WalletsInstance } from "../types/truffle-contracts";
import { deployContractManager } from "./tools/deploy/contractManager";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import { deployWallets } from "./tools/deploy/wallets";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
chai.should();
chai.use(chaiAsPromised);

contract("Wallets", ([owner, validator, node]) => {
    let contractManager: ContractManagerInstance;
    let wallets: WalletsInstance;
    let validatorService: ValidatorServiceInstance
    let schains: SchainsInstance;
    let skaleManager: SkaleManagerInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        wallets = await deployWallets(contractManager);
        validatorService = await deployValidatorService(contractManager);
        schains = await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);

        await validatorService.registerValidator("Validator", "", 0, 0, {from: validator});

    });

    it("should recharge validator wallet", async() => {
        const amount = 1e9.toString();
        const walletBeforeRecharging = await web3.eth.getBalance(wallets.address);
        assert.equal(walletBeforeRecharging, "0");
        await wallets.rechargeValidatorWallet(1, {from: validator, value: amount});
        const walletAfterRecharging = await web3.eth.getBalance(wallets.address);
        assert.equal(walletAfterRecharging, amount);
    });

    describe("when schain has been created", async() => {
        let schainId: string;
        let validatorId: number;

        beforeEach(async () => {
            validatorId = 1;
            await validatorService.disableWhitelist();
            let signature = await web3.eth.sign(web3.utils.soliditySha3(validatorId.toString()), node);
            signature = (signature.slice(130) === "00" ? signature.slice(0, 130) + "1b" :
                    (signature.slice(130) === "01" ? signature.slice(0, 130) + "1c" : signature));
            await validatorService.linkNodeAddress(node, signature, {from: validator});
            await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner)

            // create 2 nodes
            const nodesCount = 2;
            const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await skaleManager.createNode(
                    8545, // port
                    0, // nonce
                    "0x7f0000" + hexIndex, // ip
                    "0x7f0000" + hexIndex, // public ip
                    ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                    "D2-" + hexIndex, // name
                    {from: node});
            }

            // create schain
            await schains.addSchainByFoundation(0, 4, 0, "schain");
            schainId = web3.utils.soliditySha3("schain");
        });

        it("should recharge schain wallet", async() => {
            const amount = 1e9.toString();;
            const walletBeforeRecharging = await web3.eth.getBalance(wallets.address);
            assert.equal(walletBeforeRecharging, "0");
            await wallets.rechargeSchainWallet(schainId, {from: validator, value: amount});
            const walletAfterRecharging = await web3.eth.getBalance(wallets.address);
            assert.equal(walletAfterRecharging, amount);
        });
    });


});
