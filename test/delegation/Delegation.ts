import {ConstantsHolder,
    ContractManager,
    DelegationController,
    DelegationPeriodManager,
    Distributor,
    Punisher,
    SkaleManagerMock,
    SkaleToken,
    TokenState,
    ValidatorService,
    Nodes,
    SlashingTable} from "../../typechain-types";

import {currentTime, nextMonth, skipTimeToDate} from "../tools/time";

import {BigNumber, Wallet} from "ethers";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {deployConstantsHolder} from "../tools/deploy/constantsHolder";
import {deployContractManager} from "../tools/deploy/contractManager";
import {deployDelegationController} from "../tools/deploy/delegation/delegationController";
import {deployDelegationPeriodManager} from "../tools/deploy/delegation/delegationPeriodManager";
import {deployDistributor} from "../tools/deploy/delegation/distributor";
import {deployPunisher} from "../tools/deploy/delegation/punisher";
import {deployTokenState} from "../tools/deploy/delegation/tokenState";
import {deployValidatorService} from "../tools/deploy/delegation/validatorService";
import {deploySkaleToken} from "../tools/deploy/skaleToken";
import {State} from "../tools/types";
import {deployNodes} from "../tools/deploy/nodes";
import {deploySlashingTable} from "../tools/deploy/slashingTable";
import {deployTimeHelpersWithDebug} from "../tools/deploy/test/timeHelpersWithDebug";
import {deploySkaleManager} from "../tools/deploy/skaleManager";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import {deploySkaleManagerMock} from "../tools/deploy/test/skaleManagerMock";
import {assert, expect} from "chai";
import {getValidatorIdSignature} from "../tools/signatures";
import {fastBeforeEach} from "../tools/mocha";

chai.should();
chai.use(chaiAsPromised);

const allowedDelegationPeriods = [2, 6, 12];

