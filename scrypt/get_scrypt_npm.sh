#!/bin/bash

# detect system name and number of CPU cores
export UNIX_SYSTEM_NAME=$(uname -s)
export NUMBER_OF_CPU_CORES=1
if [ "$UNIX_SYSTEM_NAME" = "Linux" ];
then
	export NUMBER_OF_CPU_CORES=$(grep -c ^processor /proc/cpuinfo)
	export READLINK=readlink
	export SO_EXT=so
fi
if [ "$UNIX_SYSTEM_NAME" = "Darwin" ];
then
	export NUMBER_OF_CPU_CORES=$(sysctl -n hw.ncpu)
	# required -> brew install coreutils
	export READLINK=/usr/local/bin/greadlink
	export SO_EXT=dylib
fi

# detect working directories, change if needed
WORKING_DIR_OLD=$(pwd)
WORKING_DIR_NEW="$(dirname "$0")"
WORKING_DIR_OLD=$("$READLINK" -f "$WORKING_DIR_OLD")
WORKING_DIR_NEW=$("$READLINK" -f "$WORKING_DIR_NEW")
cd "$WORKING_DIR_NEW"



rm -rf ./node-scrypt || true
git clone https://github.com/barrysteyn/node-scrypt.git
cd node-scrypt
git checkout fb60a8d3c158fe115a624b5ffa7480f3a24b03fb
yarn install
node-gyp configure build
cd ..



cd "$WORKING_DIR_OLD"
exit 0
