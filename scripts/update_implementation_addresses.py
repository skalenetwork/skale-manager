#!/usr/bin/env python

import os
import sys
import json

CONTRACT_MANAGER_ABI = [{
    "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
    "outputs": [{"internalType": "address", "name": "contractAddress", "type": "address"}],
    "stateMutability": "view", "type": "function", "name": "getContract"}]

PROXY_ADMIN_ABI = [{"constant": True, "inputs": [{"name": "proxy", "type": "address"}],
                    "name": "getProxyImplementation", "outputs": [{"name": "", "type": "address"}],
                    "payable": False, "stateMutability": "view", "type": "function"}]


def proxy_to_contract(name):
    return name.split('/')[-1]


def contract_to_key(name):
    key = name
    if key == 'BountyV2':
        key = 'Bounty'
    elif key == 'Bounty':
        key = None
    return key


def main():
    network_filename = os.path.dirname(os.path.realpath(__file__)) + '/../.openzeppelin/mainnet.json'
    arguments = [argument for argument in sys.argv if argument[0] != '-']
    flags = [flag for flag in sys.argv if flag[0] == '-']
    if len(arguments) > 1:
        network_filename = arguments[-1]
    print(f'Target filename: {network_filename}', file=sys.stderr)
    offline = '--offline' in flags

    if not offline:
        ENDPOINT = os.environ.get('ENDPOINT')
        if ENDPOINT:
            os.environ['WEB3_PROVIDER_URI'] = ENDPOINT

        from web3.auto import w3

    with open(network_filename) as network_f:
        network = json.load(network_f)

        if not offline:
            proxy_admin = w3.eth.contract(
                address=network['proxyAdmin']['address'],
                abi=PROXY_ADMIN_ABI)

        for proxy_name in network['proxies'].keys():
            contract_name = proxy_to_contract(proxy_name)

            if len(network['proxies'][proxy_name]) != 1:
                raise ValueError('Multiple instances of the same contract were found')

            proxy_address = network['proxies'][proxy_name][0]['address']
            current_implementation = network['proxies'][proxy_name][0]['implementation']
            deployed_implementation = network['contracts'][contract_name]['address']

            updated_implementation = deployed_implementation

            if not offline:
                registered_implementation = proxy_admin.functions.getProxyImplementation(proxy_address).call()
                if registered_implementation != deployed_implementation:
                    raise ValueError(f'Deployed implementation for {contract_name} ({deployed_implementation})' +
                                     f' does not match to value in ProxyAdmin ({registered_implementation})')

            if current_implementation != updated_implementation:
                print(f'Update implementation of {proxy_name} from {current_implementation} to {updated_implementation}',
                      file=sys.stderr)
                network['proxies'][proxy_name][0]['implementation'] = updated_implementation

        print(json.dumps(network, sort_keys=True, indent=4))


if __name__ == '__main__':
    main()
