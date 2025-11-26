#!/usr/bin/env bash
# cspell:ignore npmjs
set -e

: "${BRANCH?Need to set BRANCH}"
: "${VERSION?Need to set VERSION}"
: "${NODE_AUTH_TOKEN?Need to set NODE_AUTH_TOKEN}"

# Optional: Set DRY_RUN=1 to skip actual publishing
DRY_RUN="${DRY_RUN:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
TYPES_PACKAGE_DIR="$PROJECT_ROOT/types-package"

# Cleanup function to ensure .npmrc is always removed
cleanup() {
  echo "Cleaning up .npmrc file..."
  rm -f "$TYPES_PACKAGE_DIR/.npmrc"
}

# Trap to ensure cleanup runs even if script fails or is interrupted
trap cleanup EXIT

cd "$PROJECT_ROOT"

echo "Ensuring dependencies installed..."
yarn install

echo "Generating TypeChain types..."
yarn generateTypes

echo "Building types package..."
yarn buildTypesPackage

cd "$TYPES_PACKAGE_DIR"

echo "Configuring npm authentication..."
cat > .npmrc << EOF
//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}
registry=https://registry.npmjs.org/
EOF

# Set restrictive permissions on .npmrc to protect the auth token
chmod 600 .npmrc

echo "Verifying authentication..."
if ! npm whoami; then
  echo "Error: npm authentication failed"
  exit 1
fi

echo "Publishing types package..."
TAG=""
if [[ "$BRANCH" != "stable" ]]; then
  TAG="--tag $BRANCH"
fi

if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY RUN: Would execute: npm publish --access public $TAG"
  echo "Package contents:"
  npm pack --dry-run
else
  npm publish --access public $TAG
fi
