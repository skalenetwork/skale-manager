import { ContractManagerContract,
         ContractManagerInstance,
         DelegationControllerContract,
         DelegationControllerInstance,
         DelegationPeriodManagerContract,
         DelegationPeriodManagerInstance,
         DelegationRequestManagerContract,
         DelegationRequestManagerInstance,
         DelegationServiceContract,
         DelegationServiceInstance,
         SkaleTokenContract,
         SkaleTokenInstance,
         TokenSaleManagerContract,
         TokenSaleManagerInstance,
         TokenStateContract,
         TokenStateInstance,
         ValidatorServiceContract,
         ValidatorServiceInstance } from "../../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");
const TokenSaleManager: TokenSaleManagerContract = artifacts.require("./TokenSaleManager");
const DelegationService: DelegationServiceContract = artifacts.require("./DelegationService");
const ValidatorService: ValidatorServiceContract = artifacts.require("./ValidatorService");
const DelegationController: DelegationControllerContract = artifacts.require("./DelegationController");
const TokenState: TokenStateContract = artifacts.require("./TokenState");
const DelegationRequestManager: DelegationRequestManagerContract = artifacts.require("./DelegationRequestManager");
const DelegationPeriodManager: DelegationPeriodManagerContract = artifacts.require("./DelegationPeriodManager");

import { skipTime, skipTimeToDate } from "../utils/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);

contract("TokenSaleManager", ([owner, holder, delegation, validator, seller, hacker]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let tokenSaleManager: TokenSaleManagerInstance;
    let delegationService: DelegationServiceInstance;
    let validatorService: ValidatorServiceInstance;
    let delegationManager: DelegationControllerInstance;
    let tokenState: TokenStateInstance;
    let delegationRequestManager: DelegationRequestManagerInstance;
    let delegationPeriodManager: DelegationPeriodManagerInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new();
        skaleToken = await SkaleToken.new(contractManager.address, []);
        await contractManager.setContractsAddress("SkaleToken", skaleToken.address);
        tokenSaleManager = await TokenSaleManager.new(contractManager.address);
        await contractManager.setContractsAddress("TokenSaleManager", tokenSaleManager.address);
        delegationService = await DelegationService.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationService", delegationService.address);
        validatorService = await ValidatorService.new(contractManager.address);
        await contractManager.setContractsAddress("ValidatorService", validatorService.address);
        delegationManager = await DelegationController.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationController", delegationManager.address);
        tokenState = await TokenState.new(contractManager.address);
        await contractManager.setContractsAddress("TokenState", tokenState.address);
        delegationRequestManager = await DelegationRequestManager.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationRequestManager", delegationRequestManager.address);
        delegationPeriodManager = await DelegationPeriodManager.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationPeriodManager", delegationPeriodManager.address);

        // each test will start from Nov 10
        await skipTimeToDate(web3, 10, 11);
        await skaleToken.mint(owner, tokenSaleManager.address, 1000, "0x", "0x");
        await delegationService.registerValidator("Validator", "D2 is even", 150, 0, {from: validator});
    });

    it("should register seller", async () => {
        await tokenSaleManager.registerSeller(seller);
    });

    it("should not register seller if sender is not owner", async () => {
        await tokenSaleManager.registerSeller(seller, {from: hacker}).should.be.eventually.rejectedWith("Ownable: caller is not the owner.");
    });

    describe("when seller is registered", async () => {
        beforeEach(async () => {
            await tokenSaleManager.registerSeller(seller);
        });

        it("should allow seller to approve transfer to buyer", async () => {
            await tokenSaleManager.approve([holder], [10], {from: seller});
            await tokenSaleManager.retrieve({from: holder});
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(10);
            await skaleToken.transfer(hacker, "1", {from: holder}).should.be.eventually.rejectedWith("Token should be unlocked for transfering");
        });

        describe("when holder bought tokens", async () => {
            const validatorId = 0;
            const totalAmount = 100;

            beforeEach(async () => {
                await tokenSaleManager.approve([holder], [totalAmount], {from: seller});
                await tokenSaleManager.retrieve({from: holder});
            });

            it("should be able to delegate part of tokens", async () => {
                const amount = 50;
                const delegationPeriod = 3;
            // await delegationService.delegate(validatorId, amount, delegationPeriod, "D2 is even", {from: holder});
            // const delegationId = 0;
            // await delegationService.accept(delegationId, {from: validator});

            // await skaleToken.transfer(hacker, 1, {from: holder})
            //     .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
            // await skaleToken.approve(hacker, 1, {from: holder})
            //     .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
            // await skaleToken.send(hacker, 1, "", {from: holder})
            //     .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");

            // const month = 60 * 60 * 24 * 31;
            // skipTime(web3, month);

            // await delegationService.requestUndelegation(delegationId, {from: holder});

            // skipTime(web3, month * delegationPeriod);

            // await skaleToken.transfer(hacker, totalAmount, {from: holder});
            // (await skaleToken.balanceOf(hacker)).toNumber().should.be.equal(totalAmount);
            });
        });
    });
});
