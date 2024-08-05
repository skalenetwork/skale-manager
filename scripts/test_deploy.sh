#!/usr/bin/env bash

set -e

# Have to set --miner.blockTime 1
# because there is a bug in ganache
# https://github.com/trufflesuite/ganache/issues/4165
# TODO: remove --miner.blockTime 1
# when ganache processes pending queue correctly
# to speed up testing process
GANACHE_SESSION=$(npx ganache --😈 --miner.blockGasLimit 8000000 --miner.blockTime 1)

PRODUCTION=true npx hardhat run migrations/deploy.ts --network localhost

npx ganache instances stop $GANACHE_SESSION
