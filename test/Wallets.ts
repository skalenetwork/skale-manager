import { ContractManager,
        Schains,
        SchainsInternal,
        SkaleDKGTester,
        SkaleManager,
        ValidatorService,
        Wallets } from "../typechain";
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
import { SchainType } from "./tools/types";
import chaiAlmost from "chai-almost";
import { ethers, web3 } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { assert } from "chai";
import { solidity } from "ethereum-waffle";
import { ContractTransaction, PopulatedTransaction, Wallet } from "ethers";
import { makeSnapshot, applySnapshot } from "./tools/snapshot";
import { send } from "process";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

async function ethSpent(response: ContractTransaction) {
    const gasUsed = (await response.wait()).gasUsed;
    if (response.gasPrice) {
        const cost = response.gasPrice.toNumber() * gasUsed.toNumber();
        return parseFloat(web3.utils.fromWei(cost.toString()));
    } else {
        throw new ReferenceError("gasPrice is undefined");
    }
}

async function getBalance(address: string) {
    return parseFloat(web3.utils.fromWei(await web3.eth.getBalance(address)));
}

function fromWei(value: string) {
    return parseFloat(web3.utils.fromWei(value));
}

function hexValue(value: string) {
    if (value.length % 2 === 0) {
        return value;
    } else {
        return "0" + value;
    }
}

async function getValidatorIdSignature(validatorId: BigNumber, signer: Wallet) {
    const hash = web3.utils.soliditySha3(validatorId.toString());
    if (hash) {
        const signature = await web3.eth.accounts.sign(hash, signer.privateKey);
        return signature.signature;
    } else {
        return "";
    }
}

async function sendTransactionFromWallet(tx: PopulatedTransaction, signer: Wallet) {
    await signer.signTransaction(tx);
    return await signer.connect(ethers.provider).sendTransaction(tx);
}

function boolParser(res: string) {
    return "" + (res === '0x0000000000000000000000000000000000000000000000000000000000000001');
}

async function callFromWallet(tx: PopulatedTransaction, signer: Wallet, parser: (a: string) => string): Promise<string> {
    await signer.signTransaction(tx);
    return parser(await signer.connect(ethers.provider).call(tx));
}

function getRound(value: number) {
    return Math.round(value*1e9)/1e9;
}

function stringValue(value: string | null) {
    if (value) {
        return value;
    } else {
        return "";
    }
}

