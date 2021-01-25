import { ContractManagerInstance,
        SchainsInstance,
        SchainsInternalInstance,
        SkaleDKGTesterInstance,
        SkaleManagerInstance,
        ValidatorServiceInstance,
        WalletsInstance } from "../types/truffle-contracts";
import { deployContractManager } from "./tools/deploy/contractManager";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";
import BigNumber from "bignumber.js";

import { deployWallets } from "./tools/deploy/wallets";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deploySkaleDKGTester } from "./tools/deploy/test/skaleDKGTester";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
chai.should();
chai.use(chaiAsPromised);

contract("Wallets", ([owner, validator, node]) => {
    let contractManager: ContractManagerInstance;
    let wallets: WalletsInstance;
    let validatorService: ValidatorServiceInstance
    let schains: SchainsInstance;
    let skaleManager: SkaleManagerInstance;
    let skaleDKG: SkaleDKGTesterInstance;
    let schainsInternal: SchainsInternalInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        wallets = await deployWallets(contractManager);
        validatorService = await deployValidatorService(contractManager);
        schains = await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

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

    describe("when nodes have been created", async() => {
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
            const nodesCount = 3;
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
                    "somedomain.name",
                    {from: node});
            }
        });

        it("should recharge schain wallet", async() => {
            // create schain
            await schains.addSchainByFoundation(0, 4, 0, "schain", owner);
            schainId = web3.utils.soliditySha3("schain");

            const amount = 1e9.toString();
            const walletBeforeRecharging = await web3.eth.getBalance(wallets.address);
            assert.equal(walletBeforeRecharging, "0");
            await wallets.rechargeSchainWallet(schainId, {from: validator, value: amount});
            const walletAfterRecharging = await web3.eth.getBalance(wallets.address);
            assert.equal(walletAfterRecharging, amount);
        });

        it("should refund gas for node when no schains", async() => {
            const amount = 1e18.toString();
            await wallets.rechargeValidatorWallet(1, {from: validator, value: amount});
            const validatorWalletBefore = parseInt(await web3.eth.getBalance(wallets.address), 10);
            const nodeBefore = parseInt(await web3.eth.getBalance(node), 10);
            await skaleManager.nodeExit(0, {from: node});
            const validatorWalletAfter = parseInt(await web3.eth.getBalance(wallets.address), 10);
            const nodeAfter = parseInt(await web3.eth.getBalance(node), 10);
            expect(validatorWalletBefore).greaterThan(validatorWalletAfter);
            expect(nodeAfter).greaterThan(nodeBefore);
        });

        it("should refund gas for node when schain exists", async() => {
            // creating schain
            schainId = web3.utils.soliditySha3("schain");
            await schains.addSchainByFoundation(0, 4, 0, "schain", owner);
            await skaleDKG.setSuccesfulDKGPublic(schainId);
            // recharging
            const amount = 1e18.toString();
            await wallets.rechargeValidatorWallet(1, {from: validator, value: amount});
            await wallets.rechargeSchainWallet(schainId, {from: validator, value: amount});

            const schainWalletBefore = new BigNumber(await wallets.getSchainBalance(schainId)).toNumber();
            const validatorWalletBefore = new BigNumber(await wallets.getValidatorBalance(validatorId)).toNumber();
            const nodeBefore = parseInt(await web3.eth.getBalance(node), 10);
            const nodeInSchain = (await schainsInternal.getNodesInGroup(schainId))[0];
            await skaleManager.nodeExit(nodeInSchain, {from: node});
            const schainWalletAfter = new BigNumber(await wallets.getSchainBalance(schainId)).toNumber();
            const validatorWalletAfter = new BigNumber(await wallets.getValidatorBalance(validatorId)).toNumber();
            const nodeAfter = parseInt(await web3.eth.getBalance(node), 10);

            expect(schainWalletBefore).greaterThan(schainWalletAfter);
            expect(validatorWalletBefore).greaterThan(validatorWalletAfter);
            expect(nodeAfter).greaterThan(nodeBefore);
        });

    });


});
