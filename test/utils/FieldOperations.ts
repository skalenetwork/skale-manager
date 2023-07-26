import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { FieldOperationsTester } from "../../typechain-types";
import { deployContractManager } from "../tools/deploy/contractManager";
import { deployFieldOperationsTester } from "../tools/deploy/test/fieldOperationsTester";
import { makeSnapshot, applySnapshot } from "../tools/snapshot";

chai.should();
chai.use(chaiAsPromised);

describe("FieldOperations", () => {
    let fieldOperations: FieldOperationsTester;
    let snapshot: number;
    before(async () => {
        const contractManager = await deployContractManager();
        fieldOperations = await deployFieldOperationsTester(contractManager);
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    describe("Math test", () => {
        it("should addG2 X + -X", async () => {
            const x = {
                x: {
                    a: "17694137579193302151574986554989606791251275550473617358986030239522178978976",
                    b: "12564968105536248672261459973073913897486530088026601007070081824732008005651"
                },
                y: {
                    a: "10077617338849750103014194401602674734647645994746679891913469903630044280365",
                    b: "7900462855050398749824004124935262009825580193399121442342422552518111765590"
                }
            };
            const minusX = {
                x: {
                    a: "17694137579193302151574986554989606791251275550473617358986030239522178978976",
                    b: "12564968105536248672261459973073913897486530088026601007070081824732008005651"
                },
                y: {
                    a: "11810625532989525119232211343654600354048665162551143770775567991015181928218",
                    b: "13987780016788876472422401620322013078870730963898702220346615342127114442993"
                }
            };
            const res = await fieldOperations.add(x, minusX);
            res.x.a.toString().should.be.equal("0");
            res.x.b.toString().should.be.equal("0");
            res.y.a.toString().should.be.equal("1");
            res.y.b.toString().should.be.equal("0");
        });

        it("should addG2 X + -X from hacker", async () => {
            const x = {
                x: {
                    a: "10857046999023057135944570762232829481370756359578518086990519993285655852781",
                    b: "11559732032986387107991004021392285783925812861821192530917403151452391805634"
                },
                y: {
                    a: "13392588948715843804641432497768002650278120570034223513918757245338268106653",
                    b: "17805874995975841540914202342111839520379459829704422454583296818431106115052"
                }
            };
            const minusX = {
                x: {
                    a: "10857046999023057135944570762232829481370756359578518086990519993285655852781",
                    b: "11559732032986387107991004021392285783925812861821192530917403151452391805634"
                },
                y: {
                    a: "8495653923123431417604973247489272438418190587263600148770280649306958101930",
                    b: "4082367875863433681332203403145435568316851327593401208105741076214120093531"
                }
            };
            const res = await fieldOperations.add(x, minusX);
            res.x.a.toString().should.be.equal("0");
            res.x.b.toString().should.be.equal("0");
            res.y.a.toString().should.be.equal("1");
            res.y.b.toString().should.be.equal("0");
        });
    });
});
