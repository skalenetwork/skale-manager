import { ContractManagerContract,
    ContractManagerInstance,
    DelegationControllerContract,
    DelegationControllerInstance,
    DelegationControllerMockContract,
    DelegationControllerMockInstance,
    DelegationServiceContract,
    DelegationServiceInstance,
    SkaleTokenContract,
    SkaleTokenInstance,
    TimeHelpersContract,
    TimeHelpersInstance,
    TokenSaleManagerContract,
    TokenSaleManagerInstance,
    TokenStateContract,
    TokenStateInstance,
    ValidatorServiceContract,
    ValidatorServiceInstance } from "../../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const TimeHelpers: TimeHelpersContract = artifacts.require("./TimeHelpers");
const TokenState: TokenStateContract = artifacts.require("./TokenState");
const DelegationControllerMock: DelegationControllerMockContract = artifacts.require("./DelegationControllerMock");

import { skipTimeToDate } from "../utils/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);

enum State {
    NONE,
    UNLOCKED,
    PROPOSED,
    ACCEPTED,
    DELEGATED,
    ENDING_DELEGATED,
    PURCHASED,
    COMPLETED,
}

contract("TokenSaleManager", ([owner, holder]) => {
    let contractManager: ContractManagerInstance;
    let timeHelpers: TimeHelpersInstance;
    let delegationController: DelegationControllerMockInstance;
    let tokenState: TokenStateInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new();

        timeHelpers = await TimeHelpers.new();
        await contractManager.setContractsAddress("TimeHelpers", timeHelpers.address);

        delegationController = await DelegationControllerMock.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationController", delegationController.address);

        tokenState = await TokenState.new(contractManager.address);
        await contractManager.setContractsAddress("TokenState", tokenState.address);
    });

    it("should not lock tokens by default", async () => {
        (await tokenState.getLockedCount.call(holder)).toNumber().should.be.equal(0);
    });

    it("should allow to set only `proposed` state by default", async () => {
        // create delegation with id "0"
        await delegationController.createDelegation("5", "100", "3", {from: holder});

        for (const state in State) {
            if (isNaN(Number(state))
                && Number(State[state]) !== State.PROPOSED.valueOf()) {
                await tokenState.setState(0, State[state]).should.be.eventually.rejected;
            }
        }

        await tokenState.setState(0, State.PROPOSED);
        const returnedState = await tokenState.getState.call(0);
        returnedState.toNumber().should.be.equal(State.PROPOSED);
    });
});
