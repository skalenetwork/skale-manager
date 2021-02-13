#!/bin/bash

NODE_OPTIONS="--max_old_space_size=3328" npx hardhat coverage --solcoverjs .solcover.js || exit $?
bash <(curl -s https://codecov.io/bash)
