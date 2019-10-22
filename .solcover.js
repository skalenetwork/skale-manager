module.exports = {    
    compileCommand: '../node_modules/.bin/truffle compile --network coverage',
    testCommand: '../node_modules/.bin/truffle test --network coverage --gas_multiplier 10',
    norpc: true,
    skipFiles: ['Migrations.sol']
};
