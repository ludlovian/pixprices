#!/bin/bash
set -euo pipefail
IFS=$'\t\n'

## Migration to v4 schema

DIR=$(dirname $(realpath -e "$0"))
NAME=$(basename "$0")
SQLMIN=$(realpath -e $DIR/../node_modules/.bin/sqlmin)
DDLSRC=$(realpath -e $DIR/../src/server/db)

cd $DIR

mkdir -p new

rm -f new/portfolio.db
rm -f new/audit.db
rm -f new/history.db

$SQLMIN $DDLSRC/ddl.mjs | \
    sqlite3 new/portfolio.db

$SQLMIN $DDLSRC/audit.mjs | \
    sqlite3 new/audit.db

$SQLMIN $DDLSRC/history.mjs | \
    sqlite3 new/history.db

sqlite3 < ${NAME%.*}.sql
