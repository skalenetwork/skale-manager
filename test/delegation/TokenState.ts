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

import { skipTime } from "../utils/time";

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

    it("should automatically unlock tokens after delegation request if validator don't accept", async () => {
        await delegationController.createDelegation("5", "100", "3", {from: holder});
        const delegationId = 0;

        await tokenState.setState(delegationId, State.PROPOSED);

        const month = 60 * 60 * 24 * 31;
        skipTime(web3, month);

        const state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.COMPLETED);
        const locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(0);
    });

    it("should allow holder to cancel delegation befor acceptance", async () => {
        await delegationController.createDelegation("5", "100", "3", {from: holder});
        const delegationId = 0;
        const delegation = await delegationController.getDelegation(delegationId);

        await tokenState.setState(delegationId, State.PROPOSED);

        await tokenState.cancel(delegationId, delegation);

        const state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.COMPLETED);
        const locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(0);
    });

    it("should allow to move delegation from proposed to accepted state", async () => {
        const amount = 100;
        await delegationController.createDelegation("5", amount.toString(), "3", {from: holder});
        const delegationId = 0;

        await tokenState.setState(delegationId, State.PROPOSED);

        for (const stateKey in State) {
            if (isNaN(Number(stateKey))
                && Number(State[stateKey]) !== State.ACCEPTED.valueOf()) {
                await tokenState.setState(delegationId, State[stateKey]).should.be.eventually.rejected;
            }
        }

        await tokenState.setState(delegationId, State.ACCEPTED);

        const state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.ACCEPTED);
        const locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(amount);
    });
});
