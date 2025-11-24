<!-- cspell:ignore Blockscout Consen -->

# SKALE Manager
<div align="center">

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/534485763354787851.svg)](https://discord.gg/skale)
[![Build Status](https://github.com/skalenetwork/skale-manager/actions/workflows/test.yml/badge.svg)](https://github.com/skalenetwork/skale-manager/actions)
[![codecov](https://codecov.io/gh/skalenetwork/skale-manager/branch/develop/graph/badge.svg)](https://codecov.io/gh/skalenetwork/skale-manager)

</div>

A smart contract system that orchestrates and operates the SKALE Network.

## Introduction

SKALE Manager is a comprehensive suite of upgradeable smart contracts that serves as the backbone infrastructure for the SKALE Network. It orchestrates a decentralized network of validators and nodes that provision elastic, high-performance SKALE Chains (also known as "Schains") — application-specific blockchains with zero gas fees and sub-second finality.

The system implements a sophisticated mechanism where validators register nodes, accept delegated SKL tokens, and earn bounties based on their effective stake and network participation. Through distributed key generation (DKG) and BLS signature verification, SKALE Manager ensures cryptographic security across all chains without relying on centralized intermediaries.

**Core Capabilities:**

- **Validator & Node Management:** Registration, authorization, stake verification, and lifecycle management for network participants
- **Elastic Chain Provisioning:** Dynamic creation and deletion of SKALE Chains with automatic node group selection and rotation
- **Staking & Delegation:** Comprehensive delegation framework supporting validator fees, minimum delegation amounts, slashing, and reward distribution
- **Distributed Key Generation:** DKG protocol implementation with complaint handling and BLS public key storage for Consensus protocol of SKALE network
- **Economic Incentives:** Automated bounty calculation and SKL token minting (immutable limited supply) based on network participation and delegated stake

## Architecture & Design

A set of smart contracts following the Transparent Upgradeable Proxy pattern.

The central contract of the system is `SkaleManager.sol`.
From there, you can find the address of `ContractManager.sol` which holds a mapping from contract name to address.

Most contracts inherit from `Permissions.sol`, which extends `Ownable.sol`. We have thus two main categories:
- **owner**: The owner of skale-manager, full access to everything including upgradeability.
- `only(string contractName)`: `Permissions.sol` queries the address from `ContractManager` with name **contractName**. If it matches msg.sender, access is granted. `ContractManager.sol` is thus the central source of truth for deployed contract addresses.



## Installation & Setup

### Prerequisites

* Node.js v18-v22 (might be compatible with newer versions, but untested by CI). Recommend v22 for most skale projects

### Clone and Install

1. ```bash
   git clone --recurse-submodules https://github.com/skalenetwork/skale-manager.git
   ```
2. `cd skale-manager`
2. `yarn install`

## Running Tests

Tests run on local hardhat test environment, and do not require additional setup

**All tests**
```bash
yarn test
```

**Single Test**
```bash
yarn test test/{filename}.ts
```

**Coverage**

Coverage is time and resource consuming. You might need to increase `--max-old-space-size` to `12288`.
```bash
npx hardhat coverage --solcoverjs .solcover.js
```

**Deployment**

You can also test the deployment workflow by running the deployment script on a local hardhat node:

```bash
npx hardhat run migrations/deploy.ts
```

## Deployment

1. Create a `.env` file with following data:

```.env
ENDPOINT="{your endpoint}"
PRIVATE_KEY="{your private key with funds to pay for gas}"
GASPRICE={gas price in wei} # optional
ETHERSCAN={etherscan API key to verify contracts} # optional
```

2. deploy:

```bash
npx hardhat run migrations/deploy.ts --network custom
```

### Production deployment on Ethereum mainnet

* Blockscout: [skale-manager](https://eth.blockscout.com/address/0x8b32F750966273cb6D804C02360F3E2743E2B511)
* Etherscan: [skale-manager](https://etherscan.io/address/0x8b32F750966273cb6D804C02360F3E2743E2B511)

* Blockscout: [skale-token](https://eth.blockscout.com/token/0x00c83aecc790e8a4453e5dd3b0b4b3680501a7a7)
* Etherscan: [skale-token](https://etherscan.io/token/0x00c83aecc790e8a4453e5dd3b0b4b3680501a7a7)


## Security and Audits

**Static Analysis:** This project uses [slither](https://github.com/crytic/slither) as a primary static analysis tool.

### Third-party Audits

| Company | Audit Report | Scope/Date |
| :--- | :--- | :--- |
| ConsenSys Diligence | [Report](https://consensys.net/diligence/audits/2020/01/skale-token/) | SKALE Token (Jan 2020) |
| ConsenSys Diligence | [Report](https://consensys.net/diligence/audits/2020/10/skale-network/) | SKALE Network (Oct 2020) |
| Quantstamp | [Report](https://certificate.quantstamp.com/full/skale-network.pdf) | SKALE Network |
| Solidified | [Report](https://github.com/solidified-platform/audits/blob/master/Audit%20Report%20-%20SKALE%20Self-Recharging%20Wallets.pdf) | Self-Recharging Wallets |


## Main Branches

* **develop:** Most up-to-date branch with latest features and technological updates. It may be ahead of production instances. This is where contributions should be pushed to.

* **stable:** Latest stable version of the project.


## License

[![License](https://img.shields.io/github/license/skalenetwork/skale-manager.svg)](LICENSE)

Copyright (C) 2018-present SKALE Labs
