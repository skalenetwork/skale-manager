#!/usr/bin/env bash

set -e

if [ -z $GITHUB_WORKSPACE ]
then
    GITHUB_WORKSPACE="$(dirname "$(dirname "$(realpath "$0")")")"
fi

if [ -z $GITHUB_REPOSITORY ]
then
    GITHUB_REPOSITORY="skalenetwork/skale-manager"
fi

export NVM_DIR=~/.nvm;
source $NVM_DIR/nvm.sh;

DEPLOYED_TAG=$(cat $GITHUB_WORKSPACE/DEPLOYED)
DEPLOYED_VERSION=$(echo $DEPLOYED_TAG | xargs ) # trim
DEPLOYED_DIR=$GITHUB_WORKSPACE/deployed-skale-manager/

DEPLOYED_WITH_NODE_VERSION="lts/krypton"
CURRENT_NODE_VERSION=$(nvm current)

## Start hardhat node setup
HARDHAT_NODE_SESSION="hardhat-node"
yarn pm2 start "yarn hardhat node" --name "$HARDHAT_NODE_SESSION"

echo "Node Initialized."

cleanup() {
    echo "Stopping Hardhat Node"
    yarn pm2 delete "$HARDHAT_NODE_SESSION"
    echo "SUCCESS"
}

trap cleanup EXIT
## End of node setup

git clone --branch $DEPLOYED_TAG https://github.com/$GITHUB_REPOSITORY.git $DEPLOYED_DIR

cd $DEPLOYED_DIR
nvm install $DEPLOYED_WITH_NODE_VERSION
nvm use $DEPLOYED_WITH_NODE_VERSION

yarn install

PRODUCTION=true VERSION=$DEPLOYED_VERSION yarn hardhat run migrations/deploy.ts --network localhost
CONTRACTS_FILENAME="skale-manager-$DEPLOYED_VERSION-localhost-contracts.json"

cp "data/$CONTRACTS_FILENAME" "$GITHUB_WORKSPACE/data"

cd $GITHUB_WORKSPACE
nvm use $CURRENT_NODE_VERSION
rm -r --interactive=never $DEPLOYED_DIR

# Ensure install
yarn install

SKALE_MANAGER_ADDRESS=$(cat data/$CONTRACTS_FILENAME | jq -r .SkaleManager)
export ALLOW_NOT_ATOMIC_UPGRADE="OK"
export TARGET="$SKALE_MANAGER_ADDRESS"
export UPGRADE_ALL=true
yarn hardhat run migrations/upgrade.ts --network localhost
