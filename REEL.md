# 60 s Reel — build notes

Vertical 1080×1920, 30 fps, four 15 s parts sharing one kit.

| file | what |
|---|---|
| `kit.js` | PALETTE, SET (park, bench, lamp, trees, skyline, leaves), BULBS, SUB, LABEL, ICONS, MARK bubble, engine (`boot`, one paused GSAP timeline, `renderAt(t)`, `?t=` freezes) and the four characters HERO, RICH, BRIDE, CHILD with their expressions |
| `kit.html` | every character × expression, palette, bulbs, set, icons |
| `part1.html` … `part4.html` | the four 15 s timelines (import `kit.js`) |
| `vendor/gsap.min.js` | GSAP 3.12.5 from npm (cdnjs is blocked in the build environment) |
| `fonts/` | Inter 700/800 (latin subset, includes ʻ “ ” … – ) |
| `sound.wav` | music + foley, 48 kHz stereo, 60.0 s, −14 LUFS, ≤ −2 dBTP |
| `music_bed.wav` | the same bed at −20 LUFS |
| `story_60s.mp4` | final video (H.264 High, CRF 14, yuv420p, bt709, AAC 192k) |

The narrator voiceover was dropped at the user's request; `vo/lines.json` and
`tools/vo_build.py` remain if it is added later.

## Rebuild

```sh
npm install                      # gsap, @fontsource/inter, sharp (Playwright + ffmpeg pre-installed)
node tools/check.js part1.html '<cfg>'           # CHECKS (configs: tools/cfg_part3.json, tools/cfg_part4.json)
node tools/sheet.js part1.html out.png "0,1,2"   # contact sheet
node tools/events.js && node tools/sound.js      # sound.wav + music_bed.wav (Web Audio OfflineAudioContext)
for i in 1 2 3 4; do node tools/render.js $i; done   # parts/partN.mp4
tools/finish.sh                                  # concat, seam check, mux -> story_60s.mp4
```
