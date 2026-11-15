#!/usr/bin/env bash
# make_stage.sh N — needs stageN/voice_N_raw.mp3 + stageN/transcript_N.json (ElevenLabs TTS + Scribe word timings).
# words → checks → half-size contact sheet → 2x frames → synthesized sound + mix → partN.mp4 → verify
set -euo pipefail
cd "$(dirname "$0")"; N=$1
SUB=$(python3 -c "import json;print(json.load(open('shared/texts.json'))['$N']['subs'])")
python3 shared/words.py "$N" "$SUB"
node shared/render.js meta "$N"
node shared/render.js check "$N" > /dev/null
node shared/render.js sheet "$N" && python3 shared/sheet.py "stage$N/sheet" "stage$N/contact_$N.png" 6
rm -rf "stage$N/frames" && node shared/render.js frames "$N" 4
python3 shared/audio.py stage "$N"
shared/encode.sh "$N"
python3 shared/verify.py "$N"
