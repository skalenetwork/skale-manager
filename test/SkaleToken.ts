import BigNumber from "bignumber.js";
import { ContractManagerContract,
         ContractManagerInstance,
         SkaleTokenContract,
         SkaleTokenInstance } from "../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);

contract("SkaleToken", ([owner, holder, receiver, nilAddress, accountWith99]) => {
  let skaleToken: SkaleTokenInstance;
  let contractManager: ContractManagerInstance;
  const TOKEN_CAP: number = 5000000000;
  const TOTAL_SUPPLY = 1000000;

  console.log("Holder", holder);
  console.log("Owner", owner);
  console.log("NilAddress", nilAddress);
  console.log("Receiver", receiver);

  beforeEach(async () => {
    contractManager = await ContractManager.new({from: owner});
    skaleToken = await SkaleToken.new(contractManager.address, { from: owner });
  });

  it("Should have the correct name", async () => {
    const name = await skaleToken.name();
    expect(name).to.be.equal("SKALE");
  });

  it("Should have the correct symbol", async () => {
    const symbol = await skaleToken.symbol();
    expect(symbol).to.be.equal("SKL");
  });

  it("Should have the correct decimal level", async () => {
    const decimals = await skaleToken.decimals();
    expect(decimals.toNumber()).to.be.equal(18);
  });

  it("Should return the сapitalization of tokens for the Contract", async () => {
    const cap = await skaleToken.cap();
    assert(toWei(TOKEN_CAP).isEqualTo(cap));
  });

  it("Owner should be equal owner", async () => {
    const contractOwner = await skaleToken.owner();
    expect(contractOwner).to.be.equal(owner);
  });

  it("Should check 10 SKALE tokens to mint", async () => {
    const cap: BigNumber = new BigNumber(await skaleToken.cap());
    const totalSupply = await skaleToken.totalSupply();
    assert(toWei(10).isLessThanOrEqualTo(cap.minus(totalSupply)));
  });

  it("The owner should have all the tokens when the Contract is created", async () => {
    const balance = new BigNumber(await skaleToken.balanceOf(owner));
    assert(balance.isEqualTo(toWei(TOTAL_SUPPLY)));
  });

  it("Should return the total supply of tokens for the Contract", async () => {
    const supply: BigNumber = new BigNumber(await skaleToken.totalSupply());
    assert(supply.isEqualTo(toWei(TOTAL_SUPPLY)));
  });

  it("Any account should have the tokens transfered to it", async () => {
    const amount = toWei(10);
    await skaleToken.transfer(holder, amount);
    const balance = new BigNumber(await skaleToken.balanceOf(holder));
    assert(balance.isEqualTo(amount));
  });

  // it('Should not let me transfer tokens to myself', async () => {
  //   var hasError = true;
  //   try {
  //     const amount = toWei(10);
  //     await skaleToken.transfer(owner, amount, { from: owner })
  //     hasError = false; // Should be unreachable
  //   } catch(err) { }
  //   assert.equal(true, hasError, "Function not throwing exception on transfer to self");
  // });

  it("Should not let someone transfer tokens they do not have", async () => {
    await skaleToken.transfer(holder, toWei(10), { from: owner });
    await skaleToken.transfer(receiver, toWei(20), { from: holder }).should.be.eventually.rejected;
  });

  it("An address that has no tokens should return a balance of zero", async () => {
    const balance: BigNumber = new BigNumber(await skaleToken.balanceOf(nilAddress));
    assert(balance.isEqualTo(0));
  });

  it("An owner address should have more than 0 tokens", async () => {
    const balance = new BigNumber(await skaleToken.balanceOf(owner));
    assert(balance.isEqualTo(toWei(1000000)));
  });

  it("Should emit a Transfer Event", async () => {
    const amount = toWei(10);
    const { logs } = await skaleToken.transfer(holder, amount, { from: owner });

    assert.equal(logs.length, 1, "No Transfer Event emitted");
    assert.equal(logs[0].event, "Transfer");
    // console.log(logs[0]);
    assert.equal(logs[0].args.from, owner);
    assert.equal(logs[0].args.to, holder);
    assert(amount.isEqualTo(logs[0].args.value));
  });

  it("Allowance should return the amount I allow them to transfer", async () => {
    const amount = toWei(99);
    await skaleToken.approve(holder, amount, { from: owner });
    const remaining = await skaleToken.allowance(owner, holder);
    assert(amount.isEqualTo(remaining));
  });

  it("Allowance should return the amount another allows a third account to transfer", async () => {
    const amount = toWei(98);
    await skaleToken.approve(receiver, amount, { from: holder });
    const remaining = await skaleToken.allowance(holder, receiver);
    assert(amount.isEqualTo(remaining));
  });

  it("Allowance should return zero if none have been approved for the account", async () => {
    const remaining = new BigNumber(await skaleToken.allowance(owner, nilAddress));
    assert(remaining.isEqualTo(0));
  });

  it("Should emit an Approval event when the approve method is successfully called", async () => {
    const amount = toWei(97);
    const { logs } = await skaleToken.approve(holder, amount, { from: owner });

    assert.equal(logs.length, 1, "No Approval Event emitted");
    assert.equal(logs[0].event, "Approval");
    // console.log(logs[0]);
    assert.equal(logs[0].args.owner, owner);
    assert.equal(logs[0].args.spender, holder);
    assert(amount.isEqualTo(logs[0].args.value));
  });

  it("Holder balance should be bigger than 0 eth", async () => {
    const holderBalance = new BigNumber(await web3.eth.getBalance(holder));
    assert(holderBalance.isGreaterThan(0));
  });

  it("transferFrom should transfer tokens when triggered by an approved third party", async () => {
    const tokenAmount = 96;
    await skaleToken.approve(receiver, tokenAmount, { from: owner });
    await skaleToken.transferFrom(owner, receiver, tokenAmount, { from: holder });
    const balance = await skaleToken.balanceOf(receiver, { from: receiver });
    assert( (new BigNumber(balance).isEqualTo(tokenAmount)));
  });

  it("The account funds are being transferred from should have sufficient funds", async () => {
    const balance99 = toWei(99);
    await skaleToken.transfer(accountWith99, balance99, { from: owner });
    const balance = await skaleToken.balanceOf(accountWith99);
    assert(balance99.isEqualTo(balance));
    const amount = toWei(100);

    await skaleToken.approve(receiver, amount, { from: accountWith99 });
    await skaleToken.transferFrom(accountWith99, receiver, amount, { from: receiver }).should.be.eventually.rejected;
  });

  it("Should throw exception when attempting to transferFrom unauthorized account", async () => {
    const remaining = new BigNumber(await skaleToken.allowance(owner, nilAddress));
    assert(remaining.isEqualTo(0));
    const holderBalance = new BigNumber(await skaleToken.balanceOf(holder));
    assert(holderBalance.isEqualTo(0));
    const amount = toWei(101);

    await skaleToken.transferFrom(owner, nilAddress, amount, { from: nilAddress }).should.be.eventually.rejected;
  });

  it("An authorized accounts allowance should go down when transferFrom is called", async () => {
    const amount = toWei(15);
    await skaleToken.approve(holder, amount, { from: owner });
    let allowance = await skaleToken.allowance(owner, holder);
    assert(amount.isEqualTo(allowance));
    await skaleToken.transferFrom(owner, holder, toWei(7), { from: holder });

    allowance = await skaleToken.allowance(owner, holder);
    assert(toWei(8).isEqualTo(allowance));
  });

  it("it should emit a Transfer event when transferFrom is called", async () => {
    const amount = toWei(17);
    await skaleToken.approve(holder, amount, { from: owner });

    const { logs } = await skaleToken.transferFrom(owner, holder, amount, { from: holder });

    assert.equal(logs.length, 1, "No Transfer Event emitted");
    assert.equal(logs[0].event, "Transfer");
    // console.log(logs[0]);
    assert.equal(logs[0].args.from, owner);
    assert.equal(logs[0].args.to, holder);
    assert(amount.isEqualTo(logs[0].args.value));
  });

  it("Should emit a Mint Event", async () => {
    const amount = toWei(10);
    const { logs } = await skaleToken.mint(owner, amount, {from: owner});

    assert.equal(logs.length, 1, "No Mint Event emitted");
    assert.equal(logs[0].event, "Mint");
    // console.log(logs[0]);
    assert.equal(logs[0].args.to, owner);
    assert(amount.isEqualTo(logs[0].args.amount));
  });

  it("Should emit a Burn Event", async () => {
    const amount = toWei(10);
    const { logs } = await skaleToken.burn(owner, amount, {from: owner});

    assert.equal(logs.length, 1, "No Burn Event emitted");
    assert.equal(logs[0].event, "Burn");
    // console.log(logs[0]);
    assert.equal(logs[0].args.from, owner);
    assert(amount.isEqualTo(logs[0].args.amount));
  });
});

function toWei(count: number): BigNumber {
  return (new BigNumber(count)).multipliedBy((new BigNumber(10)).pow(18));
}
