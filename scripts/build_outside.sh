#!/bin/bash
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
###echo PROJECT_DIR is "$PROJECT_DIR"
cd "$PROJECT_DIR"
###export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH
/bin/bash build.sh
