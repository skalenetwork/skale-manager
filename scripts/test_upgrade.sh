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
npx truffle migrate --network test || exit $?
cp .openzeppelin/dev-*.json $TRAVIS_BUILD_DIR/.openzeppelin
cd $TRAVIS_BUILD_DIR

npx oz upgrade --network test --all

kill $GANACHE_PID