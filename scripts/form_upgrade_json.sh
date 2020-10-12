npx ganache-cli --gasLimit 8000000 --quiet &
GANACHE_PID=$!
NODE_OPTIONS="--max-old-space-size=4096" PRODUCTION=false npx truffle migrate --network test || exit $?
echo "deployped"
node scripts/form_json/FormUpgradeJson.js form
node scripts/form_json/FormUpgradeJson.js
kill $GANACHE_PID
