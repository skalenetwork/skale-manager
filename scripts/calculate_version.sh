#!/usr/bin/env bash

set -e

VERSION=$(cat VERSION)
USAGE_MSG='Usage: BRANCH=[BRANCH] calculate_version.sh'

if [ -z "$BRANCH" ]
then
    (>&2 echo 'You should provide branch')
    echo "$USAGE_MSG"
    exit 1
fi


if [ -z "$VERSION" ]; then
      echo "The base version is not set."
      exit 1
fi

if [[ $BRANCH == 'master' ]]; then
    echo $VERSION
    exit 1
fi

git fetch --tags > /dev/null

KNOWN_BRANCHES=('stable' 'release-candidate' 'beta')
# Everything else will be marked as 'develop'

declare -A SUFFIXES=(
    ['release-candidate']='rc'
)

if [[ ! "${KNOWN_BRANCHES[@]}" =~ "$BRANCH" ]]
then
    BRANCH='develop'
fi

SUFFIX=$BRANCH
if [[ -n "${SUFFIXES[$BRANCH]}" ]]
then
    SUFFIX="${SUFFIXES[$BRANCH]}"
fi

for (( NUMBER=0; ; NUMBER++ ))
do
    FULL_VERSION="$VERSION-$SUFFIX.$NUMBER"
    if ! [[ $(git tag -l | grep $FULL_VERSION) ]]; then
        echo "$FULL_VERSION" | tr / -
        break
    fi
done
