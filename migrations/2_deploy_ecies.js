let fs = require("fs");
const fsPromises = fs.promises;

let AES = artifacts.require('AES');

async function deploy(deployer, network) {
    await deployer.deploy(AES, 128, {gas: 8000000}).then(async function(inst) {

    console.log('Deploy done, writing results...');
    let jsonObject = {
        aes_address: AES.address,
        aes_abi: AES.abi
    };


    await fsPromises.writeFile('data/AES.json', JSON.stringify(jsonObject));
    await sleep(10000);
    console.log('Done, check AES file in data folder.');
});
}

function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = deploy;