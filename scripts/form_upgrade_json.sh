export $(cat .env | xargs) 

npx ganache-cli --gasLimit 8000000 --account="0x$LOCAL_PRIVATE_KEY, 1000000000000000000000000"  --quiet &
GANACHE_PID=$!
NODE_OPTIONS="--max-old-space-size=4096" npx truffle migrate --network test

if [ $PRODUCTION = true ]
then
    VERSION=$(cat VERSION)
    wget https://raw.githubusercontent.com/skalenetwork/skale-network/master/releases/mainnet/skale-manager/$VERSION/skale-manager-$VERSION-mainnet-contracts.json
    mv skale-manager-$VERSION-mainnet-contracts.json scripts/form_json/ContractAddresses.json
    PROXY_ADMIN_ADDRESS=$(node scripts/form_json/FormUpgradeJson.js getProxyAdminAddress)
    node scripts/form_json/FormUpgradeJson.js
else
    npx ganache-cli --gasLimit 8000000 --account="0x$PRIVATE_KEY, 1000000000000000000000000" --port 8546 --quiet &
    NODE_OPTIONS="--max-old-space-size=4096" npx truffle migrate --network unique
    PROXY_ADMIN_ADDRESS=$(node scripts/form_json/FormUpgradeJson.js getTestProxyAdminAddress)
    node scripts/form_json/FormUpgradeJson.js form
    node scripts/form_json/FormUpgradeJson.js

fi

kill $GANACHE_PID


echo $PROXY_ADMIN_ADDRESS
