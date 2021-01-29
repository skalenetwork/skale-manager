import { ConstantsHolderInstance,
    ContractManagerInstance,
    DelegationControllerInstance,
    DelegationPeriodManagerInstance,
    DistributorInstance,
    LockerMockContract,
    PunisherInstance,
    SkaleManagerMockContract,
    SkaleManagerMockInstance,
    SkaleTokenInstance,
    TokenStateInstance,
    ValidatorServiceInstance,
    NodesInstance,
    SlashingTableInstance} from "../../types/truffle-contracts";

const SkaleManagerMock: SkaleManagerMockContract = artifacts.require("./SkaleManagerMock");

import { currentTime, skipTime, skipTimeToDate } from "../tools/time";

import BigNumber from "bignumber.js";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { deployConstantsHolder } from "../tools/deploy/constantsHolder";
import { deployContractManager } from "../tools/deploy/contractManager";
import { deployDelegationController } from "../tools/deploy/delegation/delegationController";
import { deployDelegationPeriodManager } from "../tools/deploy/delegation/delegationPeriodManager";
import { deployDistributor } from "../tools/deploy/delegation/distributor";
import { deployPunisher } from "../tools/deploy/delegation/punisher";
import { deployTokenState } from "../tools/deploy/delegation/tokenState";
import { deployValidatorService } from "../tools/deploy/delegation/validatorService";
import { deploySkaleToken } from "../tools/deploy/skaleToken";
import { Delegation, State } from "../tools/types";
import { deployNodes } from "../tools/deploy/nodes";
import { deploySlashingTable } from "../tools/deploy/slashingTable";
import { deployTimeHelpersWithDebug } from "../tools/deploy/test/timeHelpersWithDebug";
import { deploySkaleManager } from "../tools/deploy/skaleManager";

chai.should();
chai.use(chaiAsPromised);

const allowedDelegationPeriods = [2, 6, 12];

