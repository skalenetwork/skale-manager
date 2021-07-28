#!/bin/bash

# cSpell:words solcover solcoverjs


NODE_OPTIONS="--max_old_space_size=4096" npx hardhat coverage --solcoverjs .solcover.js || exit $?
bash <(curl -s https://codecov.io/bash)
