 # SKALE Manager

[![Discord](https://img.shields.io/discord/534485763354787851.svg)](https://discord.gg/vvUtWJB) [![Build Status](https://travis-ci.com/skalenetwork/skale-manager.svg?branch=develop)](https://travis-ci.com/skalenetwork/skale-manager) [![codecov](https://codecov.io/gh/skalenetwork/skale-manager/branch/develop/graph/badge.svg)](https://codecov.io/gh/skalenetwork/skale-manager)

A smart contract system that orchestrates and operates the SKALE Network.

## Description

SKALE Manager controls Nodes, Validators, and SKALE chains. It also contains contracts for managing SkaleToken, Distributed Key Generation (DKG), and Verification of BLS signatures.

## Upgradeability

This system is upgradeable and uses the Separate Data and Functionality approach.

1) ContractManager: main contract of Separate Data and Functionality approach. It stores all contract's addresses in the SKALE Manager system.
2) Permissions: connectable contract to every SKALE Manager contract except ContractManager. It stores address of ContractManager and a modifier that forbids calls only from the given contract

## Structure

All interaction with this system is possible only through SKALE Manager. For all statuses and data, see Data contracts.
The main purpose of this system:

1) Control Nodes in the system:
    \- Register, Delete
2) Control Schains in the system:
    \- Create schain, delete schain
    \- Create group of Nodes for Schain
3) Control Validation system:
    \- collect verdicts of Nodes by Validators
    \- charge Bounty

## Install

1) Clone this repo
2) run `yarn install`

## Deployment

To create your network, see examples in `truffle-config.js`

Create a `.env` file with following data:

    ENDPOINT="your endpoint"
    ETH_PRIVATE_KEY="your private key"
    NETWORK="your created network"

-   deploy:

    truffle migrate --network 

## Test

_Need to deploy the system first_

    yarn test

## License

[![License](https://img.shields.io/github/license/skalenetwork/skale-manager.svg)](LICENSE)

Copyright (C) 2018-present SKALE Labs
