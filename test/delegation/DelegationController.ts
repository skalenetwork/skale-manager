import { ContractManager,
    DelegationController,
    SkaleToken,
    ValidatorService,
    ConstantsHolder} from "../../typechain";

import { currentTime, skipTime } from "../tools/time";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../tools/deploy/contractManager";
import { deployDelegationController } from "../tools/deploy/delegation/delegationController";
import { deployValidatorService } from "../tools/deploy/delegation/validatorService";
import { deploySkaleToken } from "../tools/deploy/skaleToken";
import { deployTimeHelpersWithDebug } from "../tools/deploy/test/timeHelpersWithDebug";
import { State } from "../tools/types";
import { deployTimeHelpers } from "../tools/deploy/delegation/timeHelpers";
import { deployConstantsHolder } from "../tools/deploy/constantsHolder";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { deploySkaleManagerMock } from "../tools/deploy/test/skaleManagerMock";
import { solidity } from "ethereum-waffle";
import { expect, assert } from "chai";
import { makeSnapshot, applySnapshot } from "../tools/snapshot";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);


describe("DelegationController", () => {
    let owner: SignerWithAddress;
    let holder1: SignerWithAddress;
    let holder2: SignerWithAddress;
    let validator: SignerWithAddress;
    let validator2: SignerWithAddress;

    let contractManager: ContractManager;
    let skaleToken: SkaleToken;
    let delegationController: DelegationController;
    let validatorService: ValidatorService;
    let constantsHolder: ConstantsHolder;

    const month = 60 * 60 * 24 * 31;

    let snapshot: number;

    before(async () => {
        [owner, holder1, holder2, validator, validator2] = await ethers.getSigners();
        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        delegationController = await deployDelegationController(contractManager);
        validatorService = await deployValidatorService(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);

        const skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);
        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    describe("when arguments for delegation initialized", async () => {
        let validatorId: number;
        let amount: number;
        let delegationPeriod: number;
        let info: string;
        let delegationId: number;
        let cleanContracts: number;

        before(async () => {
            cleanContracts = await makeSnapshot();
            validatorId = 1;
            amount = 100;
            delegationPeriod = 2;
            info = "VERY NICE";
            await validatorService.connect(validator).registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100);
            await validatorService.enableValidator(validatorId);
        });

        after(async () => {
            await applySnapshot(cleanContracts);
        });

        it("should reject delegation if validator with such id does not exist", async () => {
            const nonExistedValidatorId = 2;
            await delegationController.connect(holder1).delegate(nonExistedValidatorId, amount, delegationPeriod, info)
                .should.be.eventually.rejectedWith("Validator with such ID does not exist");
        });

        it("should reject delegation if it doesn't meet minimum delegation amount", async () => {
            amount = 99;
            await delegationController.connect(holder1).delegate(validatorId, amount, delegationPeriod, info)
                .should.be.eventually.rejectedWith("Amount does not meet the validator's minimum delegation amount");
        });

        it("should reject delegation if request doesn't meet allowed delegation period", async () => {
            delegationPeriod = 4;
            await delegationController.connect(holder1).delegate(validatorId, amount, delegationPeriod, info)
                .should.be.eventually.rejectedWith("This delegation period is not allowed");
        });

        it("should reject delegation if holder doesn't have enough unlocked tokens for delegation", async () => {
            delegationPeriod = 2;
            amount = 101;
            await delegationController.connect(holder1).delegate(validatorId, amount, delegationPeriod, info)
                .should.be.eventually.rejectedWith("Token holder does not have enough tokens to delegate");
        });

        it("should send request for delegation", async () => {
            amount = 100;
            await skaleToken.mint(holder1.address, amount, "0x", "0x");
            // const { logs } = await delegationController.connect(holder1).delegate(
            //     validatorId, amount, delegationPeriod, info);
            // assert.equal(logs.length, 1, "No DelegationProposed Event emitted");
            // assert.equal(logs[0].event, "DelegationProposed");

            await expect(
                delegationController.connect(holder1).delegate(validatorId, amount, delegationPeriod, info)
            ).to.emit(delegationController, "DelegationProposed");

            delegationId = 0;
            const delegation = await delegationController.delegations(delegationId);
            assert.equal(holder1.address, delegation.holder);
            assert.equal(validatorId, delegation.validatorId.toNumber());
            assert.equal(delegationPeriod, delegation.delegationPeriod.toNumber());
            assert.equal("VERY NICE", delegation.info);
        });

        it("should reject delegation if it doesn't have enough tokens", async () => {
            await skaleToken.mint(holder1.address, 2 * amount, "0x", "0x");
            await delegationController.connect(holder1).delegate(validatorId, amount + 1, delegationPeriod, info);
            await delegationController.connect(holder1).delegate(validatorId, amount, delegationPeriod, info)
                .should.be.eventually.rejectedWith("Token holder does not have enough tokens to delegate");

        });

        it("should reject canceling if delegation doesn't exist", async () => {
            delegationId = 99;
            await delegationController.connect(holder1).cancelPendingDelegation(delegationId)
                .should.be.rejectedWith("Delegation does not exist");
        });

        it("should allow to delegate if whitelist of validators is no longer supports", async () => {
            await skaleToken.mint(holder1.address, amount, "0x", "0x");
            await validatorService.disableValidator(validatorId);
            await delegationController.connect(holder1).delegate(validatorId, amount, delegationPeriod, info)
                .should.be.eventually.rejectedWith("Validator is not authorized to accept delegation request");
            await validatorService.disableWhitelist();
            await delegationController.connect(holder1).delegate(validatorId, amount, delegationPeriod, info);
        });

        describe("when delegation request was created", async () => {
            let validatorEnabled: number;
            before(async () => {
                validatorEnabled = await makeSnapshot();
                await skaleToken.mint(holder1.address, amount, "0x", "0x");
                await delegationController.connect(holder1).delegate(
                    validatorId, amount, delegationPeriod, info);
                delegationId = 0;
            });

            after(async () => {
                await applySnapshot(validatorEnabled);
            });

            it("should reject canceling request if it isn't actually holder of tokens", async () => {
                await delegationController.connect(holder2).cancelPendingDelegation(delegationId)
                    .should.be.rejectedWith("Only token holders can cancel delegation request");
            });

            it("should reject canceling request if validator already accepted it", async () => {
                await delegationController.connect(validator).acceptPendingDelegation(delegationId);
                await delegationController.connect(holder1).cancelPendingDelegation(delegationId)
                    .should.be.rejectedWith("Token holders are only able to cancel PROPOSED delegations");
            });

            it("should reject canceling request if delegation request already rejected", async () => {
                await delegationController.connect(holder1).cancelPendingDelegation(delegationId);
                await delegationController.connect(holder1).cancelPendingDelegation(delegationId)
                    .should.be.rejectedWith("Token holders are only able to cancel PROPOSED delegations");
            });

            it("should change state of tokens to CANCELED if delegation was cancelled", async () => {
                await delegationController.connect(holder1).cancelPendingDelegation(delegationId);
                const CANCELED = 2;
                const status = await delegationController.getState(delegationId);
                status.should.be.equal(CANCELED);
            });

            it("should reject accepting request if such validator doesn't exist", async () => {
                await delegationController.connect(validator2).acceptPendingDelegation(delegationId)
                    .should.be.rejectedWith("Validator address does not exist");
            });

            it("should reject accepting request if validator already canceled it", async () => {
                await delegationController.connect(holder1).cancelPendingDelegation(delegationId);
                await delegationController.connect(validator).acceptPendingDelegation(delegationId)
                    .should.be.rejectedWith("The delegation has been cancelled by token holder");
            });

            it("should reject accepting request if validator already accepted it", async () => {
                await delegationController.connect(validator).acceptPendingDelegation(delegationId);
                await delegationController.connect(validator).acceptPendingDelegation(delegationId)
                    .should.be.rejectedWith("The delegation has been already accepted");
            });

            it("should reject accepting request if next month started", async () => {
                await skipTime(ethers, month);
                await delegationController.connect(validator).acceptPendingDelegation(delegationId)
                    .should.be.rejectedWith("The delegation request is outdated");
            });

            it("should reject accepting request if validator tried to accept request not assigned to him", async () => {
                validatorService.connect(validator2).registerValidator(
                    "ValidatorName",
                    "Really good validator",
                    500,
                    100);
                await delegationController.connect(validator2).acceptPendingDelegation(delegationId)
                        .should.be.rejectedWith("No permissions to accept request");
            });

            it("should allow for QA team to test delegation pipeline immediately", async () => {
                const timeHelpersWithDebug = await deployTimeHelpersWithDebug(contractManager);
                await contractManager.setContractsAddress("TimeHelpers", timeHelpersWithDebug.address);

                await delegationController.connect(validator).acceptPendingDelegation(delegationId);
                (await delegationController.getState(delegationId)).should.be.equal(State.ACCEPTED);

                await timeHelpersWithDebug.skipTime(month);
                (await delegationController.getState(delegationId)).should.be.equal(State.DELEGATED);

                await delegationController.connect(holder1).requestUndelegation(delegationId);
                (await delegationController.getState(delegationId))
                    .should.be.equal(State.UNDELEGATION_REQUESTED);

                await timeHelpersWithDebug.skipTime(month * delegationPeriod);
                (await delegationController.getState(delegationId)).should.be.equal(State.COMPLETED);

                // skipTime should now affect new delegations
                await delegationController.connect(holder1).delegate(
                    validatorId, amount, delegationPeriod, info);
                delegationId = 1;
                (await delegationController.getState(delegationId)).should.be.equal(State.PROPOSED);
            });

            describe("when delegation is accepted", async () => {
                let holder1DelegatedToValidator: number;
                before(async () => {
                    delegationId = 0;
                    holder1DelegatedToValidator = await makeSnapshot();
                    await delegationController.connect(validator).acceptPendingDelegation(delegationId);

                    await skipTime(ethers, month);
                });

                after(async () => {
                    await applySnapshot(holder1DelegatedToValidator);
                });

                it("should allow validator to request undelegation", async () => {
                    await delegationController.connect(validator).requestUndelegation(delegationId);

                    await skipTime(ethers, delegationPeriod * month);

                    (await delegationController.getState(delegationId)).should.be.equal(State.COMPLETED);
                    (await skaleToken.callStatic.getAndUpdateDelegatedAmount(holder1.address)).toNumber().should.be.equal(0);
                });

                it("should not allow everyone to request undelegation", async () => {
                    await delegationController.connect(holder2).requestUndelegation(delegationId)
                        .should.be.eventually.rejectedWith("Permission denied to request undelegation");

                    await validatorService.connect(validator2).registerValidator(
                        "ValidatorName",
                        "Really good validator",
                        500,
                        100);
                    await delegationController.connect(validator2).requestUndelegation(delegationId)
                        .should.be.eventually.rejectedWith("Permission denied to request undelegation");

                    await skipTime(ethers, delegationPeriod * month);

                    (await delegationController.getState(delegationId)).should.be.equal(State.DELEGATED);
                    (await skaleToken.callStatic.getAndUpdateDelegatedAmount(holder1.address)).toNumber().should.be.equal(amount);
                });

                it("should not allow holder to request undelegation at the last moment", async () => {
                    const timeHelpers = await deployTimeHelpers(contractManager);
                    const currentEpoch = (await timeHelpers.getCurrentMonth()).toNumber();
                    const delegationEndTimestamp = (await timeHelpers.monthToTimestamp(currentEpoch + delegationPeriod)).toNumber();
                    const twoDays = 2 * 24 * 60 * 60;

                    // skip time 2 days before delegation end
                    await skipTime(ethers, delegationEndTimestamp - twoDays - await currentTime(ethers));

                    await delegationController.connect(validator).requestUndelegation(delegationId)
                        .should.be.eventually.rejectedWith("Undelegation requests must be sent 3 days before the end of delegation period");
                    (await delegationController.getState(delegationId)).should.be.equal(State.DELEGATED);

                    await skipTime(ethers, twoDays * 2);

                    await delegationController.connect(validator).requestUndelegation(delegationId);
                    (await delegationController.getState(delegationId)).should.be.equal(State.UNDELEGATION_REQUESTED);

                    await skipTime(ethers, delegationPeriod * month);

                    (await delegationController.getState(delegationId)).should.be.equal(State.COMPLETED);
                    (await skaleToken.callStatic.getAndUpdateDelegatedAmount(holder1.address)).toNumber().should.be.equal(0);
                });
            });
        });
    });
});
