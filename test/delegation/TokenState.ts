import { ContractManagerContract,
         ContractManagerInstance,
         DelegationControllerContract,
         DelegationControllerInstance,
         TimeHelpersContract,
         TimeHelpersInstance,
         TokenStateContract,
         TokenStateInstance } from "../../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const TimeHelpers: TimeHelpersContract = artifacts.require("./TimeHelpers");
const TokenState: TokenStateContract = artifacts.require("./TokenState");
const DelegationController: DelegationControllerContract = artifacts.require("./DelegationController");

import { currentTime, skipTime } from "../utils/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);

enum State {
    PROPOSED,
    ACCEPTED,
    DELEGATED,
    ENDING_DELEGATED,
    COMPLETED,
}

contract("TokenState", ([owner, holder]) => {
    let contractManager: ContractManagerInstance;
    let timeHelpers: TimeHelpersInstance;
    let delegationController: DelegationControllerInstance;
    let tokenState: TokenStateInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new();

        timeHelpers = await TimeHelpers.new();
        await contractManager.setContractsAddress("TimeHelpers", timeHelpers.address);

        delegationController = await DelegationController.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationController", delegationController.address);

        tokenState = await TokenState.new(contractManager.address);
        await contractManager.setContractsAddress("TokenState", tokenState.address);
    });

    it("should not lock tokens by default", async () => {
        (await tokenState.getLockedCount.call(holder)).toNumber().should.be.equal(0);
        (await tokenState.getDelegatedCount.call(holder)).toNumber().should.be.equal(0);
    });

    it("should be in `proposed` state by default", async () => {
        // create delegation with id "0"
        const amount = 100;
        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), "3", time, "INFO");

        const returnedState = await tokenState.getState.call(0);
        returnedState.toNumber().should.be.equal(State.PROPOSED);
    });

    it("should automatically unlock tokens after delegation request if validator don't accept", async () => {
        const amount = 100;

        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), "3", time, "INFO");
        const delegationId = 0;

        const month = 60 * 60 * 24 * 31;
        skipTime(web3, month);

        const state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.COMPLETED);
        const locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(0);
        const delegated = await tokenState.getDelegatedCount.call(holder);
        delegated.toNumber().should.be.equal(0);
    });

    it("should allow holder to cancel delegation befor acceptance", async () => {
        const amount = 100;
        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), "3", time, "INFO");
        const delegationId = 0;

        let locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(amount);
        let delegated = await tokenState.getDelegatedCount.call(holder);
        delegated.toNumber().should.be.equal(0);

        await tokenState.cancel(delegationId);

        const state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.COMPLETED);
        locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(0);
        delegated = await tokenState.getDelegatedCount.call(holder);
        delegated.toNumber().should.be.equal(0);
    });

    it("should allow to move delegation from proposed to accepted state", async () => {
        const amount = 100;
        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), "3", time, "INFO");
        const delegationId = 0;

        await tokenState.accept(delegationId);

        const state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.ACCEPTED);
        const locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(amount);
        const delegated = await tokenState.getDelegatedCount.call(holder);
        delegated.toNumber().should.be.equal(0);
    });

    it("should become delegated after month end if is accepted", async () => {
        const amount = 100;
        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), "3", time, "INFO");
        const delegationId = 0;

        await tokenState.accept(delegationId);

        // skip month
        const month = 60 * 60 * 24 * 31;
        skipTime(web3, month);

        const state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.DELEGATED);
        const locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(amount);
        const delegated = await tokenState.getDelegatedCount.call(holder);
        delegated.toNumber().should.be.equal(amount);
    });

    it("should not allow to request undelegation while is not delegated", async () => {
        const amount = 100;
        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), "3", time, "INFO");
        const delegationId = 0;

        await tokenState.accept(delegationId);

        await tokenState.requestUndelegation(delegationId).should.be.eventually.rejectedWith("Can't request undelegation");
    });

    it("should allow to send undelegation request", async () => {
        const amount = 100;
        const period = 3;
        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), period.toString(), time, "INFO");
        const delegationId = 0;

        await tokenState.accept(delegationId);

        // skip month
        const month = 60 * 60 * 24 * 31;
        skipTime(web3, month);

        await tokenState.requestUndelegation(delegationId);

        let state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.ENDING_DELEGATED);
        let locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(amount);
        let delegated = await tokenState.getDelegatedCount.call(holder);
        delegated.toNumber().should.be.equal(amount);

        skipTime(web3, month * period);

        state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.COMPLETED);
        locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(0);
        delegated = await tokenState.getDelegatedCount.call(holder);
        delegated.toNumber().should.be.equal(0);
    });

    it("should not allow to accept request after end of the month", async () => {
        const amount = 100;
        const period = 3;
        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), period.toString(), time, "INFO");
        const delegationId = 0;

        // skip month
        const month = 60 * 60 * 24 * 31;
        skipTime(web3, month);

        await tokenState.accept(delegationId).should.eventually.be.rejectedWith("Can't set state to accepted");

        const state = await tokenState.getState.call(delegationId);
        state.toNumber().should.be.equal(State.COMPLETED);
        const locked = await tokenState.getLockedCount.call(holder);
        locked.toNumber().should.be.equal(0);
        const delegated = await tokenState.getDelegatedCount.call(holder);
        delegated.toNumber().should.be.equal(0);
    });

    it("should not allow to cancel accepted request", async () => {
        const amount = 100;
        const period = 3;
        const time = await currentTime(web3);
        await delegationController.addDelegation(holder, "5", amount.toString(), period.toString(), time, "INFO");
        const delegationId = 0;

        await tokenState.accept(delegationId);

        await tokenState.cancel(delegationId).should.be.eventually.rejectedWith("Can't cancel delegation request");
    });

    it("should not allow to get state of non existing delegation", async () => {
        await tokenState.getState.call("0xd2").should.be.eventually.rejectedWith("Delegation does not exist");
    });

    describe("Token sale", async () => {
        it("should allow to mark tokens as sold", async () => {
            const totalAmount = 100;
            await tokenState.sold(holder, totalAmount.toString());

            const locked = await tokenState.getLockedCount.call(holder);
            locked.toNumber().should.be.equal(totalAmount);
            const delegated = await tokenState.getDelegatedCount.call(holder);
            delegated.toNumber().should.be.equal(0);
        });

        describe("When purchased 100 tokens", async () => {
            const totalAmount = 100;

            beforeEach(async () => {
                await tokenState.sold(holder, totalAmount.toString());
            });

            it("should not unlock purchased tokens if delegation request was cancelled", async () => {
                const amount = 100;
                const period = 3;
                const time = await currentTime(web3);
                await delegationController.addDelegation(
                    holder, "5", amount.toString(), period.toString(), time, "INFO");
                const delegationId = 0;
                const delegation = await delegationController.getDelegation(delegationId);
                delegation.holder.should.be.deep.equal(holder);

                await tokenState.cancel(delegationId);

                const locked = await tokenState.getLockedCount.call(holder);
                locked.toNumber().should.be.equal(totalAmount);
                const delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should unlock all tokens if 50% was delegated", async () => {
                const amount = 50;
                const period = 3;
                const time = await currentTime(web3);
                await delegationController.addDelegation(
                    holder, "5", amount.toString(), period.toString(), time, "INFO");
                const delegationId = 0;

                await tokenState.accept(delegationId);

                // skip month
                const month = 60 * 60 * 24 * 31;
                skipTime(web3, month);

                let delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                await tokenState.requestUndelegation(delegationId);

                skipTime(web3, month * period);

                const state = await tokenState.getState.call(delegationId);
                state.toNumber().should.be.equal(State.COMPLETED);
                const locked = await tokenState.getLockedCount.call(holder);
                locked.toNumber().should.be.equal(0);
                delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should unlock only 40% tokens if 40% was delegated", async () => {
                const amount = 40;
                const period = 3;
                const time = await currentTime(web3);
                await delegationController.addDelegation(
                    holder, "5", amount.toString(), period.toString(), time, "INFO");
                const delegationId = 0;

                await tokenState.accept(delegationId);

                // skip month
                const month = 60 * 60 * 24 * 31;
                skipTime(web3, month);

                let delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                await tokenState.requestUndelegation(delegationId);

                delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                skipTime(web3, month * period);

                const state = await tokenState.getState.call(delegationId);
                state.toNumber().should.be.equal(State.COMPLETED);
                const locked = await tokenState.getLockedCount.call(holder);
                locked.toNumber().should.be.equal(totalAmount - amount);
                delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should unlock all tokens if 40% was delegated and then 10% was delegated", async () => {
                // delegate 40%
                let amount = 40;
                const period = 3;
                let time = await currentTime(web3);
                await delegationController.addDelegation(
                    holder, "5", amount.toString(), period.toString(), time, "INFO");
                let delegationId = 0;

                await tokenState.accept(delegationId);

                // skip month
                const month = 60 * 60 * 24 * 31;
                skipTime(web3, month);

                let delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                await tokenState.requestUndelegation(delegationId);

                skipTime(web3, month * period);

                let state = await tokenState.getState.call(delegationId);
                state.toNumber().should.be.equal(State.COMPLETED);
                let locked = await tokenState.getLockedCount.call(holder);
                locked.toNumber().should.be.equal(totalAmount - amount);
                delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(0);

                // delegate 10%
                amount = 10;
                time = await currentTime(web3);
                await delegationController.addDelegation(
                    holder, "5", amount.toString(), period.toString(), time, "INFO");
                delegationId = 1;

                await tokenState.accept(delegationId);

                // skip month
                skipTime(web3, month);

                state = await tokenState.getState.call(delegationId);
                state.toNumber().should.be.equal(State.DELEGATED);
                delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(amount);
                await tokenState.requestUndelegation(delegationId);

                skipTime(web3, month * period);

                state = await tokenState.getState.call(delegationId);
                state.toNumber().should.be.equal(State.COMPLETED);
                locked = await tokenState.getLockedCount.call(holder);
                locked.toNumber().should.be.equal(0);
                delegated = await tokenState.getDelegatedCount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });
        });
    });
});
