# STAGE 5: synthesize SFX + music bed (numpy, 48 kHz, no samples). Writes audio/stems/sfx.wav and music.wav
# covering the whole timeline (hook + scenes). Each SFX peaks 1 frame after its picture event.
import json, os, re, wave
import numpy as np

SR = 48000
FPS = 30
rng = np.random.default_rng(7)
T = json.load(open('src/data/timing.json'))
S = {s['id']: s for s in json.load(open('script.json', encoding='utf-8'))['scenes']}
DEFS = open('src/defs.tsx', encoding='utf-8').read()
hook = json.load(open('src/data/hook.json')) if os.path.exists('src/data/hook.json') else {'frames': 0, 'events': []}
ids = sorted(int(k) for k in T['scenes'])
starts = {}
t = hook['frames'] / FPS
for i in ids:
    starts[i] = t
    t += T['scenes'][str(i)]['frames'] / FPS
TOTAL = t
N = int(TOTAL * SR) + SR
sfx = np.zeros(N)
speech = np.zeros(N, dtype=bool)  # where the voice is talking
for i in ids:
    for c in T['scenes'][str(i)]['cues']:
        a, b = int((starts[i] + c['tin']) * SR), int((starts[i] + c['speech_end']) * SR)
        speech[a:b] = True
for e in hook.get('speech', []):
    speech[int(e[0] * SR):int(e[1] * SR)] = True

def env(n, att, rel):
    a = int(att * SR); r = n - a
    return np.concatenate([np.linspace(0, 1, max(a, 1)) ** 2, np.exp(-np.linspace(0, rel, max(r, 1)))])[:n]

def place(sig, peak_time, peak_index, gain_db):
    """put sig so that its sample peak_index lands at peak_time (s)."""
    g = 10 ** (gain_db / 20)
    s0 = int(peak_time * SR) - peak_index
    if s0 < 0:
        sig = sig[-s0:]; s0 = 0
    e = min(N, s0 + len(sig))
    sfx[s0:e] += sig[:e - s0] * g

from scipy.signal import lfilter
def lp(x, a):  # one-pole low-pass
    return lfilter([a], [1, a - 1], x)

# --- sound designs (all normalised to peak 1)
def whoosh():
    n = int(0.55 * SR); x = rng.standard_normal(n)
    sweep = np.linspace(0.02, 0.25, n) ** 1.5
    y = np.empty(n); acc = 0.0
    for i in range(n):  # short (0.55 s), loop is fine
        acc += sweep[i] * (x[i] - acc); y[i] = acc
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    y *= e; return y / np.abs(y).max(), int(n * 0.5)

def pop():
    n = int(0.09 * SR); tt = np.arange(n) / SR
    f = 900 * np.exp(-tt * 30) + 380
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 9)
    return y / np.abs(y).max(), int(0.004 * SR)

def rustle():
    n = int(0.7 * SR); x = rng.standard_normal(n)
    y = x - lp(x, 0.35)  # high-passed
    grains = (rng.random(n) < 0.002).astype(float)
    ge = np.convolve(grains, np.exp(-np.arange(int(0.03 * SR)) / (0.006 * SR)))[:n]
    y *= (0.25 + ge) * np.sin(np.linspace(0, np.pi, n))
    return y / np.abs(y).max(), int(n * 0.4)

def tick(freq=2400, dur=0.025):
    n = int(dur * SR); tt = np.arange(n) / SR
    y = (np.sin(2 * np.pi * freq * tt) + 0.4 * rng.standard_normal(n)) * np.exp(-tt * 260)
    return y / np.abs(y).max(), 0

def typewriter(k=5):
    parts = []
    for j in range(k):
        y, _ = tick(1800 + 300 * rng.random(), 0.03)
        gap = np.zeros(int((0.07 + 0.05 * rng.random()) * SR))
        parts += [y * (0.7 + 0.3 * rng.random()), gap]
    y = np.concatenate(parts); return y / np.abs(y).max(), 0

def boom():
    n = int(1.6 * SR); tt = np.arange(n) / SR
    f = 55 + 40 * np.exp(-tt * 8)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.012, 4.5)
    y += 0.25 * lp(rng.standard_normal(n), 0.02) * env(n, 0.005, 9)
    return y / np.abs(y).max(), int(0.012 * SR)

