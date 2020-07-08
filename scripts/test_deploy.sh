#!/usr/bin/env bash

npx ganache-cli --gasLimit 8000000 --quiet &
GANACHE_PID=$!
npx oz push --network test --force || exit $?
NODE_OPTIONS="--max-old-space-size=4096" PRODUCTION=true npx truffle migrate --network test || exit $?
sleep 5
kill $GANACHE_PID
