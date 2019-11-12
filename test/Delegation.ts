import { ContractManagerContract,
    ContractManagerInstance,
    DelegationServiceContract,
    DelegationServiceInstance,
    SkaleTokenContract,
    SkaleTokenInstance } from "../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");
const DelegationService: DelegationServiceContract = artifacts.require("./DelegationService");

import { currentTime, months, skipTime } from "./utils/time";

contract("SkaleToken", ([owner, holder1, holder1bounty, holder2, validator]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let delegationService: DelegationServiceInstance;
    const defaultAmount = 100 * 1e18;

    beforeEach(async () => {
        contractManager = await ContractManager.new();
        skaleToken = await SkaleToken.new(contractManager.address, []);
        delegationService = await DelegationService.new();

        // each test will start from Nov 10
        const timestamp = await currentTime(web3);
        const now = new Date(timestamp * 1000);
        const d2birthday = new Date(1991, 10, 10, 16);
        const zeroTime = new Date(d2birthday);
        zeroTime.setFullYear(now.getFullYear() + 1);
        const diffInSeconds = Math.round(zeroTime.getTime() / 1000) - timestamp;
        await skipTime(web3, diffInSeconds);
    });

    describe("when holders have tokens", async () => {
        beforeEach(async () => {
            await skaleToken.mint(owner, holder1, defaultAmount.toString(), "0x", "0x");
        });

        months.forEach((month) => {
            it("should send request for delegation starting from " + month, async () => {
                await skaleToken.delegate(validator, month, 0, "D2 is even", holder1bounty);
            });

            describe("when delegation request is sent", async () => {
                let requestId;

                beforeEach(async () => {
                    const { logs } = await skaleToken.delegate(validator, month, 0, "D2 is even", holder1bounty);
                    assert.equal(logs.length, 1, "No Mint Event emitted");
                    assert.equal(logs[0].event, "DelegationRequestIsSent");
                    requestId = logs[0].args.id;
                });

                it("should not allow holder to spend tokens", async () => {
                    await skaleToken.transfer(holder2, 1, {from: holder1}).should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                    await skaleToken.approve(holder2, 1, {from: holder1}).should.be.eventually.rejectedWith("Can't approve transfer bacause delegation request is created");
                    await skaleToken.send(holder2, 1, "", {from: holder1}).should.be.eventually.rejectedWith("Can't send tokens because delegation request is created");
                });

                it("should not allow holder to receive tokens", async () => {
                    await skaleToken.transfer(holder1, 1, {from: holder2}).should.be.eventually.rejectedWith("Can't transfer tokens because delegation request is created");
                });

                it("should accept delegation request", async () => {

                });
            });
        });
    });
});