describe("Wallets", () => {
    let owner: SignerWithAddress;
    let validator1: SignerWithAddress;
    let validator2: SignerWithAddress;
    let nodeAddress1: Wallet;
    let nodeAddress2: Wallet;

    let contractManager: ContractManager;
    let wallets: Wallets;
    let validatorService: ValidatorService
    let schains: Schains;
    let skaleManager: SkaleManager;
    let skaleDKG: SkaleDKGTester;
    let schainsInternal: SchainsInternal;

    const validator1Id = 1;
    const validator2Id = 2;
    let snapshot: number;

    before(async() => {
        chai.use(chaiAlmost(0.002));
        [owner, validator1, validator2] = await ethers.getSigners();

        nodeAddress1 = new Wallet(String(privateKeys[3]));
        nodeAddress2 = new Wallet(String(privateKeys[4]));
        await owner.sendTransaction({to: nodeAddress1.address, value: ethers.utils.parseEther("10000")});
        await owner.sendTransaction({to: nodeAddress2.address, value: ethers.utils.parseEther("10000")});

        contractManager = await deployContractManager();
        wallets = await deployWallets(contractManager);
        validatorService = await deployValidatorService(contractManager);
        schains = await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

        await validatorService.connect(validator1).registerValidator("Validator 1", "", 0, 0);
        await validatorService.connect(validator2).registerValidator("Validator 2", "", 0, 0);
        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        const SCHAIN_TYPE_MANAGER_ROLE = await schainsInternal.SCHAIN_TYPE_MANAGER_ROLE();
        await schainsInternal.grantRole(SCHAIN_TYPE_MANAGER_ROLE, owner.address);
        const SCHAIN_REMOVAL_ROLE = await skaleManager.SCHAIN_REMOVAL_ROLE();
        await skaleManager.grantRole(SCHAIN_REMOVAL_ROLE, owner.address);
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    it("should revert if someone sends ETH to contract Wallets", async() => {
        const amount = ethers.utils.parseEther("1.0");
        await owner.sendTransaction({to: wallets.address, value: amount})
        .should.be.eventually.rejectedWith("Validator address does not exist");
    });

    it("should recharge validator wallet sending ETH to contract Wallets", async() => {
        const amount = ethers.utils.parseEther("1.0");
        (await wallets.getValidatorBalance(validator1Id)).toNumber().should.be.equal(0);
        await validator1.sendTransaction({to: wallets.address, value: amount});
        (await wallets.getValidatorBalance(validator1Id)).should.be.equal(amount);
    });

    it("should recharge validator wallet", async() => {
        const amount = 1e9;
        (await wallets.getValidatorBalance(validator1Id)).toNumber().should.be.equal(0);
        (await wallets.getValidatorBalance(validator2Id)).toNumber().should.be.equal(0);

        await wallets.rechargeValidatorWallet(validator1Id, {value: amount.toString()});
        (await wallets.getValidatorBalance(validator1Id)).toNumber().should.be.equal(amount);
        (await wallets.getValidatorBalance(validator2Id)).toNumber().should.be.equal(0);
    });

    it("should withdraw from validator wallet", async() => {
        const amount = 1e9;
        await wallets.rechargeValidatorWallet(validator1Id, {value: amount.toString()});
        const validator1Balance = Number.parseInt(await web3.eth.getBalance(validator1.address), 10);

        const tx = await wallets.connect(validator1).withdrawFundsFromValidatorWallet(amount);
        const validator1BalanceAfterWithdraw = fromWei(await web3.eth.getBalance(validator1.address)) + await ethSpent(tx);
        assert.equal(getRound(validator1BalanceAfterWithdraw), getRound((validator1Balance + amount)/1e18));
        await wallets.connect(validator2).withdrawFundsFromValidatorWallet(amount).should.be.eventually.rejectedWith("Balance is too low");
        await wallets.withdrawFundsFromValidatorWallet(amount).should.be.eventually.rejectedWith("Validator address does not exist");
    });

    describe("when nodes and schains have been created", async() => {
        const schain1Name = "schain-1";
        const schain2Name = "schain-2";
        const schain1Id = web3.utils.soliditySha3(schain1Name);
        const schain2Id = web3.utils.soliditySha3(schain2Name);

        let snapshotOfDeployedContracts: number;

        before(async () => {
            snapshotOfDeployedContracts = await makeSnapshot();
            await validatorService.disableWhitelist();
            let signature = await getValidatorIdSignature(new BigNumber(validator1Id), nodeAddress1);
            await validatorService.connect(validator1).linkNodeAddress(nodeAddress1.address, signature);
            signature = await getValidatorIdSignature(new BigNumber(validator2Id), nodeAddress2);
            await validatorService.connect(validator2).linkNodeAddress(nodeAddress2.address, signature);

            const nodesPerValidator = 2;
            const validators = [
                {
                    nodePublicKey: ec.keyFromPrivate(String(nodeAddress1.privateKey).slice(2)).getPublic(),
                    nodeAddress: nodeAddress1
                },
                {
                    nodePublicKey: ec.keyFromPrivate(String(nodeAddress2.privateKey).slice(2)).getPublic(),
                    nodeAddress: nodeAddress2
                }
            ];
            for (const [validatorIndex, validator] of validators.entries()) {
                for (const index of Array(nodesPerValidator).keys()) {
                    const hexIndex = ("0" + (validatorIndex * nodesPerValidator + index).toString(16)).slice(-2);
                    const tx = await skaleManager.connect(validator.nodeAddress).populateTransaction.createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        ["0x" + hexValue(validator.nodePublicKey.x.toString('hex')),
                         "0x" + hexValue(validator.nodePublicKey.y.toString('hex'))], // public key
                        "D2-" + hexIndex, // name
                        "some.domain.name");
                    await sendTransactionFromWallet(tx, validator.nodeAddress);
                }
            }

            await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address)
            await schainsInternal.addSchainType(1, 16);
            await schainsInternal.addSchainType(4, 16);
            await schainsInternal.addSchainType(128, 16);
            await schainsInternal.addSchainType(0, 2);
            await schainsInternal.addSchainType(32, 4);

            await schains.addSchainByFoundation(0, SchainType.TEST, 0, schain1Name, validator1.address);
            await skaleDKG.setSuccessfulDKGPublic(stringValue(schain1Id));

            await schains.addSchainByFoundation(0, SchainType.TEST, 0, schain2Name, validator2.address);
            await skaleDKG.setSuccessfulDKGPublic(stringValue(schain2Id));
        });

        after(async () => {
            await applySnapshot(snapshotOfDeployedContracts);
        });

        it("should automatically recharge wallet after creating schain by foundation", async () => {
            const amount = 1e9;
            await schains.addSchainByFoundation(0, SchainType.TEST, 0, "schain-3", validator2.address, {value: amount.toString()});
            const schainBalance = await wallets.getSchainBalance(stringValue(web3.utils.soliditySha3("schain-3")));
            amount.should.be.equal(schainBalance.toNumber());
        });

        it("should recharge schain wallet", async() => {
            const amount = 1e9;
            (await wallets.getSchainBalance(stringValue(schain1Id))).toNumber().should.be.equal(0);
            (await wallets.getSchainBalance(stringValue(schain2Id))).toNumber().should.be.equal(0);

            await wallets.rechargeSchainWallet(stringValue(schain1Id), {value: amount.toString()});
            (await wallets.getSchainBalance(stringValue(schain1Id))).toNumber().should.be.equal(amount);
            (await wallets.getSchainBalance(stringValue(schain2Id))).toNumber().should.be.equal(0);
        });

        it("should recharge schain wallet sending ETH to contract Wallets", async() => {
            const amount = ethers.utils.parseEther("1.0");
            (await wallets.getSchainBalance(stringValue(schain1Id))).toNumber().should.be.equal(0);
            await validator1.sendTransaction({to: wallets.address, value: amount});
            (await wallets.getSchainBalance(stringValue(schain1Id))).should.be.equal(amount);
        });

        describe("when validators and schains wallets are recharged", async () => {
            const initialBalance = 1;

            let snapshotWithNodesAndSchains: number;

            before(async () => {
                snapshotWithNodesAndSchains = await makeSnapshot();
                await wallets.rechargeValidatorWallet(validator1Id, {value: (initialBalance * 1e18).toString()});
                await wallets.rechargeValidatorWallet(validator2Id, {value: (initialBalance * 1e18).toString()});
                await wallets.rechargeSchainWallet(stringValue(schain1Id), {value: (initialBalance * 1e18).toString()});
                await wallets.rechargeSchainWallet(stringValue(schain2Id), {value: (initialBalance * 1e18).toString()});
            });

            after(async () => {
                await applySnapshot(snapshotWithNodesAndSchains);
            });

            it("should move ETH to schain owner after schain termination", async () => {
                let balanceBefore = await getBalance(validator1.address);
                const result = await skaleManager.connect(validator1).deleteSchain(schain1Name);
                let balance = await getBalance(validator1.address);
                const expectedBalance = balanceBefore - await ethSpent(result) + initialBalance;
                getRound(balance).should.be.equal(getRound(expectedBalance));

                balanceBefore = await getBalance(validator2.address);
                await skaleManager.deleteSchainByRoot(schain2Name);
                balance = await getBalance(validator2.address);
                balance.should.be.equal(balanceBefore + initialBalance);
            });

            it("should reimburse gas for node exit", async() => {
                const balanceBefore = await getBalance(nodeAddress1.address);
                const tx = await skaleManager.connect(nodeAddress1).populateTransaction.nodeExit(0);
                const response = await sendTransactionFromWallet(tx, nodeAddress1);
                const balance = await getBalance(nodeAddress1.address);
                // balance.should.not.be.lessThan(balanceBefore);
                // balance.should.be.almost(balanceBefore);
                const validatorBalance = await wallets.getValidatorBalance(validator1Id);
                (initialBalance - fromWei(validatorBalance.toString()))
                    .should.be.almost(await ethSpent(response));
            });
        });
    });
});
