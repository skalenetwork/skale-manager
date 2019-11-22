import { ContractManagerContract,
    ContractManagerInstance,
    DelegationServiceContract,
    DelegationServiceInstance,
    SkaleTokenContract,
    SkaleTokenInstance,
    TokenSaleManagerContract,
    TokenSaleManagerInstance } from "../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");
const TokenSaleManager: TokenSaleManagerContract = artifacts.require("./TokenSaleManager");
const DelegationService: DelegationServiceContract = artifacts.require("./DelegationService");

import { skipTimeToDate } from "./utils/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);

contract("TokenSaleManager", ([owner, holder, delegation, validator, seller, hacker]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let tokenSaleManager: TokenSaleManagerInstance;
    let delegationService: DelegationServiceInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new();
        skaleToken = await SkaleToken.new(contractManager.address, []);
        tokenSaleManager = await TokenSaleManager.new(skaleToken.address);
        delegationService = await DelegationService.new(contractManager.address);

        // each test will start from Nov 10
        await skipTimeToDate(web3, 10, 11);
        await skaleToken.mint(owner, tokenSaleManager.address, 1000, "0x", "0x");
        // await delegationService.registerValidator("Validator", "D2 is even", 150, {from: validator});
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
        });

        describe("when holder bought tokens", async () => {
            beforeEach(async () => {
                await tokenSaleManager.approve([holder], [10], {from: seller});
                await tokenSaleManager.retrieve({from: holder});
            });

            it("should not be able to delegate less then 50%", async () => {
                await tokenSaleManager.delegateSaleToken(delegation, 4, 0, 3, "D2 is even", {from: holder})
                    .should.be.eventually.rejectedWith("You should delegate at least 50%");
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