describe("Delegation", () => {
    let owner: SignerWithAddress;
    let holder1: SignerWithAddress;
    let holder2: SignerWithAddress;
    let holder3: SignerWithAddress;
    let validator: SignerWithAddress;
    let bountyAddress: SignerWithAddress;

    let contractManager: ContractManager;
    let skaleToken: SkaleToken;
    let delegationController: DelegationController;
    let delegationPeriodManager: DelegationPeriodManager;
    let skaleManagerMock: SkaleManagerMock;
    let validatorService: ValidatorService;
    let constantsHolder: ConstantsHolder;
    let tokenState: TokenState;
    let distributor: Distributor;
    let punisher: Punisher;
    let nodes: Nodes;

    const defaultAmount = ethers.utils.parseEther("100");
    const month = 60 * 60 * 24 * 31;

    interface IValidator {
        id: number;
        account: Wallet
    }

    fastBeforeEach(async () => {
        [owner, holder1, holder2, holder3, validator, bountyAddress] = await ethers.getSigners();

        contractManager = await deployContractManager();

        skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);

        skaleToken = await deploySkaleToken(contractManager);
        delegationController = await deployDelegationController(contractManager);
        delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
        validatorService = await deployValidatorService(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        tokenState = await deployTokenState(contractManager);
        distributor = await deployDistributor(contractManager);
        punisher = await deployPunisher(contractManager);
        nodes = await deployNodes(contractManager);

        // contract must be set in contractManager for proper work of allow modifier
        await contractManager.setContractsAddress("SkaleDKG", nodes.address);

        // each test will start from Nov 10
        await skipTimeToDate(10, 10);

        const CONSTANTS_HOLDER_MANAGER_ROLE = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
        await constantsHolder.grantRole(CONSTANTS_HOLDER_MANAGER_ROLE, owner.address);
        const DELEGATION_PERIOD_SETTER_ROLE = await delegationPeriodManager.DELEGATION_PERIOD_SETTER_ROLE();
        await delegationPeriodManager.grantRole(DELEGATION_PERIOD_SETTER_ROLE, owner.address);
        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        const FORGIVER_ROLE = await punisher.FORGIVER_ROLE();
        await punisher.grantRole(FORGIVER_ROLE, owner.address);
    });

    it("should allow owner to remove locker", async () => {
        const lockerMockFactory = await ethers.getContractFactory("LockerMock");
        const lockerMock = await lockerMockFactory.deploy();
        await contractManager.setContractsAddress("D2", lockerMock.address);

        await tokenState.connect(validator).addLocker("D2")
            .should.be.eventually.rejectedWith("LOCKER_MANAGER_ROLE is required");
        await tokenState.addLocker("D2");
        // TODO: consider on transfer optimization. Locker are turned of for non delegated wallets
        // (await tokenState.getAndUpdateLockedAmount.call(owner)).toNumber().should.be.equal(13);
        await tokenState.connect(validator).removeLocker("D2")
            .should.be.eventually.rejectedWith("LOCKER_MANAGER_ROLE is required");
        await tokenState.removeLocker("D2");
        (await tokenState.callStatic.getAndUpdateLockedAmount(owner.address)).toNumber().should.be.equal(0);
    });

    it("should allow owner to set new delegation period", async () => {
        await delegationPeriodManager.connect(validator).setDelegationPeriod(13, 13)
            .should.be.eventually.rejectedWith("DELEGATION_PERIOD_SETTER_ROLE is required");
        await delegationPeriodManager.setDelegationPeriod(13, 13);
        (await delegationPeriodManager.stakeMultipliers(13)).toNumber()
            .should.be.equal(13);
    });

    it("should check limit of validators", async () => {
        await skaleToken.mint(holder1.address, defaultAmount, "0x", "0x");
        const validatorsLimit = (await constantsHolder.limitValidatorsPerDelegator()).toNumber();
        const validatorsAmount = validatorsLimit + 1;
        const validators: IValidator[] = [];
        for (let i = 0; i < validatorsAmount; ++i) {
            validators.push({
                id: i + 1,
                account: Wallet.createRandom().connect(ethers.provider)
            });
        }
        const etherAmount = ethers.utils.parseEther("5000");
        for (const newValidator of validators) {
            await holder1.sendTransaction({to: newValidator.account.address, value: etherAmount});
            await validatorService.connect(newValidator.account).registerValidator("Validator", "Good Validator", 150, 0);
            await validatorService.enableValidator(newValidator.id);
        }

        for (let i = 0; i < validatorsLimit; i++) {
            await delegationController.connect(holder1).delegate(validators[i].id, 100, 2, "OK delegation");
            const delegationId = i;
            await delegationController.connect(validators[i].account).acceptPendingDelegation(delegationId);
        }

        // could send delegation request to already delegated validator
        await delegationController.connect(holder1).delegate(2, 100, 2, "OK delegation");

        // could not send delegation request to new validator
        await delegationController.connect(holder1).delegate(validators[validatorsLimit].id, 100, 2, "OK delegation")
            .should.be.eventually.rejectedWith("Limit of validators is reached");

        // still could send delegation request to already delegated validator
        await delegationController.connect(holder1).delegate(2, 100, 2, "OK delegation");

        await nextMonth(contractManager);
        // could send undelegation request from 1 delegationId
        await delegationController.connect(holder1).requestUndelegation(0);

        // still could send delegation request to already delegated validator
        await delegationController.connect(holder1).delegate(2, 100, 2, "OK delegation");

        // could send delegation request to new validator
        await delegationController.connect(holder1).delegate(validators[validatorsLimit].id, 100, 2, "OK delegation");
        await delegationController.connect(validators[validatorsLimit].account).acceptPendingDelegation(23);

        // could not send delegation request to previously delegated validator
        await delegationController.connect(holder1).delegate(1, 100, 2, "OK delegation")
            .should.be.eventually.rejectedWith("Limit of validators is reached");
    });

    it("should check limit of validators when delegations was not accepted", async () => {
        await skaleToken.mint(holder1.address, defaultAmount, "0x", "0x");
        const validatorsLimit = (await constantsHolder.limitValidatorsPerDelegator()).toNumber();
        const validatorsAmount = validatorsLimit + 1;
        const validators: IValidator[] = [];
        for (let i = 0; i < validatorsAmount; ++i) {
            validators.push({
                id: i + 1,
                account: Wallet.createRandom().connect(ethers.provider)
            });
        }
        const etherAmount = ethers.utils.parseEther("5000");
        for (const newValidator of validators) {
            await holder1.sendTransaction({to: newValidator.account.address, value: etherAmount});
            await validatorService.connect(newValidator.account).registerValidator("Validator", "Good Validator", 150, 0);
            await validatorService.enableValidator(newValidator.id);
        }

        for (let i = 0; i < validatorsAmount; i++) {
            await delegationController.connect(holder1).delegate(validators[i].id, 100, 2, "OK delegation");
        }

        for (let i = 0; i < validatorsLimit; i++) {
            const delegationId = i;
            await delegationController.connect(validators[i].account).acceptPendingDelegation(delegationId);
        }

        await delegationController.connect(validators[validatorsLimit].account).acceptPendingDelegation(validatorsLimit)
            .should.be.eventually.rejectedWith("Limit of validators is reached");

        // could send delegation request to already delegated validator
        await delegationController.connect(holder1).delegate(2, 100, 2, "OK delegation");

        // could not send delegation request to new validator
        await delegationController.connect(holder1).delegate(validators[validatorsLimit].id, 100, 2, "OK delegation")
            .should.be.eventually.rejectedWith("Limit of validators is reached");

        // still could send delegation request to already delegated validator
        await delegationController.connect(holder1).delegate(2, 100, 2, "OK delegation");

        await nextMonth(contractManager);
        // could send undelegation request from 1 delegationId (2 validatorId)
        await delegationController.connect(holder1).requestUndelegation(0);

        // still could send delegation request to already delegated validator
        await delegationController.connect(holder1).delegate(2, 100, 2, "OK delegation");

        // could send delegation request to new validator
        await delegationController.connect(holder1).delegate(validators[validatorsLimit].id, 100, 2, "OK delegation");
        await delegationController.connect(validators[validatorsLimit].account).acceptPendingDelegation(24);

        // could not send delegation request to previously delegated validator
        await delegationController.connect(holder1).delegate(validators[0].id, 100, 2, "OK delegation")
            .should.be.eventually.rejectedWith("Limit of validators is reached");
    });

    describe("when holders have tokens and validator is registered", () => {
        let validatorId: number;
        fastBeforeEach(async () => {
            validatorId = 1;
            await skaleToken.mint(holder1.address, defaultAmount.toString(), "0x", "0x");
            await skaleToken.mint(holder2.address, defaultAmount.toString(), "0x", "0x");
            await skaleToken.mint(holder3.address, defaultAmount.toString(), "0x", "0x");
            await validatorService.connect(validator).registerValidator(
                "First validator", "Super-duper validator", 150, 0);
            await validatorService.enableValidator(validatorId);
            await delegationPeriodManager.setDelegationPeriod(12, 200);
            await delegationPeriodManager.setDelegationPeriod(6, 150);
        });

        for (let delegationPeriod = 1; delegationPeriod <= 18; ++delegationPeriod) {
            it(`should check ${delegationPeriod} month${delegationPeriod > 1 ? "s" : ""} delegation period availability`, async () => {
                await delegationPeriodManager.isDelegationPeriodAllowed(delegationPeriod)
                    .should.be.eventually.equal(allowedDelegationPeriods.includes(delegationPeriod));
            });

            if (allowedDelegationPeriods.includes(delegationPeriod)) {
                describe(`when delegation period is ${delegationPeriod} months`, () => {
                    let requestId: number;

                    it("should send request for delegation", async () => {
                        await expect(
                            delegationController.connect(holder1).delegate(validatorId, defaultAmount.toString(), delegationPeriod, "D2 is even")
                        ).to.emit(delegationController,"DelegationProposed" );
                        requestId = 0;

                        const delegation = await delegationController.delegations(requestId);
                        assert.equal(holder1.address, delegation.holder);
                        assert.equal(validatorId, delegation.validatorId.toNumber());
                        assert.equal(delegationPeriod, delegation.delegationPeriod.toNumber());
                        assert.equal("D2 is even", delegation.info);
                    });

                    describe("when delegation request is sent", () => {
                        fastBeforeEach(async () => {
                            await delegationController.connect(holder1).delegate(
                                validatorId, defaultAmount.toString(), delegationPeriod, "D2 is even");
                            requestId = 0;
                        });

                        it("should not allow to burn locked tokens", async () => {
                            await skaleToken.connect(holder1).burn(1, "0x")
                                .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                        });

                        it("should not allow holder to spend tokens", async () => {
                            await skaleToken.connect(holder1).transfer(holder2.address, 1)
                                .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                            await skaleToken.connect(holder1).approve(holder2.address, 1);
                            await skaleToken.connect(holder2).transferFrom(holder1.address, holder2.address, 1)
                                .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                            await skaleToken.connect(holder1).send(holder2.address, 1, "0x", )
                                .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                        });

                        it("should allow holder to receive tokens", async () => {
                            await skaleToken.connect(holder2).transfer(holder1.address, 1);
                            const balance = (await skaleToken.balanceOf(holder1.address)).toString();
                            balance.should.be.equal("100000000000000000001");
                        });

                        it("should accept delegation request", async () => {
                            await delegationController.connect(validator).acceptPendingDelegation(requestId);
                        });

                        it("should unlock token if validator does not accept delegation request", async () => {
                            await skipTimeToDate(1, 11);

                            await skaleToken.connect(holder1).transfer(holder2.address, 1);
                            await skaleToken.connect(holder1).approve(holder2.address, 1);
                            await skaleToken.connect(holder2).transferFrom(holder1.address, holder2.address, 1);
                            await skaleToken.connect(holder1).send(holder2.address, 1, "0x");

                            const balance = BigNumber.from(await skaleToken.balanceOf(holder1.address));
                            const correctBalance = BigNumber.from(defaultAmount.toString()).sub(3);

                            balance.should.be.deep.equal(correctBalance);
                        });

                        describe("when delegation request is accepted", () => {
                            fastBeforeEach(async () => {
                                await delegationController.connect(validator).acceptPendingDelegation(requestId);
                            });

                            it("should extend delegation period if undelegation request was not sent",
                                async () => {
                                    await skipTimeToDate(1, (11 + delegationPeriod) % 12);

                                    await skaleToken.connect(holder1).transfer(holder2.address, 1)
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                                    await skaleToken.connect(holder1).approve(holder2.address, 1);
                                    await skaleToken.connect(holder2).transferFrom(holder1.address, holder2.address, 1)
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                                    await skaleToken.connect(holder1).send(holder2.address, 1, "0x")
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");

                                    await delegationController.connect(holder1).requestUndelegation(requestId);

                                    await skipTimeToDate(27, (11 + delegationPeriod + delegationPeriod - 1) % 12);

                                    await skaleToken.connect(holder1).transfer(holder2.address, 1)
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");

                                    await skaleToken.connect(holder1).approve(holder2.address, 1);
                                    await skaleToken.connect(holder2).transferFrom(holder1.address, holder2.address, 1)
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                                    await skaleToken.connect(holder1).send(holder2.address, 1, "0x")
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");

                                    await skipTimeToDate(1, (11 + delegationPeriod + delegationPeriod) % 12);

                                    await skaleToken.connect(holder1).transfer(holder2.address, 1);
                                    await skaleToken.connect(holder1).approve(holder2.address, 1);
                                    await skaleToken.connect(holder2).transferFrom(holder1.address, holder2.address, 1);
                                    await skaleToken.connect(holder1).send(holder2.address, 1, "0x");

                                    (await skaleToken.balanceOf(holder1.address)).toString().should.be.equal("99999999999999999997");
                            });
                        });
                    });
                });
            } else {
                it(`should not allow to send delegation request for ${delegationPeriod} month${delegationPeriod > 1 ? "s" : "" }`, async () => {
                    await delegationController.connect(holder1).delegate(validatorId, defaultAmount.toString(), delegationPeriod,
                        "D2 is even")
                        .should.be.eventually.rejectedWith("This delegation period is not allowed");
                });
            }
        }

        it("should not allow holder to delegate to unregistered validator", async () => {
            await delegationController.connect(holder1).delegate(13, 1,  2, "D2 is even")
                .should.be.eventually.rejectedWith("Validator with such ID does not exist");
        });

        it("should calculate bond amount if validator delegated to itself", async () => {
            await skaleToken.mint(validator.address, defaultAmount.toString(), "0x", "0x");
            await delegationController.connect(validator).delegate(
                validatorId, defaultAmount.toString(), 2, "D2 is even");
            await delegationController.connect(holder1).delegate(
                validatorId, defaultAmount.toString(), 2, "D2 is even");
            await delegationController.connect(validator).acceptPendingDelegation(0);
            await delegationController.connect(validator).acceptPendingDelegation(1);

            await nextMonth(contractManager);

            const bondAmount = await validatorService.callStatic.getAndUpdateBondAmount(validatorId);
            assert.equal(defaultAmount.toString(), bondAmount.toString());
        });

        it("should calculate bond amount if validator delegated to itself using different periods", async () => {
            await skaleToken.mint(validator.address, defaultAmount.toString(), "0x", "0x");
            await delegationController.connect(validator).delegate(
                validatorId, 5, 2, "D2 is even");
            await delegationController.connect(validator).delegate(
                validatorId, 13, 12, "D2 is even");
            await delegationController.connect(validator).acceptPendingDelegation(0);
            await delegationController.connect(validator).acceptPendingDelegation(1);

            await nextMonth(contractManager);

            const bondAmount = await validatorService.callStatic.getAndUpdateBondAmount(validatorId);
            assert.equal(18, bondAmount.toNumber());
        });

        it("should bond equals zero for validator if she delegated to another validator", async () =>{
            const validator1 = validator;
            const validator2 = holder1;
            const validator1Id = 1;
            const validator2Id = 2;
            await validatorService.connect(validator2).registerValidator(
                "Second validator", "Super-duper validator", 150, 0);
            await validatorService.enableValidator(validator2Id);
            await delegationController.connect(validator2).delegate(
                validator1Id, 200, 2, "D2 is even");
            await delegationController.connect(validator2).delegate(
                validator2Id, 200, 2, "D2 is even");
            await delegationController.connect(validator1).acceptPendingDelegation(0);
            await delegationController.connect(validator2).acceptPendingDelegation(1);
            await nextMonth(contractManager);

            const bondAmount1 = await validatorService.callStatic.getAndUpdateBondAmount(validator1Id);
            let bondAmount2 = await validatorService.callStatic.getAndUpdateBondAmount(validator2Id);
            assert.equal(bondAmount1.toNumber(), 0);
            assert.equal(bondAmount2.toNumber(), 200);
            await delegationController.connect(validator2).delegate(
                validator2Id, 200, 2, "D2 is even");
            await delegationController.connect(validator2).acceptPendingDelegation(2);

            await nextMonth(contractManager);
            bondAmount2 = await validatorService.callStatic.getAndUpdateBondAmount(validator2Id);
            assert.equal(bondAmount2.toNumber(), 400);
        });

        it("should not pay bounty for slashed tokens", async () => {
            const timeHelpersWithDebug = await deployTimeHelpersWithDebug(contractManager);
            await contractManager.setContractsAddress("TimeHelpers", timeHelpersWithDebug.address);
            await skaleToken.mint(holder1.address, ethers.utils.parseEther("10000"), "0x", "0x");
            await skaleToken.mint(holder2.address, ethers.utils.parseEther("10000"), "0x", "0x");

            await constantsHolder.setMSR(ethers.utils.parseEther("2000"));

            const slashingTable: SlashingTable = await deploySlashingTable(contractManager);
            const PENALTY_SETTER_ROLE = await slashingTable.PENALTY_SETTER_ROLE();
            await slashingTable.grantRole(PENALTY_SETTER_ROLE, owner.address);
            await slashingTable.setPenalty("FailedDKG", ethers.utils.parseEther("10000"));

            await constantsHolder.setLaunchTimestamp((await currentTime()) - 4 * month);

            await delegationController.connect(holder1).delegate(validatorId, ethers.utils.parseEther("10000"), 2, "First delegation");
            const delegationId1 = 0;
            await delegationController.connect(validator).acceptPendingDelegation(delegationId1);

            await timeHelpersWithDebug.skipTime(month);
            (await delegationController.getState(delegationId1)).should.be.equal(State.DELEGATED);

            const bounty = ethers.utils.parseEther("1");
            for (let i = 0; i < 5; ++i) {
                await skaleManagerMock.payBounty(validatorId, bounty);
            }

            await timeHelpersWithDebug.skipTime(month);

            await distributor.connect(holder1).withdrawBounty(validatorId, bountyAddress.address);
            let balance = (await skaleToken.balanceOf(bountyAddress.address)).toString();
            balance.should.be.equal(bounty.mul(5).mul(85).div(100));
            await skaleToken.connect(bountyAddress).transfer(holder1.address, balance);

            await punisher.slash(validatorId, ethers.utils.parseEther("10000"));

            (await skaleToken.callStatic.getAndUpdateSlashedAmount(holder1.address)).toString()
                .should.be.equal(ethers.utils.parseEther("10000"));
            (await skaleToken.callStatic.getAndUpdateDelegatedAmount(holder1.address)).toString()
                .should.be.equal("0");

            await delegationController.connect(holder2).delegate(validatorId, ethers.utils.parseEther("10000"), 2, "Second delegation");
            const delegationId2 = 1;
            await delegationController.connect(validator).acceptPendingDelegation(delegationId2);

            await timeHelpersWithDebug.skipTime(month);
            (await delegationController.getState(delegationId2)).should.be.equal(State.DELEGATED);

            for (let i = 0; i < 5; ++i) {
                await skaleManagerMock.payBounty(validatorId, bounty);
            }

            await timeHelpersWithDebug.skipTime(month);

            await distributor.connect(holder1).withdrawBounty(validatorId, bountyAddress.address);
            balance = (await skaleToken.balanceOf(bountyAddress.address)).toString();
            balance.should.be.equal("0");
            await skaleToken.connect(bountyAddress).transfer(holder1.address, balance);

            await distributor.connect(holder2).withdrawBounty(validatorId, bountyAddress.address);
            balance = (await skaleToken.balanceOf(bountyAddress.address)).toString();
            balance.should.be.equal(bounty.mul(5).mul(85).div(100));
            await skaleToken.connect(bountyAddress).transfer(holder2.address, balance);
        });

        it("should be possible to distribute bounty across thousands of holders", async () => {
            let holdersAmount = 1000;
            if (process.env.CI) {
                console.log("Reduce holders amount to fit GitHub time limit");
                holdersAmount = 10;
            }
            const delegatedAmount = 1e7;
            const holders: Wallet[] = [];
            for (let i = 0; i < holdersAmount; ++i) {
                holders.push(Wallet.createRandom().connect(ethers.provider));
            }
            const etherAmount = ethers.utils.parseEther("5000");

            await constantsHolder.setLaunchTimestamp(0);

            let delegationId = 0;
            for (const holder of holders) {
                await holder1.sendTransaction({to: holder.address, value: etherAmount});
                await skaleToken.mint(holder.address, delegatedAmount, "0x", "0x");
                await delegationController.connect(holder).delegate(validatorId, delegatedAmount, 2, "D2 is even");
                await delegationController.connect(validator).acceptPendingDelegation(delegationId++);
            }

            await nextMonth(contractManager);

            const bounty = Math.floor(holdersAmount * delegatedAmount / 0.85);
            (bounty - Math.floor(bounty * 0.15)).should.be.equal(holdersAmount * delegatedAmount);
            await skaleManagerMock.payBounty(validatorId, bounty);

            await nextMonth(contractManager);

            for (const holder of holders) {
                await distributor.connect(holder).withdrawBounty(validatorId, holder.address);
                (await skaleToken.balanceOf(holder.address)).toNumber().should.be.equal(delegatedAmount * 2);
                (await skaleToken.callStatic.getAndUpdateDelegatedAmount(holder.address))
                    .toNumber().should.be.equal(delegatedAmount);

                const balance = await holder.getBalance();
                const gas = 21 * 1e3;
                const gasPrice = 20 * 1e9;
                await holder.sendTransaction({
                    to: holder1.address,
                    gasLimit: gas,
                    gasPrice,
                    value: balance.sub(gas * gasPrice)
                });
                (await holder.getBalance()).toNumber().should.be.equal(0);
            }
        });

        describe("when 3 holders delegated", () => {
            const delegatedAmount1 = 2e6;
            const delegatedAmount2 = 3e6;
            const delegatedAmount3 = 5e6;
            fastBeforeEach(async () => {
                await delegationController.connect(holder1).delegate(validatorId, delegatedAmount1, 12, "D2 is even");
                await delegationController.connect(holder2).delegate(validatorId, delegatedAmount2, 6,
                    "D2 is even more even");
                await delegationController.connect(holder3).delegate(validatorId, delegatedAmount3, 2, "D2 is the evenest");

                await delegationController.connect(validator).acceptPendingDelegation(0);
                await delegationController.connect(validator).acceptPendingDelegation(1);
                await delegationController.connect(validator).acceptPendingDelegation(2);

                await nextMonth(contractManager);
            });

            it("should distribute funds sent to Distributor across delegators", async () => {
                await constantsHolder.setLaunchTimestamp(await currentTime());

                await skaleManagerMock.payBounty(validatorId, 101);

                await nextMonth(contractManager);

                // 15% fee to validator

                // Stakes:
                // holder1: 20%
                // holder2: 30%
                // holder3: 50%

                // Affective stakes:
                // holder1: $8
                // holder2: $9
                // holder3: $10

                // Shares:
                // holder1: ~29%
                // holder2: ~33%
                // holder3: ~37%

                // TODO: Validator should get 17 (not 15) because of rounding errors
                (await distributor.connect(validator).callStatic.getEarnedFeeAmount())[0].toNumber().should.be.equal(15);
                (await distributor.connect(holder1).callStatic.getAndUpdateEarnedBountyAmount(
                    validatorId))[0].toNumber().should.be.equal(25);
                (await distributor.connect(holder2).callStatic.getAndUpdateEarnedBountyAmount(
                    validatorId))[0].toNumber().should.be.equal(28);
                (await distributor.connect(holder3).callStatic.getAndUpdateEarnedBountyAmount(
                    validatorId))[0].toNumber().should.be.equal(31);

                await distributor.connect(validator).withdrawFee(bountyAddress.address)
                    .should.be.eventually.rejectedWith("Fee is locked");
                await distributor.connect(holder1).withdrawBounty(validatorId, bountyAddress.address)
                    .should.be.eventually.rejectedWith("Bounty is locked");

                await nextMonth(contractManager, 3);

                await distributor.connect(validator).withdrawFee(bountyAddress.address);
                (await distributor.connect(validator).callStatic.getEarnedFeeAmount())[0].toNumber().should.be.equal(0);
                await distributor.connect(validator).withdrawFee(validator.address);
                (await distributor.connect(validator).callStatic.getEarnedFeeAmount())[0].toNumber().should.be.equal(0);

                (await skaleToken.balanceOf(bountyAddress.address)).toNumber().should.be.equal(15);

                await distributor.connect(holder1).withdrawBounty(validatorId, bountyAddress.address);
                (await distributor.connect(holder1).callStatic.getAndUpdateEarnedBountyAmount(
                    validatorId))[0].toNumber().should.be.equal(0);
                await distributor.connect(holder2).withdrawBounty(validatorId, holder2.address);
                (await distributor.connect(holder2).callStatic.getAndUpdateEarnedBountyAmount(
                    validatorId))[0].toNumber().should.be.equal(0);

                (await skaleToken.balanceOf(bountyAddress.address)).toNumber().should.be.equal(15 + 25);

                const balance = (await skaleToken.balanceOf(holder2.address)).toString();
                balance.should.be.equal(BigNumber.from(defaultAmount.toString()).add(28).toString());
            });

            describe("Slashing", () => {
                it("should slash validator and lock delegators fund in proportion of delegation share", async () => {
                    // do 5 separate slashes to check aggregation
                    const slashesNumber = 5;
                    for (let i = 0; i < slashesNumber; ++i) {
                        await punisher.slash(validatorId, 5);
                    }

                    // Stakes:
                    // holder1: $2e6
                    // holder2: $3e6
                    // holder3: $5e6

                    (await tokenState.callStatic.getAndUpdateLockedAmount(holder1.address)).toNumber()
                        .should.be.equal(delegatedAmount1);
                    (await delegationController.callStatic.getAndUpdateDelegatedAmount(
                        holder1.address)).toNumber().should.be.equal(delegatedAmount1 - 1 * slashesNumber);

                    (await tokenState.callStatic.getAndUpdateLockedAmount(holder2.address)).toNumber()
                        .should.be.equal(delegatedAmount2);
                    (await delegationController.callStatic.getAndUpdateDelegatedAmount(
                        holder2.address)).toNumber().should.be.equal(delegatedAmount2 - 2 * slashesNumber);

                    (await tokenState.callStatic.getAndUpdateLockedAmount(holder3.address)).toNumber()
                        .should.be.equal(delegatedAmount3);
                    (await delegationController.callStatic.getAndUpdateDelegatedAmount(
                        holder3.address)).toNumber().should.be.equal(delegatedAmount3 - 3 * slashesNumber);
                });

                it("should not lock more tokens than were delegated", async () => {
                    await punisher.slash(validatorId, 10 * (delegatedAmount1 + delegatedAmount2 + delegatedAmount3));

                    (await tokenState.callStatic.getAndUpdateLockedAmount(holder1.address)).toNumber()
                        .should.be.equal(delegatedAmount1);
                    (await delegationController.callStatic.getAndUpdateDelegatedAmount(
                        holder1.address)).toNumber().should.be.equal(0);

                    (await tokenState.callStatic.getAndUpdateLockedAmount(holder2.address)).toNumber()
                        .should.be.equal(delegatedAmount2);
                    (await delegationController.callStatic.getAndUpdateDelegatedAmount(
                        holder2.address)).toNumber().should.be.equal(0);

                    (await tokenState.callStatic.getAndUpdateLockedAmount(holder3.address)).toNumber()
                        .should.be.equal(delegatedAmount3);
                    (await delegationController.callStatic.getAndUpdateDelegatedAmount(
                        holder3.address)).toNumber().should.be.equal(0);
                });

                it("should allow to return slashed tokens back", async () => {
                    await punisher.slash(validatorId, 10);

                    (await tokenState.callStatic.getAndUpdateLockedAmount(holder3.address)).toNumber()
                        .should.be.equal(delegatedAmount3);
                    (await delegationController.callStatic.getAndUpdateDelegatedAmount(
                        holder3.address)).toNumber().should.be.equal(delegatedAmount3 - 5);

                    await delegationController.processAllSlashes(holder3.address);
                    await punisher.forgive(holder3.address, 3);

                    (await tokenState.callStatic.getAndUpdateLockedAmount(holder3.address)).toNumber()
                        .should.be.equal(delegatedAmount3 - 3);
                    (await delegationController.callStatic.getAndUpdateDelegatedAmount(
                        holder3.address)).toNumber().should.be.equal(delegatedAmount3 - 5);
                });

                it("should allow only FORGIVER_ROLE to return slashed tokens", async() => {
                    await deploySkaleManager(contractManager);

                    await punisher.slash(validatorId, 10);
                    await delegationController.processAllSlashes(holder3.address);

                    await punisher.connect(holder1).forgive(holder3.address, 3)
                        .should.be.eventually.rejectedWith("FORGIVER_ROLE is required");
                    const FORGIVER_ROLE = await punisher.FORGIVER_ROLE();
                    await punisher.grantRole(FORGIVER_ROLE, holder1.address);
                    await punisher.connect(holder1).forgive(holder3.address, 3);
                });

                it("should not pay bounty for slashed tokens", async () => {
                    // slash everything
                    await punisher.slash(validatorId, delegatedAmount1 + delegatedAmount2 + delegatedAmount3);

                    await delegationController.connect(holder1).delegate(validatorId, 1e7, 2, "D2 is the evenest");
                    const delegationId = 3;
                    await delegationController.connect(validator).acceptPendingDelegation(delegationId);

                    await nextMonth(contractManager);

                    // now only holder1 has delegated and not slashed tokens

                    await skaleManagerMock.payBounty(validatorId, 100);

                    await nextMonth(contractManager);

                    (await distributor.connect(validator).callStatic.getEarnedFeeAmount())[0].toNumber().should.be.equal(15);
                    (await distributor.connect(holder1).callStatic.getAndUpdateEarnedBountyAmount(
                        validatorId))[0].toNumber().should.be.equal(85);
                    (await distributor.connect(holder2).callStatic.getAndUpdateEarnedBountyAmount(
                        validatorId))[0].toNumber().should.be.equal(0);
                    (await distributor.connect(holder3).callStatic.getAndUpdateEarnedBountyAmount(
                        validatorId))[0].toNumber().should.be.equal(0);
                });

                it("should reduce delegated amount immediately after slashing", async () => {
                    await delegationController.connect(holder1).getAndUpdateDelegatedAmount(holder1.address);

                    await punisher.slash(validatorId, 1);

                    (await delegationController.connect(holder1).callStatic.getAndUpdateDelegatedAmount(holder1.address)).toNumber()
                        .should.be.equal(delegatedAmount1 - 1);
                });

                it("should not consume extra gas for slashing calculation if holder has never delegated", async () => {
                    const amount = 100;
                    await skaleToken.mint(validator.address, amount, "0x", "0x");
                    // make owner balance non zero to do not affect transfer costs
                    await skaleToken.mint(owner.address, 1, "0x", "0x");
                    let tx = await (await skaleToken.connect(validator).transfer(owner.address, 1)).wait();
                    const gasUsedBeforeSlashing = tx.gasUsed;
                    for (let i = 0; i < 10; ++i) {
                        await punisher.slash(validatorId, 1);
                    }
                    tx = await (await skaleToken.connect(validator).transfer(owner.address, 1)).wait();
                    tx.gasUsed.should.be.equal(gasUsedBeforeSlashing);
                });
            });
        });

        it("should be possible for N.O.D.E. foundation to spin up node immediately", async () => {
            await constantsHolder.setMSR(0);
            const validatorIndex = await validatorService.getValidatorId(validator.address);
            const signature = await getValidatorIdSignature(validatorIndex, bountyAddress);
            await validatorService.connect(validator).linkNodeAddress(bountyAddress.address, signature);
            await nodes.checkPossibilityCreatingNode(bountyAddress.address);
        });
    });
});
