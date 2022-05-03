#!/usr/bin/env bash

set -e

npx ganache-cli --gasLimit 8000000 --quiet &

PRODUCTION=true npx hardhat run migrations/deploy.ts --network localhost

npx kill-port 8545
