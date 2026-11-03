import {ConstantsHolder,
         ContractManager} from "../typechain-types";
import {deployConstantsHolder} from "./tools/deploy/constantsHolder";
import {deployContractManager} from "./tools/deploy/contractManager";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import chai, {expect} from "chai";
import chaiAsPromised from "chai-as-promised";
import {fastBeforeEach} from "./tools/mocha";

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
    await contractManager.connect(user).setContractsAddress(simpleContractName, constantsHolder)
      .should.be.eventually.rejectedWith("Ownable: caller is not the owner");
    await contractManager.setContractsAddress(simpleContractName, constantsHolder);

    (await contractManager.getContract("ConstantsHolder")).should.be.equal(constantsHolder);
  });

  it("Should reject incorrect contract addresses", async () => {
    const simpleContractName = "Constants";
    await expect(contractManager.setContractsAddress(simpleContractName, ethers.ZeroAddress))
      .to.be.revertedWithCustomError(contractManager, "ZeroAddress");
    await expect(contractManager.setContractsAddress(simpleContractName, user.address))
      .to.be.revertedWithCustomError(contractManager, "IsNotContract")
      .withArgs(user.address);
    await contractManager.setContractsAddress(simpleContractName, constantsHolder);
    await expect(contractManager.setContractsAddress(simpleContractName, constantsHolder))
      .to.be.revertedWithCustomError(contractManager, "ContractAlreadyAdded")
      .withArgs(simpleContractName, await constantsHolder.getAddress());
  });

  it("Should reject a request for an unknown contract", async () => {
    await expect(contractManager.getContract("Unknown"))
      .to.be.revertedWithCustomError(contractManager, "ContractNotFound")
      .withArgs("Unknown");
  });
});
