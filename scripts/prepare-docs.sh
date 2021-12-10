#!/usr/bin/env bash

# cSpell:words adoc

set -o errexit

OUTDIR=docs/modules/api/pages/

if [ ! -d node_modules ]; then
  yarn install --frozen-lockfile
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
