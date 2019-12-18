import { ContractManagerContract,
         ContractManagerInstance,
         DelegationControllerContract,
         DelegationControllerInstance,
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

import { skipTimeToDate } from "../utils/time";

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
            beforeEach(async () => {
                await tokenSaleManager.approve([holder], [10], {from: seller});
                await tokenSaleManager.retrieve({from: holder});
            });

//         it("should be able to delegate part of tokens", async () => {
//             await tokenSaleManager.delegateSaleToken(delegation, 5, 0, "dec", 3, "D2 is even", {from: holder});
//             await delegationService.accept(0, {from: validator});
//             await delegationService.requestUndelegation({from: holder});

//             await skaleToken.transfer(hacker, 1, {from: holder})
//                 .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
//             await skaleToken.approve(hacker, 1, {from: holder})
//                 .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
//             await skaleToken.send(hacker, 1, "", {from: holder})
//                 .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");

//             await skaleToken.transfer(hacker, 1, {from: delegation})
//                 .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
//             await skaleToken.approve(hacker, 1, {from: delegation})
//                 .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
//             await skaleToken.send(hacker, 1, "", {from: delegation})
//                 .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");

//             await skipTimeToDate(web3, 14, 2);

//             await skaleToken.transfer(holder, 5, {from: delegation});
//             await skaleToken.transfer(hacker, 10, {from: holder});
//             await skaleToken.balanceOf(hacker).should.be.eventually.equal("10");
//         });
        });
    });
});
