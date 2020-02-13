require('dotenv').config();

module.exports = {    
    compileCommand: 'npx buidler compile',
    testCommand: 'npx buidler test',
    norpc: true,
    skipFiles: ['Migrations.sol', 'thirdparty/', 'interfaces/'],
    copyPackages: ['@openzeppelin/contracts'],
    providerOptions: {
        "accounts": [
            {
                "secretKey": process.env.PRIVATE_KEY_1,
                "balance": "0xd3c21bcecceda1000000"
            },
            {
                "secretKey": process.env.PRIVATE_KEY_2,
                "balance": "0xd3c21bcecceda1000000"
            },
            {
                "secretKey": process.env.PRIVATE_KEY_3,
                "balance": "0xd3c21bcecceda1000000"
            },
            {
                "secretKey": process.env.PRIVATE_KEY_4,
                "balance": "0xd3c21bcecceda1000000"
            },
            {
                "secretKey": process.env.PRIVATE_KEY_5,
                "balance": "0xd3c21bcecceda0000000"
            }
        ]
    }
};
