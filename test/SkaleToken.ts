import { BigNumber } from "ethers";
import { ContractManager,
         SkaleToken,
         SkaleTokenInternalTester} from "../typechain";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deployReentrancyTester } from "./tools/deploy/test/reentracyTester";
import { deploySkaleManagerMock } from "./tools/deploy/test/skaleManagerMock";
import { ethers, web3 } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

describe("SkaleToken", () => {
  let owner: SignerWithAddress;
  let holder: SignerWithAddress;
  let receiver: SignerWithAddress;
  let nilAddress: SignerWithAddress;
  let accountWith99: SignerWithAddress;

  let skaleToken: SkaleToken;
  let contractManager: ContractManager;

  const TOKEN_CAP: number = 7000000000;
  const TOTAL_SUPPLY = 5000000000;

  beforeEach(async () => {
    [owner, holder, receiver, nilAddress, accountWith99] = await ethers.getSigners();

    contractManager = await deployContractManager();

    contractManager = await deployContractManager();
    skaleToken = await deploySkaleToken(contractManager);

    const skaleManagerMock = await deploySkaleManagerMock(contractManager);
    await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);

    const premined = "5000000000000000000000000000"; // 5e9 * 1e18
    await skaleToken.mint(owner.address, premined, "0x", "0x");
  });

  it("should have the correct name", async () => {
    const name = await skaleToken.NAME();
    expect(name).to.be.equal("SKALE");
  });

  it("should have the correct symbol", async () => {
    const symbol = await skaleToken.SYMBOL();
    expect(symbol).to.be.equal("SKL");
  });

  it("should have the correct decimal level", async () => {
    const decimals = await skaleToken.DECIMALS();
    expect(decimals.toNumber()).to.be.equal(18);
  });

  it("should return the capitalization of tokens for the Contract", async () => {
    const cap = await skaleToken.CAP();
    toWei(TOKEN_CAP).should.be.equal(cap);
  });

  it("owner should be equal owner", async () => {
    await skaleToken.hasRole(await skaleToken.DEFAULT_ADMIN_ROLE(), owner.address).should.be.eventually.true;
  });
  
  it("the owner should have all the tokens when the Contract is created", async () => {
    const balance = await skaleToken.balanceOf(owner.address);
    balance.should.be.equal(toWei(TOTAL_SUPPLY));
  });

  it("should return the total supply of tokens for the Contract", async () => {
    const supply = await skaleToken.totalSupply();
    supply.should.be.equal(toWei(TOTAL_SUPPLY));
  });

  it("any account should have the tokens transferred to it", async () => {
    const amount = toWei(10);
    await skaleToken.transfer(holder.address, amount);
    const balance = await skaleToken.balanceOf(holder.address);
    balance.should.be.equal(amount);
  });

  it("should not let someone transfer tokens they do not have", async () => {
    await skaleToken.transfer(holder.address, toWei(10));
    await skaleToken.connect(holder).transfer(receiver.address, toWei(20)).should.be.eventually.rejected;
  });

  it("an address that has no tokens should return a balance of zero", async () => {
    const balance = await skaleToken.balanceOf(nilAddress.address);
    balance.should.be.equal(0);
  });

  it("an owner address should have more than 0 tokens", async () => {
    const balance = await skaleToken.balanceOf(owner.address);
    balance.should.be.equal(toWei(5000000000));
  });

  it("should emit a Transfer Event", async () => {
    const amount = toWei(10);
    await expect(
      skaleToken.transfer(holder.address, amount)
    ).to.emit(skaleToken, 'Transfer')
      .withArgs(owner.address, holder.address, amount);
  });

  it("allowance should return the amount I allow them to transfer", async () => {
    const amount = toWei(99);
    await skaleToken.approve(holder.address, amount);
    const remaining = await skaleToken.allowance(owner.address, holder.address);
    amount.should.be.equal(remaining);
  });

  it("allowance should return the amount another allows a third account to transfer", async () => {
    const amount = toWei(98);
    await skaleToken.connect(holder).approve(receiver.address, amount);
    const remaining = await skaleToken.allowance(holder.address, receiver.address);
    amount.should.be.equal(remaining);
  });

  it("allowance should return zero if none have been approved for the account", async () => {
    const remaining = await skaleToken.allowance(owner.address, nilAddress.address);
    remaining.should.be.equal(0);
  });

  it("should emit an Approval event when the approve method is successfully called", async () => {
    const amount = toWei(97);
    await expect(skaleToken.approve(holder.address, amount))
      .to.emit(skaleToken, 'Approval')
      .withArgs(owner.address, holder.address, amount);
  });

  it("holder balance should be bigger than 0 eth", async () => {
    const holderBalance = await web3.eth.getBalance(holder.address);
    holderBalance.should.not.be.equal(0);
  });

  it("transferFrom should transfer tokens when triggered by an approved third party", async () => {
    const tokenAmount = 96;
    await skaleToken.approve(holder.address, tokenAmount);
    await skaleToken.connect(holder).transferFrom(owner.address, receiver.address, tokenAmount);
    const balance = await skaleToken.connect(receiver).balanceOf(receiver.address);
    balance.should.be.equal(tokenAmount);
  });

  it("the account funds are being transferred from should have sufficient funds", async () => {
    const balance99 = toWei(99);
    await skaleToken.transfer(accountWith99.address, balance99);
    const balance = await skaleToken.balanceOf(accountWith99.address);
    balance99.should.be.equal(balance);
    const amount = toWei(100);

    await skaleToken.connect(accountWith99).approve(receiver.address, amount);
    await skaleToken.connect(receiver).transferFrom(accountWith99.address, receiver.address, amount).should.be.eventually.rejected;
  });

  it("should throw exception when attempting to transferFrom unauthorized account", async () => {
    const remaining = await skaleToken.allowance(owner.address, nilAddress.address);
    remaining.should.be.equal(0);
    const holderBalance = await skaleToken.balanceOf(holder.address);
    holderBalance.should.be.equal(0);
    const amount = toWei(101);

    await skaleToken.connect(nilAddress).transferFrom(owner.address, nilAddress.address, amount).should.be.eventually.rejected;
  });

  it("an authorized accounts allowance should go down when transferFrom is called", async () => {
    const amount = toWei(15);
    await skaleToken.approve(holder.address, amount);
    let allowance = await skaleToken.allowance(owner.address, holder.address);
    amount.should.be.equal(allowance);
    await skaleToken.connect(holder).transferFrom(owner.address, holder.address, toWei(7));

    allowance = await skaleToken.allowance(owner.address, holder.address);
    toWei(8).should.be.equal(allowance);
  });

  it("should emit a Transfer event when transferFrom is called", async () => {
    const amount = toWei(17);
    await skaleToken.approve(holder.address, amount);

    await expect(skaleToken.connect(holder).transferFrom(owner.address, holder.address, amount))
      .to.emit(skaleToken, "Transfer")
      .withArgs(owner.address, holder.address, amount);
  });

  it("should emit a Minted Event", async () => {
    const amount = toWei(10);
    await expect(skaleToken.mint(owner.address, amount, "0x", "0x"))
      .to.emit(skaleToken, "Minted")
      .withArgs(owner.address, owner.address, amount, "0x", "0x");
  });

  it("should emit a Burned Event", async () => {
    const amount = toWei(10);
    await expect(skaleToken.burn(amount, "0x"))
      .to.emit(skaleToken, "Burned")
      .withArgs(owner.address, owner.address, amount, "0x", "0x");
  });

  it("should not allow reentrancy on transfers", async () => {
    const amount = 5;
    await skaleToken.mint(holder.address, amount, "0x", "0x");

    const reentrancyTester = await deployReentrancyTester(contractManager);
    await reentrancyTester.prepareToReentracyCheck();

    await skaleToken.connect(holder).transfer(reentrancyTester.address, amount)
      .should.be.eventually.rejectedWith("ReentrancyGuard: reentrant call");

    (await skaleToken.balanceOf(holder.address)).toNumber().should.be.equal(amount);
    (await skaleToken.balanceOf(skaleToken.address)).toNumber().should.be.equal(0);
  });

  it("should not allow to delegate burned tokens", async () => {
    const reentrancyTester = await deployReentrancyTester(contractManager);
    const validatorService = await deployValidatorService(contractManager);

    await validatorService.registerValidator("Regular validator", "I love D2", 0, 0);
    const validatorId = 1;
    await validatorService.enableValidator(validatorId);

    await reentrancyTester.prepareToBurningAttack();
    const amount = toWei(1);
    await skaleToken.mint(reentrancyTester.address, amount, "0x", "0x");
    await reentrancyTester.burningAttack()
      .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
  });

  it("should parse call data correctly", async () => {
    const skaleTokenInternalTesterFactory = await ethers.getContractFactory("SkaleTokenInternalTester");
    const skaleTokenInternalTester = await skaleTokenInternalTesterFactory.deploy(contractManager.address, []) as SkaleTokenInternalTester;
    await skaleTokenInternalTester.getMsgData().should.be.eventually.equal(web3.eth.abi.encodeFunctionSignature("getMsgData()"));
  });
});

function toWei(count: number): BigNumber {
  return BigNumber.from(count).mul(BigNumber.from(10).pow(18));
}
