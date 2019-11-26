import { ContractManagerContract,
    ContractManagerInstance,
    DelegationControllerContract,
    DelegationControllerInstance,
    DelegationPeriodManagerContract,
    DelegationPeriodManagerInstance,
    DelegationRequestManagerContract,
    DelegationRequestManagerInstance,
    DelegationServiceContract,
    DelegationServiceInstance,
    SkaleTokenContract,
    SkaleTokenInstance,
    ValidatorDelegationContract,
    ValidatorDelegationInstance } from "../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");
const DelegationService: DelegationServiceContract = artifacts.require("./DelegationService");
const DelegationPeriodManager: DelegationPeriodManagerContract = artifacts.require("./DelegationPeriodManager");
const DelegationRequestManager: DelegationRequestManagerContract = artifacts.require("./DelegationRequestManager");
const ValidatorDelegation: ValidatorDelegationContract = artifacts.require("./ValidatorDelegation");
const DelegationController: DelegationControllerContract = artifacts.require("./DelegationController");

import { currentTime, months, skipTime, skipTimeToDate } from "./utils/time";

import * as chai from "chai";
import BigNumber from "bignumber.js";
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);

const allowedDelegationPeriods = [3, 6, 12];


class DelegationRequest {
    public tokenAddress: string;
    public validatorId: BigNumber;
    public delegationPeriod: BigNumber;
    public unlockedUntill: BigNumber;
    public description: string;

    constructor(arrayData: [string, BigNumber, BigNumber, BigNumber, string]) {
        this.tokenAddress = arrayData[0];
        this.validatorId = new BigNumber(arrayData[1]);
        this.delegationPeriod = new BigNumber(arrayData[2]);
        this.unlockedUntill = new BigNumber(arrayData[3]);
        this.description = arrayData[4];
    }
}

