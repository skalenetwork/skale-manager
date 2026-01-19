#!/usr/bin/env bash
# cspell:words corepack
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

DEPLOYED_WITH_NODE_VERSION="lts/hydrogen"
CURRENT_NODE_VERSION=$(nvm current)

## Setup node
HARDHAT_NODE_SESSION="hardhat-node"
yarn pm2 start "yarn hardhat node" --name "$HARDHAT_NODE_SESSION"

echo "Node Initialized."

cleanup() {
    echo "Stopping Hardhat Node"
    yarn pm2 delete "$HARDHAT_NODE_SESSION"
}

trap cleanup EXIT

git clone --branch $DEPLOYED_TAG https://github.com/$GITHUB_REPOSITORY.git $DEPLOYED_DIR

cd $DEPLOYED_DIR
nvm install $DEPLOYED_WITH_NODE_VERSION
nvm use $DEPLOYED_WITH_NODE_VERSION

# IMPORTANT: YARN_IGNORE_PATH=1 prevents using the parent folder's Yarn binary.
# Consider changing cloned /deployed-skale-manager/ to be cloned outside of GITHUB_WORKSPACE
export YARN_IGNORE_PATH=1

# TODO: change when old version is specified in package.json - currently is not, we should use 1.22.22
corepack use yarn@1.22.22+sha512.a6b2f7906b721bba3d67d4aff083df04dad64c399707841b7acf00f6b133b7ac24255f2652fa22ae3534329dc6180534e98d17432037ff6fd140556e2bb3137e

yarn install

# NOTE: Might need to change to `yarn hardhat` on next release (when old version uses yarn 4+)
PRODUCTION=true VERSION=$DEPLOYED_VERSION npx hardhat run migrations/deploy.ts --network localhost
# No need to handle manifests using hardhat node, saved in cache not in .openzeppelin folder
CONTRACTS_FILENAME="skale-manager-$DEPLOYED_VERSION-localhost-contracts.json"
# TODO: copy contracts.json file when deployed version starts supporting it
# cp "data/$CONTRACTS_FILENAME" "$GITHUB_WORKSPACE/data"
ABI_FILENAME="skale-manager-$DEPLOYED_VERSION-localhost-abi.json"
cp "data/$ABI_FILENAME" "$GITHUB_WORKSPACE/data"

cd $GITHUB_WORKSPACE
nvm use $CURRENT_NODE_VERSION
rm -r --interactive=never $DEPLOYED_DIR

## Restore settings
# 1. Unset the ignore flag so we respect the local .yarnrc.yml again
unset YARN_IGNORE_PATH
corepack enable
corepack install

# TODO: use contracts.json file when deployed version starts supporting it
# SKALE_MANAGER_ADDRESS=$(cat data/$CONTRACTS_FILENAME | jq -r .SkaleManager)
SKALE_MANAGER_ADDRESS=$(cat data/$ABI_FILENAME | jq -r .skale_manager_address)
export ALLOW_NOT_ATOMIC_UPGRADE="OK"
export TARGET="$SKALE_MANAGER_ADDRESS"
export UPGRADE_ALL=true
# TODO: Remove after release 1.12.0
export IMA="$SKALE_MANAGER_ADDRESS"
export MARIONETTE="$SKALE_MANAGER_ADDRESS"
export PAYMASTER="$SKALE_MANAGER_ADDRESS"
# End of TODO
yarn hardhat run migrations/upgrade.ts --network localhost
