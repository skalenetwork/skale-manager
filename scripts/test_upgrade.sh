#!/usr/bin/env bash

DEPLOYED_VERSION=$(cat $GITHUB_WORKSPACE/DEPLOYED)
DEPLOYED_DIR=$GITHUB_WORKSPACE/deployed-skale-manager/

git clone --branch $DEPLOYED_VERSION https://github.com/$GITHUB_REPOSITORY.git $DEPLOYED_DIR

npx ganache-cli --gasLimit 8000000 --quiet &
GANACHE_PID=$!

cd $DEPLOYED_DIR
yarn install
npx oz push --network test --force || exit $?
NODE_OPTIONS="--max-old-space-size=4096" PRODUCTION=true npx truffle migrate --network test || exit $?
rm $GITHUB_WORKSPACE/.openzeppelin/dev-*.json
cp .openzeppelin/dev-*.json $GITHUB_WORKSPACE/.openzeppelin || exit $?
cd $GITHUB_WORKSPACE
rm -r --interactive=never $DEPLOYED_DIR

npx oz push --network test || exit $?
npx oz upgrade --network test --all || exit $?

kill $GANACHE_PID
