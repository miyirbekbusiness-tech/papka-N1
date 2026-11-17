#!/bin/bash
# usage: sheet.sh dir  -> dir/sheet.jpg (2 columns, files in frame order)
cd "$1" && ffmpeg -y -loglevel error -pattern_type glob -i 'f*.png' -vf "scale=960:540,tile=2x$(( ($(ls f*.png | wc -l)+1)/2 )):padding=4" -frames:v 1 sheet.jpg
