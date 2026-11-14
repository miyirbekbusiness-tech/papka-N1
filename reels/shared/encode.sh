#!/usr/bin/env bash
# shared/encode.sh N — 2x frames → Lanczos 1080x1920 + 1% grain/dither → H.264 High CRF 14 + AAC 192k → partN.mp4 (15.0 s)
set -euo pipefail
N=$1; D="$(cd "$(dirname "$0")/.." && pwd)/stage$N"
ffmpeg -v error -y -framerate 30 -i "$D/frames/f%04d.png" -i "$D/mix_$N.wav" \
  -filter_complex "[0:v]scale=1080:1920:flags=lanczos+accurate_rnd+full_chroma_int,format=gbrp,noise=alls=3:allf=t+u,scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -profile:v high -preset slow -crf 14 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -frames:v 450 -t 15 -movflags +faststart "$D/part$N.mp4"
ffprobe -v error -show_entries stream=codec_name,profile,width,height,nb_frames,duration,pix_fmt,bit_rate -of compact "$D/part$N.mp4"
