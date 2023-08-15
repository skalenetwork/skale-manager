import { ConstantsHolder, ContractManager,
        Nodes,
        Schains,
        SkaleDKGTester,
        SkaleManager,
        ValidatorService,
        Wallets } from "../typechain-types";
import { deployContractManager } from "./tools/deploy/contractManager";
import chaiAsPromised from "chai-as-promised";
import * as chai from "chai";
import { privateKeys } from "./tools/private-keys";
import { deployWallets } from "./tools/deploy/wallets";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deploySkaleDKGTester } from "./tools/deploy/test/skaleDKGTester";
import { SchainType } from "./tools/types";
import chaiAlmost from "chai-almost";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ContractTransaction, Wallet } from "ethers";
import { makeSnapshot, applySnapshot } from "./tools/snapshot";
import { getPublicKey, getValidatorIdSignature } from "./tools/signatures";
import { stringKeccak256 } from "./tools/hashes";
import { deployNodes } from "./tools/deploy/nodes";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";

chai.should();
chai.use(chaiAsPromised);

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
    let richGuy1: SignerWithAddress;
    let richGuy2: SignerWithAddress;
    let richGuy3: SignerWithAddress;
    let richGuy4: SignerWithAddress;
    let nodeAddress1: Wallet;
    let nodeAddress2: Wallet;
    let nodeAddress3: Wallet;
    let nodeAddress4: Wallet;

    let contractManager: ContractManager;
    let wallets: Wallets;
    let validatorService: ValidatorService
    let schains: Schains;
    let skaleManager: SkaleManager;
    let skaleDKG: SkaleDKGTester;
    let nodes: Nodes;
    let constantsHolder: ConstantsHolder;

    const tolerance = 0.004;
    const validator1Id = 1;
    const validator2Id = 2;
    let snapshot: number;

    before(async() => {
        chai.use(chaiAlmost(tolerance));
        [owner, validator1, validator2, richGuy1, richGuy2, richGuy3, richGuy4] = await ethers.getSigners();

        nodeAddress1 = new Wallet(String(privateKeys[0])).connect(ethers.provider);
        nodeAddress2 = new Wallet(String(privateKeys[1])).connect(ethers.provider);
        nodeAddress3 = new Wallet(String(privateKeys[3])).connect(ethers.provider);
        nodeAddress4 = new Wallet(String(privateKeys[4])).connect(ethers.provider);
        const balanceRichGuy1 = await richGuy1.getBalance();
        const balanceRichGuy2 = await richGuy2.getBalance();
        const balanceRichGuy3 = await richGuy3.getBalance();
        const balanceRichGuy4 = await richGuy4.getBalance();
        await richGuy1.sendTransaction({to: nodeAddress1.address, value: balanceRichGuy1.sub(ethers.utils.parseEther("1"))});
        await richGuy2.sendTransaction({to: nodeAddress2.address, value: balanceRichGuy2.sub(ethers.utils.parseEther("1"))});
        await richGuy3.sendTransaction({to: nodeAddress3.address, value: balanceRichGuy3.sub(ethers.utils.parseEther("1"))});
        await richGuy4.sendTransaction({to: nodeAddress4.address, value: balanceRichGuy4.sub(ethers.utils.parseEther("1"))});

        contractManager = await deployContractManager();
        wallets = await deployWallets(contractManager);
        validatorService = await deployValidatorService(contractManager);
        schains = await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        nodes = await deployNodes(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);

        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

        await validatorService.connect(validator1).registerValidator("Validator 1", "", 0, 0);
        await validatorService.connect(validator2).registerValidator("Validator 2", "", 0, 0);
        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        const NODE_MANAGER_ROLE = await nodes.NODE_MANAGER_ROLE();
        await nodes.grantRole(NODE_MANAGER_ROLE, owner.address);
        const SCHAIN_REMOVAL_ROLE = await skaleManager.SCHAIN_REMOVAL_ROLE();
        await skaleManager.grantRole(SCHAIN_REMOVAL_ROLE, owner.address);
        const CONSTANTS_HOLDER_MANAGER_ROLE = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
        await constantsHolder.grantRole(CONSTANTS_HOLDER_MANAGER_ROLE, owner.address);
    });

    after(async () => {
        const balanceNode1 = await nodeAddress1.getBalance();
        const balanceNode2 = await nodeAddress2.getBalance();
        const balanceNode3 = await nodeAddress3.getBalance();
        const balanceNode4 = await nodeAddress4.getBalance();
        await nodeAddress1.sendTransaction({to: richGuy1.address, value: balanceNode1.sub(ethers.utils.parseEther("1"))});
        await nodeAddress2.sendTransaction({to: richGuy2.address, value: balanceNode2.sub(ethers.utils.parseEther("1"))});
        await nodeAddress3.sendTransaction({to: richGuy2.address, value: balanceNode3.sub(ethers.utils.parseEther("1"))});
        await nodeAddress4.sendTransaction({to: richGuy2.address, value: balanceNode4.sub(ethers.utils.parseEther("1"))});
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

    describe("when nodes and schains have been created", () => {
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
            signature = await getValidatorIdSignature(validator1Id, nodeAddress2);
            await validatorService.connect(validator1).linkNodeAddress(nodeAddress2.address, signature);
            signature = await getValidatorIdSignature(validator2Id, nodeAddress3);
            await validatorService.connect(validator2).linkNodeAddress(nodeAddress3.address, signature);
            signature = await getValidatorIdSignature(validator2Id, nodeAddress4);
            await validatorService.connect(validator2).linkNodeAddress(nodeAddress4.address, signature);

            const nodesPerValidator = 2;
            const validators = [
                {
                    nodePublicKey: [
                        getPublicKey(nodeAddress1),
                        getPublicKey(nodeAddress2)
                    ],
                    nodeAddress: [
                        nodeAddress1,
                        nodeAddress2
                    ]
                },
                {
                    nodePublicKey: [
                        getPublicKey(nodeAddress3),
                        getPublicKey(nodeAddress4)
                    ],
                    nodeAddress: [
                        nodeAddress3,
                        nodeAddress4
                    ]
                }
            ];
            for (const [validatorIndex, validator] of validators.entries()) {
                for (const index of Array(nodesPerValidator).keys()) {
                    const hexIndex = ("0" + (validatorIndex * nodesPerValidator + index).toString(16)).slice(-2);
                    await skaleManager.connect(validator.nodeAddress[index]).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        validator.nodePublicKey[index], // public key
                        "D2-" + hexIndex, // name
                        "some.domain.name");
                }
            }

            await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner.address)

            await schains.addSchainByFoundation(0, SchainType.TEST, 0, schain1Name, validator1.address, ethers.constants.AddressZero, []);
            await skaleDKG.setSuccessfulDKGPublic(schain1Id);

            await schains.addSchainByFoundation(0, SchainType.TEST, 0, schain2Name, validator2.address, ethers.constants.AddressZero, []);
            await skaleDKG.setSuccessfulDKGPublic(schain2Id);
        });

        after(async () => {
            await applySnapshot(snapshotOfDeployedContracts);
        });

        it("should automatically recharge wallet after creating schain by foundation", async () => {
            const amount = 1e9;
            await schains.addSchainByFoundation(0, SchainType.TEST, 0, "schain-3", validator2.address, ethers.constants.AddressZero, [], {value: amount.toString()});
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

        describe("when validators and schains wallets are recharged", () => {
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

            it("should not withdraw ETH from schain wallet if schain is still active", async () => {
                await wallets.connect(validator1).withdrawFundsFromSchainWallet(owner.address, schain1Id).should.be.eventually.rejectedWith("Message sender is invalid");
                await wallets.connect(owner).withdrawFundsFromSchainWallet(owner.address, schain1Id).should.be.eventually.rejectedWith("Schain is active");
            });

            it("should reimburse gas for node exit", async() => {
                const minNodeBalance = await constantsHolder.minNodeBalance();
                await nodeAddress1.sendTransaction({
                    to: owner.address,
                    value: (await nodeAddress1.getBalance()).sub(minNodeBalance)
                });
                await nodes.initExit(0);
                const response = await skaleManager.connect(nodeAddress1).nodeExit(0, {gasLimit: 2e6});
                const balance = await nodeAddress1.getBalance();
                const spentValue = await ethSpent(response);

                balance.add(spentValue).should.be.least(minNodeBalance);
                balance.add(spentValue).should.be.closeTo(minNodeBalance, 1e13);

                const validatorBalance = await wallets.getValidatorBalance(validator1Id);
                initialBalance.sub(spentValue).sub(validatorBalance).toNumber()
                    .should.be.almost(0, ethers.utils.parseEther(tolerance.toString()).toNumber());
            });
        });
    });
});
