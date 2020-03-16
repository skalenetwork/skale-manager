import { ConstantsHolderInstance,
    ContractManagerInstance,
    DelegationControllerInstance,
    DelegationPeriodManagerInstance,
    DistributorInstance,
    PunisherInstance,
    SkaleManagerMockContract,
    SkaleManagerMockInstance,
    SkaleTokenInstance,
    TokenStateInstance,
    ValidatorServiceInstance} from "../../types/truffle-contracts";

const SkaleManagerMock: SkaleManagerMockContract = artifacts.require("./SkaleManagerMock");

import { currentTime, skipTime, skipTimeToDate } from "../utils/time";

import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployConstantsHolder } from "../utils/deploy/constantsHolder";
import { deployContractManager } from "../utils/deploy/contractManager";
import { deployDelegationController } from "../utils/deploy/delegation/delegationController";
import { deployDelegationPeriodManager } from "../utils/deploy/delegation/delegationPeriodManager";
import { deployDistributor } from "../utils/deploy/delegation/distributor";
import { deployPunisher } from "../utils/deploy/delegation/punisher";
import { deployTokenState } from "../utils/deploy/delegation/tokenState";
import { deployValidatorService } from "../utils/deploy/delegation/validatorService";
import { deploySkaleToken } from "../utils/deploy/skaleToken";
import { Delegation } from "../utils/types";

chai.should();
chai.use(chaiAsPromised);

const allowedDelegationPeriods = [3, 6, 12];

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

        // each test will start from Nov 10
        await skipTimeToDate(web3, 10, 10);
    });

    describe("when holders have tokens and validator is registered", async () => {
        let validatorId: number;
        beforeEach(async () => {
            validatorId = 1;
            await skaleToken.mint(owner, holder1, defaultAmount.toString(), "0x", "0x");
            await skaleToken.mint(owner, holder2, defaultAmount.toString(), "0x", "0x");
            await skaleToken.mint(owner, holder3, defaultAmount.toString(), "0x", "0x");
            await skaleToken.mint(owner, skaleManagerMock.address, defaultAmount.toString(), "0x", "0x");
            await validatorService.registerValidator(
                "First validator", "Super-pooper validator", 150, 0, {from: validator});
            await validatorService.enableValidator(validatorId, {from: owner});
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
                        assert.equal(logs[0].event, "DelegationRequestIsSent");
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
                            assert.equal(logs[0].event, "DelegationRequestIsSent");
                            requestId = logs[0].args.delegationId;
                        });

                        it("should not allow to burn locked tokens", async () => {
                            await skaleToken.burn(1, "0x", {from: holder1})
                                .should.be.eventually.rejectedWith("Token should be unlocked for burning");
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
            await delegationController.delegate(13, 1,  3, "D2 is even", {from: holder1})
                .should.be.eventually.rejectedWith("Validator with such id doesn't exist");
        });

        it("should return bond amount if validator delegated to itself", async () => {
            await skaleToken.mint(owner, validator, defaultAmount.toString(), "0x", "0x");
            await delegationController.delegate(
                validatorId, defaultAmount.toString(), 3, "D2 is even", {from: validator});
            await delegationController.delegate(
                validatorId, defaultAmount.toString(), 3, "D2 is even", {from: holder1});
            await delegationController.acceptPendingDelegation(0, {from: validator});
            await delegationController.acceptPendingDelegation(1, {from: validator});
            skipTime(web3, month);
            const bondAmount = await validatorService.getAndUpdateBondAmount.call(validatorId);
            assert.equal(defaultAmount.toString(), bondAmount.toString());
        });

        describe("when 3 holders delegated", async () => {
            beforeEach(async () => {
                delegationController.delegate(validatorId, 2, 12, "D2 is even", {from: holder1});
                delegationController.delegate(validatorId, 3, 6, "D2 is even more even", {from: holder2});
                delegationController.delegate(validatorId, 5, 3, "D2 is the evenest", {from: holder3});

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
                    .should.be.eventually.rejectedWith("Bounty is locked");
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
                    await punisher.slash(validatorId, 5);

                    // Stakes:
                    // holder1: $2
                    // holder2: $3
                    // holder3: $5

                    (await tokenState.getAndUpdateLockedAmount.call(holder1)).toNumber().should.be.equal(2);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder1)).toNumber().should.be.equal(1);

                    (await tokenState.getAndUpdateLockedAmount.call(holder2)).toNumber().should.be.equal(3);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder2)).toNumber().should.be.equal(1);

                    (await tokenState.getAndUpdateLockedAmount.call(holder3)).toNumber().should.be.equal(5);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder3)).toNumber().should.be.equal(2);
                });

                it("should not lock more tokens than were delegated", async () => {
                    await punisher.slash(validatorId, 100);

                    (await tokenState.getAndUpdateLockedAmount.call(holder1)).toNumber().should.be.equal(2);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder1)).toNumber().should.be.equal(0);

                    (await tokenState.getAndUpdateLockedAmount.call(holder2)).toNumber().should.be.equal(3);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder2)).toNumber().should.be.equal(0);

                    (await tokenState.getAndUpdateLockedAmount.call(holder3)).toNumber().should.be.equal(5);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder3)).toNumber().should.be.equal(0);
                });

                it("should allow to return slashed tokens back", async () => {
                    await punisher.slash(validatorId, 10);

                    (await tokenState.getAndUpdateLockedAmount.call(holder3)).toNumber().should.be.equal(5);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder3)).toNumber().should.be.equal(0);

                    await delegationController.processAllSlashes(holder3);
                    await punisher.forgive(holder3, 3);

                    (await tokenState.getAndUpdateLockedAmount.call(holder3)).toNumber().should.be.equal(2);
                    (await delegationController.getAndUpdateDelegatedAmount.call(
                        holder3)).toNumber().should.be.equal(0);
                });

                it("should not pay bounty for slashed tokens", async () => {
                    // slash everything
                    await punisher.slash(validatorId, 10);

                    delegationController.delegate(validatorId, 1, 3, "D2 is the evenest", {from: holder1});
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
            });
        });

        it("should be possible for N.O.D.E. foundation to spin up node immediately", async () => {
            await constantsHolder.setMSR(0);
            await validatorService.checkPossibilityCreatingNode(validator);
        });

        it("should be possible to distribute bounty accross thousands of holders", async () => {
            let holdersAmount = 1000;
            if (process.env.TRAVIS) {
                console.log("Reduce holders amount to fit Travis timelimit");
                holdersAmount = 10;
            }
            const delegatedAmount = 1;
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
                await skaleToken.mint(owner, holder.address, delegatedAmount, "0x", "0x");

                const callData = web3DelegationController.methods.delegate(
                    validatorId, delegatedAmount, 3, "D2 is even").encodeABI();

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
