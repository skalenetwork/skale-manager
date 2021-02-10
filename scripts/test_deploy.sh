#!/usr/bin/env bash

npx ganache-cli --gasLimit 8000000 --quiet --allowUnlimitedContractSize &
GANACHE_PID=$!
NODE_OPTIONS="--max-old-space-size=4096" PRODUCTION=true npx truffle migrate --network test || exit $?
sleep 5
kill $GANACHE_PID
