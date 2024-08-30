import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {ECDH} from "../typechain-types";
import {ec} from "elliptic";

const secp256k1Curve = new ec("secp256k1");

import {deployECDH} from "./tools/deploy/ecdh";
import {deployContractManager} from "./tools/deploy/contractManager";
import {fastBeforeEach} from "./tools/mocha";

chai.should();
chai.use(chaiAsPromised);

const n = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
const gx = BigInt("0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798");
const gy = BigInt("0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8");
const n2 = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

describe("ECDH", () => {
    let ecdh: ECDH;

    fastBeforeEach(async () => {
        const contractManager = await deployContractManager();

        ecdh = await deployECDH(contractManager);
    });

    it("Should Add two small numbers", async () => {
        const x1 = 2;
        const z1 = 3;
        const x2 = 4;
        const z2 = 5;
        const result = await ecdh.jAdd(x1, z1, x2, z2);
        result.x3.should.be.equal(22);
        result.z3.should.be.equal(15);
    });

    it("Should Add one big numbers with one small", async () => {
        const x1 = n - 1n;
        const z1 = 1;
        const x2 = 2;
        const z2 = 1;
        const result = await ecdh.jAdd(x1, z1, x2, z2);
        result.x3.should.be.equal(1);
        result.z3.should.be.equal(1);
    });

    it("Should Add two big numbers", async () => {
        const x1 = n - 1n;
        const z1 = 1;
        const x2 = n - 2n;
        const z2 = 1;
        const result = await ecdh.jAdd(x1, z1, x2, z2);
        result.x3.should.be.equal(n - 3n);
        result.z3.should.be.equal(1);
    });

    it("Should Subtract two small numbers", async () => {
        const x1 = 2;
        const z1 = 3;
        const x2 = 4;
        const z2 = 5;
        const result = await ecdh.jSub(x1, z1, x2, z2);
        result.x3.should.be.equal(n - 2n);
        result.z3.should.be.equal(15);
    });

    it("Should Subtract one big numbers with one small", async () => {
        const x1 = 2;
        const z1 = 1;
        const x2 = n - 1n;
        const z2 = 1;
        const result = await ecdh.jSub(x1, z1, x2, z2);
        result.x3.should.be.equal(3);
        result.z3.should.be.equal(1);
    });

    it("Should Subtract two big numbers", async () => {
        const x1 = n - 2n;
        const z1 = 1;
        const x2 = n - 1n;
        const z2 = 1;
        const result = await ecdh.jSub(x1, z1, x2, z2);
        result.x3.should.be.equal( n - 1n);
        result.z3.should.be.equal(1);
    });

    it("Should Subtract two same numbers", async () => {
        const x1 = n - 16n;
        const z1 = 1;
        const x2 = n - 16n;
        const z2 = 1;
        const result = await ecdh.jSub(x1, z1, x2, z2);
        result.x3.should.be.equal(0);
        result.z3.should.be.equal(1);
    });

    it("Should Multiply two small numbers", async () => {
        const x1 = 2;
        const z1 = 3;
        const x2 = 4;
        const z2 = 5;
        const result = await ecdh.jMul(x1, z1, x2, z2);
        result.x3.should.be.equal(8);
        result.z3.should.be.equal(15);
    });

    it("Should Multiply one big numbers with one small", async () => {
        const x1 = n - 1n;
        const z1 = 1;
        const x2 = 2;
        const z2 = 1;
        const result = await ecdh.jMul(x1, z1, x2, z2);
        result.x3.should.be.equal( n - 2n);
        result.z3.should.be.equal(1);
    });

    it("Should Multiply two big numbers", async () => {
        const x1 = n - 2n;
        const z1 = 1;
        const x2 = n - 3n;
        const z2 = 1;
        const result = await ecdh.jMul(x1, z1, x2, z2);
        result.x3.should.be.equal(6);
        result.z3.should.be.equal(1);
    });

    it("Should Multiply one is zero", async () => {
        const x1 = 2;
        const z1 = 3;
        const x2 = 0;
        const z2 = 5;
        const result = await ecdh.jMul(x1, z1, x2, z2);
        result.x3.should.be.equal(0);
        result.z3.should.be.equal(15);
    });

    it("Should Divide two small numbers", async () => {
        const x1 = 2;
        const z1 = 3;
        const x2 = 4;
        const z2 = 5;
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        result.x3.should.be.equal(10);
        result.z3.should.be.equal(12);
    });

    it("Should Divide one big numbers with one small", async () => {
        const x1 = n - 1n;
        const z1 = 1;
        const x2 = 2;
        const z2 = 1;
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        result.x3.should.be.equal(n - 1n);
        result.z3.should.be.equal(2);
    });

    it("Should Divide two big numbers", async () => {
        const x1 = n - 2n;
        const z1 = 1;
        const x2 = n - 3n;
        const z2 = 1;
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        result.x3.should.be.equal(n - 2n);
        result.z3.should.be.equal(n - 3n);
    });

    it("Should Divide one is zero", async () => {
        const x1 = 2;
        const z1 = 3;
        const x2 = 0;
        const z2 = 5;
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        result.x3.should.be.equal(10);
        result.z3.should.be.equal(0);
    });

    it("Should Calculate inverse", async () => {
        const d = 2;
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        result1.x3.should.be.equal(1);
        result1.z3.should.be.equal(1);
    });

    it("Inverse of 0", async () => {
        const d = 0;
        await ecdh.inverse(d).should.be.eventually.rejectedWith("Input is incorrect");
    });

    it("Inverse of 1", async () => {
        const d = 1;
        const result = await ecdh.inverse(d);
        result.should.be.equal(1);
    });

    it("Should Calculate inverse -1", async () => {
        const d = n - 1n;
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        result1.x3.should.be.equal(1);
        result1.z3.should.be.equal(1);
    });

    it("Should Calculate inverse -2", async () => {
        const d = n - 1n;
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        result1.x3.should.be.equal(1);
        result1.z3.should.be.equal(1);
    });

    it("Should Calculate inverse big number", async () => {
        const d = BigInt("0xf167a208bea79bc52668c016aff174622837f780ab60f59dfed0a8e66bb7c2ad");
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        result1.x3.should.be.equal(1);
        result1.z3.should.be.equal(1);
    });
    it("Should double gx,gy", async () => {
        let ln = gx * gx * 3n;
        let ld = gy * 2n;

        ln = ln % n;
        ld = ld % n;

        let x2ccN = ln * ln;
        let x2ccD = ld * ld;

        x2ccN = x2ccN - (gx * 2n * x2ccD);

        x2ccN = x2ccN % n;
        if (x2ccN < 0n) {
            x2ccN = x2ccN + n;
        }
        x2ccD = x2ccD % n;
        if (x2ccD < 0n) {
            x2ccD = x2ccD + n;
        }

        let y2ccN;
        y2ccN  = gx * x2ccD * ln;
        y2ccN = y2ccN - x2ccN * ln;
        y2ccN = y2ccN - gy * x2ccD * ld;

        let y2ccD;
        y2ccD  = x2ccD * ld;

        y2ccN = y2ccN % n;
        if (y2ccN < 0n) {
            y2ccN = y2ccN + n;
        }
        y2ccD = y2ccD % n;
        if (y2ccD < 0n) {
            y2ccD = y2ccD + n;
        }

        let ccD = y2ccD * x2ccD;
        x2ccN = x2ccN * y2ccD;
        y2ccN = y2ccN * x2ccD;

        x2ccN = x2ccN % n;
        if (x2ccN < 0n) {
            x2ccN = x2ccN + n;
        }
        y2ccN = y2ccN % n;
        if (y2ccN < 0n) {
            y2ccN = y2ccN + n;
        }
        ccD = ccD % n;
        if (ccD < 0n) {
            ccD = ccD + n;
        }

        const result = await ecdh.ecDouble(gx, gy, 1);
        let x2 = result.x3;
        let y2 = result.y3;
        const z2 = result.z3;

        const result1 = await ecdh.inverse(z2);
        x2 = x2 * result1 % n;
        y2 = y2 * result1 % n;
        x2.should.be.equal("89565891926547004231252920425935692360644145829622209833684329913297188986597");
        y2.should.be.equal("12158399299693830322967808612713398636155367887041628176798871954788371653930");
    });
    it("Add EC", async () => {
        const x2 = BigInt("89565891926547004231252920425935692360644145829622209833684329913297188986597");
        const y2 = BigInt("12158399299693830322967808612713398636155367887041628176798871954788371653930");
        const result = await ecdh.ecAdd(gx, gy, 1, x2, y2, 1);
        let x3 = result.x3;
        let y3 = result.y3;
        const z3 = result.z3;
        const result1 = await ecdh.inverse(z3);
        x3 = x3 * result1 % n;
        y3 = y3 * result1 % n;
        x3.should.be.equal("112711660439710606056748659173929673102114977341539408544630613555209775888121");
        y3.should.be.equal("25583027980570883691656905877401976406448868254816295069919888960541586679410");
    });

    it("2G+1G = 3G", async () => {
        const result = await ecdh.ecDouble(gx, gy, 1);
        const x2 = result.x3;
        const y2 = result.y3;
        const z2 = result.z3;
        const result1 = await ecdh.ecAdd(gx, gy, 1, x2, y2, z2);
        let x3 = result1.x3;
        let y3 = result1.y3;
        const z3 = result1.z3;
        const result2 = await ecdh.ecMul(3, gx, gy, 1);
        let x3c = result2.x3;
        let y3c = result2.y3;
        const z3c = result2.z3;
        const result3 = await ecdh.inverse(z3);
        x3 = x3 * result3 % n;
        y3 = y3 * result3 % n;
        const result4 = await ecdh.inverse(z3c);
        x3c = x3c * result4 % n;
        y3c = y3c * result4 % n;
        x3.should.be.equal(x3c);
        y3.should.be.equal(y3c);
    });

    it("Should create a valid public key", async () => {
        const key = secp256k1Curve.genKeyPair();
        const priv = key.getPrivate();
        const d = BigInt("0x" + priv.toString(16));
        const pubX = BigInt("0x" + key.getPublic().getX().toString(16));
        const pubY = BigInt("0x" + key.getPublic().getY().toString(16));
        const result = await ecdh.publicKey(d);
        const pubXCalc = result[0];
        const pubYCalc = result[1];
        pubX.should.be.equal(pubXCalc);
        pubY.should.be.equal(pubYCalc);
    });

    it("Key derived in both directions should be the same", async () => {
        const key1 = secp256k1Curve.genKeyPair();
        const key2 = secp256k1Curve.genKeyPair();
        const d1 = BigInt("0x" + key1.getPrivate().toString(16));
        const d2 = BigInt("0x" + key2.getPrivate().toString(16));
        const pub1X = BigInt("0x" + key1.getPublic().getX().toString(16));
        const pub1Y = BigInt("0x" + key1.getPublic().getY().toString(16));
        const pub2X = BigInt("0x" + key2.getPublic().getX().toString(16));
        const pub2Y = BigInt("0x" + key2.getPublic().getY().toString(16));
        const result = await ecdh.deriveKey(d1, pub2X, pub2Y);
        const k12x = result[0];
        const k12y = result[1];
        const result1 = await ecdh.deriveKey(d2, pub1X, pub1Y);
        const k21x = result1[0];
        const k21y = result1[1];
        k12x.should.be.equal(k21x);
        k12y.should.be.equal(k21y);

        const kd = key1.derive(key2.getPublic()).toString(10);
        k12x.should.be.equal(kd);
    });

    it("Should follow associative property", async () => {
        const key1 = secp256k1Curve.genKeyPair();
        const key2 = secp256k1Curve.genKeyPair();
        const d1 = BigInt("0x" + key1.getPrivate().toString(16));
        const d2 = BigInt("0x" + key2.getPrivate().toString(16));
        let add12X;
        let add12Y;
        const result = await ecdh.publicKey(d1);
        const pub1X = result.qx;
        const pub1Y = result.qy;
        const result1 = await ecdh.publicKey(d2);
        const pub2X = result1.qx;
        const pub2Y = result1.qy;
        const d12 = (d1 + d2) % n2;
        const result2 = await ecdh.publicKey(d12);
        const pub12X = result2.qx;
        const pub12Y = result2.qy;
        const result3 = await ecdh.ecAdd(pub1X, pub1Y, 1, pub2X, pub2Y, 1);
        add12X = result3.x3;
        add12Y = result3.y3;

        const result4 = await ecdh.inverse(result3[2]);
        add12X = add12X * result4 % n;
        add12Y = add12Y * result4 % n;
        pub12X.should.be.equal(add12X);
        pub12Y.should.be.equal(add12Y);
    });
});
