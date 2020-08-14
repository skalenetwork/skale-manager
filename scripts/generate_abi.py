#!/usr/bin/env python

import json
import sys
import re


def camel_to_snake(name):
    # name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    # return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()
    return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()


def main():
    if len(sys.argv) < 3:
        print('Usage:')
        print('./generate_abi.py {network file} {build dir}')
        print('Example:')
        print('./generate_abi.py ../.openzeppelin/mainnet.json ../build')
        exit(1)

    try:
        with open(sys.argv[1]) as json_file:
            network_file = json.loads(json_file.read())
    except Exception as e:
        print(e)
        exit(2)

    result = {
        "skale_token_address": "0x00c83aeCC790e8a4453e5dD3B0B4b3680501a7A7",
        "skale_token_abi": [
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "contractsAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "address[]",
                        "name": "defOps",
                        "type": "address[]"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "constructor",
                "signature": "constructor"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "owner",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "spender",
                        "type": "address"
                    },
                    {
                        "indexed": False,
                        "internalType": "uint256",
                        "name": "value",
                        "type": "uint256"
                    }
                ],
                "name": "Approval",
                "type": "event",
                "signature": "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "operator",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "tokenHolder",
                        "type": "address"
                    }
                ],
                "name": "AuthorizedOperator",
                "type": "event",
                "signature": "0xf4caeb2d6ca8932a215a353d0703c326ec2d81fc68170f320eb2ab49e9df61f9"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "operator",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "from",
                        "type": "address"
                    },
                    {
                        "indexed": False,
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "indexed": False,
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    },
                    {
                        "indexed": False,
                        "internalType": "bytes",
                        "name": "operatorData",
                        "type": "bytes"
                    }
                ],
                "name": "Burned",
                "type": "event",
                "signature": "0xa78a9be3a7b862d26933ad85fb11d80ef66b8f972d7cbba06621d583943a4098"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "operator",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    },
                    {
                        "indexed": False,
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "indexed": False,
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    },
                    {
                        "indexed": False,
                        "internalType": "bytes",
                        "name": "operatorData",
                        "type": "bytes"
                    }
                ],
                "name": "Minted",
                "type": "event",
                "signature": "0x2fe5be0146f74c5bce36c0b80911af6c7d86ff27e89d5cfa61fc681327954e5d"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "operator",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "tokenHolder",
                        "type": "address"
                    }
                ],
                "name": "RevokedOperator",
                "type": "event",
                "signature": "0x50546e66e5f44d728365dc3908c63bc5cfeeab470722c1677e3073a6ac294aa1"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    }
                ],
                "name": "RoleGranted",
                "type": "event",
                "signature": "0x2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    }
                ],
                "name": "RoleRevoked",
                "type": "event",
                "signature": "0xf6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "operator",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "from",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    },
                    {
                        "indexed": False,
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "indexed": False,
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    },
                    {
                        "indexed": False,
                        "internalType": "bytes",
                        "name": "operatorData",
                        "type": "bytes"
                    }
                ],
                "name": "Sent",
                "type": "event",
                "signature": "0x06b541ddaa720db2b10a4d0cdac39b8d360425fc073085fac19bc82614677987"
            },
            {
                "anonymous": False,
                "inputs": [
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "from",
                        "type": "address"
                    },
                    {
                        "indexed": True,
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    },
                    {
                        "indexed": False,
                        "internalType": "uint256",
                        "name": "value",
                        "type": "uint256"
                    }
                ],
                "name": "Transfer",
                "type": "event",
                "signature": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
            },
            {
                "inputs": [],
                "name": "CAP",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0xec81b483"
            },
            {
                "inputs": [],
                "name": "DECIMALS",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x2e0f2625"
            },
            {
                "inputs": [],
                "name": "DEFAULT_ADMIN_ROLE",
                "outputs": [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0xa217fddf"
            },
            {
                "inputs": [],
                "name": "NAME",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0xa3f4df7e"
            },
            {
                "inputs": [],
                "name": "SYMBOL",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0xf76f8d78"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "holder",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "spender",
                        "type": "address"
                    }
                ],
                "name": "allowance",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0xdd62ed3e"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "spender",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "value",
                        "type": "uint256"
                    }
                ],
                "name": "approve",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0x095ea7b3"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "operator",
                        "type": "address"
                    }
                ],
                "name": "authorizeOperator",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0x959b8c3f"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "tokenHolder",
                        "type": "address"
                    }
                ],
                "name": "balanceOf",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x70a08231"
            },
            {
                "inputs": [
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "name": "burn",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xfe9d9303"
            },
            {
                "inputs": [],
                "name": "contractManager",
                "outputs": [
                    {
                        "internalType": "contract ContractManager",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0xb39e12cf"
            },
            {
                "inputs": [],
                "name": "decimals",
                "outputs": [
                    {
                        "internalType": "uint8",
                        "name": "",
                        "type": "uint8"
                    }
                ],
                "stateMutability": "pure",
                "type": "function",
                "constant": True,
                "signature": "0x313ce567"
            },
            {
                "inputs": [],
                "name": "defaultOperators",
                "outputs": [
                    {
                        "internalType": "address[]",
                        "name": "",
                        "type": "address[]"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x06e48538"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    }
                ],
                "name": "getRoleAdmin",
                "outputs": [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x248a9ca3"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "uint256",
                        "name": "index",
                        "type": "uint256"
                    }
                ],
                "name": "getRoleMember",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x9010d07c"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    }
                ],
                "name": "getRoleMemberCount",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0xca15c873"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    }
                ],
                "name": "grantRole",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0x2f2ff15d"
            },
            {
                "inputs": [],
                "name": "granularity",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x556f0dc7"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    }
                ],
                "name": "hasRole",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x91d14854"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "contractManagerAddress",
                        "type": "address"
                    }
                ],
                "name": "initialize",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xc4d66de8"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "operator",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "tokenHolder",
                        "type": "address"
                    }
                ],
                "name": "isOperatorFor",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0xd95b6371"
            },
            {
                "inputs": [],
                "name": "name",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x06fdde03"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    },
                    {
                        "internalType": "bytes",
                        "name": "operatorData",
                        "type": "bytes"
                    }
                ],
                "name": "operatorBurn",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xfc673c4f"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    },
                    {
                        "internalType": "bytes",
                        "name": "operatorData",
                        "type": "bytes"
                    }
                ],
                "name": "operatorSend",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0x62ad1b83"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    }
                ],
                "name": "renounceRole",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0x36568abe"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "operator",
                        "type": "address"
                    }
                ],
                "name": "revokeOperator",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xfad8b32a"
            },
            {
                "inputs": [
                    {
                        "internalType": "bytes32",
                        "name": "role",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    }
                ],
                "name": "revokeRole",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xd547741f"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "name": "send",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0x9bd9bbc6"
            },
            {
                "inputs": [],
                "name": "symbol",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x95d89b41"
            },
            {
                "inputs": [],
                "name": "totalSupply",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function",
                "constant": True,
                "signature": "0x18160ddd"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "name": "transfer",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xa9059cbb"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "holder",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "recipient",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "name": "transferFrom",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0x23b872dd"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "account",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes",
                        "name": "userData",
                        "type": "bytes"
                    },
                    {
                        "internalType": "bytes",
                        "name": "operatorData",
                        "type": "bytes"
                    }
                ],
                "name": "mint",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xdcdc7dd0"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "wallet",
                        "type": "address"
                    }
                ],
                "name": "getAndUpdateDelegatedAmount",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0x27040f68"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "wallet",
                        "type": "address"
                    }
                ],
                "name": "getAndUpdateSlashedAmount",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xb1cb105f"
            },
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "wallet",
                        "type": "address"
                    }
                ],
                "name": "getAndUpdateLockedAmount",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function",
                "signature": "0xfa8dacba"
            }
        ]
    }
    for alias in network_file['proxies'].keys():
        name = alias.split('/')[-1]
        address = network_file['proxies'][alias][0]['address']
        try:
            artifact_filename = sys.argv[2] + '/contracts/' + name + '.json'
            with open(artifact_filename) as artifact_file:
                artifact = json.loads(artifact_file.read())
                abi = artifact['abi']
        except Exception as e:
            print('Error on processing of ' + artifact_file)
            print(e)
            exit(3)
        snake_name = camel_to_snake(name)
        result[snake_name + '_address'] = address
        result[snake_name + '_abi'] = abi
    print(json.dumps(result, sort_keys=True, indent=4))


if __name__ == '__main__':
    main()
