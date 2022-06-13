#!/usr/bin/env bash

set -e

USAGE_MSG='Usage: BRANCH=[BRANCH] publish_package.sh'
if [ -z "$BRANCH" ]
then
    (>&2 echo 'You should provide branch')
    echo "$USAGE_MSG"
    exit 1
fi

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR=$(dirname "$SCRIPT_DIR")
INTERFACES_DIR="$ROOT_DIR/contracts/interfaces"

cd "$ROOT_DIR"

BRANCH=$(echo $BRANCH | tr [:upper:] [:lower:] | tr -d [:space:])
VERSION=$(BRANCH=$BRANCH $ROOT_DIR/predeployed/scripts/calculate_version.sh)

TAG=""
if ! [[ $BRANCH == 'stable' ]]
then
    TAG="--tag $BRANCH"
fi

if [[ "$VERSION" == *-stable.0 ]]
then
    VERSION=${VERSION%-stable.0}
fi

echo "Using $VERSION as a new version"

cp LICENSE "$INTERFACES_DIR"
cp README.md "$INTERFACES_DIR"
cp "$ROOT_DIR/interfaces/package.json" "$INTERFACES_DIR"

yarn publish $INTERFACES_DIR --access public --new-version $VERSION --verbose --no-git-tag-version $TAG --ignore-scripts
