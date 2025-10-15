#!/usr/bin/env bash

set -e

# Have to set --miner.blockTime 1
# because there is a bug in ganache
# https://github.com/trufflesuite/ganache/issues/4165
# TODO: remove --miner.blockTime 1
# when ganache processes pending queue correctly
# to speed up testing process

#echo "Deploy on ganache node"
#GANACHE_SESSION=$(npx ganache --😈 --miner.blockGasLimit 8000000 --miner.blockTime 1)
#PRODUCTION=true npx hardhat run migrations/deploy.ts --network localhost
#npx ganache instances stop $GANACHE_SESSION

#echo "Deploy on hardhat node"
#PRODUCTION=true npx hardhat run migrations/deploy.ts


echo "Deploy to anvil node"
anvil > anvil.log 2>&1 &

# Store the Process ID (PID)
ANVIL_PID=$!

# Give Anvil a moment to start up
sleep 2
PRODUCTION=true npx hardhat run migrations/deploy.ts --network localhost
kill $ANVIL_PID