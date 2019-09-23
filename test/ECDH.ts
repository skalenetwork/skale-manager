import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as elliptic from "elliptic";
import { ECDHContract,
         ECDHInstance} from "../types/truffle-contracts";
import "./utils/elliptic-types";

import { gasMultiplier } from "./utils/command_line";
import { skipTime } from "./utils/time";

const EC = elliptic.ec;
const ec = new EC("secp256k1");
// const truffleAssert = require("truffle-assertions");
// const truffleEvent = require("truffle-events");

const ECDH: ECDHContract = artifacts.require("./ECDH");
// let EC = require("elliptic").ec;

import BigNumber from "bignumber.js";
chai.should();
chai.use(chaiAsPromised);

// const ec = new EC("secp256k1");

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
        const result = await ecdh._jAdd(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "22");
        assert.equal(result[1].toString(10), "15");
    });
    it("Should Add one big numbers with one small", async () => {
        const x1 = n.minus(1).toFixed();
        const z1 = new BigNumber(1);
        const x2 = new BigNumber(2);
        const z2 = new BigNumber(1);
        const result = await ecdh._jAdd(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "1");
        assert.equal(result[1].toString(10), "1");
    });
    it("Should Add two big numbers", async () => {
        const x1 = n.minus(1).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(2).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh._jAdd(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(3).toString(10));
        assert.equal(result[1].toString(10), "1");
    });
    it("Should Substract two small numbers", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(4);
        const z2 = new BigNumber(5);
        const result = await ecdh._jSub(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(2).toString(10));
        assert.equal(result[1].toString(10), "15");
    });
    it("Should Substract one big numbers with one small", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(1);
        const x2 = n.minus(1).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh._jSub(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "3");
        assert.equal(result[1].toString(10), "1");
    });
    it("Should Substract two big numbers", async () => {
        const x1 = n.minus(2).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(1).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh._jSub(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(1).toString(10));
        assert.equal(result[1].toString(10), "1");
    });
    it("Should Substract two same numbers", async () => {
        const x1 = n.minus(16).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(16).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh._jSub(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "0");
        assert.equal(result[1].toString(10), "1");
    });
    it("Should Multiply two small numbers", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(4);
        const z2 = new BigNumber(5);
        const result = await ecdh._jMul(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "8");
        assert.equal(result[1].toString(10), "15");
    });
    it("Should Multiply one big numbers with one small", async () => {
        const x1 = n.minus(1).toFixed();
        const z1 = new BigNumber(1);
        const x2 = new BigNumber(2);
        const z2 = new BigNumber(1);
        const result = await ecdh._jMul(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(2).toString(10));
        assert.equal(result[1].toString(10), "1");
    });
    it("Should Multiply two big numbers", async () => {
        const x1 = n.minus(2).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(3).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh._jMul(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "6");
        assert.equal(result[1].toString(10), "1");
    });
    it("Should Multiply one is zero", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(0);
        const z2 = new BigNumber(5);
        const result = await ecdh._jMul(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "0");
        assert.equal(result[1].toString(10), "15");
    });
    it("Should Divide two small numbers", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(4);
        const z2 = new BigNumber(5);
        const result = await ecdh._jDiv(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "10");
        assert.equal(result[1].toString(10), "12");
    });
    it("Should Divide one big numbers with one small", async () => {
        const x1 = n.minus(1).toFixed();
        const z1 = new BigNumber(1);
        const x2 = new BigNumber(2);
        const z2 = new BigNumber(1);
        const result = await ecdh._jDiv(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(1).toString(10));
        assert.equal(result[1].toString(10), "2");
    });
    it("Should Divide two big numbers", async () => {
        const x1 = n.minus(2).toFixed();
        const z1 = new BigNumber(1);
        const x2 = n.minus(3).toFixed();
        const z2 = new BigNumber(1);
        const result = await ecdh._jDiv(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), n.minus(2).toString(10));
        assert.equal(result[1].toString(10), n.minus(3).toString(10));
    });
    it("Should Divide one is zero", async () => {
        const x1 = new BigNumber(2);
        const z1 = new BigNumber(3);
        const x2 = new BigNumber(0);
        const z2 = new BigNumber(5);
        const result = await ecdh._jDiv(x1, z1, x2, z2);
        assert.equal(result[0].toString(10), "10");
        assert.equal(result[1].toString(10), "0");
    });
    it("Should Calculate inverse", async () => {
        const d = new BigNumber(2);
        const result = await ecdh._inverse(d);
        const result1 = await ecdh._jMul(d, 1, result, 1);
        assert.equal(result1[0].toString(10), "1");
        assert.equal(result1[1].toString(10), "1");
    });
    it("Inverse of 0", async () => {
        const d = new BigNumber(0);
        const result = await ecdh._inverse(d);
        assert.equal(result.toString(10), "0");
    });
    it("Inverse of 1", async () => {
        const d = new BigNumber(1);
        const result = await ecdh._inverse(d);
        assert.equal(result.toString(10), "1");
    });
    it("Should Calculate inverse -1", async () => {
        const d = n.minus(1).toFixed();
        const result = await ecdh._inverse(d);
        const result1 = await ecdh._jMul(d, 1, result, 1);
        assert.equal(result1[0].toString(10), "1");
        assert.equal(result1[1].toString(10), "1");
    });
    it("Should Calculate inverse -2", async () => {
        const d = n.minus(1).toFixed();
        const result = await ecdh._inverse(d);
        const result1 = await ecdh._jMul(d, 1, result, 1);
        assert.equal(result1[0].toString(10), "1");
        assert.equal(result1[1].toString(10), "1");

    });
    it("Should Calculate inverse big number", async () => {
        const d = new BigNumber("f167a208bea79bc52668c016aff174622837f780ab60f59dfed0a8e66bb7c2ad", 16).toFixed();
        const result = await ecdh._inverse(d);
        const result1 = await ecdh._jMul(d, 1, result, 1);
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

/*
        const y2ccN;
        const y2ccD;

        y2ccN = gx.mul(x2ccD).minus(x2ccN);
        y2ccD = x2ccD;

        y2ccN = y2ccN.mul(ln);
        y2ccD = y2ccD.mul(ld);

        y2ccN = y2ccN.minus ( gy.mul(y2ccD));
*/

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

        const result = await ecdh._ecDouble(gx.toFixed(), gy.toFixed(), 1);
        let x2 = new BigNumber(result[0]);
        let y2 = new BigNumber(result[1]);
        const z2 = new BigNumber(result[2]);
        // log("x2: " + x2.toString(10));
        // log("y2: " + y2.toString(10));
        // log("z2: " + z2.toString(10));
        const result1 = new BigNumber(await ecdh._inverse(z2.toFixed()));
        // log("Inverse: " + inv.toString(10));
        // log("Inv test: "+ inv.mul(z2).mod(n).toString(10));
        x2 = x2.multipliedBy(result1).modulo(n);
        y2 = y2.multipliedBy(result1).modulo(n);
        // log("x2: " + x2.toString(10));
        // log("y2: " + y2.toString(10));
        assert.equal(x2.toString(10), "89565891926547004231252920425935692360644145829622209833684329913297188986597");
        assert.equal(y2.toString(10), "12158399299693830322967808612713398636155367887041628176798871954788371653930");

    });
    it("Add EC", async () => {
        const x2 = new BigNumber("89565891926547004231252920425935692360644145829622209833684329913297188986597");
        const y2 = new BigNumber("12158399299693830322967808612713398636155367887041628176798871954788371653930");
        const result = await ecdh._ecAdd(gx.toFixed(), gy.toFixed(), 1, x2.toFixed(), y2.toFixed(), 1);
        let x3 = new BigNumber(result[0]);
        let y3 = new BigNumber(result[1]);
        const z3 = new BigNumber(result[2]);
        // log("x3: " + x3.toString(10));
        // log("y3: " + y3.toString(10));
        // log("z3: " + z3.toString(10));
        const result1 = await ecdh._inverse(z3.toFixed());
        x3 = x3.multipliedBy(result1).modulo(n);
        y3 = y3.multipliedBy(result1).modulo(n);
        // log("x3: " + x3.toString(10));
        // log("y3: " + y3.toString(10));
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
        const result = await ecdh._ecDouble(gx.toFixed(), gy.toFixed(), 1);
        const x2 = new BigNumber(result[0]);
        const y2 = new BigNumber(result[1]);
        const z2 = new BigNumber(result[2]);
        // log("x2: " + x2.toString(10));
        // log("y2: " + y2.toString(10));
        // log("z2: " + z2.toString(10));
        const result1 = await ecdh._ecAdd(gx.toFixed(), gy.toFixed(), 1, x2.toFixed(), y2.toFixed(), z2.toFixed());
        let x3 = new BigNumber(result1[0]);
        let y3 = new BigNumber(result1[1]);
        const z3 = new BigNumber(result1[2]);
        // log("x3: " + x3.toString(10));
        // log("y3: " + y3.toString(10));
        // log("z3: " + z3.toString(10));
        const result2 = await ecdh._ecMul(3, gx.toFixed(), gy.toFixed(), 1);
        let x3c = new BigNumber(result2[0]);
        let y3c = new BigNumber(result2[1]);
        const z3c = new BigNumber(result2[2]);
        // log("x3c: " + x3c.toString(10));
        // log("y3c: " + y3c.toString(10));
        // log("z3c: " + z3c.toString(10));
        const result3 = new BigNumber(await ecdh._inverse(z3.toFixed()));
        x3 = x3.multipliedBy(result3).modulo(n);
        y3 = y3.multipliedBy(result3).modulo(n);
        // log("Inv test: "+ inv3.mul(z3).mod(n).toString(10));
        // log("x3n: " + x3.toString(10));
        // log("y3n: " + y3.toString(10));
        const result4 = await ecdh._inverse(z3c.toFixed());
        x3c = x3c.multipliedBy(result4).modulo(n);
        y3c = y3c.multipliedBy(result4).modulo(n);
        // log("Inv test: "+ inv3c.mul(z3c).mod(n).toString(10));
        // log("x3cn: " + x3c.toString(10));
        // log("y3cn: " + y3c.toString(10));
        assert.equal(x3.toString(10), x3c.toString(10));
        assert.equal(y3.toString(10), y3c.toString(10));
    });

    it("Should create a valid public key", async () => {
        const key = ec.genKeyPair();
        const priv = key.getPrivate();
        const d = new BigNumber(priv.toString(16), 16);
        // log(JSON.stringify(priv));
        const pub = key.getPublic();
        // log(JSON.stringify(pub));
        const pubX = new BigNumber(key.getPublic().x.toString(16), 16);
        const pubY = new BigNumber(key.getPublic().y.toString(16), 16);
        // log(d.toString(10));
        // log(pub_x.toString(10));
        // log(pub_y.toString(10));
        const result = await ecdh.publicKey(d.toFixed());
        const pubXCalc = result[0];
        const pubYCalc = result[1];
        assert.equal(pubX.toString(10), pubXCalc.toString(10));
        assert.equal(pubY.toString(10), pubYCalc.toString(10));
    });

