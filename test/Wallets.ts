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
import { SchainType } from "./tools/types";
import chaiAlmost from "chai-almost";
chai.should();
chai.use(chaiAsPromised);
chai.use(chaiAlmost());

async function ethSpent(web3: Web3, response: Truffle.TransactionResponse) {
    const transaction = await web3.eth.getTransaction(response.tx);
    return parseFloat(web3.utils.fromWei(new BigNumber(transaction.gasPrice).multipliedBy(response.receipt.gasUsed).toString()));
}

async function getBalance(web3: Web3, address: string) {
    return parseFloat(web3.utils.fromWei(await web3.eth.getBalance(address)));
}

function fromWei(value: BigNumber) {
    return parseFloat(web3.utils.fromWei(value.toString()));
}

contract("Wallets", ([owner, validator1, validator2, node1, node2]) => {
    let contractManager: ContractManagerInstance;
    let wallets: WalletsInstance;
    let validatorService: ValidatorServiceInstance
    let schains: SchainsInstance;
    let skaleManager: SkaleManagerInstance;
    let skaleDKG: SkaleDKGTesterInstance;
    let schainsInternal: SchainsInternalInstance;

    const validator1Id = 1;
    const validator2Id = 2;

    it("test", async () => {
        console.log(new BigNumber(5).dividedBy(2).toString());
        console.log(web3.utils.toBN(5).divn(2).toString());

        console.log(web3.utils.fromWei("1500000000000000000"));
        console.log(await getBalance(web3, owner));
    });

    beforeEach(async () => {
        contractManager = await deployContractManager();
        wallets = await deployWallets(contractManager);
        validatorService = await deployValidatorService(contractManager);
        schains = await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

        await validatorService.registerValidator("Validator 1", "", 0, 0, {from: validator1});
        await validatorService.registerValidator("Validator 2", "", 0, 0, {from: validator2});

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
        assert(false, "Not implemented");

        const amount = 1e9;
        await wallets.rechargeValidatorWallet(validator1Id, {value: amount.toString()});

        // await wallets.withdraw(amount).should.be.eventually.rejectedWith("Validator does not exists");
        // const validator1Balance = Number.parseInt(await web3.eth.getBalance(validator1), 10);
        // await wallets.withdraw(amount, {from: validator2}).should.be.eventually.rejectedWith("Balance is too low");
        // await wallets.withdraw(amount, {from: validator1});
        // await web3.eth.getBalance(validator1).should.be.eventually.equal((validator1Balance + amount).toString());
    });

    describe("when nodes and schains have been created", async() => {
        const schain1Name = "schain-1";
        const schain2Name = "schain-2";
        const schain1Id = web3.utils.soliditySha3(schain1Name);
        const schain2Id = web3.utils.soliditySha3(schain2Name);


        beforeEach(async () => {
            await validatorService.disableWhitelist();
            let signature = await web3.eth.sign(web3.utils.soliditySha3(validator1Id.toString()), node1);
            signature = (signature.slice(130) === "00" ? signature.slice(0, 130) + "1b" :
                    (signature.slice(130) === "01" ? signature.slice(0, 130) + "1c" : signature));
            await validatorService.linkNodeAddress(node1, signature, {from: validator1});
            signature = await web3.eth.sign(web3.utils.soliditySha3(validator2Id.toString()), node2);
            signature = (signature.slice(130) === "00" ? signature.slice(0, 130) + "1b" :
                    (signature.slice(130) === "01" ? signature.slice(0, 130) + "1c" : signature));
            await validatorService.linkNodeAddress(node2, signature, {from: validator2});

            const nodesPerValidator = 2;
            const validators = [
                {
                    nodePublicKey: ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic(),
                    nodeAddress: node1
                },
                {
                    nodePublicKey: ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic(),
                    nodeAddress: node2
                }
            ];
            for (const [validatorIndex, validator] of validators.entries()) {
                for (const index of Array(nodesPerValidator).keys()) {
                    const hexIndex = ("0" + (validatorIndex * nodesPerValidator + index).toString(16)).slice(-2);
                    await skaleManager.createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + hexIndex, // ip
                        "0x7f0000" + hexIndex, // public ip
                        ["0x" + validator.nodePublicKey.x.toString('hex'), "0x" + validator.nodePublicKey.y.toString('hex')], // public key
                        "D2-" + hexIndex, // name
                        "some.domain.name",
                        {from: validator.nodeAddress});
                }
            }

            await schains.grantRole(await schains.SCHAIN_CREATOR_ROLE(), owner)

            await schains.addSchainByFoundation(0, SchainType.TEST, 0, schain1Name, validator1);
            await skaleDKG.setSuccesfulDKGPublic(schain1Id);

            await schains.addSchainByFoundation(0, SchainType.TEST, 0, schain2Name, validator2);
            await skaleDKG.setSuccesfulDKGPublic(schain2Id);
        });

        it("should recharge schain wallet", async() => {
            const amount = 1e9;
            (await wallets.getSchainBalance(schain1Id)).toNumber().should.be.equal(0);
            (await wallets.getSchainBalance(schain2Id)).toNumber().should.be.equal(0);

            await wallets.rechargeSchainWallet(schain1Id, {value: amount.toString()});
            (await wallets.getSchainBalance(schain1Id)).toNumber().should.be.equal(amount);
            (await wallets.getSchainBalance(schain2Id)).toNumber().should.be.equal(0);
        });

        describe("when validators and schains wallets are recharged", async () => {
            const initialBalance = 1;

            beforeEach(async () => {
                await wallets.rechargeValidatorWallet(validator1Id, {value: (initialBalance * 1e18).toString()});
                await wallets.rechargeValidatorWallet(validator2Id, {value: (initialBalance * 1e18).toString()});
                await wallets.rechargeSchainWallet(schain1Id, {value: (initialBalance * 1e18).toString()});
                await wallets.rechargeSchainWallet(schain2Id, {value: (initialBalance * 1e18).toString()});
            });

            it("should move ETH to schain owner after schain termination", async () => {
                let balanceBefore = await getBalance(web3, validator1);
                const result = await skaleManager.deleteSchain(schain1Name, {from: validator1});
                let balance = await getBalance(web3, validator1);
                balance.should.be.equal(balanceBefore - await ethSpent(web3, result) + initialBalance);

                balanceBefore = await getBalance(web3, validator2);
                await skaleManager.deleteSchainByRoot(schain2Name);
                balance = await getBalance(web3, validator2);
                balance.should.be.equal(balanceBefore + initialBalance);
            });

            it("should reimburse gas for node exit", async() => {
                const balanceBefore = await getBalance(web3, node1);
                const response = await skaleManager.nodeExit(0, {from: node1});
                const balance = await getBalance(web3, node1);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);
                (initialBalance - fromWei(await wallets.getValidatorBalance(validator1Id)))
                    .should.be.almost(await ethSpent(web3, response));
            });
        });
    });
});
