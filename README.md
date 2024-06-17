# SKALE Manager

[![Discord](https://img.shields.io/discord/534485763354787851.svg)](https://discord.gg/vvUtWJB)
[![Build Status](https://github.com/skalenetwork/skale-manager/actions/workflows/test.yml/badge.svg)](https://github.com/skalenetwork/skale-manager/actions)
[![codecov](https://codecov.io/gh/skalenetwork/skale-manager/branch/develop/graph/badge.svg)](https://codecov.io/gh/skalenetwork/skale-manager)

A smart contract system that orchestrates and operates the SKALE Network.

## Description

SKALE Manager controls Nodes, Validators, and SKALE chains. It also contains contracts for managing SkaleToken, Distributed Key Generation (DKG), and Verification of BLS signatures.

## Upgradeability

This system is upgradeable and uses the transparent proxy approach.

## Structure

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

Create a `.env` file with following data:

```.env
ENDPOINT="{your endpoint}"
PRIVATE_KEY="{your private key}"
GASPRICE={gas price in wei} # optional
ETHERSCAN={etherscan API key to verify contracts} # optional
```

deploy:

```bash
npx hardhat run migrations/deploy.ts --network custom
```

## Test

The is no need to deploy the system first

```bash
yarn test
```

## License

[![License](https://img.shields.io/github/license/skalenetwork/skale-manager.svg)](LICENSE)

Copyright (C) 2018-present SKALE Labs
