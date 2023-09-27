import {applySnapshot, makeSnapshot} from "./snapshot";

export function fastBeforeEach(fn: Mocha.AsyncFunc) {
    let initialState: number
    let stateBeforeTest: number;

    before(async function (this: Mocha.Context) {
        initialState = await makeSnapshot();
        await fn.apply(this);
    });

    beforeEach(async () => {
        stateBeforeTest = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(stateBeforeTest);
    });

    after(async () => {
        await applySnapshot(initialState);
    })
}
