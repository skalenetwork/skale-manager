export $(cat .env | xargs) 

npx ganache-cli --gasLimit 8000000 --account="0xa15c19da241e5b1db20d8dd8ca4b5eeaee01c709b49ec57aa78c2133d3c1b3c9, 1000000000000000000000000"  --quiet &
GANACHE_PID=$!
NODE_OPTIONS="--max-old-space-size=4096" npx truffle migrate --network test

if [ $PRODUCTION = true ]
then
    VERSION=$(cat VERSION)
    wget https://raw.githubusercontent.com/skalenetwork/skale-network/master/releases/mainnet/skale-manager/$VERSION/skale-manager-$VERSION-mainnet-contracts.json
    mv skale-manager-$VERSION-mainnet-contracts.json scripts/upgrade/ContractAddresses.json
    PROXY_ADMIN_ADDRESS=$(node scripts/upgrade/GenerateOZJson.js getProxyAdminAddress)
    node scripts/upgrade/GenerateOZJson.js
else
    npx ganache-cli --gasLimit 8000000 --account="0x$PRIVATE_KEY, 1000000000000000000000000" --port ${ENDPOINT:(-4)} --quiet &
    GANACHE_PID_TEST=$!
    NODE_OPTIONS="--max-old-space-size=4096" npx truffle migrate --network unique
    PROXY_ADMIN_ADDRESS=$(node scripts/upgrade/GenerateOZJson.js getTestProxyAdminAddress)
    node scripts/upgrade/GenerateOZJson.js form
    node scripts/upgrade/GenerateOZJson.js

fi

kill $GANACHE_PID
kill $GANACHE_PID_TEST
