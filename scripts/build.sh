#!/bin/bash

export $(cat .env | xargs) 

if [[ ! ${NETWORK} =~ ^(local|server|aws|do|aws_sip|aws_test|coverage)$ ]]; then
    echo "NETWORK variable proper values: ( local | server | aws | aws_test | aws_sip | do | coverage)"
    exit 1
fi
node migrations/deploy_upgradeable_contracts.js

