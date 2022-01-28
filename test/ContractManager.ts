import { ConstantsHolder,
         ContractManager } from "../typechain-types";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { fastBeforeEach } from "./tools/mocha";

chai.should();
chai.use(chaiAsPromised);

describe("ContractManager", () => {
  let user: SignerWithAddress;

  let contractManager: ContractManager;
  let constantsHolder: ConstantsHolder;

  fastBeforeEach(async () => {
    [, user] = await ethers.getSigners();

    contractManager = await deployContractManager();
    constantsHolder = await deployConstantsHolder(contractManager);
  });

  it("Should add a right contract address (ConstantsHolder) to the register", async () => {
    const simpleContractName = "Constants";
    await contractManager.connect(user).setContractsAddress(simpleContractName, constantsHolder.address)
      .should.be.eventually.rejectedWith("Ownable: caller is not the owner");
    await contractManager.setContractsAddress(simpleContractName, constantsHolder.address);

    (await contractManager.getContract("ConstantsHolder")).should.be.equal(constantsHolder.address);
  });
});
