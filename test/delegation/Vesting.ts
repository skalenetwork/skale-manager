import { ContractManagerInstance,
    DelegationControllerInstance,
    SkaleTokenInstance,
    ValidatorServiceInstance,
    VestingInstance} from "../../types/truffle-contracts";

import { calculateLockedAmount } from "../tools/vestingCalculation";
import { currentTime, getTimeAtDate, skipTimeToDate } from "../tools/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../tools/deploy/contractManager";
import { deployDelegationController } from "../tools/deploy/delegation/delegationController";
import { deployValidatorService } from "../tools/deploy/delegation/validatorService";
import { deployVesting } from "../tools/deploy/delegation/vesting";
import { deploySkaleToken } from "../tools/deploy/skaleToken";
chai.should();
chai.use(chaiAsPromised);

contract("Vesting", ([owner, holder, holder1, holder2, holder3, hacker]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let validatorService: ValidatorServiceInstance;
    let Vesting: VestingInstance;
    let delegationController: DelegationControllerInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        skaleToken = await deploySkaleToken(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);
        Vesting = await deployVesting(contractManager);

        // each test will start from July 1
        await skipTimeToDate(web3, 1, 6);
        await skaleToken.mint(Vesting.address, 1e9, "0x", "0x");
    });

    it("should register SAFT investor", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
    });

    it("should get SAFT data", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        ((await Vesting.getStartVestingTime(holder)).toNumber()).should.be.equal(getTimeAtDate(1, 6, 2020));
        ((await Vesting.getLockupPeriodInMonth(holder)).toNumber()).should.be.equal(6);
        ((await Vesting.getLockupPeriodTimestamp(holder)).toNumber()).should.be.equal(getTimeAtDate(1, 0, 2021));
        (await Vesting.isCancelableVestingTerm(holder)).should.be.equal(false);
        console.log(getTimeAtDate(1, 6, 2023));
        ((await Vesting.getFinishVestingTime(holder)).toNumber()).should.be.equal(getTimeAtDate(1, 6, 2023));
    });

    it("should approve SAFT", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: holder});
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(true);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
    });

    it("should not approve SAFT from hacker", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: hacker}).should.be.eventually.rejectedWith("SAFT is not registered");
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
    });

    it("should not approve SAFT twice", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: holder});
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(true);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: holder}).should.be.eventually.rejectedWith("SAFT is already approved");
    });

    it("should not start vesting without approve SAFT", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.startVesting(holder, {from: owner}).should.be.eventually.rejectedWith("SAFT is not approved");
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
    });

    it("should not start vesting without registering SAFT", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.startVesting(holder, {from: owner}).should.be.eventually.rejectedWith("SAFT is not registered");
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
    });

    it("should start vesting with register & approve SAFT", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: holder});
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(true);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
        await Vesting.startVesting(holder, {from: owner});
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(true);
    });

    it("should stop cancelable vesting before start", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, true, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: holder});
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(true);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
        await Vesting.stopVesting(holder, {from: owner});
        await Vesting.startVesting(holder, {from: owner}).should.be.eventually.rejectedWith("SAFT is already canceled");
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
    });

    it("should stop cancelable vesting after start", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, true, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: holder});
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(true);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
        await Vesting.startVesting(holder, {from: owner});
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(true);
        await Vesting.stopVesting(holder, {from: owner});
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
        await Vesting.startVesting(holder, {from: owner}).should.be.eventually.rejectedWith("SAFT is already canceled");
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
    });

    it("should stop not-cancelable vesting before start", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: holder});
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(true);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
        await Vesting.stopVesting(holder, {from: owner});
        await Vesting.startVesting(holder, {from: owner}).should.be.eventually.rejectedWith("SAFT is already canceled");
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
    });

    it("should not stop not-cancelable vesting before start", async () => {
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(false);
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        (await Vesting.isSAFTRegistered(holder)).should.be.eq(true);
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(false);
        await Vesting.approveSAFTHolder({from: holder});
        (await Vesting.isApprovedSAFT(holder)).should.be.eq(true);
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(false);
        await Vesting.startVesting(holder, {from: owner});
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(true);
        await Vesting.stopVesting(holder, {from: owner}).should.be.eventually.rejectedWith("You could not stop vesting for holder");
        (await Vesting.isActiveVestingTerm(holder)).should.be.eq(true);
    });

    it("should not register seller if sender is not owner", async () => {
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: hacker}).should.be.eventually.rejectedWith("Ownable: caller is not the owner");
    });

    it("should not register already registered SAFT investor", async () => {
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner}).should.be.eventually.rejectedWith("SAFT holder is already added");
    });

    it("should not register seller if periods incorrect", async () => {
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 37, 36, 1e6, 1e5, 6, false, {from: owner}).should.be.eventually.rejectedWith("Incorrect periods");
    });

    it("should not register seller if amounts incorrect", async () => {
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e5, 1e6, 6, false, {from: owner}).should.be.eventually.rejectedWith("Incorrect amounts");
    });

    it("should not register seller if vesting times incorrect", async () => {
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 7, false, {from: owner}).should.be.eventually.rejectedWith("Incorrect vesting times");
    });

    it("should not register seller if period starts incorrect", async () => {
        const time = await currentTime(web3);
        const currentDate = new Date(time * 1000);
        const nextYear = currentDate.getFullYear() + 1;
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, nextYear), 6, 36, 1e6, 1e5, 6, false, {from: owner}).should.be.eventually.rejectedWith("Incorrect period starts");
    });

    it("should be possible to delegate SAFT tokens", async () => {
        await Vesting.addVestingTerm(holder, getTimeAtDate(1, 6, 2020), 6, 36, 1e6, 1e5, 6, false, {from: owner});
        await Vesting.approveSAFTHolder({from: holder});
        await Vesting.startVesting(holder, {from: owner});
        (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(1e6);
        await validatorService.registerValidator("Validator", "D2 is even", 150, 0, {from: owner});
        await validatorService.enableValidator(1, {from: owner});
        const amount = 15000;
        const delegationPeriod = 3;
        await delegationController.delegate(
            1, amount, delegationPeriod, "D2 is even", {from: holder});
        const delegationId = 0;
        await delegationController.acceptPendingDelegation(delegationId, {from: owner});
        (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(1e6);
    });

    it("should show all tokens if SAFT registered along time ago", async () => {
        const lockupPeriod = 6;
        const fullPeriod = 15;
        const fullAmount = 4e6;
        const lockupAmount = 1e6;
        const vestPeriod = 3;
        const startDate = getTimeAtDate(1, 9, 2018);
        const isCancelable = false;
        await Vesting.addVestingTerm(holder, startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod, isCancelable, {from: owner});
        await Vesting.approveSAFTHolder({from: holder});
        await Vesting.startVesting(holder, {from: owner});
        const lockedAmount = await Vesting.getLockedAmount(holder);
        lockedAmount.toNumber().should.be.equal(0);
    });

    it("should operate with fractional payments", async () => {
        const lockupPeriod = 1;
        const fullPeriod = 4;
        const fullAmount = 2e6;
        const lockupAmount = 1e6;
        const vestPeriod = 1;
        const startDate = await currentTime(web3);
        const isCancelable = false;
        await Vesting.addVestingTerm(holder, startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod, isCancelable, {from: owner});
        await Vesting.approveSAFTHolder({from: holder});
        await Vesting.startVesting(holder, {from: owner});
        let lockedAmount = await Vesting.getLockedAmount(holder);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 7);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedAmount.toNumber().should.be.equal(fullAmount - lockupAmount);
        await skipTimeToDate(web3, 1, 8);
        lockedAmount = await Vesting.getLockedAmount(holder);
        let lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(Math.round(fullAmount - lockupAmount - (fullAmount - lockupAmount) / ((fullPeriod - lockupPeriod) / vestPeriod)));
        await skipTimeToDate(web3, 1, 9);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - lockupAmount - Math.trunc(2 * (fullAmount - lockupAmount) / ((fullPeriod - lockupPeriod) / vestPeriod)));
        await skipTimeToDate(web3, 1, 10);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(0);
    });

    it("should correctly operate SAFT 4: one time payment", async () => {
        const lockupPeriod = 10;
        const fullPeriod = 10;
        const fullAmount = 2e6;
        const lockupAmount = 2e6;
        const vestPeriod = 0;
        const startDate = await currentTime(web3);
        const isCancelable = false;
        await Vesting.addVestingTerm(holder, startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod, isCancelable, {from: owner});
        await Vesting.approveSAFTHolder({from: holder});
        await Vesting.startVesting(holder, {from: owner});
        let lockedAmount = await Vesting.getLockedAmount(holder);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 7);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 8);
        lockedAmount = await Vesting.getLockedAmount(holder);
        let lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 9);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 10);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 11);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 12);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 1);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 2);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 3);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 4);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(0);
    });

    it("should correctly operate SAFT 5: each month payment", async () => {
        const lockupPeriod = 1;
        const fullPeriod = 10;
        const fullAmount = 2e6;
        const lockupAmount = 2e5;
        const vestPeriod = 1;
        const startDate = await currentTime(web3);
        const isCancelable = false;
        await Vesting.addVestingTerm(holder, startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod, isCancelable, {from: owner});
        await Vesting.approveSAFTHolder({from: holder});
        await Vesting.startVesting(holder, {from: owner});
        let lockedAmount = await Vesting.getLockedAmount(holder);
        lockedAmount.toNumber().should.be.equal(fullAmount);
        await skipTimeToDate(web3, 1, 7);
        lockedAmount = await Vesting.getLockedAmount(holder);
        let lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(fullAmount - lockupAmount);
        await skipTimeToDate(web3, 1, 8);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 2 * lockupAmount);
        await skipTimeToDate(web3, 1, 9);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 3 * lockupAmount);
        await skipTimeToDate(web3, 1, 10);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 4 * lockupAmount);
        await skipTimeToDate(web3, 1, 11);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 5 * lockupAmount);
        await skipTimeToDate(web3, 1, 12);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 6 * lockupAmount);
        await skipTimeToDate(web3, 1, 1);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 7 * lockupAmount);
        await skipTimeToDate(web3, 1, 2);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 8 * lockupAmount);
        await skipTimeToDate(web3, 1, 3);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 9 * lockupAmount);
        await skipTimeToDate(web3, 1, 4);
        lockedAmount = await Vesting.getLockedAmount(holder);
        lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
        lockedAmount.toNumber().should.be.equal(fullAmount - 10 * lockupAmount);
        lockedAmount.toNumber().should.be.equal(0);
    });

    it("should correctly operate SAFT 6: only initial payment", async () => {
        const lockupPeriod = 0;
        const fullPeriod = 0;
        const fullAmount = 2e6;
        const lockupAmount = 2e6;
        const vestPeriod = 0;
        const startDate = await currentTime(web3);
        const isCancelable = false;
        await Vesting.addVestingTerm(holder, startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod, isCancelable, {from: owner});
        await Vesting.approveSAFTHolder({from: holder});
        await Vesting.startVesting(holder, {from: owner});
        const lockedAmount = await Vesting.getLockedAmount(holder);
        const lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
        lockedAmount.toNumber().should.be.equal(0);
    });

    describe("when SAFTs are registered at the past", async () => {
        const lockupPeriod = 6;
        const fullPeriod = 36;
        const fullAmount = 6e6;
        const lockupAmount = 1e6;
        const vestPeriod = 6;
        const isCancelable = false;

        let startDate: number;

        beforeEach(async () => {
            const time = await currentTime(web3);
            const currentDate = new Date(time * 1000);
            const previousYear = currentDate.getFullYear() - 1;
            startDate = getTimeAtDate(1, 9, previousYear)
            // SAFT example 0
            await Vesting.addVestingTerm(holder, startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod, isCancelable, {from: owner});
            await Vesting.approveSAFTHolder({from: holder});
            await Vesting.startVesting(holder, {from: owner});
        });

        it("should unlock tokens after lockup", async () => {
            const lockedAmount = await Vesting.getLockedAmount(holder);
            const lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            // SAFT 0 lockup amount unlocked
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(fullAmount - lockupAmount);
        });

        it("should be able to transfer token", async () => {
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(fullAmount);
            await skaleToken.transfer(holder1, "100", {from: holder});
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(fullAmount - 100);
            (await skaleToken.balanceOf(holder1)).toNumber().should.be.equal(100);
        });

        it("should not be able to transfer more than unlocked", async () => {
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(fullAmount);
            await skaleToken.transfer(holder1, "1000001", {from: holder}).should.be.eventually.rejectedWith("Token should be unlocked for transferring");;
        });

        it("should unlock tokens first part after lockup", async () => {
            await skipTimeToDate(web3, 1, 9)
            const lockedAmount = await Vesting.getLockedAmount(holder);
            const lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.lessThan(fullAmount - lockupAmount);
        });
    });

    describe("when All SAFTs are registered", async () => {
        const lockupPeriod = 6;
        const fullPeriod = 36;
        const fullAmount = 6e6;
        const lockupAmount = 1e6;
        const vestPeriod = 6;
        const isCancelable = false;

        const lockupPeriod1 = 12;
        const fullPeriod1 = 15;
        const fullAmount1 = 1e6;
        const lockupAmount1 = 5e5;
        const vestPeriod1 = 3;
        const isCancelable1 = false;

        const lockupPeriod2 = 9;
        const fullPeriod2 = 15;
        const fullAmount2 = 1e6;
        const lockupAmount2 = 5e5;
        const vestPeriod2 = 6;
        const isCancelable2 = false;

        const lockupPeriod3 = 12;
        const fullPeriod3 = 36;
        const fullAmount3 = 36e6;
        const lockupAmount3 = 12e6;
        const vestPeriod3 = 1;
        const isCancelable3 = false;

        let startDate: number;

        beforeEach(async () => {
            startDate = await currentTime(web3);
            // SAFT example 0
            await Vesting.addVestingTerm(holder, startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod, isCancelable, {from: owner});
            await Vesting.approveSAFTHolder({from: holder});
            await Vesting.startVesting(holder, {from: owner});
            // SAFT example 1
            await Vesting.addVestingTerm(holder1, startDate, lockupPeriod1, fullPeriod1, fullAmount1, lockupAmount1, vestPeriod1, isCancelable1, {from: owner});
            await Vesting.approveSAFTHolder({from: holder1});
            await Vesting.startVesting(holder1, {from: owner});
            // SAFT example 2
            await Vesting.addVestingTerm(holder2, startDate, lockupPeriod2, fullPeriod2, fullAmount2, lockupAmount2, vestPeriod2, isCancelable2, {from: owner});
            await Vesting.approveSAFTHolder({from: holder2});
            await Vesting.startVesting(holder2, {from: owner});
            // SAFT example 3
            await Vesting.addVestingTerm(holder3, startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3, isCancelable3, {from: owner});
            await Vesting.approveSAFTHolder({from: holder3});
            await Vesting.startVesting(holder3, {from: owner});
        });

        it("should show balance of all SAFTs", async () => {
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(fullAmount);
            (await skaleToken.balanceOf(holder1)).toNumber().should.be.equal(fullAmount1);
            (await skaleToken.balanceOf(holder2)).toNumber().should.be.equal(fullAmount2);
            (await skaleToken.balanceOf(holder3)).toNumber().should.be.equal(fullAmount3);
        });

        it("should not transferable of SAFT 0", async () => {
            await skaleToken.transfer(hacker, "100", {from: holder}).should.be.eventually.rejectedWith("Token should be unlocked for transferring");
            await skaleToken.transfer(hacker, "100", {from: holder1}).should.be.eventually.rejectedWith("Token should be unlocked for transferring");
            await skaleToken.transfer(hacker, "100", {from: holder2}).should.be.eventually.rejectedWith("Token should be unlocked for transferring");
            await skaleToken.transfer(hacker, "100", {from: holder3}).should.be.eventually.rejectedWith("Token should be unlocked for transferring");
        });

        it("All tokens should be locked of all SAFTs", async () => {
            const lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            let lockedAmount = await Vesting.getLockedAmount(holder);
            lockedAmount.toNumber().should.be.equal(fullAmount);

            lockedAmount = await Vesting.getLockedAmount(holder1);
            lockedAmount.toNumber().should.be.equal(fullAmount1);

            lockedAmount = await Vesting.getLockedAmount(holder2);
            lockedAmount.toNumber().should.be.equal(fullAmount2);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            lockedAmount.toNumber().should.be.equal(fullAmount3);
        });

        it("After 6 month", async () => {
            await skipTimeToDate(web3, 1, 12);

            let lockedAmount = await Vesting.getLockedAmount(holder);
            const lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            // SAFT 0 lockup amount unlocked
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(fullAmount - lockupAmount);

            lockedAmount = await Vesting.getLockedAmount(holder1);
            lockedAmount.toNumber().should.be.equal(fullAmount1);

            lockedAmount = await Vesting.getLockedAmount(holder2);
            lockedAmount.toNumber().should.be.equal(fullAmount2);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            lockedAmount.toNumber().should.be.equal(fullAmount3);
        });

        it("After 9 month", async () => {
            await skipTimeToDate(web3, 1, 3);
            let lockedAmount = await Vesting.getLockedAmount(holder);
            let lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            // SAFT 0 only lockup amount unlocked
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(fullAmount - lockupAmount);

            lockedAmount = await Vesting.getLockedAmount(holder1);
            lockedAmount.toNumber().should.be.equal(fullAmount1);

            // SAFT 2 lockup amount unlocked
            lockedAmount = await Vesting.getLockedAmount(holder2);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod2, fullPeriod2, fullAmount2, lockupAmount2, vestPeriod2);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(fullAmount2 - lockupAmount2);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            lockedAmount.toNumber().should.be.equal(fullAmount3);
        });

        it("After 12 month", async () => {
            await skipTimeToDate(web3, 1, 12);
            await skipTimeToDate(web3, 1, 6);

            let lockedAmount = await Vesting.getLockedAmount(holder);
            let lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.lessThan(fullAmount - lockupAmount);

            // SAFT 1 lockup amount unlocked
            lockedAmount = await Vesting.getLockedAmount(holder1);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod1, fullPeriod1, fullAmount1, lockupAmount1, vestPeriod1);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(fullAmount1 - lockupAmount1);

            // SAFT 2 lockup amount unlocked
            lockedAmount = await Vesting.getLockedAmount(holder2);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod2, fullPeriod2, fullAmount2, lockupAmount2, vestPeriod2);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(fullAmount2 - lockupAmount2);

            // SAFT 3 lockup amount unlocked
            lockedAmount = await Vesting.getLockedAmount(holder3);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(fullAmount3 - lockupAmount3);
        });

        it("should be possible to send tokens", async () => {
            await skipTimeToDate(web3, 1, 12);
            await skipTimeToDate(web3, 1, 6);
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(fullAmount);
            (await skaleToken.balanceOf(holder1)).toNumber().should.be.equal(fullAmount1);
            (await skaleToken.balanceOf(holder2)).toNumber().should.be.equal(fullAmount2);
            (await skaleToken.balanceOf(holder3)).toNumber().should.be.equal(fullAmount3);
            await skaleToken.transfer(hacker, "100", {from: holder});
            await skaleToken.transfer(hacker, "100", {from: holder1});
            await skaleToken.transfer(hacker, "100", {from: holder2});
            await skaleToken.transfer(hacker, "100", {from: holder3});
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(fullAmount - 100);
            (await skaleToken.balanceOf(holder1)).toNumber().should.be.equal(fullAmount1 - 100);
            (await skaleToken.balanceOf(holder2)).toNumber().should.be.equal(fullAmount2 - 100);
            (await skaleToken.balanceOf(holder3)).toNumber().should.be.equal(fullAmount3 - 100);
            (await skaleToken.balanceOf(hacker)).toNumber().should.be.equal(400);
        });

        it("After 15 month", async () => {
            await skipTimeToDate(web3, 1, 3);
            await skipTimeToDate(web3, 1, 9);

            let lockedAmount = await Vesting.getLockedAmount(holder);
            let lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.lessThan(fullAmount - lockupAmount);

            // SAFT 1 unlocked all tokens
            lockedAmount = await Vesting.getLockedAmount(holder1);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod1, fullPeriod1, fullAmount1, lockupAmount1, vestPeriod1);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(0);

            // SAFT 2 unlocked all tokens
            lockedAmount = await Vesting.getLockedAmount(holder2);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod2, fullPeriod2, fullAmount2, lockupAmount2, vestPeriod2);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(0);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.lessThan(fullAmount3 - lockupAmount3);
        });

        it("After 16, 17, 18 month", async () => {
            let saft0unlocked16: number;
            let saft0unlocked17: number;
            let saft0unlocked18: number;
            let saft3unlocked16: number;
            let saft3unlocked17: number;
            let saft3unlocked18: number;

            await skipTimeToDate(web3, 1, 5);
            await skipTimeToDate(web3, 1, 10);

            let lockedAmount = await Vesting.getLockedAmount(holder);
            saft0unlocked16 = lockedAmount.toNumber();
            let lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            saft3unlocked16 = lockedAmount.toNumber();
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            await skipTimeToDate(web3, 1, 11);

            lockedAmount = await Vesting.getLockedAmount(holder);
            saft0unlocked17 = lockedAmount.toNumber();
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            saft3unlocked17 = lockedAmount.toNumber();
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            saft0unlocked16.should.be.equal(saft0unlocked17);

            await skipTimeToDate(web3, 1, 12);

            lockedAmount = await Vesting.getLockedAmount(holder);
            saft0unlocked18 = lockedAmount.toNumber();
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            saft3unlocked18 = lockedAmount.toNumber();
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            (saft3unlocked16 - saft3unlocked17).should.be.equal(saft3unlocked17 - saft3unlocked18);

            saft0unlocked18.should.be.lessThan(saft0unlocked17);
        });

        it("After 24, 30, 36 month", async () => {
            let saft0unlocked24: number;
            let saft0unlocked30: number;
            let saft0unlocked36: number;

            await skipTimeToDate(web3, 1, 5);
            await skipTimeToDate(web3, 1, 4);
            await skipTimeToDate(web3, 1, 6);

            let lockedAmount = await Vesting.getLockedAmount(holder);
            saft0unlocked24 = lockedAmount.toNumber();
            let lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            await skipTimeToDate(web3, 1, 12);

            lockedAmount = await Vesting.getLockedAmount(holder);
            saft0unlocked30 = lockedAmount.toNumber();
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);

            await skipTimeToDate(web3, 1, 6);

            lockedAmount = await Vesting.getLockedAmount(holder);
            saft0unlocked36 = lockedAmount.toNumber();
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(0);

            lockedAmount = await Vesting.getLockedAmount(holder3);
            lockedCalculatedAmount = calculateLockedAmount(await currentTime(web3), startDate, lockupPeriod3, fullPeriod3, fullAmount3, lockupAmount3, vestPeriod3);
            lockedAmount.toNumber().should.be.equal(lockedCalculatedAmount);
            lockedAmount.toNumber().should.be.equal(0);

            (saft0unlocked24 - saft0unlocked30).should.be.equal(saft0unlocked30 - saft0unlocked36);
        });
    });
});
