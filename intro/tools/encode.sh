#!/usr/bin/env bash
# tools/encode.sh FRAMES4K_DIR AUDIO_WAV OUT_MP4
# 3840x2160 PNG frames -> lanczos 1920x1080 -> H.264 CRF 16 yuv420p (BT.709) + AAC, 60 fps, 9.6 s.
set -euo pipefail
FR="$1"; WAV="$2"; OUT="$3"
n=$(ls "$FR"/f*.png | wc -l); [ "$n" -eq 576 ] || { echo "expected 576 frames, found $n"; exit 1; }
ffmpeg -hide_banner -loglevel warning -y \
  -framerate 60 -i "$FR/f%04d.png" -i "$WAV" \
  -map 0:v -map 1:a \
  -vf "scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -r 60 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -ac 2 \
  -t 9.6 -movflags +faststart "$OUT"
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_frames,sample_rate,channels,duration -of compact "$OUT"
