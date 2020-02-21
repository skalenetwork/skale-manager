import BigNumber from "bignumber.js";

class Delegation {
    public holder: string;
    public validatorId: BigNumber;
    public amount: BigNumber;
    public delegationPeriod: BigNumber;
    public created: BigNumber;
    public started: BigNumber;
    public finished: BigNumber;
    public info: string;

    constructor(arrayData: [string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, string]) {
        this.holder = arrayData[0];
        this.validatorId = new BigNumber(arrayData[1]);
        this.amount = new BigNumber(arrayData[2]);
        this.delegationPeriod = new BigNumber(arrayData[3]);
        this.created = new BigNumber(arrayData[4]);
        this.started = new BigNumber(arrayData[5]);
        this.finished = new BigNumber(arrayData[6]);
        this.info = arrayData[7];
    }
}

enum State {
    PROPOSED,
    ACCEPTED,
    CANCELED,
    REJECTED,
    DELEGATED,
    UNDELEGATION_REQUESTED,
    COMPLETED,
}

export { Delegation, State };
