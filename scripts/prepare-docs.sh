#!/usr/bin/env bash

set -o errexit

OUTDIR=docs/api/pages/

if [ ! -d node_modules ]; then
  yarn install --frozen-lockfile
fi

rm -rf "$OUTDIR"
solidity-docgen --solc-module=./node_modules/solc -t docs -o "$OUTDIR" --extension=adoc
node scripts/gen-nav.js "$OUTDIR" > "$OUTDIR/../nav.adoc"