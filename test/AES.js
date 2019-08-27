const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const jsonData = require(`../data/AES.json`);

let AES = new web3.eth.Contract(jsonData.aes_abi, jsonData.aes_address);

let mainAccount = "0xf247e43f4b8cdfafc9c1402810227251984abcb8";

async function initAES() {
    let res1 = await AES.methods.setSbox().send({from: mainAccount, gas: 8000000});
    console.log(res1);
    let res2 = await AES.methods.setInvSbox().send({from: mainAccount, gas: 8000000});
    console.log(res2);
}

async function testAES() {
    let text = "Hello";
    let cipherKey = "0x5A7134743777217A24432646294A404E";
    let res = await AES.methods.Encrypt(text, cipherKey).call();
    console.log(res);
}

async function run() {
    await initAES();
    await testAES();
}

run();