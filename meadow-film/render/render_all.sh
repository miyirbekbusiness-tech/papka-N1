#!/bin/bash
# Resumable final render: 6 x 100-frame H.264 segments, 12-sample motion blur, then lossless concat.
cd "$(dirname "$0")/.."
for i in 0 1 2 3 4 5; do
  f0=$((i*100)); f1=$((f0+100)); seg=out/seg/seg$i.mp4
  [ -s "$seg.done" ] && continue
  node render/render.cjs video "$seg" 12 $f0 $f1 2>&1 | grep --line-buffered -v "GPU stall" && echo ok > "$seg.done"
done
ls out/seg/seg*.mp4 | sed "s|^out/seg/|file '|; s|$|'|" > out/seg/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/list.txt -c copy out/meadow_video.mp4 && echo "VIDEO DONE"
