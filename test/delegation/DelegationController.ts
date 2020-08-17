import { ContractManagerInstance,
    DelegationControllerInstance,
    SkaleTokenInstance,
    ValidatorServiceInstance,
    ConstantsHolderInstance} from "../../types/truffle-contracts";

import { skipTime } from "../tools/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../tools/deploy/contractManager";
import { deployDelegationController } from "../tools/deploy/delegation/delegationController";
import { deployValidatorService } from "../tools/deploy/delegation/validatorService";
import { deploySkaleToken } from "../tools/deploy/skaleToken";
import { deployTimeHelpersWithDebug } from "../tools/deploy/test/timeHelpersWithDebug";
import { Delegation, State } from "../tools/types";
import { deployTimeHelpers } from "../tools/deploy/delegation/timeHelpers";
import { deployConstantsHolder } from "../tools/deploy/constantsHolder";
chai.should();
chai.use(chaiAsPromised);

contract("DelegationController", ([owner, holder1, holder2, validator, validator2]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let delegationController: DelegationControllerInstance;
    let validatorService: ValidatorServiceInstance;
    let constantsHolder: ConstantsHolderInstance;

    const month = 60 * 60 * 24 * 31;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        delegationController = await deployDelegationController(contractManager);
        validatorService = await deployValidatorService(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);

        await constantsHolder.setFirstDelegationsMonth(0);
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

        it("should reject delegation if validator with such id does not exist", async () => {
            const nonExistedValidatorId = 2;
            await delegationController.delegate(nonExistedValidatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Validator with such ID does not exist");
        });

        it("should reject delegation if it doesn't meet minimum delegation amount", async () => {
            amount = 99;
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Amount does not meet the validator's minimum delegation amount");
        });

        it("should reject delegation if request doesn't meet allowed delegation period", async () => {
            delegationPeriod = 4;
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("This delegation period is not allowed");
        });

        it("should reject delegation if holder doesn't have enough unlocked tokens for delegation", async () => {
            amount = 101;
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Token holder does not have enough tokens to delegate");
        });

        it("should reject delegation if it is sent before network launch", async () => {
            const timeHelpers = await deployTimeHelpers(contractManager);
            const currentMonth = (await timeHelpers.getCurrentMonth()).toNumber();
            await constantsHolder.setFirstDelegationsMonth(currentMonth + 1);
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Delegations are not allowed");
        });

        it("should send request for delegation", async () => {
            await skaleToken.mint(holder1, amount, "0x", "0x");
            const { logs } = await delegationController.delegate(
                validatorId, amount, delegationPeriod, info, {from: holder1});
            assert.equal(logs.length, 1, "No DelegationProposed Event emitted");
            assert.equal(logs[0].event, "DelegationProposed");
            delegationId = logs[0].args.delegationId;
            const delegation: Delegation = new Delegation(
                await delegationController.delegations(delegationId));
            assert.equal(holder1, delegation.holder);
            assert.equal(validatorId, delegation.validatorId.toNumber());
            assert.equal(delegationPeriod, delegation.delegationPeriod.toNumber());
            assert.equal("VERY NICE", delegation.info);
        });

        it("should reject delegation if it doesn't have enough tokens", async () => {
            await skaleToken.mint(holder1, 2 * amount, "0x", "0x");
            await delegationController.delegate(validatorId, amount + 1, delegationPeriod, info, {from: holder1});
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Token holder does not have enough tokens to delegate");

        });

        it("should reject canceling if delegation doesn't exist", async () => {
            delegationId = 99;
            await delegationController.cancelPendingDelegation(delegationId, {from: holder1})
                .should.be.rejectedWith("Delegation does not exist");
        });

        it("should allow to delegate if whitelist of validators is no longer supports", async () => {
            await skaleToken.mint(holder1, amount, "0x", "0x");
            await validatorService.disableValidator(validatorId, {from: owner});
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1})
                .should.be.eventually.rejectedWith("Validator is not authorized to accept delegation request");
            await validatorService.disableWhitelist();
            await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder1});
        });

        describe("when delegation request was created", async () => {
            beforeEach(async () => {
                await skaleToken.mint(holder1, amount, "0x", "0x");
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
                    .should.be.rejectedWith("Token holders are only able to cancel PROPOSED delegations");
            });

            it("should reject canceling request if delegation request already rejected", async () => {
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1});
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1})
                    .should.be.rejectedWith("Token holders are only able to cancel PROPOSED delegations");
            });

            it("should change state of tokens to CANCELED if delegation was cancelled", async () => {
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1});
                const CANCELED = 2;
                const status = (await delegationController.getState(delegationId)).toNumber();
                status.should.be.equal(CANCELED);
            });

            it("should reject accepting request if such validator doesn't exist", async () => {
                await delegationController.acceptPendingDelegation(delegationId, {from: validator2})
                    .should.be.rejectedWith("Validator address does not exist");
            });

            it("should reject accepting request if validator already canceled it", async () => {
                await delegationController.cancelPendingDelegation(delegationId, {from: holder1});
                await delegationController.acceptPendingDelegation(delegationId, {from: validator})
                    .should.be.rejectedWith("The delegation has been cancelled by token holder");
            });

            it("should reject accepting request if validator already accepted it", async () => {
                await delegationController.acceptPendingDelegation(delegationId, {from: validator});
                await delegationController.acceptPendingDelegation(delegationId, {from: validator})
                    .should.be.rejectedWith("The delegation has been already accepted");
            });

            it("should reject accepting request if next month started", async () => {
                skipTime(web3, month);
                await delegationController.acceptPendingDelegation(delegationId, {from: validator})
                    .should.be.rejectedWith("The delegation request is outdated");
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

            it("should allow for QA team to test delegation pipeline immediately", async () => {
                const timeHelpersWithDebug = await deployTimeHelpersWithDebug(contractManager);
                await contractManager.setContractsAddress("TimeHelpers", timeHelpersWithDebug.address);

                await delegationController.acceptPendingDelegation(delegationId, {from: validator});
                (await delegationController.getState(delegationId)).toNumber().should.be.equal(State.ACCEPTED);

                await timeHelpersWithDebug.skipTime(month);
                (await delegationController.getState(delegationId)).toNumber().should.be.equal(State.DELEGATED);

                await delegationController.requestUndelegation(delegationId, {from: holder1});
                (await delegationController.getState(delegationId)).toNumber()
                    .should.be.equal(State.UNDELEGATION_REQUESTED);

                await timeHelpersWithDebug.skipTime(month * delegationPeriod);
                (await delegationController.getState(delegationId)).toNumber().should.be.equal(State.COMPLETED);

                // skipTime should now affect new delegations
                const { logs } = await delegationController.delegate(
                    validatorId, amount, delegationPeriod, info, {from: holder1});
                delegationId = logs[0].args.delegationId;
                (await delegationController.getState(delegationId)).toNumber().should.be.equal(State.PROPOSED);
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