//     it("Should consume few gas", async () => {
//         this.timeout(20000);
//         const key = ec.genKeyPair();
//         const d = new BigNumber(key.getPrivate().toString(16), 16);
//         const result = await ecdh.publicKey.estimateGas(d, function(err, gas) {
//             assert.ifError(err);
//             log("Estimate gas: " +gas);
//             assert(gas<1000000,"Public key calculation gas should be lower that 1M");
//             done();
//         });
//     });
//     it("Key derived in both directions should be the same", async () => {
//         this.timeout(20000);
//         const key1 = ec.genKeyPair();
//         const key2 = ec.genKeyPair();
//         const d1 = new BigNumber(key1.getPrivate().toString(16), 16);
//         const d2 = new BigNumber(key2.getPrivate().toString(16), 16);
//         const pub1_x = new BigNumber(key1.getPublic().x.toString(16), 16);
//         const pub1_y = new BigNumber(key1.getPublic().y.toString(16), 16);
//         const pub2_x = new BigNumber(key2.getPublic().x.toString(16), 16);
//         const pub2_y = new BigNumber(key2.getPublic().y.toString(16), 16);
//         const result = await ecdh.deriveKey(d1, pub2_x, pub2_y, function(err, res) {
//             assert.ifError(err);
//             const k1_2x = res[0];
//             const k1_2y = res[1];
//             log("k1_2x:" + k1_2x.toString(10));
//             log("k1_2y:" + k1_2y.toString(10));
//             const result = await ecdh.deriveKey(d2, pub1_x, pub1_y, function(err, res) {
//                 assert.ifError(err);
//                 const k2_1x = res[0];
//                 const k2_1y = res[1];
//                 log("k2_1x:" + k2_1x.toString(10));
//                 log("k2_1y:" + k2_1y.toString(10));
//                 assert.equal(k1_2x.toString(10), k2_1x.toString(10));
//                 assert.equal(k1_2y.toString(10), k2_1y.toString(10));

