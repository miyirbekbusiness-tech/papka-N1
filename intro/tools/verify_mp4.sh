#!/usr/bin/env bash
# tools/verify_mp4.sh OUT_MP4 CHECKDIR WORKDIR — decode the delivered MP4 and re-run the image checks on it
set -euo pipefail
MP4="$1"; CHK="$2"; WD="$3"; mkdir -p "$WD/dec"
ffmpeg -hide_banner -loglevel error -y -i "$MP4" -vf "scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24" -start_number 0 "$WD/dec/f%04d.png"
echo "decoded frames: $(ls "$WD/dec" | wc -l)"
python3 "$(dirname "$0")/checks.py" "$CHK" "$WD/dec"
ffmpeg -hide_banner -nostats -i "$MP4" -map 0:a -af ebur128=peak=true -f null - 2>&1 | grep -A1 -E "^\s+(I|Peak):" | grep -E "I:|Peak:"
