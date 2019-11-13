import { ContractManagerContract,
    ContractManagerInstance,
    DelegationPeriodManagerContract,
    DelegationPeriodManagerInstance,
    DelegationServiceContract,
    DelegationServiceInstance,
    SkaleTokenContract,
    SkaleTokenInstance } from "../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");
const DelegationService: DelegationServiceContract = artifacts.require("./DelegationService");
const DelegationPeriodManager = artifacts.require("./DelegationPeriodManager");

import { currentTime, months, skipTime, skipTimeToDate } from "./utils/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);

const allowedDelegationPeriods = [3, 6, 12];

contract("SkaleToken", ([owner,
                         holder1, holder1bounty,
                         holder2, holder2bounty,
                         holder3, holder3bounty,
                         validator]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let delegationService: DelegationServiceInstance;
    let delegationPeriodManager: DelegationPeriodManagerInstance;
    const defaultAmount = 100 * 1e18;

    beforeEach(async () => {
        contractManager = await ContractManager.new();
        skaleToken = await SkaleToken.new(contractManager.address, []);
        delegationService = await DelegationService.new();
        delegationPeriodManager = await DelegationPeriodManager.new(contractManager.address);

        // each test will start from Nov 10
        await skipTimeToDate(web3, 10, 11);
    });

    describe("when holders have tokens", async () => {
        beforeEach(async () => {
            await skaleToken.mint(owner, holder1, defaultAmount.toString(), "0x", "0x");
        });

        for (let delegationPeriod = 1; delegationPeriod <= 30; ++delegationPeriod) {
            it("should check delegation period availability", async () => {
                await delegationPeriodManager.isDelegationPeriodAllowed(delegationPeriod)
                    .should.be.eventually.equal(allowedDelegationPeriods.includes(delegationPeriod));
            });

            if (allowedDelegationPeriods.includes(delegationPeriod)) {
                describe("when delegation period is " + delegationPeriod + " months", async () => {

                    months.forEach((month, monthIndex) => {
                        let requestId: number;

                        it("should send request for delegation starting from " + month, async () => {
                            const { logs } = await skaleToken.delegate(
                                validator, month, 0, "D2 is even", holder1bounty);
                            assert.equal(logs.length, 1, "No Mint Event emitted");
                            assert.equal(logs[0].event, "DelegationRequestIsSent");
                            requestId = logs[0].args.id;
                            await delegationService.listDelegationRequests()
                                .should.be.eventually.deep.equal([requestId]);
                        });

                        describe("when delegation request is sent", async () => {

                            beforeEach(async () => {
                                const { logs } = await skaleToken.delegate(
                                    validator, month, 0, "D2 is even", holder1bounty);
                                assert.equal(logs.length, 1, "No Mint Event emitted");
                                assert.equal(logs[0].event, "DelegationRequestIsSent");
                                requestId = logs[0].args.id;
                            });

                            it("should not allow holder to spend tokens", async () => {
                                await skaleToken.transfer(holder2, 1, {from: holder1})
                                    .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                                await skaleToken.approve(holder2, 1, {from: holder1})
                                    .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
                                await skaleToken.send(holder2, 1, "", {from: holder1})
                                    .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");
                            });

                            it("should not allow holder to receive tokens", async () => {
                                await skaleToken.transfer(holder1, 1, {from: holder2})
                                    .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                            });

                            it("should accept delegation request", async () => {
                                await delegationService.accept(requestId, {from: validator});

                                await delegationService.listDelegationRequests().should.be.eventually.empty;
                            });

                            it("should unlock token if validator does not accept delegation request", async () => {
                                await skipTimeToDate(web3, 1, monthIndex);

                                await skaleToken.transfer(holder2, 1, {from: holder1});
                                await skaleToken.approve(holder2, 1, {from: holder1});
                                await skaleToken.send(holder2, 1, "", {from: holder1});

                                await skaleToken.balanceOf(holder1).should.be.deep.equal(defaultAmount - 3);
                            });

                            describe("when delegation request is accepted", async () => {
                                beforeEach(async () => {
                                    await delegationService.accept(requestId, {from: validator});
                                });

                                it("should not allow to create node before 26th day of a month before delegation start",
                                    async () => {
                                    for (let currentMonth = 11;
                                        currentMonth !== monthIndex;
                                        currentMonth = (currentMonth + 1) % 12) {
                                            await skipTimeToDate(web3, 25, currentMonth);
                                            await delegationService.createNode(4444, 0, "127.0.0.1", "127.0.0.1",
                                                {from: validator})
                                                .should.be.eventually.rejectedWith("Not enough tokens");
                                    }
                                    await skipTimeToDate(web3, 25, monthIndex);
                                    await delegationService.createNode(4444, 0, "127.0.0.1", "127.0.0.1",
                                        {from: validator})
                                        .should.be.eventually.rejectedWith("Not enough tokens");
                                });

                                it("should extend delegation period for 3 months if undelegation request was not sent",
                                    async () => {
                                        await skipTimeToDate(web3, 1, (monthIndex + delegationPeriod) % 12);

                                        await skaleToken.transfer(holder2, 1, {from: holder1})
                                            .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                                        await skaleToken.approve(holder2, 1, {from: holder1})
                                            .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
                                        await skaleToken.send(holder2, 1, "", {from: holder1})
                                            .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");

                                        await delegationService.requestUndelegation();

                                        await skipTimeToDate(web3, 27, (monthIndex + delegationPeriod + 2) % 12);

                                        await skaleToken.transfer(holder2, 1, {from: holder1})
                                            .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                                        await skaleToken.approve(holder2, 1, {from: holder1})
                                            .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
                                        await skaleToken.send(holder2, 1, "", {from: holder1})
                                            .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");

                                        await skipTimeToDate(web3, 1, (monthIndex + delegationPeriod + 2) % 12);

                                        await skaleToken.transfer(holder2, 1, {from: holder1});
                                        await skaleToken.approve(holder2, 1, {from: holder1});
                                        await skaleToken.send(holder2, 1, "", {from: holder1});

                                        await skaleToken.balanceOf(holder1).should.be.deep.equal(defaultAmount - 3);
                                });
                            });
                        });
                    });
                });
            } else {
                it("should not allow to send delegation request", async () => {
                    await skaleToken.delegate(validator, "dec", delegationPeriod,
                        "D2 is even", holder1bounty, {from: holder1})
                        .should.be.eventually.rejectedWith("This delegation period is not allowed");
                });
            }
        }

        it("should not allow holder to delegate to unregistered validator", async () => {
            await skaleToken.delegate(validator, "dec", 3, "D2 is even", holder1bounty, {from: holder1})
                .should.be.eventually.rejectedWith("Validator is not registered");
        });

        describe("when validator is registered", async () => {
            beforeEach(async () => {
                delegationService.register("First validator", "Super-pooper validator", {from: validator});
            });

            // MSR = $100

            // Stake in time:
            // month       |11|12| 1| 2| 3| 4| 5| 6| 7| 8| 9|10|11|12| 1|
            // ----------------------------------------------------------
            // holder1 $97 |  |##|##|##|##|##|##|  |  |##|##|##|  |  |  |
            // holder2 $89 |  |  |##|##|##|##|##|##|##|##|##|##|##|##|  |
            // holder3 $83 |  |  |  |  |##|##|##|  |  |  |  |  |  |  |  |

            // month       |11|12| 1| 2| 3| 4| 5| 6| 7| 8| 9|10|11|12| 1|
            // ----------------------------------------------------------
            //             |  |  |  |  |##|##|##|  |  |  |  |  |  |  |  |
            // Nodes online|  |  |##|##|##|##|##|  |  |##|##|##|  |  |  |

            it("should distribute bounty proportionally to delegation share and period coefficient", async () => {
                const holder1Balance = 97;
                const holder2Balance = 89;
                const holder3Balance = 83;

                await skaleToken.transfer(validator, defaultAmount - holder1Balance);
                await skaleToken.transfer(validator, defaultAmount - holder2Balance);
                await skaleToken.transfer(validator, defaultAmount - holder3Balance);

                await skaleToken.delegate(validator, "dec", 6, "First holder", holder1bounty, {from: holder1});
                await skaleToken.delegate(validator, "jan", 12, "Second holder", holder2bounty, {from: holder2});

                await skipTimeToDate(web3, 28, 11);

                await delegationService.createNode(4444, 0, "127.0.0.1", "127.0.0.1", {from: validator});

                await skipTimeToDate(web3, 1, 0);

                // get bounty
            });

        });
    });
});
