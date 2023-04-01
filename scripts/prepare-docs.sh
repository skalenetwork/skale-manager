#!/usr/bin/env bash

# cSpell:words adoc

set -o errexit

OUTDIR=docs/modules/api/pages/

if [ ! -d node_modules ]; then
  yarn install --frozen-lockfile
fi

if [ "$(npm list | grep -c solidity-docgen)" -eq 0 ]; then
  echo "Installing solidity-docgen..."
  yarn add solidity-docgen@0.5.16
  else
  echo "Solidity-docgen already installed."
fi

if [ "$(npm list | grep -c lodash.startcase)" -eq 0 ]; then
  echo "Installing lodash.startcase..."
  yarn add lodash.startcase@4.4.0
  else
  echo "Lodash.startcase already installed."
fi

rm -rf "$OUTDIR"

solidity-docgen \
  -i contracts/ \
  -e contracts/test/ \
  -H docs/helpers.js \
  --solc-module=./scripts/prepare-docs-solc.js \
  -t docs \
  -o "$OUTDIR" \
  --extension=adoc

node scripts/gen-nav.js "$OUTDIR" > "$OUTDIR/../nav.adoc"

rm -rf "$OUTDIR/thirdparty/"
