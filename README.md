# Skale-manager

Skale-manager - smart contract system, which control work of skale-network

## Description

Skale-manager system controls Nodes, Validators, Schains. Also it contained SkaleToken, DKG and Verification of BLS signatures.
This system is upgradeable, used by Separate Data and Functionality approach.
Smart contract language - Solididty 0.4.24

## Upgradeability

1) ContractManager
    Main contract of Separate Data and Functionality approach. It stores all contract's addresses in Skale-manager system.
2) Permissions
    Connectable contract to every Skale-manager contracts, except ContractManager. It stores address of ContractManager and modifier which forbids calls only from the given contract

## Structure

All interaction with this system possible only throw SkaleManager. But all statuses and data you can look at Data contracts.
The main purpose of this system:

1) Control Nodes in the system:
    - Register, Delete
2) Control Schains in the system:
    - Create schain, delete schain
    - Create group of Nodes for Schain
3) Control Validation system:
    - collect verdicts of Nodes by Validators
    - charge Bounty

## Install

1) Clone this repo
2) run `npm install`
3) run `npm run compile`

## Deployment

Need to create your networks

Need to create `.env` file with following data:

```
NETWORK="your network"
ETH_PRIVATE_KEY="your private key"
```

 - deploy:

```
npm run deploy
```

## Test

*Need to deploy the system first*

```
npm run test
```
