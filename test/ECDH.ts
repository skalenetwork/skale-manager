import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as elliptic from "elliptic";
import { ECDHContract,
         ECDHInstance} from "../types/truffle-contracts";
import "./tools/elliptic-types";

import { gasMultiplier } from "./tools/command_line";
import { skipTime } from "./tools/time";

const EC = elliptic.ec;
const ec = new EC("secp256k1");

const ECDH: ECDHContract = artifacts.require("./ECDH");

import BigNumber from "bignumber.js";
chai.should();
chai.use(chaiAsPromised);

const n = new BigNumber("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F", 16);
const gx = new BigNumber("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798", 16);
const gy = new BigNumber("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8", 16);
const n2 = new BigNumber("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16);

contract("ECDH", ([owner, validator, developer, hacker]) => {
    let ecdh: ECDHInstance;

    beforeEach(async () => {
        ecdh = await ECDH.new({from: owner, gas: 8000000 * gasMultiplier});
    });

    it("Should Add two small numbers", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(4);
        const z2 = new BigNumber(5);
        const result = await ecdh.jAdd(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "22");
        assert.equal(result[1].toString(10), "15");
    });

    it("Should Add one big numbers with one small", async () => {
        const x1 = n.minus(1).toFixed();
        const z1 = new BigNumber(1);
        const x2 = new BigNumber(2);
        const z2 = new BigNumber(1);
        const result = await ecdh.jAdd(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "1");
        assert.equal(result[1].toString(10), "1");
    });

    it("Should Add two big numbers", async () => {
        const x1 = n.minus(1).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(2).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh.jAdd(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(3).toString(10));
        assert.equal(result[1].toString(10), "1");
    });

    it("Should Subtract two small numbers", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(4);
        const z2 = new BigNumber(5);
        const result = await ecdh.jSub(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(2).toString(10));
        assert.equal(result[1].toString(10), "15");
    });

    it("Should Subtract one big numbers with one small", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(1);
        const x2 = n.minus(1).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh.jSub(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "3");
        assert.equal(result[1].toString(10), "1");
    });

    it("Should Subtract two big numbers", async () => {
        const x1 = n.minus(2).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(1).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh.jSub(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(1).toString(10));
        assert.equal(result[1].toString(10), "1");
    });

    it("Should Subtract two same numbers", async () => {
        const x1 = n.minus(16).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(16).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh.jSub(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "0");
        assert.equal(result[1].toString(10), "1");
    });

    it("Should Multiply two small numbers", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(4);
        const z2 = new BigNumber(5);
        const result = await ecdh.jMul(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "8");
        assert.equal(result[1].toString(10), "15");
    });

    it("Should Multiply one big numbers with one small", async () => {
        const x1 = n.minus(1).toFixed();
        const z1 = new BigNumber(1);
        const x2 = new BigNumber(2);
        const z2 = new BigNumber(1);
        const result = await ecdh.jMul(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(2).toString(10));
        assert.equal(result[1].toString(10), "1");
    });

    it("Should Multiply two big numbers", async () => {
        const x1 = n.minus(2).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(3).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh.jMul(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "6");
        assert.equal(result[1].toString(10), "1");
    });

    it("Should Multiply one is zero", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(0);
        const z2 = new BigNumber(5);
        const result = await ecdh.jMul(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "0");
        assert.equal(result[1].toString(10), "15");
    });

    it("Should Divide two small numbers", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(4);
        const z2 = new BigNumber(5);
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "10");
        assert.equal(result[1].toString(10), "12");
    });

    it("Should Divide one big numbers with one small", async () => {
        const x1 = n.minus(1).toFixed();
        const z1 = new BigNumber(1);
        const x2 = new BigNumber(2);
        const z2 = new BigNumber(1);
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(1).toString(10));
        assert.equal(result[1].toString(10), "2");
    });

    it("Should Divide two big numbers", async () => {
        const x1 = n.minus(2).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(3).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(2).toString(10));
        assert.equal(result[1].toString(10), n.minus(3).toString(10));
    });

    it("Should Divide one is zero", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(0);
        const z2 = new BigNumber(5);
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "10");
        assert.equal(result[1].toString(10), "0");
    });

    it("Should Calculate inverse", async () => {
        const d = new BigNumber(2);
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        assert.equal(result1[0].toString(10), "1");
        assert.equal(result1[1].toString(10), "1");
    });

    it("Inverse of 0", async () => {
        const d = new BigNumber(0);
        const result = await ecdh.inverse(d).should.be.eventually.rejectedWith("Input is incorrect");
        assert.equal(result.toString(10), "0");
    });

    it("Inverse of 1", async () => {
        const d = new BigNumber(1);
        const result = await ecdh.inverse(d);
        assert.equal(result.toString(10), "1");
    });

    it("Should Calculate inverse -1", async () => {
        const d = n.minus(1).toFixed();
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        assert.equal(result1[0].toString(10), "1");
        assert.equal(result1[1].toString(10), "1");
    });

    it("Should Calculate inverse -2", async () => {
        const d = n.minus(1).toFixed();
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        assert.equal(result1[0].toString(10), "1");
        assert.equal(result1[1].toString(10), "1");

    });

    it("Should Calculate inverse big number", async () => {
        const d = new BigNumber("f167a208bea79bc52668c016aff174622837f780ab60f59dfed0a8e66bb7c2ad", 16).toFixed();
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        assert.equal(result1[0].toString(10), "1");
        assert.equal(result1[1].toString(10), "1");
    });
    it("Should double gx,gy", async () => {
        let ln = gx.multipliedBy(gx).multipliedBy(3);
        let ld = gy.multipliedBy(2);

        ln = ln.modulo(n);
        ld = ld.modulo(n);

        let x2ccN = ln.multipliedBy(ln);
        let x2ccD = ld.multipliedBy(ld);

        x2ccN = x2ccN.minus(gx.multipliedBy(2).multipliedBy(x2ccD));

        x2ccN = x2ccN.modulo(n);
        if (x2ccN.isLessThan(0)) {
            x2ccN = x2ccN.plus(n);
        }
        x2ccD = x2ccD.modulo(n);
        if (x2ccD.isLessThan(0)) {
            x2ccD = x2ccD.plus(n);
        }

        let y2ccN;
        y2ccN  = gx.multipliedBy(x2ccD).multipliedBy(ln);
        y2ccN = y2ccN.minus( x2ccN.multipliedBy(ln) );
        y2ccN = y2ccN.minus( gy.multipliedBy(x2ccD).multipliedBy(ld) );

        let y2ccD;
        y2ccD  = x2ccD.multipliedBy(ld);

        y2ccN = y2ccN.modulo(n);
        if (y2ccN.isLessThan(0)) {
            y2ccN = y2ccN.plus(n);
        }
        y2ccD = y2ccD.modulo(n);
        if (y2ccD.isLessThan(0)) {
            y2ccD = y2ccD.plus(n);
        }

        let ccD = y2ccD.multipliedBy(x2ccD);
        x2ccN = x2ccN.multipliedBy(y2ccD);
        y2ccN = y2ccN.multipliedBy(x2ccD);

        x2ccN = x2ccN.modulo(n);
        if (x2ccN.isLessThan(0)) {
            x2ccN = x2ccN.plus(n);
        }
        y2ccN = y2ccN.modulo(n);
        if (y2ccN.isLessThan(0)) {
            y2ccN = y2ccN.plus(n);
        }
        ccD = ccD.modulo(n);
        if (ccD.isLessThan(0)) {
            ccD = ccD.plus(n);
        }

        const result = await ecdh.ecDouble(gx.toFixed(), gy.toFixed(), 1);
        let x2 = new BigNumber(result[0]);
        let y2 = new BigNumber(result[1]);
        const z2 = new BigNumber(result[2]);

        const result1 = new BigNumber(await ecdh.inverse(z2.toFixed()));
        x2 = x2.multipliedBy(result1).modulo(n);
        y2 = y2.multipliedBy(result1).modulo(n);
        assert.equal(x2.toString(10), "89565891926547004231252920425935692360644145829622209833684329913297188986597");
        assert.equal(y2.toString(10), "12158399299693830322967808612713398636155367887041628176798871954788371653930");

    });
    it("Add EC", async () => {
        const x2 = new BigNumber("89565891926547004231252920425935692360644145829622209833684329913297188986597");
        const y2 = new BigNumber("12158399299693830322967808612713398636155367887041628176798871954788371653930");
        const result = await ecdh.ecAdd(gx.toFixed(), gy.toFixed(), 1, x2.toFixed(), y2.toFixed(), 1);
        let x3 = new BigNumber(result[0]);
        let y3 = new BigNumber(result[1]);
        const z3 = new BigNumber(result[2]);
        const result1 = await ecdh.inverse(z3.toFixed());
        x3 = x3.multipliedBy(result1).modulo(n);
        y3 = y3.multipliedBy(result1).modulo(n);
        assert.equal(
            x3.toString(10),
            "112711660439710606056748659173929673102114977341539408544630613555209775888121",
        );
        assert.equal(
            y3.toString(10),
            "25583027980570883691656905877401976406448868254816295069919888960541586679410",
        );
    });

    it("2G+1G = 3G", async () => {
        const result = await ecdh.ecDouble(gx.toFixed(), gy.toFixed(), 1);
        const x2 = new BigNumber(result[0]);
        const y2 = new BigNumber(result[1]);
        const z2 = new BigNumber(result[2]);
        const result1 = await ecdh.ecAdd(gx.toFixed(), gy.toFixed(), 1, x2.toFixed(), y2.toFixed(), z2.toFixed());
        let x3 = new BigNumber(result1[0]);
        let y3 = new BigNumber(result1[1]);
        const z3 = new BigNumber(result1[2]);
        const result2 = await ecdh.ecMul(3, gx.toFixed(), gy.toFixed(), 1);
        let x3c = new BigNumber(result2[0]);
        let y3c = new BigNumber(result2[1]);
        const z3c = new BigNumber(result2[2]);
        const result3 = new BigNumber(await ecdh.inverse(z3.toFixed()));
        x3 = x3.multipliedBy(result3).modulo(n);
        y3 = y3.multipliedBy(result3).modulo(n);
        const result4 = await ecdh.inverse(z3c.toFixed());
        x3c = x3c.multipliedBy(result4).modulo(n);
        y3c = y3c.multipliedBy(result4).modulo(n);
        assert.equal(x3.toString(10), x3c.toString(10));
        assert.equal(y3.toString(10), y3c.toString(10));
    });

    it("Should create a valid public key", async () => {
        const key = ec.genKeyPair();
        const priv = key.getPrivate();
        const d = new BigNumber(priv.toString(16), 16);
        const pub = key.getPublic();
        const pubX = new BigNumber(key.getPublic().x.toString(16), 16);
        const pubY = new BigNumber(key.getPublic().y.toString(16), 16);
        const result = await ecdh.publicKey(d.toFixed());
        const pubXCalc = result[0];
        const pubYCalc = result[1];
        assert.equal(pubX.toString(10), pubXCalc.toString(10));
        assert.equal(pubY.toString(10), pubYCalc.toString(10));
    });

    it("Key derived in both directions should be the same", async () => {
        const key1 = ec.genKeyPair();
        const key2 = ec.genKeyPair();
        const d1 = new BigNumber(key1.getPrivate().toString(16), 16);
        const d2 = new BigNumber(key2.getPrivate().toString(16), 16);
        const pub1X = new BigNumber(key1.getPublic().x.toString(16), 16);
        const pub1Y = new BigNumber(key1.getPublic().y.toString(16), 16);
        const pub2X = new BigNumber(key2.getPublic().x.toString(16), 16);
        const pub2Y = new BigNumber(key2.getPublic().y.toString(16), 16);
        const result = await ecdh.deriveKey(d1.toFixed(), pub2X.toFixed(), pub2Y.toFixed());
        const k12x = result[0];
        const k12y = result[1];
        const result1 = await ecdh.deriveKey(d2.toFixed(), pub1X.toFixed(), pub1Y.toFixed());
        const k21x = result1[0];
        const k21y = result1[1];
        assert.equal(k12x.toString(10), k21x.toString(10));
        assert.equal(k12y.toString(10), k21y.toString(10));

        const kd = key1.derive(key2.getPublic()).toString(10);
        assert.equal(k12x.toString(10), kd);
    });

    it("Should follow associative property", async () => {

        const key1 = ec.genKeyPair();
        const key2 = ec.genKeyPair();
        const d1 = new BigNumber(key1.getPrivate().toString(16), 16);
        const d2 = new BigNumber(key2.getPrivate().toString(16), 16);
        let pub1X;
        let pub1Y;
        let pub2X;
        let pub2Y;
        let pub12X;
        let pub12Y;
        let add12X;
        let add12Y;
        const result = await ecdh.publicKey(d1.toFixed());
        pub1X = new BigNumber(result[0]);
        pub1Y = new BigNumber(result[1]);
        const result1 = await ecdh.publicKey(d2.toFixed());
        pub2X = new BigNumber(result1[0]);
        pub2Y = new BigNumber(result1[1]);
        const d12 = (d1.plus(d2)).modulo(n2);
        const result2 = await ecdh.publicKey(d12.toFixed());
        pub12X = new BigNumber(result2[0]);
        pub12Y = new BigNumber(result2[1]);
        const result3 = await ecdh.ecAdd(pub1X.toFixed(), pub1Y.toFixed(), 1, pub2X.toFixed(), pub2Y.toFixed(), 1);
        add12X = new BigNumber(result3[0]);
        add12Y = new BigNumber(result3[1]);

        const result4 = await ecdh.inverse(result3[2]);
        add12X = add12X.multipliedBy(result4).mod(n);
        add12Y = add12Y.multipliedBy(result4).mod(n);
        assert.equal(pub12X.toString(10), add12X.toString(10));
        assert.equal(pub12Y.toString(10), add12Y.toString(10));
    });
});
