#!/usr/bin/env bash

npx ganache-cli --gasLimit 10000000 --quiet &
GANACHE_PID=$!
npx truffle migrate --network test || exit $?
sleep 5
kill $GANACHE_PID