#!/bin/bash
SRC=pi2.pix.uk.to
DIR=dev/pixprices/db
rsync $SRC:$DIR/ ~/$DIR/ -av "$@"
