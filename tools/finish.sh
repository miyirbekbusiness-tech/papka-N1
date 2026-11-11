#!/usr/bin/env bash
# join part1-4 (concat demuxer, -c copy), check the seams, mux sound.wav -> story_60s.mp4, report
set -euo pipefail
cd "$(dirname "$0")/.."
printf "file '%s'\n" "$PWD/parts/part1.mp4" "$PWD/parts/part2.mp4" "$PWD/parts/part3.mp4" "$PWD/parts/part4.mp4" > parts/list.txt
ffmpeg -v error -y -f concat -safe 0 -i parts/list.txt -c copy parts/video.mp4
ffmpeg -v error -y -i parts/video.mp4 -i sound.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart story_60s.mp4
echo "== story_60s.mp4"
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,r_frame_rate,width,height,profile,pix_fmt,color_space -of default=nw=1 story_60s.mp4
ffprobe -v error -show_entries format=duration -of default=nw=1 story_60s.mp4
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,bit_rate,sample_rate,channels,duration -of default=nw=1 story_60s.mp4
ffmpeg -hide_banner -nostats -i story_60s.mp4 -map 0:a -af ebur128=peak=true:framelog=quiet -f null - 2>&1 | sed -n '/Summary/,$p' | grep -E "I:|Peak:|LRA:"
echo "== seams (mean RGB and spread of each frame)"
python3 - <<'PY'
import subprocess, numpy as np
def frame(n):
    raw = subprocess.run(['ffmpeg','-v','error','-i','story_60s.mp4','-vf',f'select=eq(n\\,{n})','-vsync','0','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(1920,1080,3).astype(float)
ok = True
for a in (449, 899, 1349):
    A, B = frame(a), frame(a+1)
    ma, mb = A.reshape(-1,3).mean(0), B.reshape(-1,3).mean(0)
    sa, sb = A.reshape(-1,3).std(0).max(), B.reshape(-1,3).std(0).max()
    same = np.abs(ma-mb).max() < 1.5 and sa < 4 and sb < 4
    ok &= same
    hexs = lambda m: '#%02X%02X%02X' % tuple(int(round(v)) for v in m)
    print(f'f{a} {hexs(ma)} (spread {sa:.1f})  |  f{a+1} {hexs(mb)} (spread {sb:.1f})  ->  {"same flat colour" if same else "DIFFERENT"}')
print('seams OK' if ok else 'seams FAILED')
PY
