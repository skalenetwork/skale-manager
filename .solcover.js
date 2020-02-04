module.exports = {    
    compileCommand: '../node_modules/.bin/truffle compile --network coverage',
    testCommand: '../node_modules/.bin/truffle test --network coverage --gas_multiplier 10',
    norpc: true,
    skipFiles: ['Migrations.sol'],
    providerOptions: {
        "port": 8555,
        "gasLimit": "0xfffffffffff"
        // "accounts": [
        //     {
        //         "balance": "0xd3c21bcecceda1000000",
        //         "secretKey": "0xa15c19da241e5b1db20d8dd8ca4b5eeaee01c709b49ec57aa78c2133d3c1b3c9"
        //     },
        //     {
        //         "balance": "0xd3c21bcecceda1000000",
        //         "secretKey": "0xe7af72d241d4dd77bc080ce9234d742f6b22e35b3a660e8c197517b909f63ca8"
        //     },
        //     {
        //         "balance": "0xd3c21bcecceda1000000",
        //         "secretKey": "0xd87e2b83ec1cc04dbb82e144a966e3a345225af631c3c60955724b0d91f97279"
        //     },
        //     {
        //         "balance": "0xd3c21bcecceda1000000",
        //         "secretKey": "0x35be08dece9f9db0e595e5144013558ce602af32cb0d73bfd901455213577bd6"
        //     }
        // ]
    }
};
