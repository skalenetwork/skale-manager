#!/usr/bin/env bash

set -e

npx ganache-cli --gasLimit 8000000 --quiet &
GANACHE_PID=$!
PRODUCTION=true npx hardhat run migrations/deploy.ts --network localhost
kill $GANACHE_PID
