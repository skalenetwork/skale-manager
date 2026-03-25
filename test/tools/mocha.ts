import {SnapshotRestorer, takeSnapshot} from "@nomicfoundation/hardhat-network-helpers";
export function fastBeforeEach(fn: Mocha.AsyncFunc) {
    let initialState: SnapshotRestorer
    let stateBeforeTest: SnapshotRestorer;

    before(async function (this: Mocha.Context) {
        initialState = await takeSnapshot();
        await fn.apply(this);
    });

    beforeEach(async () => {
        stateBeforeTest = await takeSnapshot();
    });

    afterEach(async () => {
        await stateBeforeTest.restore();
    });

    after(async () => {
        await initialState.restore();
    })
}
