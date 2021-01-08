#!/bin/bash

NODE_OPTIONS="--max_old_space_size=4096" npx buidler coverage --solcoverjs .solcover.js || exit $?
bash <(curl -s https://codecov.io/bash)