//                 const kd = key1.derive(key2.getPublic()).toString(10);
//                 log("keyDerived: " + kd);
//                 assert.equal(k1_2x.toString(10), kd);
//                 done();
//             });
//         });
//     });
//     it("Should follow associative property", async () => {
//         this.timeout(20000);

//         log("n: " + n.toString(10));
//         log("n2: " + n2.toString(10));
//         log("gx: " + gx.toString(10));
//         log("gy: " + gy.toString(10));

//         const key1 = ec.genKeyPair();
//         const key2 = ec.genKeyPair();
//         const d1 = new BigNumber(key1.getPrivate().toString(16), 16);
//         const d2 = new BigNumber(key2.getPrivate().toString(16), 16);
//         log("priv1:" + d1.toString(10));
//         log("priv2:" + d2.toString(10));
//         const pub1_x, pub1_y;
//         const pub2_x, pub2_y;
//         const pub12_x, pub12_y;
//         const add12_x, add12_y;
//         async.series([
//             function(cb) {
//                 const result = await ecdh.publicKey(d1, function(err, res) {
//                     if (err) return cb(err);
//                     pub1_x = res[0];
//                     pub1_y = res[1];
//                     log("pub1_x:" + pub1_x.toString(10));
//                     log("pub1_y:" + pub1_y.toString(10));
//                     cb();
//                 });
//             },
//             function(cb) {
//                 const result = await ecdh.publicKey(d2, function(err, res) {
//                     if (err) return cb(err);
//                     pub2_x = res[0];
//                     pub2_y = res[1];
//                     log("pub2_x:" + pub2_x.toString(10));
//                     log("pub2_y:" + pub2_y.toString(10));
//                     cb();
//                 });
//             },
//             function(cb) {
//                 const d12 = (d1.add(d2)).mod(n2);
//                 log("priv12:" + d12.toString(10));
//                 const result = await ecdh.publicKey(d12, function(err, res) {
//                     if (err) return cb(err);
//                     pub12_x = res[0];
//                     pub12_y = res[1];
//                     log("pub12_x:" + pub12_x.toString(10));
//                     log("pub12_y:" + pub12_y.toString(10));
//                     cb();
//                 });
//             },
//             function(cb) {
//                  const result = await ecdh._ecAdd(pub1_x, pub1_y, 1, pub2_x, pub2_y, 1, function(err, res) {
//                     if (err) return cb(err);
//                     add12_x = res[0];
//                     add12_y = res[1];

//                     ecCurve._inverse(res[2], function(err, inv) {
//                         if (err) return cb(err);
//                         log("Inv test2: "+ inv.mul(res[2]).mod(n).toString(10));
//                         add12_x = add12_x.mul(inv).mod(n);
//                         add12_y = add12_y.mul(inv).mod(n);
//                         log("add12_x:" + add12_x.toString(10));
//                         log("add12_y:" + add12_y.toString(10));
//                         cb();
//                     });
//                 });
//             }
//         ], function(err) {
//             assert.ifError(err);
//             assert.equal(pub12_x.toString(10), add12_x.toString(10));
//             assert.equal(pub12_y.toString(10), add12_y.toString(10));
//             done();
//         });

//     });
});
