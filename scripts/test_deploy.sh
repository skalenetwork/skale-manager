#!/usr/bin/env bash

set -e

echo "Deploy on hardhat node"
PRODUCTION=true yarn hardhat run migrations/deploy.ts
