#!/usr/bin/env python3
"""Build vo_track.wav from vo/S1.mp3 ... vo/CTA2.mp3.

Each line is decoded at 48 kHz, its leading/trailing silence trimmed, placed at its
start time, and (only if it would overrun its slot) sped up with pitch-preserving
atempo, never more than 1.15x. Prints the line / start / end / slot table and writes
vo/timing.json. Voice chain: high-pass 90 Hz, light de-ess, gentle compression,
about -16 LUFS, centred stereo, 48 kHz, 60.0 s.
"""
import json, subprocess, sys, os
import numpy as np
SR, DUR, MAXT = 48000, 60.0, 1.15
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = json.load(open(os.path.join(ROOT, 'vo/lines.json')))['lines']

def decode(path, tempo=1.0):
    af = f'atempo={tempo:.4f}' if abs(tempo - 1) > 1e-4 else 'anull'
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-af', af, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def trim(y):
    fr = int(0.01 * SR); n = len(y) // fr
    e = 20 * np.log10(np.sqrt((y[:n * fr].reshape(n, fr) ** 2).mean(1)) + 1e-9)
    idx = np.where(e > e.max() - 38)[0]
    a = max(0, idx[0] * fr - int(0.03 * SR)); b = min(len(y), (idx[-1] + 1) * fr + int(0.06 * SR))
    return y[a:b]

missing = [l['id'] for l in L if not os.path.exists(os.path.join(ROOT, f"vo/{l['id']}.mp3"))]
if missing:
    sys.exit('missing: ' + ', '.join(f'vo/{m}.mp3' for m in missing))
track = np.zeros(int(DUR * SR), np.float32); rows = []; fails = []
clips = {}
for l in L:
    clips[l['id']] = trim(decode(os.path.join(ROOT, f"vo/{l['id']}.mp3")))
# CTA1 + gap + CTA2 must fit 56.0 .. 59.8
c1, c2 = len(clips['CTA1']) / SR, len(clips['CTA2']) / SR
for l in L:
    y = clips[l['id']]; ln = len(y) / SR
    if l['id'] == 'CTA1':
        start, avail = 56.0, (59.8 - 56.0 - 0.15) * c1 / (c1 + c2)
    elif l['id'] == 'CTA2':
        start, avail = None, 59.8 - (rows[-1]['end'] + 0.15)
    else:
        start, avail = l['start'], l['end_by'] - l['start']
    tempo = 1.0
    if ln > avail:
        tempo = ln / avail
        if tempo > MAXT + 1e-6:
            fails.append(f"{l['id']}: {ln:.2f}s needs {tempo:.2f}x for a {avail:.2f}s slot (max {MAXT}x)")
            tempo = MAXT
        y = trim(decode(os.path.join(ROOT, f"vo/{l['id']}.mp3"), tempo)); ln = len(y) / SR
    if start is None: start = rows[-1]['end'] + 0.15
    i = int(round(start * SR)); track[i:i + len(y)] += y[:max(0, len(track) - i)]
    rows.append({'id': l['id'], 'start': round(start, 3), 'end': round(start + ln, 3), 'slot': round(avail, 3), 'tempo': round(tempo, 3)})
for a, b in zip(rows, rows[1:]):
    if a['end'] > b['start'] - 1e-3: fails.append(f"{a['id']} overlaps {b['id']}")
tmp = os.path.join(ROOT, 'frames/vo_raw.f32')
os.makedirs(os.path.dirname(tmp), exist_ok=True); track.tofile(tmp)
chain = 'highpass=f=90,deesser=i=0.25,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,loudnorm=I=-16:TP=-2:LRA=7,aresample=48000,pan=stereo|c0=c0|c1=c0'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', tmp, '-af', chain, '-t', str(DUR), '-ar', str(SR), '-c:a', 'pcm_s24le', os.path.join(ROOT, 'vo_track.wav')], check=True)
json.dump(rows, open(os.path.join(ROOT, 'vo/timing.json'), 'w'), indent=1)
print('| line | start | end | slot | length | tempo |\n|---|---|---|---|---|---|')
for r in rows: print(f"| {r['id']} | {r['start']:.3f} | {r['end']:.3f} | {r['slot']:.2f} | {r['end'] - r['start']:.2f} | {r['tempo']:.2f}x |")
print('\n' + ('\n'.join('FAIL ' + f for f in fails) if fails else 'all 23 lines fit their slots, in order, no overlaps'))
