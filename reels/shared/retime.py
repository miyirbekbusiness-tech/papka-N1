#!/usr/bin/env python3
"""retime.py N word[#k]=t ... — piecewise-linear re-pacing of a stage WITHOUT voice so each cue word
(k-th occurrence, default 0) starts at time t; the reading pace inside every shot is kept."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
n = int(sys.argv[1]); p = ROOT / f'stage{n}' / f'words_{n}.json'
d = json.loads(p.read_text()); W = d['words']
strip = lambda s: re.sub(r'[.,?!:;«»]', '', s)
anchors = [(0.0, 0.0)]
for a in sys.argv[2:]:
    w, t = a.split('='); w, k = (w.split('#') + ['0'])[:2]
    hits = [x for x in W if strip(x['word']) == w]
    anchors.append((hits[int(k)]['start'], float(t)))
anchors.append((W[-1]['end'], 14.45)); anchors.sort()
def warp(t):
    for (a0, b0), (a1, b1) in zip(anchors, anchors[1:]):
        if t <= a1: return b0 + (t - a0) * (b1 - b0) / (a1 - a0)
    return anchors[-1][1]
for x in W:
    x['start'] = round(warp(x['start']), 3); x['end'] = round(warp(x['end']), 3); x['frame'] = int(round(x['start'] * 30))
d['retimed_no_voice'] = True; d['provisional'] = False
p.write_text(json.dumps(d, ensure_ascii=False, indent=1))
print(' '.join(f"{x['frame']}:{x['word']}" for x in W))
