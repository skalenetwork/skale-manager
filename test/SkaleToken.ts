import BigNumber from "bignumber.js";
import { ContractManagerContract,
         ContractManagerInstance,
         SkaleTokenContract,
         SkaleTokenInstance } from "../types/truffle-contracts";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "./utils/deploy/contractManager";
import { deploySkaleToken } from "./utils/deploy/skaleToken";
chai.should();
chai.use(chaiAsPromised);

contract("SkaleToken", ([owner, holder, receiver, nilAddress, accountWith99]) => {
  let skaleToken: SkaleTokenInstance;
  let contractManager: ContractManagerInstance;
  const TOKEN_CAP: number = 7000000000;
  const TOTAL_SUPPLY = 10000000;

  console.log("Holder", holder);
  console.log("Owner", owner);
  console.log("NilAddress", nilAddress);
  console.log("Receiver", receiver);

  beforeEach(async () => {
    if (await web3.eth.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24") === "0x") {
      await web3.eth.sendTransaction({ from: "0x7E6CE355Ca303EAe3a858c172c3cD4CeB23701bc", to: "0xa990077c3205cbDf861e17Fa532eeB069cE9fF96", value: "80000000000000000"});
      await web3.eth.sendSignedTransaction("0xf90a388085174876e800830c35008080b909e5608060405234801561001057600080fd5b506109c5806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a5576000357c010000000000000000000000000000000000000000000000000000000090048063a41e7d5111610078578063a41e7d51146101d4578063aabbb8ca1461020a578063b705676514610236578063f712f3e814610280576100a5565b806329965a1d146100aa5780633d584063146100e25780635df8122f1461012457806365ba36c114610152575b600080fd5b6100e0600480360360608110156100c057600080fd5b50600160a060020a038135811691602081013591604090910135166102b6565b005b610108600480360360208110156100f857600080fd5b5035600160a060020a0316610570565b60408051600160a060020a039092168252519081900360200190f35b6100e06004803603604081101561013a57600080fd5b50600160a060020a03813581169160200135166105bc565b6101c26004803603602081101561016857600080fd5b81019060208101813564010000000081111561018357600080fd5b82018360208201111561019557600080fd5b803590602001918460018302840111640100000000831117156101b757600080fd5b5090925090506106b3565b60408051918252519081900360200190f35b6100e0600480360360408110156101ea57600080fd5b508035600160a060020a03169060200135600160e060020a0319166106ee565b6101086004803603604081101561022057600080fd5b50600160a060020a038135169060200135610778565b61026c6004803603604081101561024c57600080fd5b508035600160a060020a03169060200135600160e060020a0319166107ef565b604080519115158252519081900360200190f35b61026c6004803603604081101561029657600080fd5b508035600160a060020a03169060200135600160e060020a0319166108aa565b6000600160a060020a038416156102cd57836102cf565b335b9050336102db82610570565b600160a060020a031614610339576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b6103428361092a565b15610397576040805160e560020a62461bcd02815260206004820152601a60248201527f4d757374206e6f7420626520616e204552433136352068617368000000000000604482015290519081900360640190fd5b600160a060020a038216158015906103b85750600160a060020a0382163314155b156104ff5760405160200180807f455243313832305f4143434550545f4d4147494300000000000000000000000081525060140190506040516020818303038152906040528051906020012082600160a060020a031663249cb3fa85846040518363ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018083815260200182600160a060020a0316600160a060020a031681526020019250505060206040518083038186803b15801561047e57600080fd5b505afa158015610492573d6000803e3d6000fd5b505050506040513d60208110156104a857600080fd5b5051146104ff576040805160e560020a62461bcd02815260206004820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e74657266616365604482015290519081900360640190fd5b600160a060020a03818116600081815260208181526040808320888452909152808220805473ffffffffffffffffffffffffffffffffffffffff19169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db15391a450505050565b600160a060020a03818116600090815260016020526040812054909116151561059a5750806105b7565b50600160a060020a03808216600090815260016020526040902054165b919050565b336105c683610570565b600160a060020a031614610624576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b81600160a060020a031681600160a060020a0316146106435780610646565b60005b600160a060020a03838116600081815260016020526040808220805473ffffffffffffffffffffffffffffffffffffffff19169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a43509190a35050565b600082826040516020018083838082843780830192505050925050506040516020818303038152906040528051906020012090505b92915050565b6106f882826107ef565b610703576000610705565b815b600160a060020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffffffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b600080600160a060020a038416156107905783610792565b335b905061079d8361092a565b156107c357826107ad82826108aa565b6107b85760006107ba565b815b925050506106e8565b600160a060020a0390811660009081526020818152604080832086845290915290205416905092915050565b6000808061081d857f01ffc9a70000000000000000000000000000000000000000000000000000000061094c565b909250905081158061082d575080155b1561083d576000925050506106e8565b61084f85600160e060020a031961094c565b909250905081158061086057508015155b15610870576000925050506106e8565b61087a858561094c565b909250905060018214801561088f5750806001145b1561089f576001925050506106e8565b506000949350505050565b600160a060020a0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff1615156108f2576108eb83836107ef565b90506106e8565b50600160a060020a03808316600081815260208181526040808320600160e060020a0319871684529091529020549091161492915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6040517f01ffc9a7000000000000000000000000000000000000000000000000000000008082526004820183905260009182919060208160248189617530fa90519096909550935050505056fea165627a7a72305820377f4a2d4301ede9949f163f319021a6e9c687c292a5e2b2c4734c126b524e6c00291ba01820182018201820182018201820182018201820182018201820182018201820a01820182018201820182018201820182018201820182018201820182018201820");
    }
    contractManager = await deployContractManager();
    skaleToken = await deploySkaleToken(contractManager);
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
    assert(balance.isEqualTo(toWei(10000000)));
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
});

function toWei(count: number): BigNumber {
  return (new BigNumber(count)).multipliedBy((new BigNumber(10)).pow(18));
}
