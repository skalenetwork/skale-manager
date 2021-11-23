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
import { privateKeys } from "./tools/private-keys";
import { deployWallets } from "./tools/deploy/wallets";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deploySkaleDKGTester } from "./tools/deploy/test/skaleDKGTester";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { SchainType } from "./tools/types";
import chaiAlmost from "chai-almost";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { solidity } from "ethereum-waffle";
import { ContractTransaction, Wallet } from "ethers";
import { makeSnapshot, applySnapshot } from "./tools/snapshot";
import { getPublicKey, getValidatorIdSignature } from "./tools/signatures";
import { stringKeccak256 } from "./tools/hashes";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

async function ethSpent(response: ContractTransaction) {
    const receipt = await response.wait();
    if (receipt.effectiveGasPrice) {
        return receipt.effectiveGasPrice.mul(receipt.gasUsed);
    } else {
        throw new ReferenceError("gasPrice is undefined");
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
        chai.use(chaiAlmost(0.003));
        [owner, validator1, validator2] = await ethers.getSigners();

        nodeAddress1 = new Wallet(String(privateKeys[3])).connect(ethers.provider);
        nodeAddress2 = new Wallet(String(privateKeys[4])).connect(ethers.provider);
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
        await wallets.rechargeValidatorWallet(validator1Id, {value: amount});
        const validator1Balance = await validator1.getBalance();

        const tx = await wallets.connect(validator1).withdrawFundsFromValidatorWallet(amount);
        const validator1BalanceAfterWithdraw = await validator1.getBalance();
        validator1BalanceAfterWithdraw.should.be.equal(validator1Balance.add(amount).sub(await ethSpent(tx)));
        await wallets.connect(validator2).withdrawFundsFromValidatorWallet(amount).should.be.eventually.rejectedWith("Balance is too low");
        await wallets.withdrawFundsFromValidatorWallet(amount).should.be.eventually.rejectedWith("Validator address does not exist");
    });

    describe("when nodes and schains have been created", async() => {
        const schain1Name = "schain-1";
        const schain2Name = "schain-2";
        const schain1Id = stringKeccak256(schain1Name);
        const schain2Id = stringKeccak256(schain2Name);

        let snapshotOfDeployedContracts: number;

        before(async () => {
            snapshotOfDeployedContracts = await makeSnapshot();
            await validatorService.disableWhitelist();
            let signature = await getValidatorIdSignature(validator1Id, nodeAddress1);
            await validatorService.connect(validator1).linkNodeAddress(nodeAddress1.address, signature);
            signature = await getValidatorIdSignature(validator2Id, nodeAddress2);
            await validatorService.connect(validator2).linkNodeAddress(nodeAddress2.address, signature);

            const nodesPerValidator = 2;
            const validators = [
                {
                    nodePublicKey: getPublicKey(nodeAddress1),
                    nodeAddress: nodeAddress1
                },
                {
                    nodePublicKey: getPublicKey(nodeAddress2),
                    nodeAddress: nodeAddress2
                }
            ];
            for (const [validatorIndex, validator] of validators.entries()) {
                for (const index of Array(nodesPerValidator).keys()) {
                    const hexIndex = ("0" + (validatorIndex * nodesPerValidator + index).toString(16)).slice(-2);
                    await skaleManager.connect(validator.nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        validator.nodePublicKey, // public key
                        "D2-" + hexIndex, // name
                        "some.domain.name");
                }
            }

            await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address)
            await schainsInternal.addSchainType(1, 16);
            await schainsInternal.addSchainType(4, 16);
            await schainsInternal.addSchainType(128, 16);
            await schainsInternal.addSchainType(0, 2);
            await schainsInternal.addSchainType(32, 4);

            await schains.addSchainByFoundation(0, SchainType.TEST, 0, schain1Name, validator1.address, ethers.constants.AddressZero);
            await skaleDKG.setSuccessfulDKGPublic(schain1Id);

            await schains.addSchainByFoundation(0, SchainType.TEST, 0, schain2Name, validator2.address, ethers.constants.AddressZero);
            await skaleDKG.setSuccessfulDKGPublic(schain2Id);
        });

        after(async () => {
            await applySnapshot(snapshotOfDeployedContracts);
        });

        it("should automatically recharge wallet after creating schain by foundation", async () => {
            const amount = 1e9;
            await schains.addSchainByFoundation(0, SchainType.TEST, 0, "schain-3", validator2.address, ethers.constants.AddressZero, {value: amount.toString()});
            const schainBalance = await wallets.getSchainBalance(stringKeccak256("schain-3"));
            amount.should.be.equal(schainBalance.toNumber());
        });

        it("should recharge schain wallet", async() => {
            const amount = 1e9;
            (await wallets.getSchainBalance(schain1Id)).toNumber().should.be.equal(0);
            (await wallets.getSchainBalance(schain2Id)).toNumber().should.be.equal(0);

            await wallets.rechargeSchainWallet(schain1Id, {value: amount.toString()});
            (await wallets.getSchainBalance(schain1Id)).toNumber().should.be.equal(amount);
            (await wallets.getSchainBalance(schain2Id)).toNumber().should.be.equal(0);
        });

        it("should recharge schain wallet sending ETH to contract Wallets", async() => {
            const amount = ethers.utils.parseEther("1.0");
            (await wallets.getSchainBalance(schain1Id)).toNumber().should.be.equal(0);
            await validator1.sendTransaction({to: wallets.address, value: amount});
            (await wallets.getSchainBalance(schain1Id)).should.be.equal(amount);
        });

        describe("when validators and schains wallets are recharged", async () => {
            const initialBalance = ethers.utils.parseEther("1");

            let snapshotWithNodesAndSchains: number;

            before(async () => {
                snapshotWithNodesAndSchains = await makeSnapshot();
                await wallets.rechargeValidatorWallet(validator1Id, {value: initialBalance});
                await wallets.rechargeValidatorWallet(validator2Id, {value: initialBalance});
                await wallets.rechargeSchainWallet(schain1Id, {value: initialBalance});
                await wallets.rechargeSchainWallet(schain2Id, {value: initialBalance});
            });

            after(async () => {
                await applySnapshot(snapshotWithNodesAndSchains);
            });

            it("should move ETH to schain owner after schain termination", async () => {
                let balanceBefore = await validator1.getBalance();
                const result = await skaleManager.connect(validator1).deleteSchain(schain1Name);
                let balance = await validator1.getBalance();
                const expectedBalance = balanceBefore.sub(await ethSpent(result)).add(initialBalance);
                balance.should.be.equal(expectedBalance);

                balanceBefore = await validator2.getBalance();
                await skaleManager.deleteSchainByRoot(schain2Name);
                balance = await validator2.getBalance();
                balance.should.be.equal(balanceBefore.add(initialBalance));
            });

            it("should reimburse gas for node exit", async() => {
                const balanceBefore = await nodeAddress1.getBalance();
                const response = await skaleManager.connect(nodeAddress1).nodeExit(0);
                const balance = await nodeAddress1.getBalance();
                balance.sub(balanceBefore).toNumber().should.not.be.lessThan(0);

                const floatBalance = Number.parseFloat(ethers.utils.formatEther(balance));
                const floatBalanceBefore = Number.parseFloat(ethers.utils.formatEther(balanceBefore));
                floatBalance.should.be.almost(floatBalanceBefore);

                const validatorBalance = await wallets.getValidatorBalance(validator1Id);
                initialBalance.sub(await ethSpent(response)).sub(validatorBalance).toNumber()
                    .should.be.almost(0, ethers.utils.parseEther("0.003").toNumber());
            });
        });
    });
});
