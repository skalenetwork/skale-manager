import { applySnapshot, makeSnapshot } from "./snapshot";

export function fastBeforeEach(fn: Mocha.AsyncFunc) {
    let stateBeforeTest: number;

    before(async function (this: Mocha.Context) {
        return await fn.apply(this);
    });

    beforeEach(async () => {
        stateBeforeTest = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(stateBeforeTest);
    });
}
