#!/usr/bin/env bash

set -e -o pipefail

HARDHAT_NODE_SESSION="hardhat-node"
yarn pm2 start "yarn hardhat node" --name "$HARDHAT_NODE_SESSION"

echo "Node Initialized."

cleanup() {
    echo "Stopping Hardhat Node"
    yarn pm2 delete "$HARDHAT_NODE_SESSION"
    echo "SUCCESS"
}

trap cleanup EXIT

echo "Running deployment setup"

DEPLOY_OUTPUT=$(PRODUCTION=true yarn hardhat run migrations/deploy.ts --network localhost)

echo "Extracting SkaleManager address"
SKALE_MANAGER_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "Register SkaleManager as SkaleManager =>" | awk '{print $NF}')

echo "SkaleManager deployed at: $SKALE_MANAGER_ADDRESS"

# The deployed version is not published yet, so use the ABI of this checkout
ABI_FILE=$(yarn hardhat run scripts/generateAbi.ts | grep "Save to" | awk '{print $NF}')

if [ ! -f "$ABI_FILE" ]; then
    echo "ABI file was not generated"
    exit 1
fi

echo "Using ABI file: $ABI_FILE"

ABI_FILE=$ABI_FILE ALLOW_NOT_ATOMIC_UPGRADE=true TARGET=$SKALE_MANAGER_ADDRESS NEW_OWNER="0x000000000000000000000000000000000000dEaD" \
 yarn hardhat run migrations/changeOwnership.ts --network localhost
