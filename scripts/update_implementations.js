var fs = require('fs');

(function() {
    let mainnetJson = require(`../.openzeppelin/mainnet.json`);
    const contractsNames = require(`../.openzeppelin/project.json`).contracts;
    for (let contractName in contractsNames) {
        const implementationAddress = mainnetJson.contracts[contractName].address;
        mainnetJson.proxies[`skale-manager/${contractName}`][0].implementation = implementationAddress;
    }
    var jsonData = JSON.stringify(mainnetJson);
    fs.writeFileSync(".openzeppelin/mainnet.json", jsonData);
    process.exit();
})();
