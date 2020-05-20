#!/bin/bash

npx buidler coverage --solcoverjs .solcover.js || exit $?
bash <(curl -s https://codecov.io/bash)
