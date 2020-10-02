import { TimeHelpersInstance, ContractManagerInstance } from "../../types/truffle-contracts";
import { deployTimeHelpers } from "../tools/deploy/delegation/timeHelpers";
import { deployContractManager } from "../tools/deploy/contractManager";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);

contract("TimeHelpers", ([owner]) => {
    let contractManager: ContractManagerInstance;
    let timeHelpers: TimeHelpersInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        timeHelpers = await deployTimeHelpers(contractManager);
    });

    it("must convert timestamps to months correctly", async () => {
        await timeHelpers.timestampToMonth((new Date("2019-12-13T00:00:00.000+00:00")).getTime() / 1000)
            .should.be.eventually.rejectedWith("Timestamp is too far in the past");
        await timeHelpers.timestampToMonth((new Date("2019-12-31T23:59:59.000+00:00")).getTime() / 1000)
            .should.be.eventually.rejectedWith("Timestamp is too far in the past");

        await timeHelpers.timestampToMonth((new Date("2020-01-01T00:00:00.000+00:00")).getTime() / 1000)
            .should.be.eventually.rejectedWith("Timestamp is too far in the past");
        await timeHelpers.timestampToMonth((new Date("2020-01-31T23:59:59.000+00:00")).getTime() / 1000)
            .should.be.eventually.rejectedWith("Timestamp is too far in the past");

        (await timeHelpers.timestampToMonth((new Date("2020-02-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(1);
        (await timeHelpers.timestampToMonth((new Date("2020-02-29T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(1);

        (await timeHelpers.timestampToMonth((new Date("2020-03-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(2);
        (await timeHelpers.timestampToMonth((new Date("2020-03-31T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(2);

        (await timeHelpers.timestampToMonth((new Date("2020-04-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(3);
        (await timeHelpers.timestampToMonth((new Date("2020-04-30T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(3);

        (await timeHelpers.timestampToMonth((new Date("2020-05-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(4);
        (await timeHelpers.timestampToMonth((new Date("2020-05-31T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(4);

        (await timeHelpers.timestampToMonth((new Date("2020-06-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(5);
        (await timeHelpers.timestampToMonth((new Date("2020-06-30T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(5);

        (await timeHelpers.timestampToMonth((new Date("2020-07-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(6);
        (await timeHelpers.timestampToMonth((new Date("2020-07-31T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(6);

        (await timeHelpers.timestampToMonth((new Date("2020-08-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(7);
        (await timeHelpers.timestampToMonth((new Date("2020-08-31T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(7);

        (await timeHelpers.timestampToMonth((new Date("2020-09-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(8);
        (await timeHelpers.timestampToMonth((new Date("2020-09-30T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(8);

        (await timeHelpers.timestampToMonth((new Date("2020-10-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(9);
        (await timeHelpers.timestampToMonth((new Date("2020-10-31T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(9);

        (await timeHelpers.timestampToMonth((new Date("2020-11-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(10);
        (await timeHelpers.timestampToMonth((new Date("2020-11-30T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(10);

        (await timeHelpers.timestampToMonth((new Date("2020-12-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(11);
        (await timeHelpers.timestampToMonth((new Date("2020-12-31T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(11);

        (await timeHelpers.timestampToMonth((new Date("2021-01-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(12);
        (await timeHelpers.timestampToMonth((new Date("2021-01-31T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(12);

        (await timeHelpers.timestampToMonth((new Date("2021-02-01T00:00:00.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(13);
        (await timeHelpers.timestampToMonth((new Date("2021-02-28T23:59:59.000+00:00")).getTime() / 1000))
            .toNumber().should.be.equal(13);
    })

    it("must convert months to timestamps correctly", async () => {
        (await timeHelpers.monthToTimestamp(0)).toNumber()
            .should.be.equal((new Date("2020-01-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(1)).toNumber()
            .should.be.equal((new Date("2020-02-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(2)).toNumber()
            .should.be.equal((new Date("2020-03-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(3)).toNumber()
            .should.be.equal((new Date("2020-04-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(4)).toNumber()
            .should.be.equal((new Date("2020-05-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(5)).toNumber()
            .should.be.equal((new Date("2020-06-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(6)).toNumber()
            .should.be.equal((new Date("2020-07-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(7)).toNumber()
            .should.be.equal((new Date("2020-08-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(8)).toNumber()
            .should.be.equal((new Date("2020-09-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(9)).toNumber()
            .should.be.equal((new Date("2020-10-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(10)).toNumber()
            .should.be.equal((new Date("2020-11-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(11)).toNumber()
            .should.be.equal((new Date("2020-12-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(12)).toNumber()
            .should.be.equal((new Date("2021-01-01T00:00:00.000+00:00")).getTime() / 1000);

        (await timeHelpers.monthToTimestamp(13)).toNumber()
            .should.be.equal((new Date("2021-02-01T00:00:00.000+00:00")).getTime() / 1000);
    });
});
