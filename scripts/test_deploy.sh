#!/usr/bin/env bash

npx ganache-cli --gasLimit 8000000 --quiet &
GANACHE_PID=$!
PRODUCTION=true npx hardhat run migrations/deploy.ts --network localhost || exit $?
kill $GANACHE_PID
