#!/bin/bash

export $(cat .env | xargs) 

./node_modules/.bin/truffle migrate --network ${NETWORK}


