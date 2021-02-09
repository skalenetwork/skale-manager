import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as elliptic from "elliptic";
import { ECDH } from "../typechain";
import "./tools/elliptic-types";

import { gasMultiplier } from "./tools/command_line";
import { skipTime } from "./tools/time";

const EC = elliptic.ec;
const ec = new EC("secp256k1");

import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { deployECDH } from "./tools/deploy/ecdh";
import { deployContractManager } from "./tools/deploy/contractManager";
import { solidity } from "ethereum-waffle";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

const n = BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
const gx = BigNumber.from("0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798");
const gy = BigNumber.from("0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8");
const n2 = BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

describe("ECDH", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let developer: SignerWithAddress;
    let hacker: SignerWithAddress;

    let ecdh: ECDH;

    beforeEach(async () => {
        [owner, validator, developer, hacker] = await ethers.getSigners();

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
        const x1 = n.sub(1);
        const z1 = 1;
        const x2 = 2;
        const z2 = 1;
        const result = await ecdh.jAdd(x1, z1, x2, z2);
        result.x3.should.be.equal(1);
        result.z3.should.be.equal(1);
    });

    it("Should Add two big numbers", async () => {
        const x1 = n.sub(1);
        const z1 = 1;
        const x2 = n.sub(2);
        const z2 = 1;
        const result = await ecdh.jAdd(x1, z1, x2, z2);
        result.x3.should.be.equal(n.sub(3));
        result.z3.should.be.equal(1);
    });

    it("Should Subtract two small numbers", async () => {
        const x1 = 2;
        const z1 = 3;
        const x2 = 4;
        const z2 = 5;
        const result = await ecdh.jSub(x1, z1, x2, z2);
        result.x3.should.be.equal(n.sub(2));
        result.z3.should.be.equal(15);
    });

    it("Should Subtract one big numbers with one small", async () => {
        const x1 = 2;
        const z1 = 1;
        const x2 = n.sub(1);
        const z2 = 1;
        const result = await ecdh.jSub(x1, z1, x2, z2);
        result.x3.should.be.equal(3);
        result.z3.should.be.equal(1);
    });

    it("Should Subtract two big numbers", async () => {
        const x1 = n.sub(2);
        const z1 = 1;
        const x2 = n.sub(1);
        const z2 = 1;
        const result = await ecdh.jSub(x1, z1, x2, z2);
        result.x3.should.be.equal( n.sub(1));
        result.z3.should.be.equal(1);
    });

    it("Should Subtract two same numbers", async () => {
        const x1 = n.sub(16);
        const z1 = 1;
        const x2 = n.sub(16);
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
        const x1 = n.sub(1);
        const z1 = 1;
        const x2 = 2;
        const z2 = 1;
        const result = await ecdh.jMul(x1, z1, x2, z2);
        result.x3.should.be.equal( n.sub(2));
        result.z3.should.be.equal(1);
    });

    it("Should Multiply two big numbers", async () => {
        const x1 = n.sub(2);
        const z1 = 1;
        const x2 = n.sub(3);
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
        const x1 = n.sub(1);
        const z1 = 1;
        const x2 = 2;
        const z2 = 1;
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        result.x3.should.be.equal(n.sub(1));
        result.z3.should.be.equal(2);
    });

    it("Should Divide two big numbers", async () => {
        const x1 = n.sub(2);
        const z1 = 1;
        const x2 = n.sub(3);
        const z2 = 1;
        const result = await ecdh.jDiv(x1, z1, x2, z2);
        result.x3.should.be.equal(n.sub(2));
        result.z3.should.be.equal(n.sub(3));
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
        const result = await ecdh.inverse(d).should.be.eventually.rejectedWith("Input is incorrect");
    });

    it("Inverse of 1", async () => {
        const d = 1;
        const result = await ecdh.inverse(d);
        result.should.be.equal(1);
    });

    it("Should Calculate inverse -1", async () => {
        const d = n.sub(1);
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        result1.x3.should.be.equal(1);
        result1.z3.should.be.equal(1);
    });

    it("Should Calculate inverse -2", async () => {
        const d = n.sub(1);
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        result1.x3.should.be.equal(1);
        result1.z3.should.be.equal(1);

    });

    it("Should Calculate inverse big number", async () => {
        const d = BigNumber.from("0xf167a208bea79bc52668c016aff174622837f780ab60f59dfed0a8e66bb7c2ad");
        const result = await ecdh.inverse(d);
        const result1 = await ecdh.jMul(d, 1, result, 1);
        result1.x3.should.be.equal(1);
        result1.z3.should.be.equal(1);
    });
    it("Should double gx,gy", async () => {
        let ln = gx.mul(gx).mul(3);
        let ld = gy.mul(2);

        ln = ln.mod(n);
        ld = ld.mod(n);

        let x2ccN = ln.mul(ln);
        let x2ccD = ld.mul(ld);

        x2ccN = x2ccN.sub(gx.mul(2).mul(x2ccD));

        x2ccN = x2ccN.mod(n);
        if (x2ccN.lt(0)) {
            x2ccN = x2ccN.add(n);
        }
        x2ccD = x2ccD.mod(n);
        if (x2ccD.lt(0)) {
            x2ccD = x2ccD.add(n);
        }

        let y2ccN;
        y2ccN  = gx.mul(x2ccD).mul(ln);
        y2ccN = y2ccN.sub( x2ccN.mul(ln) );
        y2ccN = y2ccN.sub( gy.mul(x2ccD).mul(ld) );

        let y2ccD;
        y2ccD  = x2ccD.mul(ld);

        y2ccN = y2ccN.mod(n);
        if (y2ccN.lt(0)) {
            y2ccN = y2ccN.add(n);
        }
        y2ccD = y2ccD.mod(n);
        if (y2ccD.lt(0)) {
            y2ccD = y2ccD.add(n);
        }

        let ccD = y2ccD.mul(x2ccD);
        x2ccN = x2ccN.mul(y2ccD);
        y2ccN = y2ccN.mul(x2ccD);

        x2ccN = x2ccN.mod(n);
        if (x2ccN.lt(0)) {
            x2ccN = x2ccN.add(n);
        }
        y2ccN = y2ccN.mod(n);
        if (y2ccN.lt(0)) {
            y2ccN = y2ccN.add(n);
        }
        ccD = ccD.mod(n);
        if (ccD.lt(0)) {
            ccD = ccD.add(n);
        }

        const result = await ecdh.ecDouble(gx, gy, 1);
        let x2 = result.x3;
        let y2 = result.y3;
        const z2 = result.z3;

        const result1 = await ecdh.inverse(z2);
        x2 = x2.mul(result1).mod(n);
        y2 = y2.mul(result1).mod(n);
        x2.should.be.equal("89565891926547004231252920425935692360644145829622209833684329913297188986597");
        y2.should.be.equal("12158399299693830322967808612713398636155367887041628176798871954788371653930");

    });
    it("Add EC", async () => {
        const x2 = BigNumber.from("89565891926547004231252920425935692360644145829622209833684329913297188986597");
        const y2 = BigNumber.from("12158399299693830322967808612713398636155367887041628176798871954788371653930");
        const result = await ecdh.ecAdd(gx, gy, 1, x2, y2, 1);
        let x3 = result.x3;
        let y3 = result.y3;
        const z3 = result.z3;
        const result1 = await ecdh.inverse(z3);
        x3 = x3.mul(result1).mod(n);
        y3 = y3.mul(result1).mod(n);
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
        x3 = x3.mul(result3).mod(n);
        y3 = y3.mul(result3).mod(n);
        const result4 = await ecdh.inverse(z3c);
        x3c = x3c.mul(result4).mod(n);
        y3c = y3c.mul(result4).mod(n);
        x3.should.be.equal(x3c);
        y3.should.be.equal(y3c);
    });

    it("Should create a valid public key", async () => {
        const key = ec.genKeyPair();
        const priv = key.getPrivate();
        const d = BigNumber.from("0x" + priv.toString(16));
        const pub = key.getPublic();
        const pubX = BigNumber.from("0x" + key.getPublic().x.toString(16));
        const pubY = BigNumber.from("0x" + key.getPublic().y.toString(16));
        const result = await ecdh.publicKey(d);
        const pubXCalc = result[0];
        const pubYCalc = result[1];
        pubX.should.be.equal(pubXCalc);
        pubY.should.be.equal(pubYCalc);
    });

    it("Key derived in both directions should be the same", async () => {
        const key1 = ec.genKeyPair();
        const key2 = ec.genKeyPair();
        const d1 = BigNumber.from("0x" + key1.getPrivate().toString(16));
        const d2 = BigNumber.from("0x" + key2.getPrivate().toString(16));
        const pub1X = BigNumber.from("0x" + key1.getPublic().x.toString(16));
        const pub1Y = BigNumber.from("0x" + key1.getPublic().y.toString(16));
        const pub2X = BigNumber.from("0x" + key2.getPublic().x.toString(16));
        const pub2Y = BigNumber.from("0x" + key2.getPublic().y.toString(16));
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

        const key1 = ec.genKeyPair();
        const key2 = ec.genKeyPair();
        const d1 = BigNumber.from("0x" + key1.getPrivate().toString(16));
        const d2 = BigNumber.from("0x" + key2.getPrivate().toString(16));
        let pub1X;
        let pub1Y;
        let pub2X;
        let pub2Y;
        let pub12X;
        let pub12Y;
        let add12X;
        let add12Y;
        const result = await ecdh.publicKey(d1);
        pub1X = result.qx;
        pub1Y = result.qy;
        const result1 = await ecdh.publicKey(d2);
        pub2X = result1.qx;
        pub2Y = result1.qy;
        const d12 = (d1.add(d2)).mod(n2);
        const result2 = await ecdh.publicKey(d12);
        pub12X = result2.qx;
        pub12Y = result2.qy;
        const result3 = await ecdh.ecAdd(pub1X, pub1Y, 1, pub2X, pub2Y, 1);
        add12X = result3.x3;
        add12Y = result3.y3;

        const result4 = await ecdh.inverse(result3[2]);
        add12X = add12X.mul(result4).mod(n);
        add12Y = add12Y.mul(result4).mod(n);
        pub12X.should.be.equal(add12X);
        pub12Y.should.be.equal(add12Y);
    });
});
