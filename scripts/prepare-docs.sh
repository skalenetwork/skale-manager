#!/usr/bin/env bash

# cSpell:words adoc

set -o errexit

OUTPUT_DIR=docs/api/pages/

if [ ! -d node_modules ]; then
  yarn install --frozen-lockfile
fi

rm -rf "$OUTPUT_DIR"
solidity-docgen -H docs/helpers.js --solc-module=./node_modules/solc -t docs -o "$OUTPUT_DIR" --extension=adoc
node scripts/gen-nav.js "$OUTPUT_DIR" > "$OUTPUT_DIR/../nav.adoc"
