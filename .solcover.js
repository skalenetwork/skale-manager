module.exports = {
    //port: 6545,
    compileCommand: '../node_modules/.bin/truffle compile --network coverage',
    //testCommand: '../node_modules/.bin/truffle test --network coverage',
    testCommand: 'node test/Main.js',
    norpc: true,
    skipFiles: ['Constants.sol']
};
