#!/bin/bash
set -euo pipefail
IFS=$'\t\n'

SRC=pi2.pix.uk.to
DIR=$(dirname $(realpath -e "$0"))

rsync \
    --recursive \
    --verbose \
    --filter='- static.cache.db' \
    --filter='+ *.db' \
    --filter='- *' \
    "$@" \
    $SRC:$DIR/ $DIR/
