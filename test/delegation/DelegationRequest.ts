import { ContractManagerInstance,
    DelegationControllerInstance,
    SkaleTokenInstance,
    TokenStateInstance,
    ValidatorServiceInstance } from "../../types/truffle-contracts";

import { skipTime } from "../utils/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../utils/deploy/contractManager";
import { deployDelegationController } from "../utils/deploy/delegation/delegationController";
import { deployTokenState } from "../utils/deploy/delegation/tokenState";
import { deployValidatorService } from "../utils/deploy/delegation/validatorService";
import { deploySkaleToken } from "../utils/deploy/skaleToken";
import { Delegation, State } from "../utils/types";
chai.should();
chai.use(chaiAsPromised);

contract("DelegationController", ([owner, holder1, holder2, validator, validator2]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let delegationController: DelegationControllerInstance;
    let tokenState: TokenStateInstance;
    let validatorService: ValidatorServiceInstance;

    const defaultAmount = 100 * 1e18;
    const month = 60 * 60 * 24 * 31;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        delegationController = await deployDelegationController(contractManager);
        tokenState = await deployTokenState(contractManager);
        validatorService = await deployValidatorService(contractManager);
    });

    describe("when arguments for delegation initialized", async () => {
        let validatorId: number;
        let amount: number;
        let delegationPeriod: number;
        let info: string;
        let delegationId: number;
        beforeEach(async () => {
            validatorId = 1;
            amount = 100;
            delegationPeriod = 3;
            info = "VERY NICE";
            await validatorService.registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100,
                {from: validator});
            await validatorService.enableValidator(validatorId, {from: owner});
            });

        it("should reject delegation if validator with such id doesn't exist", async () => {
            const nonExistedValidatorId = 2;
            await delegationController.delegate(nonExistedValidatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Validator with such id doesn't exist");
        });

        it("should reject delegation if it doesn't meet minimum delegation amount", async () => {
            amount = 99;
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Amount doesn't meet minimum delegation amount");
        });

        it("should reject delegation if request doesn't meet allowed delegation period", async () => {
            delegationPeriod = 4;
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("This delegation period is not allowed");
        });

        it("should reject delegation if holder doesn't have enough unlocked tokens for delegation", async () => {
            amount = 101;
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Delegator doesn't have enough tokens to delegate");
        });

        it("should send request for delegation", async () => {
            await skaleToken.mint(owner, holder1, amount, "0x", "0x");
            const { logs } = await delegationController.delegate(
                validatorId, amount, delegationPeriod, info, {from: holder1});
            assert.equal(logs.length, 1, "No DelegationRequestIsSent Event emitted");
            assert.equal(logs[0].event, "DelegationRequestIsSent");
            delegationId = logs[0].args.delegationId;
            const delegation: Delegation = new Delegation(
                await delegationController.delegations(delegationId));
            assert.equal(holder1, delegation.holder);
            assert.equal(validatorId, delegation.validatorId.toNumber());
            assert.equal(delegationPeriod, delegation.delegationPeriod.toNumber());
            assert.equal("VERY NICE", delegation.info);
        });

        it("should reject delegation if it doesn't have enough tokens", async () => {
            await skaleToken.mint(owner, holder1, 2 * amount, "0x", "0x");
            await delegationController.delegate(validatorId, amount + 1, delegationPeriod, info, {from: holder1});
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Delegator doesn't have enough tokens to delegate");

        });

        it("should reject canceling if delegation doesn't exist", async () => {
            await delegationController.cancelPendingDelegation(delegationId, {from: holder1})
                .should.be.rejectedWith("Delegation does not exist");
        });

        describe("when delegation request was created", async () => {
            beforeEach(async () => {
                await skaleToken.mint(owner, holder1, amount, "0x", "0x");
                const { logs } = await delegationController.delegate(
                    validatorId, amount, delegationPeriod, info, {from: holder1});
                delegationId = logs[0].args.delegationId;
            });

            it("should reject canceling request if it isn't actually holder of tokens", async () => {
                await delegationController.cancelPendingDelegation(delegationId, {from: holder2})
                    .should.be.rejectedWith("Only token holders can cancel delegation request");
            });

            it("should reject canceling request if validator already accepted it", async () => {
                await delegationController.acceptPendingDelegation(delegationId, {from: validator});
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1})
                    .should.be.rejectedWith("Token holders able to cancel only PROPOSED delegations");
            });

            it("should reject canceling request if delegation request already rejected", async () => {
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1});
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1})
                    .should.be.rejectedWith("Token holders able to cancel only PROPOSED delegations");
            });

            it("should change state of tokens to CANCELED if delegation was cancelled", async () => {
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1});
                const CANCELED = 2;
                const status = (await delegationController.getState(delegationId)).toNumber();
                status.should.be.equal(CANCELED);
            });

            it("should reject accepting request if such validator doesn't exist", async () => {
                await delegationController.acceptPendingDelegation(delegationId, {from: validator2})
                    .should.be.rejectedWith("Validator with such address doesn't exist");
            });

            it("should reject accepting request if validator already canceled it", async () => {
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1});
                await delegationController.acceptPendingDelegation(delegationId, {from: validator})
                    .should.be.rejectedWith("Can't set state to accepted");
            });

            it("should reject accepting request if validator already accepted it", async () => {
                await delegationController.acceptPendingDelegation(delegationId, {from: validator});
                await delegationController.acceptPendingDelegation(delegationId, {from: validator})
                    .should.be.rejectedWith("Can't set state to accepted");
            });

            it("should reject accepting request if validator tried to accept request not assigned to him", async () => {
                validatorService.registerValidator(
                    "ValidatorName",
                    "Really good validator",
                    500,
                    100,
                    {from: validator2});
                await delegationController.acceptPendingDelegation(delegationId, {from: validator2})
                        .should.be.rejectedWith("No permissions to accept request");
            });

            describe("when delegation is accepted", async () => {
                beforeEach(async () => {
                    await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                    skipTime(web3, month);
                });

                it("should allow validator to request undelegation", async () => {
                    await delegationController.requestUndelegation(delegationId, {from: validator});

                    skipTime(web3, delegationPeriod * month);

                    (await delegationController.getState(delegationId)).toNumber().should.be.equal(State.COMPLETED);
                    (await skaleToken.getAndUpdateDelegatedAmount.call(holder1)).toNumber().should.be.equal(0);
                });

                it("should not allow everyone to request undelegation", async () => {
                    await delegationController.requestUndelegation(delegationId, {from: holder2})
                        .should.be.eventually.rejectedWith("Permission denied to request undelegation");

                    await validatorService.registerValidator(
                        "ValidatorName",
                        "Really good validator",
                        500,
                        100,
                        {from: validator2});
                    await delegationController.requestUndelegation(delegationId, {from: validator2})
                        .should.be.eventually.rejectedWith("Permission denied to request undelegation");

                    skipTime(web3, delegationPeriod * month);

                    (await delegationController.getState(delegationId)).toNumber().should.be.equal(State.DELEGATED);
                    (await skaleToken.getAndUpdateDelegatedAmount.call(holder1)).toNumber().should.be.equal(amount);
                });
            });
        });
    });
});
