#!/usr/bin/env bash
# make_final.sh — part1..4 → final.mp4 (60.0 s, 1800 frames): video concatenated losslessly,
# audio rebuilt as one continuous track (no joins), -14 LUFS, true peak <= -2 dBTP, AAC 192k, +faststart.
set -euo pipefail
cd "$(dirname "$0")"
for n in 1 2 3 4; do test -f "stage$n/part$n.mp4"; done
python3 shared/audio.py final
printf "file 'stage%s/part%s.mp4'\n" 1 1 2 2 3 3 4 4 > concat.txt
ffmpeg -v error -y -f concat -safe 0 -i concat.txt -i final_mix.wav -map 0:v -map 1:a -c:v copy \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -t 60 -movflags +faststart final.mp4
rm concat.txt
ffprobe -v error -count_frames -show_entries stream=codec_type,nb_read_frames,duration -of compact final.mp4
ffmpeg -hide_banner -i final.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
python3 shared/film_check.py
