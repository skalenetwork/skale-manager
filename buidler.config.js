usePlugin("@nomiclabs/buidler-truffle5");
usePlugin("solidity-coverage");
require('dotenv').config();

module.exports = {
  defaultNetwork: "buidlerevm",
  solc: {
    version: '0.5.15',
    evmVersion: 'petersburg',
    optimizer:{
      enabled: true,
      runs: 200
    }
  },
  mocha: {
    timeout: 300000
  },
  networks: {
    buidlerevm: {
      accounts: [
        {
          privateKey: process.env.PRIVATE_KEY_1,
          balance: "0xd3c21bcecceda0000000"
        },
        {
          privateKey: process.env.PRIVATE_KEY_2,
          balance: "0xd3c21bcecceda0000000"
        },
        {
          privateKey: process.env.PRIVATE_KEY_3,
          balance: "0xd3c21bcecceda0000000"
        },
        {
          privateKey: process.env.PRIVATE_KEY_4,
          balance: "0xd3c21bcecceda0000000"
        },
        {
          privateKey: process.env.PRIVATE_KEY_5,
          balance: "0xd3c21bcecceda0000000"
        }
      ],
      gas: 0xfffffffffff,
      blockGasLimit: 0xfffffffffff,
      port: 8555
    }
  }
};
