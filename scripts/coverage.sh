#!/bin/bash

npx hardhat coverage --solcoverjs .solcover.js || exit $?
bash <(curl -s https://codecov.io/bash)
