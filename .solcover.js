module.exports = {    
    compileCommand: '../node_modules/.bin/truffle compile --network coverage',
    testCommand: 'node --max-old-space-size=8192 ../node_modules/.bin/truffle test --network coverage --gas_multiplier 10',
    norpc: true,
    skipFiles: ['Constants.sol']
};