contract("Delegation", ([owner,
                         holder1,
                         holder2,
                         holder3,
                         validator,
                         bountyAddress]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let delegationService: DelegationServiceInstance;
    let delegationPeriodManager: DelegationPeriodManagerInstance;
    let delegationRequestManager: DelegationRequestManagerInstance;
    let validatorDelegation: ValidatorDelegationInstance;
    let delegationController: DelegationControllerInstance;

    const defaultAmount = 100 * 1e18;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});

        skaleToken = await SkaleToken.new(contractManager.address, []);
        await contractManager.setContractsAddress("SkaleToken", skaleToken.address);

        delegationService = await DelegationService.new(contractManager.address, {from: owner});
        await contractManager.setContractsAddress("DelegationService", delegationService.address);

        delegationPeriodManager = await DelegationPeriodManager.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationPeriodManager", delegationPeriodManager.address);

        delegationRequestManager = await DelegationRequestManager.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationRequestManager", delegationRequestManager.address);

        validatorDelegation = await ValidatorDelegation.new(contractManager.address);
        await contractManager.setContractsAddress("ValidatorDelegation", validatorDelegation.address);
        
        delegationController = await DelegationController.new(contractManager.address);
        await contractManager.setContractsAddress("DelegationController", delegationController.address);

        // each test will start from Nov 10
        await skipTimeToDate(web3, 10, 11);
    });

    describe("when holders have tokens and validator registered", async () => {
        let validatorId: number;
        beforeEach(async () => {
            await skaleToken.mint(owner, holder1, defaultAmount.toString(), "0x", "0x");
            const { logs } = await delegationService.registerValidator(
                "First validator", "Super-pooper validator", 150, 0, {from: validator});
            validatorId = logs[0].args.validatorId.toNumber()
        });

        for (let delegationPeriod = 1; delegationPeriod <= 30; ++delegationPeriod) {
            // it("should check delegation period availability", async () => {
            //     await delegationPeriodManager.isDelegationPeriodAllowed(delegationPeriod)
            //         .should.be.eventually.equal(allowedDelegationPeriods.includes(delegationPeriod));
            // });

            if (allowedDelegationPeriods.includes(delegationPeriod)) {
                describe("when delegation period is " + delegationPeriod + " months", async () => {
                    let requestId: number;

                    it("should send request for delegation", async () => {
                        const { logs } = await delegationService.delegate(
                            validatorId, 1, delegationPeriod, "D2 is even", {from: holder1});
                        assert.equal(logs.length, 1, "No DelegationRquestIsSent Event emitted");
                        assert.equal(logs[0].event, "DelegationRequestIsSent");
                        requestId = logs[0].args.requestId;
                        const delegationRequest: DelegationRequest = new DelegationRequest(
                            await delegationRequestManager.delegationRequests(requestId)
                        );
                        assert.equal(holder1, delegationRequest.tokenAddress);
                        assert.equal(validatorId, delegationRequest.validatorId.toNumber());
                        assert.equal(delegationPeriod, delegationRequest.delegationPeriod.toNumber());
                        assert.equal("D2 is even", delegationRequest.description);
                    });

                    describe("when delegation request is sent", async () => {

                        beforeEach(async () => {
                            const { logs } = await delegationService.delegate(
                                validatorId, 1, delegationPeriod, "D2 is even", {from: holder1});
                            assert.equal(logs.length, 1, "No DelegationRequest Event emitted");
                            assert.equal(logs[0].event, "DelegationRequestIsSent");
                            requestId = logs[0].args.requestId;
                        });

                        it("should not allow holder to spend tokens", async () => {
                            await skaleToken.transfer(holder2, 1, {from: holder1});
                                // .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                            // await skaleToken.approve(holder2, 1, {from: holder1})
                                // .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
                            // await skaleToken.send(holder2, 1, "", {from: holder1})
                                // .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");
                        });

                        // it("should not allow holder to receive tokens", async () => {
                        //     await skaleToken.transfer(holder1, 1, {from: holder2})
                        //         .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                        // });

                        // it("should accept delegation request", async () => {
                        //     await delegationService.accept(requestId, {from: validator});

                        //     // await delegationService.listDelegationRequests().should.be.eventually.empty;
                        // });

                        // it("should unlock token if validator does not accept delegation request", async () => {
                        //     await skipTimeToDate(web3, 1, 11);

                        //     await skaleToken.transfer(holder2, 1, {from: holder1});
                        //     await skaleToken.approve(holder2, 1, {from: holder1});
                        //     await skaleToken.send(holder2, 1, "", {from: holder1});

                        //     await skaleToken.balanceOf(holder1).should.be.deep.equal(defaultAmount - 3);
                        // });

                    //     describe("when delegation request is accepted", async () => {
                    //         beforeEach(async () => {
                    //             await delegationService.accept(requestId, {from: validator});
                    //         });

                    //         it("should extend delegation period for 3 months if undelegation request was not sent",
                    //             async () => {
                    //                 await skipTimeToDate(web3, 1, (10 + delegationPeriod) % 12);

                    //                 await skaleToken.transfer(holder2, 1, {from: holder1})
                    //                     .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                    //                 await skaleToken.approve(holder2, 1, {from: holder1})
                    //                     .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
                    //                 await skaleToken.send(holder2, 1, "", {from: holder1})
                    //                     .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");

                    //                 await delegationService.requestUndelegation();

                    //                 await skipTimeToDate(web3, 27, (10 + delegationPeriod + 2) % 12);

                    //                 await skaleToken.transfer(holder2, 1, {from: holder1})
                    //                     .should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                    //                 await skaleToken.approve(holder2, 1, {from: holder1})
                    //                     .should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
                    //                 await skaleToken.send(holder2, 1, "", {from: holder1})
                    //                     .should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");

                    //                 await skipTimeToDate(web3, 1, (10 + delegationPeriod + 2) % 12);

                    //                 await skaleToken.transfer(holder2, 1, {from: holder1});
                    //                 await skaleToken.approve(holder2, 1, {from: holder1});
                    //                 await skaleToken.send(holder2, 1, "", {from: holder1});

                    //                 await skaleToken.balanceOf(holder1).should.be.deep.equal(defaultAmount - 3);
                    //         });
                    //     });
                    });
                });
            } 
            // else {
            //     it("should not allow to send delegation request", async () => {
            //         await delegationService.delegate(validator, delegationPeriod,
            //             "D2 is even", {from: holder1})
            //             .should.be.eventually.rejectedWith("This delegation period is not allowed");
            //     });
            // }
        }

        // it("should not allow holder to delegate to unregistered validator", async () => {
        //     await delegationService.delegate(validator, 3, "D2 is even", {from: holder1})
        //         .should.be.eventually.rejectedWith("Validator is not registered");
        // });

        // describe("when validator is registered", async () => {
        //     beforeEach(async () => {
        //         await delegationService.registerValidator(
        //             "First validator", "Super-pooper validator", 150, {from: validator});
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
        //         const validatorId = validatorIds[0];

                // let responce = await delegationService.delegate(
                //     validatorId, 6, "First holder", {from: holder1});
                // const requestId1 = responce.logs[0].args.id;
                // await delegationService.accept(requestId1, {from: validator});

        //         await skipTimeToDate(web3, 28, 10);

                // responce = await delegationService.delegate(
                //     validatorId, 12, "Second holder", {from: holder2});
                // const requestId2 = responce.logs[0].args.id;
                // await delegationService.accept(requestId2, {from: validator});

        //         await skipTimeToDate(web3, 28, 11);

        //         await delegationService.createNode("4444", 0, "127.0.0.1", "127.0.0.1", {from: validator});

        //         await skipTimeToDate(web3, 1, 0);

                // await delegationService.requestUndelegation({from: holder1});
                // await delegationService.requestUndelegation({from: holder2});
                // // get bounty
                // await skipTimeToDate(web3, 1, 1);

                // responce = await delegationService.delegate(
                //     validatorId, 3, "Third holder", {from: holder3});
                // const requestId3 = responce.logs[0].args.id;
                // await delegationService.accept(requestId3, {from: validator});

                // let bounty = await delegationService.getEarnedBountyAmount.call({from: holder1});
                // bounty.should.be.equal(38);
                // await delegationService.withdrawBounty(bountyAddress, bounty, {from: holder1});

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

                // responce = await delegationService.delegate(validatorId, 3, "D2 is even", {from: holder1});
                // const requestId = responce.logs[0].args.id;
                // await delegationService.accept(requestId, {from: validator});

        //         await delegationService.requestUndelegation({from: holder3});

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
