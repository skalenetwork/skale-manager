# SKALE Manager

A smart contract system, which orchestrates the SKALE network

## Description

SKALE Manager controls Nodes, Validators, and SKALE chains. It also contains SkaleToken, DKG and Verification of BLS signatures.
This system is upgradeable and uses the Separate Data and Functionality approach.

## Upgradeability

1) ContractManager
    Main contract of Separate Data and Functionality approach. It stores all contract's addresses in Skale-manager system.
2) Permissions
    Connectable contract to every Skale-manager contracts, except ContractManager. It stores address of ContractManager and modifier which forbids calls only from the given contract

## Structure

All interaction with this system possible only through SkaleManager. But all statuses and data you can look at Data contracts.
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
3) run `yarn run compile`

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

    yarn run test

## TODO

Provide ways to upgrade contracts
