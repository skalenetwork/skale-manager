import { ContractManagerInstance,
         SkaleTokenInstance,
         TokenStateInstance,
         VestingInstance} from "../../types/truffle-contracts";

import { currentTime, isLeapYear, skipTime, skipTimeInMonthFromDate, skipTimeToDate} from "../utils/time";

import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../utils/deploy/contractManager";
import { deployTokenState } from "../utils/deploy/delegation/tokenState";
import { deployVesting } from "../utils/deploy/delegation/vesting";
import { deploySkaleToken } from "../utils/deploy/skaleToken";
chai.should();
chai.use(chaiAsPromised);

class SAFT {
    public startVesting: BigNumber;
    public finishVesting: BigNumber;
    public lockupPeriod: BigNumber;
    public fullAmount: BigNumber;
    public afterLockupAmount: BigNumber;
    public regularPaymentTime: BigNumber;

    constructor(arrayData: [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber]) {
        this.startVesting = new BigNumber(arrayData[0]);
        this.finishVesting = new BigNumber(arrayData[1]);
        this.lockupPeriod = new BigNumber(arrayData[2]);
        this.fullAmount = new BigNumber(arrayData[3]);
        this.afterLockupAmount = new BigNumber(arrayData[4]);
        this.regularPaymentTime = new BigNumber(arrayData[5]);
    }
}

contract("Vesting", ([owner, holder, delegation, validator, seller, hacker]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let vesting: VestingInstance;
    let tokenState: TokenStateInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        skaleToken = await deploySkaleToken(contractManager);
        vesting = await deployVesting(contractManager);
        tokenState = await deployTokenState(contractManager);
    });

    it("should add SAFT investor", async () => {
        const curTime = new BigNumber(await currentTime(web3));
        await vesting.addVestingTerm(holder, curTime, "6", "12", "1000000", "500000", "1");
        const saftHolder: SAFT = new SAFT(
            await vesting.saftHolders(holder));
        assert.equal(saftHolder.startVesting.toNumber(), curTime.toNumber());
        assert.equal(
            saftHolder.finishVesting.toNumber(),
            await skipTimeInMonthFromDate(curTime.toNumber() * 1000, 12) / 1000,
        );
        assert.equal(saftHolder.lockupPeriod.toNumber(), 6);
        assert.equal(saftHolder.fullAmount.toNumber(), 1000000);
        assert.equal(saftHolder.afterLockupAmount.toNumber(), 500000);
        assert.equal(saftHolder.regularPaymentTime.toNumber(), 1);
    });

    

});
