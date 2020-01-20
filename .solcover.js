module.exports = {    
    compileCommand: '../node_modules/.bin/truffle compile --network coverage',
    testCommand: '../node_modules/.bin/truffle test --network coverage --gas_multiplier 10',
    /// TODO: Temporary have turned off all tests and left only those who should pass
    // testCommand: '../node_modules/.bin/truffle test test/delegation/* --network coverage --gas_multiplier 10',
    norpc: true,
    skipFiles: ['Migrations.sol'],
    copyPackages: ['@openzeppelin/contracts']
};
