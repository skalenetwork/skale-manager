import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Decryption } from "../typechain-types";
import { deployDecryption } from "./tools/deploy/decryption";
import { deployContractManager } from "./tools/deploy/contractManager";
import { fastBeforeEach } from "./tools/mocha";

chai.should();
chai.use(chaiAsPromised);

describe("Decryption", () => {
    let decryption: Decryption;

    fastBeforeEach(async () => {
        decryption = await deployDecryption(await deployContractManager());
    });

    describe("when decryption contract is activated", () => {
        it("should encrypt and decrypt messages with a given key correctly", async () => {
            const secretNumber = 123456789;
            const key = "0x814eda04f881a67553ab65e4a0aeca015591a9aaa3f6bd2246508ce2f42905a6";
            const encrypted = await decryption.encrypt(secretNumber, key);
            const decrypted = await decryption.decrypt(encrypted, key);
            decrypted.should.be.equal(secretNumber);
        });
    });
});
