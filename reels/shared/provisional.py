#!/usr/bin/env python3
"""provisional.py N "SUBTITLE TEXT" — PLACEHOLDER word timings for building/checking a stage before
its ElevenLabs voice exists (pace modelled on the stage-1 Mirjalol take).  words.py overwrites the
file with real timings as soon as voice_N_raw.mp3 + transcript_N.json exist."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
n, text = int(sys.argv[1]), sys.argv[2]
toks = text.split()
dur = lambda w: 0.052 * len(w.strip('.,?!:;«»—')) + 0.10
pause = lambda w: 0.36 if w[-1] in '.?!' else 0.22 if w[-1] in ',:;' or w == '—' else 0.05
raw, t = [], 0.08
for w in toks:
    d = dur(w) if w != '—' else 0.08
    raw.append([t, t + d]); t += d + pause(w)
k = 14.35 / raw[-1][1]
words = [{'word': w, 'start': round(a * k, 3), 'end': round(b * k, 3), 'frame': int(round(a * k * 30))} for w, (a, b) in zip(toks, raw)]
d = ROOT / f'stage{n}'; d.mkdir(exist_ok=True)
(d / f'words_{n}.json').write_text(json.dumps({'stage': n, 'provisional': True, 'voice_duration': None, 'words': words}, ensure_ascii=False, indent=1))
print('\n'.join(f"{w['frame']:4d} {w['start']:6.3f} {w['word']}" for w in words))
