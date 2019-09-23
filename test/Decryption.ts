import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { DecryptionContract,
         DecryptionInstance} from "../types/truffle-contracts";

import { gasMultiplier } from "./utils/command_line";
import { skipTime } from "./utils/time";
// const truffleAssert = require('truffle-assertions');
// const truffleEvent = require('truffle-events');

const Decryption: DecryptionContract = artifacts.require("./Decryption");

import BigNumber from "bignumber.js";
chai.should();
chai.use(chaiAsPromised);

contract("Decryption", ([owner, validator, developer, hacker]) => {
    let decryption: DecryptionInstance;

    beforeEach(async () => {
        decryption = await Decryption.new({from: owner, gas: 8000000 * gasMultiplier});
    });

    describe("when decryption contract is activated", async () => {
        it("should encrypt and decrypt messages with a given key correctly", async () => {
            const secretNumber = new BigNumber("123456789");
            const key = "0x814eda04f881a67553ab65e4a0aeca015591a9aaa3f6bd2246508ce2f42905a6";
            const encrypted = await decryption.encrypt(secretNumber, key);
            const decrypted = await decryption.decrypt(encrypted, key);
            assert(new BigNumber(decrypted.toString()).toString().should.be.equal(secretNumber.toString()));
        });
    });
});
