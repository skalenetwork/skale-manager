import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Decryption } from "../typechain";

import { gasMultiplier } from "./tools/command_line";
import { skipTime } from "./tools/time";

import { BigNumber } from "ethers";
import { deployDecryption } from "./tools/deploy/decryption";
import { deployContractManager } from "./tools/deploy/contractManager";
import { solidity } from "ethereum-waffle";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

describe("Decryption", () => {
    let decryption: Decryption;

    beforeEach(async () => {
        decryption = await deployDecryption(await deployContractManager());
    });

    describe("when decryption contract is activated", async () => {
        it("should encrypt and decrypt messages with a given key correctly", async () => {
            const secretNumber = 123456789;
            const key = "0x814eda04f881a67553ab65e4a0aeca015591a9aaa3f6bd2246508ce2f42905a6";
            const encrypted = await decryption.encrypt(secretNumber, key);
            const decrypted = await decryption.decrypt(encrypted, key);
            decrypted.should.be.equal(secretNumber);
        });
    });
});
