import BigNumber from "bignumber.js";
import { ContractManagerInstance,
         SkaleTokenInstance } from "../types/truffle-contracts";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deployReentrancyTester } from "./tools/deploy/test/reentracyTester";

chai.should();
chai.use(chaiAsPromised);

contract("SkaleToken", ([owner, holder, receiver, nilAddress, accountWith99]) => {
  let skaleToken: SkaleTokenInstance;
  let contractManager: ContractManagerInstance;

  const TOKEN_CAP: number = 7000000000;
  const TOTAL_SUPPLY = 5000000000;

  console.log("Holder", holder);
  console.log("Owner", owner);
  console.log("NilAddress", nilAddress);
  console.log("Receiver", receiver);

  beforeEach(async () => {
    contractManager = await deployContractManager();

    contractManager = await deployContractManager();
    skaleToken = await deploySkaleToken(contractManager);

    const premined = "5000000000000000000000000000"; // 5e9 * 1e18
    await skaleToken.mint(owner, owner, premined, "0x", "0x");
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

  it("should return the сapitalization of tokens for the Contract", async () => {
    const cap = await skaleToken.CAP();
    assert(toWei(TOKEN_CAP).isEqualTo(cap));
  });

  it("owner should be equal owner", async () => {
    const contractOwner = await skaleToken.owner();
    expect(contractOwner).to.be.equal(owner);
  });

  it("should check 10 SKALE tokens to mint", async () => {
    const cap: BigNumber = new BigNumber(await skaleToken.CAP());
    const totalSupply = await skaleToken.totalSupply();
    assert(toWei(10).isLessThanOrEqualTo(cap.minus(totalSupply)));
  });

  it("the owner should have all the tokens when the Contract is created", async () => {
    const balance = new BigNumber(await skaleToken.balanceOf(owner));
    assert(balance.isEqualTo(toWei(TOTAL_SUPPLY)));
  });

  it("should return the total supply of tokens for the Contract", async () => {
    const supply: BigNumber = new BigNumber(await skaleToken.totalSupply());
    assert(supply.isEqualTo(toWei(TOTAL_SUPPLY)));
  });

  it("any account should have the tokens transferred to it", async () => {
    const amount = toWei(10);
    await skaleToken.transfer(holder, amount);
    const balance = new BigNumber(await skaleToken.balanceOf(holder));
    assert(balance.isEqualTo(amount));
  });

  // it('should not let me transfer tokens to myself', async () => {
  //   var hasError = true;
  //   try {
  //     const amount = toWei(10);
  //     await skaleToken.transfer(owner, amount, { from: owner })
  //     hasError = false; // Should be unreachable
  //   } catch(err) { }
  //   assert.equal(true, hasError, "Function not throwing exception on transfer to self");
  // });

  it("should not let someone transfer tokens they do not have", async () => {
    await skaleToken.transfer(holder, toWei(10), { from: owner });
    await skaleToken.transfer(receiver, toWei(20), { from: holder }).should.be.eventually.rejected;
  });

  it("an address that has no tokens should return a balance of zero", async () => {
    const balance: BigNumber = new BigNumber(await skaleToken.balanceOf(nilAddress));
    assert(balance.isEqualTo(0));
  });

  it("an owner address should have more than 0 tokens", async () => {
    const balance = new BigNumber(await skaleToken.balanceOf(owner));
    expect(balance.isEqualTo(toWei(5000000000)));
  });

  it("should emit a Transfer Event", async () => {
    const amount = toWei(10);
    const { logs } = await skaleToken.transfer(holder, amount, { from: owner });

    assert.equal(logs.length, 2, "No Transfer Event emitted");
    assert.equal(logs[1].event, "Transfer");
    assert.equal(logs[1].args.from, owner);
    assert.equal(logs[1].args.to, holder);
    assert(amount.isEqualTo(logs[1].args.value));
  });

  it("allowance should return the amount I allow them to transfer", async () => {
    const amount = toWei(99);
    await skaleToken.approve(holder, amount, { from: owner });
    const remaining = await skaleToken.allowance(owner, holder);
    assert(amount.isEqualTo(remaining));
  });

  it("allowance should return the amount another allows a third account to transfer", async () => {
    const amount = toWei(98);
    await skaleToken.approve(receiver, amount, { from: holder });
    const remaining = await skaleToken.allowance(holder, receiver);
    assert(amount.isEqualTo(remaining));
  });

  it("allowance should return zero if none have been approved for the account", async () => {
    const remaining = new BigNumber(await skaleToken.allowance(owner, nilAddress));
    assert(remaining.isEqualTo(0));
  });

  it("should emit an Approval event when the approve method is successfully called", async () => {
    const amount = toWei(97);
    const { logs } = await skaleToken.approve(holder, amount, { from: owner });

    assert.equal(logs.length, 1, "No Approval Event emitted");
    assert.equal(logs[0].event, "Approval");
    assert.equal(logs[0].args.owner, owner);
    assert.equal(logs[0].args.spender, holder);
    assert(amount.isEqualTo(logs[0].args.value));
  });

  it("holder balance should be bigger than 0 eth", async () => {
    const holderBalance = new BigNumber(await web3.eth.getBalance(holder));
    assert(holderBalance.isGreaterThan(0));
  });

  it("transferFrom should transfer tokens when triggered by an approved third party", async () => {
    const tokenAmount = 96;
    await skaleToken.approve(holder, tokenAmount, { from: owner });
    await skaleToken.transferFrom(owner, receiver, tokenAmount, { from: holder });
    const balance = await skaleToken.balanceOf(receiver, { from: receiver });
    assert( (new BigNumber(balance).isEqualTo(tokenAmount)));
  });

  it("the account funds are being transferred from should have sufficient funds", async () => {
    const balance99 = toWei(99);
    await skaleToken.transfer(accountWith99, balance99, { from: owner });
    const balance = await skaleToken.balanceOf(accountWith99);
    assert(balance99.isEqualTo(balance));
    const amount = toWei(100);

    await skaleToken.approve(receiver, amount, { from: accountWith99 });
    await skaleToken.transferFrom(accountWith99, receiver, amount, { from: receiver }).should.be.eventually.rejected;
  });

  it("should throw exception when attempting to transferFrom unauthorized account", async () => {
    const remaining = new BigNumber(await skaleToken.allowance(owner, nilAddress));
    assert(remaining.isEqualTo(0));
    const holderBalance = new BigNumber(await skaleToken.balanceOf(holder));
    assert(holderBalance.isEqualTo(0));
    const amount = toWei(101);

    await skaleToken.transferFrom(owner, nilAddress, amount, { from: nilAddress }).should.be.eventually.rejected;
  });

  it("an authorized accounts allowance should go down when transferFrom is called", async () => {
    const amount = toWei(15);
    await skaleToken.approve(holder, amount, { from: owner });
    let allowance = await skaleToken.allowance(owner, holder);
    assert(amount.isEqualTo(allowance));
    await skaleToken.transferFrom(owner, holder, toWei(7), { from: holder });

    allowance = await skaleToken.allowance(owner, holder);
    assert(toWei(8).isEqualTo(allowance));
  });

  it("should emit a Transfer event when transferFrom is called", async () => {
    const amount = toWei(17);
    await skaleToken.approve(holder, amount, { from: owner });

    const { logs } = await skaleToken.transferFrom(owner, holder, amount, { from: holder });
    assert.equal(logs.length, 3, "No Transfer Event emitted");
    assert.equal(logs[1].event, "Transfer");
    assert.equal(logs[1].args.from, owner);
    assert.equal(logs[1].args.to, holder);
    assert(amount.isEqualTo(logs[1].args.value));
  });

  it("should emit a Minted Event", async () => {
    const amount = toWei(10);
    const { logs } = await skaleToken.mint(owner, owner, amount, "0x", "0x", {from: owner});

    assert.equal(logs.length, 2, "No Mint Event emitted");
    assert.equal(logs[0].event, "Minted");
    assert.equal(logs[0].args.to, owner);
    assert(amount.isEqualTo(logs[0].args.amount));
  });

  it("should emit a Burned Event", async () => {
    const amount = toWei(10);
    const { logs } = await skaleToken.burn(amount, "0x", {from: owner});
    assert.equal(logs.length, 2, "No Burn Event emitted");
    assert.equal(logs[0].event, "Burned");
    assert.equal(logs[0].args.from, owner);
    assert(amount.isEqualTo(logs[0].args.amount));
  });

  it("should not allow reentrancy on transfers", async () => {
    const amount = 5;
    await skaleToken.mint(owner, holder, amount, "0x", "0x");

    const reentrancyTester = await deployReentrancyTester(contractManager);
    await reentrancyTester.prepareToReentracyCheck();

    await skaleToken.transfer(reentrancyTester.address, amount, {from: holder})
      .should.be.eventually.rejectedWith("ReentrancyGuard: reentrant call");

    (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(amount);
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
    await skaleToken.mint(owner, reentrancyTester.address, amount, "0x", "0x", {from: owner});
    await reentrancyTester.burningAttack()
      .should.be.eventually.rejectedWith("Token should be unlocked for burning");
  });
});

function toWei(count: number): BigNumber {
  return (new BigNumber(count)).multipliedBy((new BigNumber(10)).pow(18));
}