contract("Delegation", ([owner,
                         holder1,
                         holder2,
                         holder3,
                         validator,
                         bountyAddress]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let delegationController: DelegationControllerInstance;
    let delegationPeriodManager: DelegationPeriodManagerInstance;
    let skaleManagerMock: SkaleManagerMockInstance;
    let validatorService: ValidatorServiceInstance;
    let constantsHolder: ConstantsHolderInstance;
    let tokenState: TokenStateInstance;
    let distributor: DistributorInstance;
    let punisher: PunisherInstance;
    let nodes: NodesInstance;

    const defaultAmount = 100 * 1e18;
    const month = 60 * 60 * 24 * 31;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        skaleManagerMock = await SkaleManagerMock.new(contractManager.address);
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
        await skipTimeToDate(web3, 10, 10);
    });

    it("should allow owner to remove locker", async () => {
        const LockerMock: LockerMockContract = artifacts.require("./LockerMock");
        const lockerMock = await LockerMock.new();
        await contractManager.setContractsAddress("D2", lockerMock.address);

        await tokenState.addLocker("D2", {from: validator})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await tokenState.addLocker("D2");
        // TODO: consider on transfer optimization. Locker are turned of for non delegated wallets
        // (await tokenState.getAndUpdateLockedAmount.call(owner)).toNumber().should.be.equal(13);
        await tokenState.removeLocker("D2", {from: validator})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await tokenState.removeLocker("D2");
        (await tokenState.getAndUpdateLockedAmount.call(owner)).toNumber().should.be.equal(0);
    });

    it("should allow owner to set new delegation period", async () => {
        await delegationPeriodManager.setDelegationPeriod(13, 13, {from: validator})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await delegationPeriodManager.setDelegationPeriod(13, 13);
        (await delegationPeriodManager.stakeMultipliers(13)).toNumber()
            .should.be.equal(13);
    });

    describe("when holders have tokens and validator is registered", async () => {
        let validatorId: number;
        beforeEach(async () => {
            validatorId = 1;
            await skaleToken.mint(holder1, defaultAmount.toString(), "0x", "0x");
            await skaleToken.mint(holder2, defaultAmount.toString(), "0x", "0x");
            await skaleToken.mint(holder3, defaultAmount.toString(), "0x", "0x");
            await validatorService.registerValidator(
                "First validator", "Super-pooper validator", 150, 0, {from: validator});
            await validatorService.enableValidator(validatorId, {from: owner});
            await delegationPeriodManager.setDelegationPeriod(12, 200);
            await delegationPeriodManager.setDelegationPeriod(6, 150);
        });

        for (let delegationPeriod = 1; delegationPeriod <= 18; ++delegationPeriod) {
            it("should check " + delegationPeriod + " month" + (delegationPeriod > 1 ? "s" : "")
                + " delegation period availability", async () => {
                await delegationPeriodManager.isDelegationPeriodAllowed(delegationPeriod)
                    .should.be.eventually.equal(allowedDelegationPeriods.includes(delegationPeriod));
            });

            if (allowedDelegationPeriods.includes(delegationPeriod)) {
                describe("when delegation period is " + delegationPeriod + " months", async () => {
                    let requestId: number;

                    it("should send request for delegation", async () => {
                        const { logs } = await delegationController.delegate(
                            validatorId, defaultAmount.toString(), delegationPeriod, "D2 is even", {from: holder1});
                        assert.equal(logs.length, 1, "No DelegationRequestIsSent Event emitted");
                        assert.equal(logs[0].event, "DelegationProposed");
                        requestId = logs[0].args.delegationId;

                        const delegation: Delegation = new Delegation(
                            await delegationController.delegations(requestId));
                        assert.equal(holder1, delegation.holder);
                        assert.equal(validatorId, delegation.validatorId.toNumber());
                        assert.equal(delegationPeriod, delegation.delegationPeriod.toNumber());
                        assert.equal("D2 is even", delegation.info);
                    });

                    describe("when delegation request is sent", async () => {

                        beforeEach(async () => {
                            const { logs } = await delegationController.delegate(
                        validatorId, defaultAmount.toString(), delegationPeriod, "D2 is even", {from: holder1});
                            assert.equal(logs.length, 1, "No DelegationRequest Event emitted");
                            assert.equal(logs[0].event, "DelegationProposed");
                            requestId = logs[0].args.delegationId;
                        });

                        it("should not allow to burn locked tokens", async () => {
                            await skaleToken.burn(1, "0x", {from: holder1})
                                .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                        });

                        it("should not allow holder to spend tokens", async () => {
                            await skaleToken.transfer(holder2, 1, {from: holder1})
                                .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                            await skaleToken.approve(holder2, 1, {from: holder1});
                            await skaleToken.transferFrom(holder1, holder2, 1, {from: holder2})
                                .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                            await skaleToken.send(holder2, 1, "0x", {from: holder1})
                                .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                        });

                        it("should allow holder to receive tokens", async () => {
                            await skaleToken.transfer(holder1, 1, {from: holder2});
                            const balance = (await skaleToken.balanceOf(holder1)).toString();
                            balance.should.be.equal("100000000000000000001");
                        });

                        it("should accept delegation request", async () => {
                            await delegationController.acceptPendingDelegation(requestId, {from: validator});
                        });

                        it("should unlock token if validator does not accept delegation request", async () => {
                            await skipTimeToDate(web3, 1, 11);

                            await skaleToken.transfer(holder2, 1, {from: holder1});
                            await skaleToken.approve(holder2, 1, {from: holder1});
                            await skaleToken.transferFrom(holder1, holder2, 1, {from: holder2});
                            await skaleToken.send(holder2, 1, "0x", {from: holder1});

                            const balance = new BigNumber((await skaleToken.balanceOf(holder1)).toString());
                            const correctBalance = (new BigNumber(defaultAmount)).minus(3);

                            balance.should.be.deep.equal(correctBalance);
                        });

                        describe("when delegation request is accepted", async () => {
                            beforeEach(async () => {
                                await delegationController.acceptPendingDelegation(requestId, {from: validator});
                            });

                            it("should extend delegation period if undelegation request was not sent",
                                async () => {
                                    await skipTimeToDate(web3, 1, (11 + delegationPeriod) % 12);

                                    await skaleToken.transfer(holder2, 1, {from: holder1})
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                                    await skaleToken.approve(holder2, 1, {from: holder1});
                                    await skaleToken.transferFrom(holder1, holder2, 1, {from: holder2})
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                                    await skaleToken.send(holder2, 1, "0x", {from: holder1})
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");

                                    await delegationController.requestUndelegation(requestId, {from: holder1});

                                    await skipTimeToDate(web3, 27, (11 + delegationPeriod + delegationPeriod - 1) % 12);

                                    await skaleToken.transfer(holder2, 1, {from: holder1})
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");

                                    await skaleToken.approve(holder2, 1, {from: holder1});
                                    await skaleToken.transferFrom(holder1, holder2, 1, {from: holder2})
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                                    await skaleToken.send(holder2, 1, "0x", {from: holder1})
                                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");

                                    await skipTimeToDate(web3, 1, (11 + delegationPeriod + delegationPeriod) % 12);

                                    await skaleToken.transfer(holder2, 1, {from: holder1});
                                    await skaleToken.approve(holder2, 1, {from: holder1});
                                    await skaleToken.transferFrom(holder1, holder2, 1, {from: holder2});
                                    await skaleToken.send(holder2, 1, "0x", {from: holder1});

                                    (await skaleToken.balanceOf(holder1)).toString().should.be.equal("99999999999999999997");
                            });
                        });
                    });
                });
            } else {
                it("should not allow to send delegation request for " + delegationPeriod +
                    " month" + (delegationPeriod > 1 ? "s" : "" ), async () => {
                    await delegationController.delegate(validatorId, defaultAmount.toString(), delegationPeriod,
                        "D2 is even", {from: holder1})
                        .should.be.eventually.rejectedWith("This delegation period is not allowed");
                });
            }
        }

        it("should not allow holder to delegate to unregistered validator", async () => {
            await delegationController.delegate(13, 1,  2, "D2 is even", {from: holder1})
                .should.be.eventually.rejectedWith("Validator with such ID does not exist");
        });

        it("should calculate bond amount if validator delegated to itself", async () => {
            await skaleToken.mint(validator, defaultAmount.toString(), "0x", "0x");
            await delegationController.delegate(
                validatorId, defaultAmount.toString(), 2, "D2 is even", {from: validator});
            await delegationController.delegate(
                validatorId, defaultAmount.toString(), 2, "D2 is even", {from: holder1});
            await delegationController.acceptPendingDelegation(0, {from: validator});
            await delegationController.acceptPendingDelegation(1, {from: validator});

            skipTime(web3, month);

            const bondAmount = await validatorService.getAndUpdateBondAmount.call(validatorId);
            assert.equal(defaultAmount.toString(), bondAmount.toString());
        });

        it("should calculate bond amount if validator delegated to itself using different periods", async () => {
            await skaleToken.mint(validator, defaultAmount.toString(), "0x", "0x");
            await delegationController.delegate(
                validatorId, 5, 2, "D2 is even", {from: validator});
            await delegationController.delegate(
                validatorId, 13, 12, "D2 is even", {from: validator});
            await delegationController.acceptPendingDelegation(0, {from: validator});
            await delegationController.acceptPendingDelegation(1, {from: validator});

            skipTime(web3, month);

            const bondAmount = await validatorService.getAndUpdateBondAmount.call(validatorId);
            assert.equal(18, bondAmount.toNumber());
        });

        it("should bond equals zero for validator if she delegated to another validator", async () =>{
            const validator1 = validator;
            const validator2 = holder1;
            const validator1Id = 1;
            const validator2Id = 2;
            await validatorService.registerValidator(
                "Second validator", "Super-pooper validator", 150, 0, {from: validator2});
            await validatorService.enableValidator(validator2Id, {from: owner});
            await delegationController.delegate(
                validator1Id, 200, 2, "D2 is even", {from: validator2});
            await delegationController.delegate(
                validator2Id, 200, 2, "D2 is even", {from: validator2});
            await delegationController.acceptPendingDelegation(0, {from: validator1});
            await delegationController.acceptPendingDelegation(1, {from: validator2});
            skipTime(web3, month);

            const bondAmount1 = await validatorService.getAndUpdateBondAmount.call(validator1Id);
            let bondAmount2 = await validatorService.getAndUpdateBondAmount.call(validator2Id);
            assert.equal(bondAmount1.toNumber(), 0);
            assert.equal(bondAmount2.toNumber(), 200);
            await delegationController.delegate(
                validator2Id, 200, 2, "D2 is even", {from: validator2});
            await delegationController.acceptPendingDelegation(2, {from: validator2});

            skipTime(web3, month);
            bondAmount2 = await validatorService.getAndUpdateBondAmount.call(validator2Id);
            assert.equal(bondAmount2.toNumber(), 400);
        });

        it("should not pay bounty for slashed tokens", async () => {
            const ten18 = web3.utils.toBN(10).pow(web3.utils.toBN(18));
            const timeHelpersWithDebug = await deployTimeHelpersWithDebug(contractManager);
            await contractManager.setContractsAddress("TimeHelpers", timeHelpersWithDebug.address);
            await skaleToken.mint(holder1, ten18.muln(10000).toString(10), "0x", "0x");
            await skaleToken.mint(holder2, ten18.muln(10000).toString(10), "0x", "0x");

            await constantsHolder.setMSR(ten18.muln(2000).toString(10));

            const slashingTable: SlashingTableInstance = await deploySlashingTable(contractManager);
            slashingTable.setPenalty("FailedDKG", ten18.muln(10000).toString(10));

            await constantsHolder.setLaunchTimestamp((await currentTime(web3)) - 4 * month);

            await delegationController.delegate(validatorId, ten18.muln(10000).toString(10), 2, "First delegation", {from: holder1});
            const delegationId1 = 0;
            await delegationController.acceptPendingDelegation(delegationId1, {from: validator});

            await timeHelpersWithDebug.skipTime(month);
            (await delegationController.getState(delegationId1)).toNumber().should.be.equal(State.DELEGATED);

            const bounty = ten18;
            for (let i = 0; i < 5; ++i) {
                skaleManagerMock.payBounty(validatorId, bounty.toString(10));
            }

            await timeHelpersWithDebug.skipTime(month);

            await distributor.withdrawBounty(validatorId, bountyAddress, {from: holder1});
            let balance = (await skaleToken.balanceOf(bountyAddress)).toString(10);
            balance.should.be.equal(bounty.muln(5).muln(85).divn(100).toString(10));
            await skaleToken.transfer(holder1, balance, {from: bountyAddress});

            await punisher.slash(validatorId, ten18.muln(10000).toString(10));

            (await skaleToken.getAndUpdateSlashedAmount.call(holder1)).toString(10)
                .should.be.equal(ten18.muln(10000).toString(10));
            (await skaleToken.getAndUpdateDelegatedAmount.call(holder1)).toString(10)
                .should.be.equal("0");

            await delegationController.delegate(validatorId, ten18.muln(10000).toString(10), 2, "Second delegation", {from: holder2});
            const delegationId2 = 1;
            await delegationController.acceptPendingDelegation(delegationId2, {from: validator});

            await timeHelpersWithDebug.skipTime(month);
            (await delegationController.getState(delegationId2)).toNumber().should.be.equal(State.DELEGATED);

            for (let i = 0; i < 5; ++i) {
                skaleManagerMock.payBounty(validatorId, bounty.toString(10));
            }

            await timeHelpersWithDebug.skipTime(month);

            await distributor.withdrawBounty(validatorId, bountyAddress, {from: holder1});
            balance = (await skaleToken.balanceOf(bountyAddress)).toString(10);
            balance.should.be.equal("0");
            await skaleToken.transfer(holder1, balance, {from: bountyAddress});

            await distributor.withdrawBounty(validatorId, bountyAddress, {from: holder2});
            balance = (await skaleToken.balanceOf(bountyAddress)).toString(10);
            balance.should.be.equal(bounty.muln(5).muln(85).divn(100).toString(10));
            await skaleToken.transfer(holder2, balance, {from: bountyAddress});
        });

        describe("when 3 holders delegated", async () => {
            const delegatedAmount1 = 2e6;
            const delegatedAmount2 = 3e6;
            const delegatedAmount3 = 5e6;
            beforeEach(async () => {
                delegationController.delegate(validatorId, delegatedAmount1, 12, "D2 is even", {from: holder1});
                delegationController.delegate(validatorId, delegatedAmount2, 6,
                    "D2 is even more even", {from: holder2});
                delegationController.delegate(validatorId, delegatedAmount3, 2, "D2 is the evenest", {from: holder3});

                await delegationController.acceptPendingDelegation(0, {from: validator});
                await delegationController.acceptPendingDelegation(1, {from: validator});
                await delegationController.acceptPendingDelegation(2, {from: validator});

                skipTime(web3, month);
            });

            it("should distribute funds sent to Distributor across delegators", async () => {
                await constantsHolder.setLaunchTimestamp(await currentTime(web3));

                await skaleManagerMock.payBounty(validatorId, 101);

                skipTime(web3, month);

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
                (await distributor.getEarnedFeeAmount.call(
                    {from: validator}))[0].toNumber().should.be.equal(15);
                (await distributor.getAndUpdateEarnedBountyAmount.call(
                    validatorId, {from: holder1}))[0].toNumber().should.be.equal(25);
                (await distributor.getAndUpdateEarnedBountyAmount.call(
                    validatorId, {from: holder2}))[0].toNumber().should.be.equal(28);
                (await distributor.getAndUpdateEarnedBountyAmount.call(
                    validatorId, {from: holder3}))[0].toNumber().should.be.equal(31);

                await distributor.withdrawFee(bountyAddress, {from: validator})
                    .should.be.eventually.rejectedWith("Fee is locked");
                await distributor.withdrawBounty(validatorId, bountyAddress, {from: holder1})
                    .should.be.eventually.rejectedWith("Bounty is locked");

                skipTime(web3, 3 * month);

                await distributor.withdrawFee(bountyAddress, {from: validator});
                (await distributor.getEarnedFeeAmount.call(
                    {from: validator}))[0].toNumber().should.be.equal(0);
                await distributor.withdrawFee(validator, {from: validator});
                (await distributor.getEarnedFeeAmount.call(
                    {from: validator}))[0].toNumber().should.be.equal(0);

                (await skaleToken.balanceOf(bountyAddress)).toNumber().should.be.equal(15);

                await distributor.withdrawBounty(validatorId, bountyAddress, {from: holder1});
                (await distributor.getAndUpdateEarnedBountyAmount.call(
                    validatorId, {from: holder1}))[0].toNumber().should.be.equal(0);
                await distributor.withdrawBounty(validatorId, holder2, {from: holder2});
                (await distributor.getAndUpdateEarnedBountyAmount.call(
                    validatorId, {from: holder2}))[0].toNumber().should.be.equal(0);

                (await skaleToken.balanceOf(bountyAddress)).toNumber().should.be.equal(15 + 25);

                const balance = (await skaleToken.balanceOf(holder2)).toString();
                balance.should.be.equal((new BigNumber(defaultAmount)).plus(28).toString());
            });

            describe("Slashing", async () => {

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

                    (await tokenState.getAndUpdateLockedAmount.call(holder1)).toNumber()
                        .should.be.equal(delegatedAmount1);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder1)).toNumber().should.be.equal(delegatedAmount1 - 1 * slashesNumber);

                    (await tokenState.getAndUpdateLockedAmount.call(holder2)).toNumber()
                        .should.be.equal(delegatedAmount2);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder2)).toNumber().should.be.equal(delegatedAmount2 - 2 * slashesNumber);

                    (await tokenState.getAndUpdateLockedAmount.call(holder3)).toNumber()
                        .should.be.equal(delegatedAmount3);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder3)).toNumber().should.be.equal(delegatedAmount3 - 3 * slashesNumber);
                });

                it("should not lock more tokens than were delegated", async () => {
                    await punisher.slash(validatorId, 10 * (delegatedAmount1 + delegatedAmount2 + delegatedAmount3));

                    (await tokenState.getAndUpdateLockedAmount.call(holder1)).toNumber()
                        .should.be.equal(delegatedAmount1);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder1)).toNumber().should.be.equal(0);

                    (await tokenState.getAndUpdateLockedAmount.call(holder2)).toNumber()
                        .should.be.equal(delegatedAmount2);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder2)).toNumber().should.be.equal(0);

                    (await tokenState.getAndUpdateLockedAmount.call(holder3)).toNumber()
                        .should.be.equal(delegatedAmount3);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder3)).toNumber().should.be.equal(0);
                });

                it("should allow to return slashed tokens back", async () => {
                    await punisher.slash(validatorId, 10);

                    (await tokenState.getAndUpdateLockedAmount.call(holder3)).toNumber()
                        .should.be.equal(delegatedAmount3);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder3)).toNumber().should.be.equal(delegatedAmount3 - 5);

                    await delegationController.processAllSlashes(holder3);
                    await punisher.forgive(holder3, 3);

                    (await tokenState.getAndUpdateLockedAmount.call(holder3)).toNumber()
                        .should.be.equal(delegatedAmount3 - 3);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder3)).toNumber().should.be.equal(delegatedAmount3 - 5);
                });

                it("should allow only ADMIN to return slashed tokens", async() => {
                    const skaleManager = await deploySkaleManager(contractManager);

                    await punisher.slash(validatorId, 10);
                    await delegationController.processAllSlashes(holder3);

                    await punisher.forgive(holder3, 3, {from: holder1})
                        .should.be.eventually.rejectedWith("Caller is not an admin");
                    skaleManager.grantRole(await skaleManager.ADMIN_ROLE(), holder1);
                    await punisher.forgive(holder3, 3, {from: holder1});
                });

                it("should not pay bounty for slashed tokens", async () => {
                    // slash everything
                    await punisher.slash(validatorId, delegatedAmount1 + delegatedAmount2 + delegatedAmount3);

                    delegationController.delegate(validatorId, 1e7, 2, "D2 is the evenest", {from: holder1});
                    const delegationId = 3;
                    await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                    skipTime(web3, month);

                    // now only holder1 has delegated and not slashed tokens

                    await skaleManagerMock.payBounty(validatorId, 100);

                    skipTime(web3, month);

                    (await distributor.getEarnedFeeAmount.call(
                        {from: validator}))[0].toNumber().should.be.equal(15);
                    (await distributor.getAndUpdateEarnedBountyAmount.call(
                        validatorId, {from: holder1}))[0].toNumber().should.be.equal(85);
                    (await distributor.getAndUpdateEarnedBountyAmount.call(
                        validatorId, {from: holder2}))[0].toNumber().should.be.equal(0);
                    (await distributor.getAndUpdateEarnedBountyAmount.call(
                        validatorId, {from: holder3}))[0].toNumber().should.be.equal(0);
                });

                it("should reduce delegated amount immediately after slashing", async () => {
                    await delegationController.getAndUpdateDelegatedAmount(holder1, {from: holder1});

                    await punisher.slash(validatorId, 1);

                    (await delegationController.getAndUpdateDelegatedAmount.call(holder1, {from: holder1})).toNumber()
                        .should.be.equal(delegatedAmount1 - 1);
                });

                it("should not consume extra gas for slashing calculation if holder has never delegated", async () => {
                    const amount = 100;
                    await skaleToken.mint(validator, amount, "0x", "0x");
                    // make owner balance non zero to do not affect transfer costs
                    await skaleToken.mint(owner, 1, "0x", "0x");
                    let tx = await skaleToken.transfer(owner, 1, {from: validator});
                    const gasUsedBeforeSlashing = tx.receipt.gasUsed;
                    for (let i = 0; i < 10; ++i) {
                        await punisher.slash(validatorId, 1);
                    }
                    tx = await skaleToken.transfer(owner, 1, {from: validator});
                    tx.receipt.gasUsed.should.be.equal(gasUsedBeforeSlashing);
                });
            });
        });

        it("should be possible for N.O.D.E. foundation to spin up node immediately", async () => {
            await constantsHolder.setMSR(0);
            const validatorIndex = await validatorService.getValidatorId(validator);
            let signature = await web3.eth.sign(web3.utils.soliditySha3(validatorIndex.toString()), bountyAddress);
            signature = (signature.slice(130) === "00" ? signature.slice(0, 130) + "1b" :
                (signature.slice(130) === "01" ? signature.slice(0, 130) + "1c" : signature));
            await validatorService.linkNodeAddress(bountyAddress, signature, {from: validator});
            await nodes.checkPossibilityCreatingNode(bountyAddress);
        });

        it("should check limit of validators", async () => {
            const validatorsAmount = 20;
            const validators = [];
            for (let i = 0; i < validatorsAmount; ++i) {
                validators.push(web3.eth.accounts.create());
            }
            const etherAmount = 5 * 1e18;

            const web3ValidatorService = new web3.eth.Contract(
                artifacts.require("./ValidatorService").abi,
                validatorService.address);
            const web3DelegationController = new web3.eth.Contract(
                artifacts.require("./DelegationController").abi,
                delegationController.address);
            let newValidatorId = 2;
            for (const newValidator of validators) {
                await web3.eth.sendTransaction({from: holder1, to: newValidator.address, value: etherAmount});

                const callData = web3ValidatorService.methods.registerValidator("Validator", "Good Validator", 150, 0).encodeABI();

                const registerTX = {
                    data: callData,
                    from: newValidator.address,
                    gas: 1e6,
                    to: validatorService.address,
                };

                const signedRegisterTx = await newValidator.signTransaction(registerTX);
                await web3.eth.sendSignedTransaction(signedRegisterTx.rawTransaction);
                await validatorService.enableValidator(newValidatorId, {from: owner});
                newValidatorId++;
            }

            let delegationId = 0;
            for (let i = 2; i < 22; i++) {
                await delegationController.delegate(i, 100, 2, "OK delegation", {from: holder1});
                const callData = web3DelegationController.methods.acceptPendingDelegation(delegationId++).encodeABI();
                const AcceptTX = {
                    data: callData,
                    from: validators[i - 2].address,
                    gas: 1e6,
                    to: delegationController.address,
                };

                const signedAcceptTX = await validators[i - 2].signTransaction(AcceptTX);
                await web3.eth.sendSignedTransaction(signedAcceptTX.rawTransaction);
            }

            // could send delegation request to already delegated validator
            await delegationController.delegate(2, 100, 2, "OK delegation", {from: holder1});

            // console.log("Delegated to 2");

            // could not send delegation request to new validator
            await delegationController.delegate(1, 100, 2, "OK delegation", {from: holder1})
                .should.be.eventually.rejectedWith("Limit of validators is reached");

            // console.log("Not delegated to 1");

            // still could send delegation request to already delegated validator
            await delegationController.delegate(2, 100, 2, "OK delegation", {from: holder1});

            // console.log("Delegated to 2");

            skipTime(web3, 60 * 60 * 24 * 31);
            // could send undelegation request from 1 delegationId (3 validatorId)
            await delegationController.requestUndelegation(1, {from: holder1});

            // console.log("Request undelegation from 3");

            // still could send delegation request to already delegated validator
            await delegationController.delegate(2, 100, 2, "OK delegation", {from: holder1});

            // console.log("Delegated to 2");

            // could send delegation request to new validator
            await delegationController.delegate(1, 100, 2, "OK delegation", {from: holder1});
            await delegationController.acceptPendingDelegation(23, {from: validator});

            // console.log("Delegated to 1");

            // could not send delegation request to previously delegated validator
            await delegationController.delegate(3, 100, 2, "OK delegation", {from: holder1})
                .should.be.eventually.rejectedWith("Limit of validators is reached");

            // console.log("Not delegated to 3");
        });

        it("should check limit of validators when delegations was not accepted", async () => {
            const validatorsAmount = 20;
            const validators = [];
            for (let i = 0; i < validatorsAmount; ++i) {
                validators.push(web3.eth.accounts.create());
            }
            const etherAmount = 5 * 1e18;

            const web3ValidatorService = new web3.eth.Contract(
                artifacts.require("./ValidatorService").abi,
                validatorService.address);
            const web3DelegationController = new web3.eth.Contract(
                artifacts.require("./DelegationController").abi,
                delegationController.address);
            let newValidatorId = 2;
            for (const newValidator of validators) {
                await web3.eth.sendTransaction({from: holder1, to: newValidator.address, value: etherAmount});

                const callData = web3ValidatorService.methods.registerValidator("Validator", "Good Validator", 150, 0).encodeABI();

                const registerTX = {
                    data: callData,
                    from: newValidator.address,
                    gas: 1e6,
                    to: validatorService.address,
                };

                const signedRegisterTx = await newValidator.signTransaction(registerTX);
                await web3.eth.sendSignedTransaction(signedRegisterTx.rawTransaction);
                await validatorService.enableValidator(newValidatorId, {from: owner});
                newValidatorId++;
            }

            for (let i = 1; i < 22; i++) {
                await delegationController.delegate(i, 100, 2, "OK delegation", {from: holder1});
            }

            let delegationId = 1;
            for (let i = 2; i < 22; i++) {
                const callData = web3DelegationController.methods.acceptPendingDelegation(delegationId++).encodeABI();
                const AcceptTX = {
                    data: callData,
                    from: validators[i - 2].address,
                    gas: 1e6,
                    to: delegationController.address,
                };

                const signedAcceptTX = await validators[i - 2].signTransaction(AcceptTX);
                await web3.eth.sendSignedTransaction(signedAcceptTX.rawTransaction);
            }

            await delegationController.acceptPendingDelegation(0, {from: validator})
                .should.be.eventually.rejectedWith("Limit of validators is reached");

            // could send delegation request to already delegated validator
            await delegationController.delegate(2, 100, 2, "OK delegation", {from: holder1});

            // console.log("Delegated to 2");

            // could not send delegation request to new validator
            await delegationController.delegate(1, 100, 2, "OK delegation", {from: holder1})
                .should.be.eventually.rejectedWith("Limit of validators is reached");

            // console.log("Not delegated to 1");

            // still could send delegation request to already delegated validator
            await delegationController.delegate(2, 100, 2, "OK delegation", {from: holder1});

            // console.log("Delegated to 2");

            skipTime(web3, 60 * 60 * 24 * 31);
            // could send undelegation request from 1 delegationId (2 validatorId)
            await delegationController.requestUndelegation(1, {from: holder1});

            // console.log("Request undelegation from 3");

            // still could send delegation request to already delegated validator
            await delegationController.delegate(2, 100, 2, "OK delegation", {from: holder1});

            // console.log("Delegated to 2");

            // could send delegation request to new validator
            const res = await delegationController.delegate(1, 100, 2, "OK delegation", {from: holder1});
            await delegationController.acceptPendingDelegation(24, {from: validator});

            // console.log("Delegated to 1");

            // could not send delegation request to previously delegated validator
            await delegationController.delegate(2, 100, 2, "OK delegation", {from: holder1})
                .should.be.eventually.rejectedWith("Limit of validators is reached");

            // console.log("Not delegated to 3");
        });

        it("should be possible to distribute bounty accross thousands of holders", async () => {
            let holdersAmount = 1000;
            if (process.env.CI) {
                console.log("Reduce holders amount to fit GitHub timelimit");
                holdersAmount = 10;
            }
            const delegatedAmount = 1e7;
            const holders = [];
            for (let i = 0; i < holdersAmount; ++i) {
                holders.push(web3.eth.accounts.create());
            }
            const etherAmount = 5 * 1e18;

            const web3DelegationController = new web3.eth.Contract(
                artifacts.require("./DelegationController").abi,
                delegationController.address);
            const web3Distributor = new web3.eth.Contract(
                artifacts.require("./Distributor").abi,
                distributor.address);

            await constantsHolder.setLaunchTimestamp(0);

            let delegationId = 0;
            for (const holder of holders) {
                await web3.eth.sendTransaction({from: holder1, to: holder.address, value: etherAmount});
                await skaleToken.mint(holder.address, delegatedAmount, "0x", "0x");

                const callData = web3DelegationController.methods.delegate(
                    validatorId, delegatedAmount, 2, "D2 is even").encodeABI();

                const delegateTx = {
                    data: callData,
                    from: holder.address,
                    gas: 1e6,
                    to: delegationController.address,
                };

                const signedDelegateTx = await holder.signTransaction(delegateTx);
                await web3.eth.sendSignedTransaction(signedDelegateTx.rawTransaction);

                await delegationController.acceptPendingDelegation(delegationId++, {from: validator});
            }

            skipTime(web3, month);

            const bounty = Math.floor(holdersAmount * delegatedAmount / 0.85);
            (bounty - Math.floor(bounty * 0.15)).should.be.equal(holdersAmount * delegatedAmount);
            await skaleManagerMock.payBounty(validatorId, bounty);

            skipTime(web3, month);

            for (const holder of holders) {
                const callData = web3Distributor.methods.withdrawBounty(
                    validatorId, holder.address).encodeABI();

                const withdrawTx = {
                    data: callData,
                    from: holder.address,
                    gas: 1e6,
                    to: distributor.address,
                };

                const signedWithdrawTx = await holder.signTransaction(withdrawTx);
                await web3.eth.sendSignedTransaction(signedWithdrawTx.rawTransaction);

                (await skaleToken.balanceOf(holder.address)).toNumber().should.be.equal(delegatedAmount * 2);
                (await skaleToken.getAndUpdateDelegatedAmount.call(holder.address))
                    .toNumber().should.be.equal(delegatedAmount);

                const balance = Number.parseInt(await web3.eth.getBalance(holder.address), 10);
                const gas = 21 * 1e3;
                const gasPrice = 20 * 1e9;
                const sendTx = {
                    from: holder.address,
                    gas,
                    gasPrice,
                    to: holder1,
                    value: balance - gas * gasPrice,
                };
                const signedSendTx = await holder.signTransaction(sendTx);
                await web3.eth.sendSignedTransaction(signedSendTx.rawTransaction);
                await web3.eth.getBalance(holder.address).should.be.eventually.equal("0");
            }
        });

        // describe("when validator is registered", async () => {
        //     beforeEach(async () => {
        //         await validatorService.registerValidator(
        //             "First validator", "Super-pooper validator", 150, 0, {from: validator});
        //     });

        //     // MSR = $100
        //     // Bounty = $100 per month per node
        //     // Validator fee is 15%

        //     // Stake in time:
        //     // month       |11|12| 1| 2| 3| 4| 5| 6| 7| 8| 9|10|11|12| 1|
        //     // ----------------------------------------------------------
        //     // holder1 $97 |  |##|##|##|##|##|##|  |  |##|##|##|  |  |  |
        //     // holder2 $89 |  |  |##|##|##|##|##|##|##|##|##|##|##|##|  |
        //     // holder3 $83 |  |  |  |  |##|##|##|==|==|==|  |  |  |  |  |

        //     // month       |11|12| 1| 2| 3| 4| 5| 6| 7| 8| 9|10|11|12| 1|
        //     // ----------------------------------------------------------
        //     //             |  |  |  |  |##|##|##|  |  |##|  |  |  |  |  |
        //     // Nodes online|  |  |##|##|##|##|##|##|##|##|##|##|  |  |  |

        //     // bounty
        //     // month       |11|12| 1| 2| 3| 4| 5| 6| 7| 8| 9|10|11|12| 1|
        //     // ------------------------------------------------------------
        //     // holder 1    |  | 0|38|38|60|60|60|  |  |46|29|29|  |  |  |
        //     // holder 2    |  |  |46|46|74|74|74|57|57|84|55|55| 0| 0|  |
        //     // holder 3    |  |  |  |  |34|34|34|27|27|39|  |  |  |  |  |
        //     // validator   |  |  |15|15|30|30|30|15|15|30|15|15|  |  |  |

        //     it("should distribute bounty proportionally to delegation share and period coefficient", async () => {
        //         const holder1Balance = 97;
        //         const holder2Balance = 89;
        //         const holder3Balance = 83;

        //         await skaleToken.transfer(validator, (defaultAmount - holder1Balance).toString());
        //         await skaleToken.transfer(validator, (defaultAmount - holder2Balance)).toString();
        //         await skaleToken.transfer(validator, (defaultAmount - holder3Balance)).toString();

        //         await delegationService.setMinimumStakingRequirement(100);

        //         const validatorIds = await delegationService.getValidators.call();
        //         validatorIds.should.be.deep.equal([0]);

        //         let response = await delegationService.delegate(
        //             validatorId, holder1Balance, 6, "First holder", {from: holder1});
        //         const requestId1 = response.logs[0].args.id;
        //         await delegationService.accept(requestId1, {from: validator});

        //         await skipTimeToDate(web3, 28, 10);

        //         response = await delegationService.delegate(
        //             validatorId, holder2Balance, 12, "Second holder", {from: holder2});
        //         const requestId2 = response.logs[0].args.id;
        //         await delegationService.accept(requestId2, {from: validator});

        //         await skipTimeToDate(web3, 28, 11);

        //         await delegationService.createNode("4444", 0, "127.0.0.1", "127.0.0.1", {from: validator});

        //         await skipTimeToDate(web3, 1, 0);

        //         await delegationController.requestUndelegation(requestId1, {from: holder1});
        //         await delegationController.requestUndelegation(requestId2, {from: holder2});
        //         // get bounty
        //         await skipTimeToDate(web3, 1, 1);

        //         response = await delegationService.delegate(
        //             validatorId, holder3Balance, 3, "Third holder", {from: holder3});
        //         const requestId3 = response.logs[0].args.id;
        //         await delegationService.accept(requestId3, {from: validator});

        //         let bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(38);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(46);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(15);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //         // spin up second node

        //         await skipTimeToDate(web3, 27, 1);
        //         await delegationService.createNode("2222", 1, "127.0.0.2", "127.0.0.2", {from: validator});

        //         // get bounty for February

        //         await skipTimeToDate(web3, 1, 2);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(38);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(46);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(15);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //         // get bounty for March

        //         await skipTimeToDate(web3, 1, 3);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(60);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(74);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder3});
        //         bounty.should.be.equal(34);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder3});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(30);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //         // get bounty for April

        //         await skipTimeToDate(web3, 1, 4);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(60);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(74);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder3});
        //         bounty.should.be.equal(34);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder3});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(30);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //         // get bounty for May

        //         await skipTimeToDate(web3, 1, 5);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(60);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(74);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder3});
        //         bounty.should.be.equal(34);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder3});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(30);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //         // stop one node

        //         await delegationService.deleteNode(0, {from: validator});

        //         // get bounty for June

        //         await skipTimeToDate(web3, 1, 6);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(0);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(57);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder3});
        //         bounty.should.be.equal(27);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder3});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(15);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //         // manage delegation

        //         response = await delegationService.delegate(
        //             validatorId, holder1Balance, 3, "D2 is even", {from: holder1});
        //         const requestId = response.logs[0].args.id;
        //         await delegationService.accept(requestId, {from: validator});

        //         await delegationController.requestUndelegation(requestId, {from: holder3});

        //         // spin up node

        //         await skipTimeToDate(web3, 30, 6);
        //         await delegationService.createNode("3333", 2, "127.0.0.3", "127.0.0.3", {from: validator});

        //         // get bounty for July

        //         await skipTimeToDate(web3, 1, 7);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(0);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(57);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder3});
        //         bounty.should.be.equal(27);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder3});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(15);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //         // get bounty for August

        //         await skipTimeToDate(web3, 1, 8);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(46);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(84);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder3});
        //         bounty.should.be.equal(39);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder3});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(30);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //         await delegationService.deleteNode(1, {from: validator});

        //         // get bounty for September

        //         await skipTimeToDate(web3, 1, 9);

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
        //         bounty.should.be.equal(29);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder2});
        //         bounty.should.be.equal(55);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder2});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: holder3});
        //         bounty.should.be.equal(0);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder3});

        //         bounty = await delegationService.getEarnedBountyAmount.call({from: validator});
        //         bounty.should.be.equal(15);
        //         await delegationService.withdrawBounty(bountyAddress, bounty, {from: validator});

        //     });
        // });
    });
});