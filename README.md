# skale_manager
Base repository with contracts implementation and deployment. 


## Main Contracts

#### SkaleManager

Managment of nodes and schains. Validation managment of nodes.

Main functions: 

- initWithdrawDeposit

- completeWithdrawDeposit

- withdrawFromSchain

- createNode (via SkaleToken transfer)

- createSchain (via SkaleToken transfer)

- sendVerdict

- getBounty

#### SkaleManager contracts structure

Libraries:

- Node - library for Node

- Validator - library for Validator

- Schain - library for Schain

Contracts:

- SkaleNodes - smart contract which operates with Nodes

- SkaleGroups - smart contract which operates with Groups

- SkaleValidators - smart contract which operates with Validators

- SkaleSchains - smart contract which operates with Schains

//TO DO

Tests

BLS+DKG module

AggregationSchain

#### SkaleToken

ERC223 token implementation. 

## Deployment

ABI and contract addresses are stored in data.json file.  

#### Truffle

- on local:

```
NETWORK='local' ./build.sh 
```

- on downstairs server:

```
NETWORK='server' ./build.sh
```
