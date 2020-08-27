import { ContractManagerInstance,
         DelegationControllerInstance,
         DelegationPeriodManagerInstance,
         PunisherInstance,
         SkaleTokenInstance,
         TokenLaunchManagerInstance,
         ValidatorServiceInstance} from "../../types/truffle-contracts";

import { isLeapYear, skipTime, skipTimeToDate } from "../tools/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../tools/deploy/contractManager";
import { deployDelegationController } from "../tools/deploy/delegation/delegationController";
import { deployDelegationPeriodManager } from "../tools/deploy/delegation/delegationPeriodManager";
import { deployPunisher } from "../tools/deploy/delegation/punisher";
import { deployTokenLaunchManager } from "../tools/deploy/delegation/tokenLaunchManager";
import { deployValidatorService } from "../tools/deploy/delegation/validatorService";
import { deploySkaleToken } from "../tools/deploy/skaleToken";
import { State } from "../tools/types";
chai.should();
chai.use(chaiAsPromised);

contract("TokenLaunchManager", ([owner, holder, delegation, validator, seller, hacker]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let TokenLaunchManager: TokenLaunchManagerInstance;
    let validatorService: ValidatorServiceInstance;
    let delegationController: DelegationControllerInstance;
    let delegationPeriodManager: DelegationPeriodManagerInstance;
    let punisher: PunisherInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        skaleToken = await deploySkaleToken(contractManager);
        TokenLaunchManager = await deployTokenLaunchManager(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);
        delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
        punisher = await deployPunisher(contractManager);

        // each test will start from Nov 10
        await skipTimeToDate(web3, 10, 11);
        await skaleToken.mint(TokenLaunchManager.address, 1e9, "0x", "0x");
        await validatorService.registerValidator("Validator", "D2 is even", 150, 0, {from: validator});
        await validatorService.enableValidator(1, {from: owner});
    });

    it("should register seller", async () => {
        await TokenLaunchManager.grantRole(await TokenLaunchManager.SELLER_ROLE(), seller);
        await TokenLaunchManager.hasRole(await TokenLaunchManager.SELLER_ROLE(), seller).should.be.eventually.true;
    });

    it("should not register seller if sender is not owner", async () => {
        await TokenLaunchManager.grantRole(await TokenLaunchManager.SELLER_ROLE(), seller, {from: hacker})
            .should.be.eventually.rejectedWith("sender must be an admin to grant");
    });

    describe("when seller is registered", async () => {
        beforeEach(async () => {
            await TokenLaunchManager.grantRole(await TokenLaunchManager.SELLER_ROLE(), seller);
        });

        it("should not allow to approve transfer if sender is not seller", async () => {
            await TokenLaunchManager.approveTransfer(holder, 10, {from: hacker})
                .should.be.eventually.rejectedWith("Not authorized");
        });

        it("should fail if parameter arrays are with different lengths", async () => {
            await TokenLaunchManager.approveBatchOfTransfers([holder, hacker], [10], {from: seller})
                .should.be.eventually.rejectedWith("Wrong input arrays length");
        });

        it("should not allow to approve transfers with more then total money amount in sum", async () => {
            await TokenLaunchManager.approveBatchOfTransfers([holder, hacker], [5e8, 5e8 + 1], {from: seller})
                .should.be.eventually.rejectedWith("Balance is too low");
        });

        it("should not allow to retrieve funds if it was not approved", async () => {
            await TokenLaunchManager.completeTokenLaunch({from: seller});
            await TokenLaunchManager.retrieve({from: hacker})
                .should.be.eventually.rejectedWith("Transfer is not approved");
        });

        it("should not allow to retrieve funds if launch is not completed", async () => {
            await TokenLaunchManager.approveBatchOfTransfers([holder], [10], {from: seller});
            await TokenLaunchManager.retrieve({from: holder})
                .should.be.eventually.rejectedWith("Cannot retrieve tokens because token launch has not yet completed");
        });

        it("should not allow to approve transfers if launch is completed", async () => {
            await TokenLaunchManager.completeTokenLaunch({from: seller});
            await TokenLaunchManager.approveTransfer(holder, 10, {from: seller})
                .should.be.eventually.rejectedWith("Cannot approve because token launch is completed");
            await TokenLaunchManager.approveBatchOfTransfers([holder], [10], {from: seller})
                .should.be.eventually.rejectedWith("Cannot approve because token launch is completed");
        });

        it("should allow seller to approve transfer to buyer", async () => {
            await TokenLaunchManager.approveBatchOfTransfers([holder], [10], {from: seller});
            await TokenLaunchManager.completeTokenLaunch({from: seller});
            await TokenLaunchManager.retrieve({from: holder});
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(10);
            await skaleToken.transfer(hacker, "1", {from: holder}).should.be.eventually.rejectedWith("Token should be unlocked for transferring");
        });

        it("should allow seller to change address of approval", async () => {
            await TokenLaunchManager.approveTransfer(hacker, 10, {from: seller});
            await TokenLaunchManager.changeApprovalAddress(hacker, holder, {from: seller});
            await TokenLaunchManager.completeTokenLaunch({from: seller});
            await TokenLaunchManager.retrieve({from: hacker})
                .should.be.eventually.rejectedWith("Transfer is not approved");
            await TokenLaunchManager.retrieve({from: holder});
            (await skaleToken.balanceOf(hacker)).toNumber().should.be.equal(0);
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(10);
        })

        it("should allow seller to change value of approval", async () => {
            await TokenLaunchManager.approveTransfer(holder, 10, {from: seller});
            await TokenLaunchManager.changeApprovalValue(holder, 5, {from: seller});
            await TokenLaunchManager.completeTokenLaunch({from: seller});
            await TokenLaunchManager.retrieve({from: holder});
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(5);
        })

        describe("when holder bought tokens", async () => {
            const validatorId = 1;
            const totalAmount = 1e7;
            const month = 60 * 60 * 24 * 31;

            beforeEach(async () => {
                await TokenLaunchManager.approveTransfer(holder, totalAmount, {from: seller});
                await TokenLaunchManager.completeTokenLaunch({from: seller});
                await TokenLaunchManager.retrieve({from: holder});
                await delegationPeriodManager.setDelegationPeriod(6, 150);
                await delegationPeriodManager.setDelegationPeriod(12, 200);
            });

            it("should lock tokens", async () => {
                const locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(totalAmount);
                const delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should not unlock purchased tokens if delegation request was cancelled", async () => {
                const period = 3;
                await delegationController.delegate(validatorId, totalAmount, period, "INFO", {from: holder});
                const delegationId = 0;
                const createdDelegation = await delegationController.getDelegation(delegationId);
                createdDelegation.holder.should.be.deep.equal(holder);

                await delegationController.cancelPendingDelegation(delegationId, {from: holder});

                const locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(totalAmount);
                const delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should be able to delegate part of tokens", async () => {
                const amount = Math.ceil(totalAmount / 2);
                const delegationPeriod = 3;
                await delegationController.delegate(
                    validatorId, amount, delegationPeriod, "D2 is even", {from: holder});
                const delegationId = 0;
                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                await skaleToken.transfer(hacker, 1, {from: holder})
                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                await skaleToken.approve(hacker, 1, {from: holder});
                await skaleToken.transferFrom(holder, hacker, 1, {from: hacker})
                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                await skaleToken.send(hacker, 1, "0x", {from: holder})
                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");

                skipTime(web3, month);

                await delegationController.requestUndelegation(delegationId, {from: holder});

                skipTime(web3, month * delegationPeriod);

                await skaleToken.transfer(hacker, totalAmount - amount, {from: holder});
                (await skaleToken.balanceOf(hacker)).toNumber().should.be.equal(totalAmount - amount);

                // TODO: move undelegated tokens too
            });

            it("should unlock all tokens if 50% was delegated for 90 days", async () => {
                await skipTimeToDate(web3, 1, 0); // January

                const amount = Math.ceil(totalAmount / 2);
                const period = 3;
                await delegationController.delegate(validatorId, amount, period, "INFO", {from: holder});
                const delegationId = 0;

                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                // skip month
                skipTime(web3, month);

                let delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                await delegationController.requestUndelegation(delegationId, {from: holder});

                // skip 89 days
                const leapYear = await isLeapYear(web3);
                if (leapYear) {
                    await skipTimeToDate(web3, 30, 3);
                } else {
                    await skipTimeToDate(web3, 1, 4);
                }

                if (leapYear) {
                    const state = await delegationController.getState(delegationId);
                    state.toNumber().should.be.equal(State.UNDELEGATION_REQUESTED);
                    const locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                    locked.toNumber().should.be.equal(totalAmount);
                    delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                    delegated.toNumber().should.be.equal(amount);
                } else {
                    const state = await delegationController.getState(delegationId);
                    state.toNumber().should.be.equal(State.COMPLETED);
                    const locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                    locked.toNumber().should.be.equal(totalAmount);
                    delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                    delegated.toNumber().should.be.equal(0);
                }

                // skip one more day
                skipTime(web3, 60 * 60 * 24);

                const finalState = await delegationController.getState(delegationId);
                finalState.toNumber().should.be.equal(State.COMPLETED);
                const finalLocked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                finalLocked.toNumber().should.be.equal(0);
                delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should unlock no tokens if 40% was delegated", async () => {
                const amount = Math.ceil(totalAmount * 0.4);
                const period = 3;
                await delegationController.delegate(validatorId, amount, period, "INFO", {from: holder});
                const delegationId = 0;

                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                // skip month
                skipTime(web3, month);

                let delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                await delegationController.requestUndelegation(delegationId, {from: holder});

                delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                skipTime(web3, month * period);

                const state = await delegationController.getState(delegationId);
                state.toNumber().should.be.equal(State.COMPLETED);
                const locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(totalAmount);
                delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should unlock all tokens if 40% was delegated and then 10% was delegated", async () => {
                // delegate 40%
                let amount = Math.ceil(totalAmount * 0.4);
                const period = 3;
                await delegationController.delegate(validatorId, amount, period, "INFO", {from: holder});
                let delegationId = 0;

                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                // skip month
                skipTime(web3, month);

                let delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                await delegationController.requestUndelegation(delegationId, {from: holder});

                skipTime(web3, month * period);

                let state = await delegationController.getState(delegationId);
                state.toNumber().should.be.equal(State.COMPLETED);
                let locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(totalAmount);
                delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);

                // delegate 10%
                amount = Math.ceil(totalAmount * 0.1);
                await delegationController.delegate(validatorId, amount, period, "INFO", {from: holder});
                delegationId = 1;

                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                // skip month
                skipTime(web3, month);

                state = await delegationController.getState(delegationId);
                state.toNumber().should.be.equal(State.DELEGATED);
                delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(amount);
                await delegationController.requestUndelegation(delegationId, {from: holder});

                skipTime(web3, month * period);

                state = await delegationController.getState(delegationId);
                state.toNumber().should.be.equal(State.COMPLETED);
                locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(0);
                delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should unlock tokens after 3 month after 50% tokens were used", async () => {
                // delegate 50%
                let amount = Math.ceil(totalAmount * 0.5);
                const period = 6;
                await delegationController.delegate(validatorId, amount, period, "INFO", {from: holder});
                let delegationId = 0;

                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                // skip month
                skipTime(web3, month);

                // delegate 10%
                let delegatedAmount = amount;
                amount = Math.ceil(totalAmount * 0.1);
                delegatedAmount += amount;
                await delegationController.delegate(validatorId, amount, period, "INFO", {from: holder});
                delegationId = 1;

                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                skipTime(web3, 2 * month);

                // 3rd month after first delegation

                let locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(totalAmount);

                skipTime(web3, month);

                locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(delegatedAmount);
            });

            it("should unlock tokens if 50% was delegated and then slashed", async () => {
                const amount = Math.ceil(totalAmount / 2);
                const period = 6;
                await delegationController.delegate(validatorId, amount, period, "INFO", {from: holder});
                const delegationId = 0;

                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                // skip month
                skipTime(web3, month);

                let delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(amount);

                await punisher.slash(validatorId, amount);
                await delegationController.requestUndelegation(delegationId, {from: holder});

                delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);
                (await skaleToken.getAndUpdateSlashedAmount.call(holder)).toNumber().should.be.equal(amount);

                skipTime(web3, month * 3);

                const state = await delegationController.getState(delegationId);
                state.toNumber().should.be.equal(State.UNDELEGATION_REQUESTED);
                const locked = await skaleToken.getAndUpdateLockedAmount.call(holder);
                locked.toNumber().should.be.equal(amount);
                delegated = await skaleToken.getAndUpdateDelegatedAmount.call(holder);
                delegated.toNumber().should.be.equal(0);
            });

            it("should not lock free tokens after delegation request cancelling", async () => {
                const freeAmount = 100;
                const purchasedAmount = totalAmount;
                const period = 12;

                await skaleToken.mint(holder, freeAmount, "0x", "0x");

                (await skaleToken.getAndUpdateLockedAmount.call(holder)).toNumber().should.be.equal(purchasedAmount);

                await delegationController.delegate(
                    validatorId, freeAmount + purchasedAmount, period, "D2 is even", {from: holder});
                const delegationId = 0;

                (await delegationController.getState(delegationId)).toNumber().should.be.equal(State.PROPOSED);
                (await skaleToken.getAndUpdateLockedAmount.call(holder)).toNumber()
                    .should.be.equal(freeAmount + purchasedAmount);

                await delegationController.cancelPendingDelegation(delegationId, {from: holder});

                (await delegationController.getState(delegationId)).toNumber().should.be.equal(State.CANCELED);
                (await skaleToken.getAndUpdateLockedAmount.call(holder)).toNumber().should.be.equal(purchasedAmount);
            });
        });
    });
});
