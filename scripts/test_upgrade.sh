#!/usr/bin/env bash

VERSION=$(cat VERSION)
DEPLOYED_VERSION=$(cat $TRAVIS_BUILD_DIR/DEPLOYED)
DEPLOYED_DIR=$TRAVIS_BUILD_DIR/deployed-skale-manager/

git clone --branch $DEPLOYED_VERSION https://github.com/$TRAVIS_REPO_SLUG.git $DEPLOYED_DIR

npx ganache-cli --gasLimit 8000000 --quiet &
GANACHE_PID=$!

cd $DEPLOYED_DIR
yarn install
npx oz push --network test --force || exit $?
NODE_OPTIONS="--max-old-space-size=4096" PRODUCTION=true npx truffle migrate --network test || exit $?
rm $TRAVIS_BUILD_DIR/.openzeppelin/dev-*.json
cp .openzeppelin/dev-*.json $TRAVIS_BUILD_DIR/.openzeppelin
cd $TRAVIS_BUILD_DIR

npx oz push --network test
npx oz upgrade --network test --all || exit $?

kill $GANACHE_PID