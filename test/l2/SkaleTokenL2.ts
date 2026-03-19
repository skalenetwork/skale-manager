import {ContractManager,
    SkaleTokenL2,
} from "../../typechain-types";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {deployContractManager} from "../tools/deploy/contractManager";
import {deploySkaleManagerMock} from "../tools/deploy/test/skaleManagerMock";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import {fastBeforeEach} from "../tools/mocha";
import { deployTokenState } from "../tools/deploy/delegation/tokenState";

chai.should();
chai.use(chaiAsPromised);

describe("SkaleTokenL2", () => {
    let owner: SignerWithAddress;
    let remoteToken: SignerWithAddress;
    let bridge: SignerWithAddress;

    let skaleTokenL2: SkaleTokenL2;
    let contractManager: ContractManager;

    fastBeforeEach(async () => {
        [owner, remoteToken, bridge] = await ethers.getSigners();

        contractManager = await deployContractManager();
        await deployTokenState(contractManager);

        skaleTokenL2 = await ethers.deployContract(
            "SkaleTokenL2",
            [contractManager, [], remoteToken, bridge]
        ) as unknown as SkaleTokenL2;

        await skaleTokenL2.grantRole(await skaleTokenL2.MINTER_ROLE(), owner);

        const premined = ethers.parseEther("5000000000"); // 5e9 * 1e18
        await skaleTokenL2["mint(address,uint256)"](owner, premined);
    });

    it("should allow minting tokens to ERC777 incompatible contracts", async () => {
        const value = ethers.parseEther("1");
        await skaleTokenL2["mint(address,uint256)"](contractManager, value);
        await skaleTokenL2.balanceOf(contractManager).should.eventually.equal(value);
    });
});
