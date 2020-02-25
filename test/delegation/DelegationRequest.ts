import { ContractManagerInstance,
    DelegationControllerInstance,
    DelegationServiceInstance,
    SkaleTokenInstance,
    TokenStateInstance,
    ValidatorServiceInstance } from "../../types/truffle-contracts";

import { skipTime } from "../utils/time";

import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../utils/deploy/contractManager";
import { deployDelegationController } from "../utils/deploy/delegation/delegationController";
import { deployDelegationService } from "../utils/deploy/delegation/delegationService";
import { deployTokenState } from "../utils/deploy/delegation/tokenState";
import { deployValidatorService } from "../utils/deploy/delegation/validatorService";
import { deploySkaleToken } from "../utils/deploy/skaleToken";
import { Delegation } from "../utils/types";
chai.should();
chai.use(chaiAsPromised);

contract("DelegationService", ([owner, holder1, holder2, validator, validator1]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let delegationService: DelegationServiceInstance;
    let delegationController: DelegationControllerInstance;
    let tokenState: TokenStateInstance;
    let validatorService: ValidatorServiceInstance;

    const defaultAmount = 100 * 1e18;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        delegationService = await deployDelegationService(contractManager);
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
            await delegationService.registerValidator(
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
                await delegationController.acceptPendingDelegation(delegationId, {from: validator1})
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
                delegationService.registerValidator(
                    "ValidatorName",
                    "Really good validator",
                    500,
                    100,
                    {from: validator1});
                await delegationController.acceptPendingDelegation(delegationId, {from: validator1})
                        .should.be.rejectedWith("No permissions to accept request");
            });

            // it("should get delegation requests by holder address", async () => {
            //     let delegations = await delegationService.getDelegationsByHolder.call(0, {from: holder1});
            //     let delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 0);

            //     await skaleToken.mint(owner, holder2, amount, "0x", "0x");
            //     await delegationService.delegate(validatorId, amount, delegationPeriod, info, {from: holder2});
            //     delegations = await delegationService.getDelegationsByHolder.call(0, {from: holder2});
            //     delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 1);

            //     await delegationService.acceptPendingDelegation(0, {from: validator});
            //     await delegationService.acceptPendingDelegation(1, {from: validator});

            //     delegations = await delegationService.getDelegationsByHolder.call(1, {from: holder1});
            //     delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 0);

            //     delegations = await delegationService.getDelegationsByHolder.call(1, {from: holder2});
            //     delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 1);

            //     delegations = await delegationService.getDelegationsByHolder.call(0, {from: holder1});
            //     assert.deepEqual(delegations, []);
            //     delegations = await delegationService.getDelegationsByHolder.call(0, {from: holder2});
            //     assert.deepEqual(delegations, []);

            //     skipTime(web3, 2592000);

            //     delegations = await delegationService.getDelegationsByHolder.call(2, {from: holder1});
            //     delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 0);

            //     delegations = await delegationService.getDelegationsByHolder.call(2, {from: holder2});
            //     delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 1);

            //     delegations = await delegationService.getDelegationsByHolder.call(1, {from: holder1});
            //     assert.deepEqual(delegations, []);
            //     delegations = await delegationService.getDelegationsByHolder.call(1, {from: holder2});
            //     assert.deepEqual(delegations, []);
            // });

            // it("should get delegation requests by validatorId", async () => {
            //     let delegations = await delegationService.getDelegationsForValidator.call(0, {from: validator});
            //     let delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 0);

            //     await delegationService.acceptPendingDelegation(0, {from: validator});

            //     delegations = await delegationService.getDelegationsForValidator.call(1, {from: validator});
            //     delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 0);

            //     delegations = await delegationService.getDelegationsForValidator.call(0, {from: validator});
            //     assert.deepEqual(delegations, []);

            //     skipTime(web3, 2592000);

            //     delegations = await delegationService.getDelegationsForValidator.call(2, {from: validator});
            //     delegation = new BigNumber(delegations[0]).toNumber();
            //     assert.equal(delegation, 0);

            //     delegations = await delegationService.getDelegationsForValidator.call(1, {from: validator});
            //     assert.deepEqual(delegations, []);
            // });
        });
    });
});
