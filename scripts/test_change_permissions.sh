
set -e

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

DEPLOY_OUTPUT=$(PRODUCTION=true npx hardhat run migrations/deploy.ts --network localhost)

echo "Extracting SkaleManager address"
SKALE_MANAGER_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep "Register SkaleManager as SkaleManager =>" | awk '{print $NF}')

echo "SkaleManager deployed at: $SKALE_MANAGER_ADDRESS"

TARGET=$SKALE_MANAGER_ADDRESS NEW_OWNER="0x000000000000000000000000000000000000dEaD" \
 npx hardhat run migrations/changeOwnership.ts --network localhost
