#!/bin/bash

: "${NETWORK:?Provide NETWORK to deploy}"
: "${ETH_PRIVATE_KEY:?Provide ETH_PRIVATE_KEY to deploy}"

rm -rf build/contracts/*
#truffle compile
if [[ ! ${NETWORK} =~ ^(local|server|aws|do|aws_sip|aws_test|coverage)$ ]]; then
    echo "NETWORK variable proper values: ( local | server | aws | aws_test | aws_sip | do | coverage)"
    exit 1
fi
node migrations/deploy_upgradeable_contracts.js