W, P, R, B = whoosh(), pop(), rustle(), boom()
BOOMS = {3: 0, 8: 2, 9: 2, 12: 3, 19: 1, 48: 0, 58: 1}  # scene: cue (6-8 key facts)
HISTORY = range(2, 10)
events = []
for i in ids:
    s0 = starts[i]; tm = T['scenes'][str(i)]
    kind = re.search(r'\n  %d: \{kind: \'(\w+)\'' % i, DEFS).group(1)
    # whoosh as the scene's camera move starts (cut at scene boundary = picture event)
    place(W[0], s0 + 1 / FPS, W[1], -24); events.append(('whoosh', s0))
    if kind == 'map':
        place(R[0], s0 + 0.25 + 1 / FPS, R[1], -30); events.append(('paper', s0 + 0.25))
    for lt in tm['label_t']:
        ev = s0 + lt + 4 / FPS  # label fully in after 4 frames
        place(P[0], ev + 1 / FPS, P[1], -22); events.append(('pop', ev))
    for ci, c in enumerate(S[i]['cues']):
        if re.search(r'\d', c['sub']):
            tw = typewriter(4)
            place(tw[0], s0 + tm['cues'][ci]['tin'] + 1 / FPS, 0, -33); events.append(('type', s0 + tm['cues'][ci]['tin']))
    if i in BOOMS:
        ev = s0 + tm['cues'][BOOMS[i]]['tin']
        place(B[0], ev + 1 / FPS, B[1], -16); events.append(('boom', ev))
    if i in HISTORY:  # quiet clock
        k = 0.0
        while k < tm['frames'] / FPS - 0.2:
            y, _ = tick(1300 if int(k) % 2 else 1100, 0.02)
            place(y, s0 + k, 0, -38); k += 1.0
for e in hook.get('events', []):
    sig = {'whoosh': W, 'pop': P, 'boom': B}[e['type']]
    place(sig[0], e['t'] + 1 / FPS, sig[1], e.get('db', -18))
if hook.get('riser'):
    n = int(hook['riser'][1] * SR); tt = np.arange(n) / SR
    y = lp(rng.standard_normal(n), 0.05) * (tt / tt[-1]) ** 2 + 0.3 * np.sin(2 * np.pi * (200 + 600 * (tt / tt[-1]) ** 2) * tt) * (tt / tt[-1]) ** 2
    place(y / np.abs(y).max(), hook['riser'][0] + hook['riser'][1], n - 1, -22)

# SFX must not mask words: 6 dB lower while speaking, except booms (short, low-frequency)
duck = np.where(speech, 10 ** (-6 / 20), 1.0)
duck = np.convolve(duck, np.ones(480) / 480, mode='same')
sfx *= duck

# --- music bed: A-minor pad (i-VI-III-VII) + light pulse at 90 BPM
bpm = 90; beat = 60 / bpm; bar = beat * 4
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G (MIDI)
music = np.zeros(N)
tt_all = np.arange(N) / SR
for b in range(int(TOTAL / bar) + 1):
    ch = chords[b % 4]; a0 = int(b * bar * SR); n = int(bar * SR * 1.15)
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / 0.9) * np.minimum(1, np.maximum(0, (bar * 1.15 - tt) / 0.6))
    sig = np.zeros(n)
    for m in ch:
        f = 440 * 2 ** ((m - 69) / 12)
        for det in (-0.12, 0.12):
            sig += np.sin(2 * np.pi * f * (1 + det / 100) * tt) * 0.5 + 0.15 * np.sin(2 * np.pi * 2 * f * tt)
    seg = sig * e
    e2 = min(N, a0 + n); music[a0:e2] += seg[:e2 - a0]
    for q in range(4):  # pulse: soft low pluck on each beat
        p0 = int((b * bar + q * beat) * SR); pn = int(0.35 * SR)
        if p0 + pn > N: break
        ptt = np.arange(pn) / SR
        f = 440 * 2 ** ((ch[0] - 12 - 69) / 12)
        music[p0:p0 + pn] += 0.6 * np.sin(2 * np.pi * f * ptt) * np.exp(-ptt * 9) * (1 if q == 0 else 0.6)
music = lp(music, 0.18)
music /= np.abs(music).max()
# fade in/out
fi = int(2 * SR); music[:fi] *= np.linspace(0, 1, fi); music[-int(4 * SR):] *= np.linspace(1, 0, int(4 * SR))

os.makedirs('audio/stems', exist_ok=True)
def save(path, x, peak_db):
    x = x / max(1e-9, np.abs(x).max()) * 10 ** (peak_db / 20)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
save('audio/stems/sfx.wav', sfx, -6)
save('audio/stems/music.wav', music, -6)
json.dump(dict(total=TOTAL, starts=starts, events=events, hook_frames=hook['frames']), open('audio/stems/sfx_events.json', 'w'), indent=1)
print('total', round(TOTAL, 2), 'events', len(events), {k: sum(1 for e in events if e[0] == k) for k in ('whoosh', 'paper', 'pop', 'type', 'boom')})
