#!/usr/bin/env bash

DEPLOYED_TAG=$(cat $GITHUB_WORKSPACE/DEPLOYED)
DEPLOYED_VERSION=$(echo $DEPLOYED_TAG | cut -d '-' -f 1)
DEPLOYED_DIR=$GITHUB_WORKSPACE/deployed-skale-manager/

git clone --branch $DEPLOYED_TAG https://github.com/$GITHUB_REPOSITORY.git $DEPLOYED_DIR

npx ganache-cli --gasLimit 8000000 --quiet &
GANACHE_PID=$!

cd $DEPLOYED_DIR
yarn install || exit $?
PRODUCTION=true VERSION=$DEPLOYED_VERSION npx hardhat run migrations/deploy.ts --network localhost || exit $?
rm $GITHUB_WORKSPACE/.openzeppelin/unknown-*.json
cp .openzeppelin/unknown-*.json $GITHUB_WORKSPACE/.openzeppelin || exit $?
ABI_FILENAME="skale-manager-$DEPLOYED_VERSION-localhost-abi.json"
cp "data/$ABI_FILENAME" "$GITHUB_WORKSPACE/data" || exit $?
cd $GITHUB_WORKSPACE
rm -r --interactive=never $DEPLOYED_DIR

ABI="data/$ABI_FILENAME" npx hardhat run migrations/upgrade.ts --network localhost || exit $?

kill $GANACHE_PID
