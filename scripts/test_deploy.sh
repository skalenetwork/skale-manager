#!/usr/bin/env bash

set -e

GANACHE_SESSION=$(npx ganache --😈 --miner.blockGasLimit 8000000)

PRODUCTION=true npx hardhat run migrations/deploy.ts --network localhost

npx ganache instances stop $GANACHE_SESSION
