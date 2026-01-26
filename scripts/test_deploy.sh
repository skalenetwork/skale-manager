#!/usr/bin/env bash

set -e

echo "Deploy on hardhat node"
PRODUCTION=true npx hardhat run migrations/deploy.ts
