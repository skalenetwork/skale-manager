import { ContractManagerInstance,
         DelegationControllerInstance,
         SkaleTokenInstance,
         TokenStateInstance,
         ValidatorServiceInstance} from "../../types/truffle-contracts";

import { deployContractManager } from "../utils/deploy/contractManager";
import { currentTime, skipTime } from "../utils/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployDelegationController } from "../utils/deploy/delegation/delegationController";
import { deployTokenState } from "../utils/deploy/delegation/tokenState";
import { deployValidatorService } from "../utils/deploy/delegation/validatorService";
import { deploySkaleToken } from "../utils/deploy/skaleToken";
import { State } from "../utils/types";
chai.should();
chai.use(chaiAsPromised);

contract("DelegationController", ([owner, holder, validator]) => {
    let contractManager: ContractManagerInstance;
    let delegationController: DelegationControllerInstance;
    let tokenState: TokenStateInstance;
    let validatorService: ValidatorServiceInstance;
    let skaleToken: SkaleTokenInstance;

    let validatorId: number;
    const month = 60 * 60 * 24 * 31;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        delegationController = await deployDelegationController(contractManager);
        tokenState = await deployTokenState(contractManager);
        validatorService = await deployValidatorService(contractManager);
        skaleToken = await deploySkaleToken(contractManager);

        await validatorService.registerValidator("Validator", "D2 is even", 150, 0, {from: validator});
        validatorId = 1;
        await validatorService.enableValidator(validatorId, {from: owner});
        await skaleToken.mint(owner, holder, 1000, "0x", "0x");
    });

    it("should not lock tokens by default", async () => {
        (await delegationController.getAndUpdateLockedAmount.call(holder)).toNumber().should.be.equal(0);
        (await delegationController.getAndUpdateDelegatedAmount.call(holder)).toNumber().should.be.equal(0);
    });

    it("should not allow to get state of non existing delegation", async () => {
        await delegationController.getState("0xd2")
            .should.be.eventually.rejectedWith("Delegation does not exist");
    });

    describe("when delegation request is sent", async () => {
        const amount = 100;
        const period = 3;
        const delegationId = 0;
        beforeEach(async () => {
            await delegationController.delegate(validatorId, amount, period, "INFO", {from: holder});
        });

        it("should be in `proposed` state", async () => {
            const returnedState = await delegationController.getState(delegationId);
            returnedState.toNumber().should.be.equal(State.PROPOSED);
        });

        it("should automatically unlock tokens after delegation request if validator don't accept", async () => {
            skipTime(web3, month);

            const state = await delegationController.getState(delegationId);
            state.toNumber().should.be.equal(State.REJECTED);
            const locked = await delegationController.getAndUpdateLockedAmount.call(holder);
            locked.toNumber().should.be.equal(0);
            const delegated = await delegationController.getAndUpdateDelegatedAmount.call(holder);
            delegated.toNumber().should.be.equal(0);
        });

        it("should allow holder to cancel delegation before acceptance", async () => {
            let locked = await delegationController.getAndUpdateLockedAmount.call(holder);
            locked.toNumber().should.be.equal(amount);
            let delegated = await delegationController.getAndUpdateDelegatedAmount.call(holder);
            delegated.toNumber().should.be.equal(0);

            await delegationController.cancelPendingDelegation(delegationId, {from: holder});

            const state = await delegationController.getState(delegationId);
            state.toNumber().should.be.equal(State.CANCELED);
            locked = await delegationController.getAndUpdateLockedAmount.call(holder);
            locked.toNumber().should.be.equal(0);
            delegated = await delegationController.getAndUpdateDelegatedAmount.call(holder);
            delegated.toNumber().should.be.equal(0);
        });

        it("should not allow to accept request after end of the month", async () => {
            // skip month
            skipTime(web3, month);

            await delegationController.acceptPendingDelegation(delegationId, {from: validator})
                .should.eventually.be.rejectedWith("Cannot set state to accepted");

            const state = await delegationController.getState(delegationId);
            state.toNumber().should.be.equal(State.REJECTED);
            const locked = await delegationController.getAndUpdateLockedAmount.call(holder);
            locked.toNumber().should.be.equal(0);
            const delegated = await delegationController.getAndUpdateDelegatedAmount.call(holder);
            delegated.toNumber().should.be.equal(0);
        });

        describe("when delegation request is accepted", async () => {
            beforeEach(async () => {
                await delegationController.acceptPendingDelegation(delegationId, {from: validator});
            });

            it("should allow to move delegation from proposed to accepted state", async () => {
                const state = await delegationController.getState(delegationId);
                state.toNumber().should.be.equal(State.ACCEPTED);
                const locked = await delegationController.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(amount);
                const delegated = await delegationController.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should not allow to request undelegation while is not delegated", async () => {
                await delegationController.requestUndelegation(delegationId, {from: holder})
                    .should.be.eventually.rejectedWith("Cannot request undelegation");
            });

            it("should not allow to cancel accepted request", async () => {
                await delegationController.cancelPendingDelegation(delegationId, {from: holder})
                    .should.be.eventually.rejectedWith("Token holders able to cancel only PROPOSED delegations");
            });

            describe("when 1 month was passed", async () => {
                beforeEach(async () => {
                    skipTime(web3, month);
                });

                it("should become delegated", async () => {
                    const state = await delegationController.getState(delegationId);
                    state.toNumber().should.be.equal(State.DELEGATED);
                    const locked = await delegationController.getAndUpdateLockedAmount.call(holder);
                    locked.toNumber().should.be.equal(amount);
                    const delegated = await delegationController.getAndUpdateDelegatedAmount.call(holder);
                    delegated.toNumber().should.be.equal(amount);
                });

                it("should allow to send undelegation request", async () => {
                    await delegationController.requestUndelegation(delegationId, {from: holder});

                    let state = await delegationController.getState(delegationId);
                    state.toNumber().should.be.equal(State.UNDELEGATION_REQUESTED);
                    let locked = await delegationController.getAndUpdateLockedAmount.call(holder);
                    locked.toNumber().should.be.equal(amount);
                    let delegated = await delegationController.getAndUpdateDelegatedAmount.call(holder);
                    delegated.toNumber().should.be.equal(amount);

                    skipTime(web3, month * period);

                    state = await delegationController.getState(delegationId);
                    state.toNumber().should.be.equal(State.COMPLETED);
                    locked = await delegationController.getAndUpdateLockedAmount.call(holder);
                    locked.toNumber().should.be.equal(0);
                    delegated = await delegationController.getAndUpdateDelegatedAmount.call(holder);
                    delegated.toNumber().should.be.equal(0);
                });
            });
        });
    });
});
