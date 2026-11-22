# dangasa Ai: 9.6 s intro

`index.html` is the whole scene: three.js 0.160.0 via a jsDelivr importmap, 1920×1080 (or `?res=3840x2160`), 60 fps, 576 frames, last frame held.

- `?t=5.4` (or `?f=324`) freezes on that time; no query plays it in real time.
- `window.renderAt(t)` draws exact time `t`. All motion is a pure function of `t`, and the random elements (twinkle phases, grain) are seeded.
- `window.TIMELINE` holds every event frame. The soundtrack reads its times from here.
- The font (`fonts/Unbounded-Bold.ttf`, Unbounded wght 700 instanced from the google/fonts variable TTF) and the texture (`tex/earth_lights_2048.png`, three.js r160) both load before frame 0.

## Pipeline

```bash
export THREE_VENDOR=/path/to/three@0.160.0/package   # optional: serve the importmap from a local copy

node tools/checks.mjs  CHECKDIR            # per-frame intersection log, arc arrival, text, framing, renders + masks
python3 tools/checks.py CHECKDIR           # colour probes, contrast, crispness, whole text, framing  → PASS/FAIL
python3 tools/contact.py CHECKDIR/img sheet.png
python3 tools/sound.py report/timeline.json audio/intro.wav     # numpy synthesis, -14 LUFS, ≤ -2 dBTP
node tools/frames.mjs --res 3840x2160 --out FRAMES --frames 0-575 --workers 3
tools/encode.sh FRAMES audio/intro.wav intro.mp4                 # lanczos → 1080p, H.264 CRF 16, AAC
tools/verify_mp4.sh intro.mp4 CHECKDIR WORKDIR                   # re-runs the image checks on the decoded MP4
```

`report/` holds the logs and results of the last run: `intersections.log` (every frame), `checks*.json`, `timeline.json`, `audio` report, and the contact sheets.
