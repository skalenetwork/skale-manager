module.exports = {
    networks: {
        server: {
            host: "51.0.1.99",
            port: 8545,
            gasPrice: 10000000000,
            network_id: "*"
        },
        local: {
            gasPrice: 10000000000,
            host: "0.0.0.0",
            port: 8545,
            gas: 8000000,
            network_id: "*"
        },
        aws: {
            host: "13.59.228.21",
            port: 1919,
            gasPrice: 10000000000,
            network_id: "*",
        },
        do: {
            host: "138.68.42.146",
            port: 1919,
            gasPrice: 10000000000,
            network_id: "*",
        },
        aws_sip: {
            host: "18.218.24.50",
            port: 1919,
            gasPrice: 10000000000,
            network_id: "*",
        },
        aws_test: {
            host: "3.16.188.116",
            port: 1919,
            gasPrice: 10000000000,
            network_id: "*",
      },
        coverage: {
            host: "127.0.0.1",
            port: "8555",
            gas: 0xfffffffffff,
            gasPrice: 0x01,
            network_id: "*"
        }
    },
    mocha: {

    },
    compilers: {
        solc: {
            version: "0.5.9"
        }
    }
};
