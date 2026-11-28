#!/bin/bash
# stdin lines: sceneid session gen signature  -> audio/voices/sNN.mp3
B=https://elevenlabsusercontent.com/database/workspace/5d469a1ca82c4b6297090dda75aff66b/content_generation
while read sid sess gen sig; do
  [ -z "$sid" ] && continue
  f=audio/voices/s$(printf %02d $sid).mp3
  code=$(curl -sS -o "$f" -w '%{http_code}' "$B/$sess/$gen/content.mp3?Expires=1795856400&KeyName=assets-cdn-key-1&Signature=$sig")
  echo "$sid $code $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null)"
done
