"""Synthesize the dangasa Ai intro soundtrack — numpy only, no samples, no voices.

python3 tools/sound.py report/timeline.json audio/intro.wav

Every event time is read from the scene's TIMELINE (exported by tools/checks.mjs).
Hits are built so their envelope peaks exactly one frame after the picture event.
"""
import json, sys, wave
from pathlib import Path
import numpy as np

SR = 48000
TL = json.loads(Path(sys.argv[1]).read_text())
OUT = Path(sys.argv[2]); OUT.parent.mkdir(parents=True, exist_ok=True)
FPS = TL['fps']
DUR = TL['frames'] / FPS                       # 9.6 s
N = int(round(DUR * SR))
FRAME = SR // FPS                              # 800 samples
rng = np.random.default_rng(0x0DA6A5A)
ev = lambda f: f / FPS                         # picture event time
pk = lambda f: (f + 1) / FPS                   # sound peak time (1 frame later)
NOTE = lambda n: 440.0 * 2 ** ((n - 69) / 12)  # MIDI -> Hz
D2, F2, A2, D3, E3, F3, Fs3, A3, D4, Fs4, A4, D5 = 38, 41, 45, 50, 52, 53, 54, 57, 62, 66, 69, 74

# ─────────────────────────── helpers ───────────────────────────
def pan2(x, p):
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])

def place(bus, sig, t0, p=0.0, gain=1.0):
    """add mono (or stereo) sig at time t0 (s)."""
    s = pan2(sig, p) if sig.ndim == 1 else sig
    i0 = int(round(t0 * SR)); i1 = min(N, i0 + s.shape[1])
    if i1 > i0: bus[:, i0:i1] += gain * s[:, : i1 - i0]

def hit_env(n, decay, att=FRAME, shape=1.0):
    """attack ramp of exactly one frame to the peak, then exponential decay."""
    e = np.empty(n); a = min(att, n)
    e[:a] = np.sin(0.5 * np.pi * np.arange(1, a + 1) / a) ** 2
    k = np.arange(n - a) / SR
    e[a:] = np.exp(-k / decay) ** shape
    return e

def fft_filter(x, lo=None, hi=None, order=4):
    """zero-phase Butterworth-magnitude band filter in the frequency domain."""
    n = x.shape[-1]; m = 1 << (n - 1).bit_length()
    X = np.fft.rfft(x, m); f = np.fft.rfftfreq(m, 1 / SR)
    H = np.ones_like(f)
    if lo: H *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi: H *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * H, m)[..., :n]

def additive_saw(f0, n, cutoff, detune_cents=0.0, vib=None, phase0=0.0, nyq_margin=0.9, align=None):
    """band-limited saw by additive synthesis, per-harmonic 2-pole low-pass at cutoff (scalar or array)."""
    t = np.arange(n) / SR
    f = f0 * 2 ** (detune_cents / 1200)
    inst = f * (1 + (vib if vib is not None else 0))
    ph = 2 * np.pi * np.cumsum(inst) / SR + phase0
    if align is not None: ph = ph - ph[align]
    osc = np.sin                                   # align: every voice/note passes the same saw phase at `align`
    out = np.zeros(n)
    cut = np.asarray(cutoff, dtype=float)
    kmax = min(int(SR / 2 * nyq_margin / (f * 1.02)), int(5 * np.max(cut) / f) + 1)
    for k in range(1, max(kmax, 1) + 1):
        amp = (1 / k) / np.sqrt(1 + ((k * f) / cut) ** 4)
        if np.ndim(amp) == 0 and amp < 1e-4: break
        out += amp * osc(k * ph)
    return out

def hilbert_env(x):
    n = x.shape[-1]; X = np.fft.fft(x); h = np.zeros(n); h[0] = 1
    h[1:(n + 1) // 2] = 2
    if n % 2 == 0: h[n // 2] = 1
    return np.abs(np.fft.ifft(X * h))

# ─────────────────────────── buses / stems ─────────────────────
stems = {k: np.zeros((2, N)) for k in ['twinkle', 'pings', 'whoosh', 'boom', 'ticks', 'swell', 'slide', 'pop', 'pad', 'brass', 'timpani', 'horn']}
rev_send = np.zeros((2, N))
HITS = []                                      # isolated hit signals for peak-timing verification

# FOLEY ─ soft twinkle bed from 0 s (fades with the picture's twinkle by 7.8 s)
tw_notes = [NOTE(n) for n in (86, 89, 91, 93, 96, 98, 101, 103)]      # D6 pentatonic-minor colours
t = 0.05
while t < 7.8:
    dens = 1.0 if t < 6.0 else 1 - (t - 6.0) / 1.8
    f = rng.choice(tw_notes) * 2 ** (rng.normal(0, 6) / 1200)
    n = int(0.45 * SR); k = np.arange(n) / SR
    env = (1 - np.exp(-k / 0.012)) * np.exp(-k / 0.11)
    sig = (np.sin(2 * np.pi * f * k) + 0.3 * np.sin(2 * np.pi * f * 2.76 * k)) * env
    place(stems['twinkle'], sig, t, rng.uniform(-0.8, 0.8), 0.05 * dens * rng.uniform(0.5, 1.0))
    t += rng.exponential(1 / 7.0)
air = fft_filter(rng.normal(0, 1, (2, N)), lo=5000, hi=12000, order=2) * 0.004
air *= np.clip(1 - (np.arange(N) / SR - 6.0) / 1.8, 0, 1)
stems['twinkle'] += air

# FOLEY ─ 8 rising glass pings on the light flares (peak 1 frame after each flare)
ping_notes = [74, 77, 79, 81, 84, 86, 89, 93]                       # D5 F5 G5 A5 C6 D6 F6 A6
for i, f in enumerate(TL['flares']):
    f0 = NOTE(ping_notes[i]); n = int(1.6 * SR); k = np.arange(n) / SR
    sig = np.zeros(n)
    for r, a, d in ((1.0, 1.0, 0.9), (2.76, 0.42, 0.45), (5.40, 0.2, 0.22), (8.93, 0.09, 0.12)):
        sig += a * np.cos(2 * np.pi * f0 * r * (k - 1 / FPS)) * np.exp(-np.maximum(k - 1 / FPS, 0) / d)
    sig *= hit_env(n, 10.0)                                          # one-frame attack, partials decay
    p = -0.7 + 1.4 * i / 7
    HITS.append(('ping%d' % (i + 1), f, sig * 0.16))
    place(stems['pings'], sig, ev(f), p, 0.16)
    place(rev_send, sig, ev(f), p, 0.10)

# FOLEY ─ airy whoosh swelling with the arcs 2.4 → 4.2 s (time-varying band-pass, SVF)
a0, a1 = ev(TL['arcLaunch']), ev(TL['arcArrive'])
n = int((a1 - a0) * SR); k = np.arange(n) / n
q4 = np.where(k < 0.5, 8 * k ** 4, 1 - (-2 * k + 2) ** 4 / 2)            # arc progress (ease-in-out-quart)
vel = np.gradient(q4) * n / 6.0                                          # arc speed, normalised-ish
fc = 350 + 3200 * q4 ** 0.8
amp = (0.25 + 0.75 * np.clip(vel, 0, 1)) * (0.3 + 0.7 * k)               # swells with the motion
amp *= np.minimum(1, k / 0.06)
wh = np.zeros((2, n))
for ch in range(2):
    x = rng.normal(0, 1, n); low = band = 0.0; out = np.empty(n)
    F = 2 * np.sin(np.pi * fc / SR); Qd = 1 / 1.4
    for j in range(n):
        low += F[j] * band; high = x[j] - low - Qd * band; band += F[j] * high; out[j] = band
    wh[ch] = out
wh *= amp * 0.11
wh[:, -int(0.012 * SR):] *= np.linspace(1, 0, int(0.012 * SR))
place(stems['whoosh'], wh, a0)
place(rev_send, wh * 0.4, a0)

# FOLEY ─ deep boom + bright shimmer on the flash (peak f253), 120–200 Hz body for phones
fb = TL['flash'][0]
n = int(2.6 * SR); k = np.arange(n) / SR; kd = np.maximum(k - 1 / FPS, 0)
sub_f = 41 + 75 * np.exp(-k / 0.08)
ph_sub = 2 * np.pi * np.cumsum(sub_f) / SR; ph_sub -= ph_sub[FRAME]
sub = np.cos(ph_sub) * np.exp(-kd / 0.7)
kc = k - 1 / FPS
body = (np.cos(2 * np.pi * 150 * kc) + 0.7 * np.cos(2 * np.pi * 186 * kc) + 0.45 * np.cos(2 * np.pi * 124 * kc)) * np.exp(-kd / 0.30)
bnoise = fft_filter(rng.normal(0, 1, n), lo=120, hi=200, order=4) * np.exp(-kd / 0.22) * 2.2
crack = fft_filter(rng.normal(0, 1, n), lo=1800, order=2) * np.exp(-kd / 0.010) * 0.5
boom = (0.55 * sub + 0.62 * body + 0.5 * bnoise + crack) * hit_env(n, 50.0)
boom = np.tanh(1.4 * boom) / 1.4 * 1.35                         # soft saturation: tames the crest, adds phone-audible harmonics
place(stems['boom'], boom, ev(fb), 0.0, 0.62)
boom_mono = boom * 0.62
shim = np.zeros((2, n))
for j in range(16):
    fr_ = rng.uniform(2500, 9000); am = 1 + 0.5 * np.sin(2 * np.pi * rng.uniform(5, 12) * k + rng.uniform(0, 6))
    shim += pan2(np.sin(2 * np.pi * fr_ * k + rng.uniform(0, 6)) * am * np.exp(-k / rng.uniform(0.9, 1.8)), rng.uniform(-0.9, 0.9))
shim *= hit_env(n, 50.0) / 16
place(stems['boom'], shim, ev(fb), gain=0.20)
HITS.append(('boom+shimmer', fb, boom_mono + 0.2 * shim.sum(axis=0)))
place(rev_send, shim, ev(fb), gain=0.25)
place(rev_send, boom, ev(fb), 0.0, 0.10)

# FOLEY ─ 9 tiny ticks as the letters lock (peak 1 frame after each lock), panned to the letter
x_of = [-0.75, -0.56, -0.38, -0.2, -0.02, 0.15, 0.32, 0.6, 0.78]          # letter order d a n g a s a A i
lock_order = sorted(range(9), key=lambda i: TL['letterLocks'][i])
for rank, i in enumerate(lock_order):
    n = int(0.06 * SR); k = np.arange(n) / SR; f0 = 3000 * 2 ** (rank / 24)
    sig = (np.sin(2 * np.pi * f0 * k) + 0.4 * np.sin(2 * np.pi * 2.3 * f0 * k)) * hit_env(n, 0.012)
    place(stems['ticks'], sig, ev(TL['letterLocks'][i]), x_of[i], 0.07)
    HITS.append(('tick_' + 'dangasaAi'[i], TL['letterLocks'][i], sig))

# FOLEY ─ warm swell on the sunrise (swells in, peaks f361, blooms out)
fs_ = TL['sunrise']; t_pk = pk(fs_); t_in = t_pk - 0.9
n = int(3.2 * SR); tt = np.arange(n) / SR + t_in
env = np.where(tt < t_pk, ((tt - t_in) / (t_pk - t_in)).clip(0, 1) ** 2.2, np.exp(-(tt - t_pk) / 1.1))
cut = 500 + 1600 * env
sw = sum(additive_saw(NOTE(m), n, cut, dc) for m in (D3, A3, D4, Fs4) for dc in (-7, 6)) / 8
sw += fft_filter(rng.normal(0, 1, n), lo=200, hi=1800, order=2) * 0.25
HITS.append(('sunrise_swell', fs_, sw * env, t_in, 1 / NOTE(D3)))
place(stems['swell'], pan2(sw * env, -0.15) + pan2(np.roll(sw, 240) * env, 0.5), t_in, gain=0.16)
place(rev_send, sw * env, t_in, 0.3, 0.06)

# FOLEY ─ lazy descending slide on the "Ai" droop (peak f433, glides with the 18-frame ease)
fd0, fd1 = TL['droop']
n = int(0.75 * SR); k = np.arange(n) / SR
u = np.clip(k / ((fd1 - fd0 + 4) / FPS), 0, 1); e = -(np.cos(np.pi * u) - 1) / 2
f_inst = NOTE(A4) * 2 ** (-7 * e / 12) * (1 + 0.012 * np.sin(2 * np.pi * (5.5 - 3 * e) * k))
ph = 2 * np.pi * np.cumsum(f_inst) / SR
tri = np.sin(ph) - np.sin(3 * ph) / 9 + np.sin(5 * ph) / 25
slide = tri * hit_env(n, 0.32) * (1 - np.exp(-(0.75 - k) / 0.03))
place(stems['slide'], slide, ev(fd0), 0.55, 0.25)
HITS.append(('lazy_slide', fd0, slide, ev(fd0), 1 / NOTE(A4)))
place(rev_send, slide, ev(fd0), 0.55, 0.10)

# FOLEY ─ bright pop on the snap (peak f469)
fsn = TL['snap'][1]
n = int(0.25 * SR); k = np.arange(n) / SR
pf = 520 + 1300 * np.exp(-k / 0.012)
pop = np.sin(2 * np.pi * np.cumsum(pf) / SR) * hit_env(n, 0.055) + 0.35 * np.sin(2 * np.pi * 4200 * k) * hit_env(n, 0.03)
pop += fft_filter(rng.normal(0, 1, n), lo=3000, order=2) * hit_env(n, 0.006) * 0.4
place(stems['pop'], pop, ev(fsn), 0.6, 0.30)
HITS.append(('snap_pop', fsn, pop))
place(rev_send, pop, ev(fsn), 0.6, 0.12)

# MUSIC ─ low string pad: D minor → (Bb, A) → D minor → D major at f360, final chord rings to the end
chords = [(0.0, ev(144), (D2, A2, D3, F3)), (ev(144), ev(216), (34, F2, 46, D3)),   # Dm | Bb
          (ev(216), ev(252), (33, 40, A2, 49)), (ev(252), ev(360), (D2, A2, D3, F3)),  # A  | Dm
          (ev(360), DUR, (D2, A2, D3, Fs3, A3))]                                         # D major
tt = np.arange(N) / SR
pad_cut = 600 + 500 * np.clip((tt - 3.0) / 1.2, 0, 1) * (tt < 4.2) + 500 * (tt >= 4.2) + 900 * np.clip((tt - 6.0) / 1.5, 0, 1)
pad_lvl = np.clip(tt / 1.2, 0.08, 1) * (1 + 0.6 * np.clip((tt - 3.0) / 1.2, 0, 1) * (tt < 4.2)) * (1 + 0.25 * (tt >= 6.0))
xf = int(0.08 * SR)
for c0, c1, notes in chords:
    i0, i1 = max(0, int(c0 * SR) - xf // 2), min(N, int(c1 * SR) + xf // 2)
    n = i1 - i0; seg = np.zeros((2, n))
    for m in notes:
        for dc, p in ((-9, -0.6), (0, 0.0), (8, 0.6)):
            vib = 0.0025 * np.sin(2 * np.pi * (4.8 + rng.uniform(-0.4, 0.4)) * (np.arange(n) / SR) + rng.uniform(0, 6))
            seg += pan2(additive_saw(NOTE(m), n, pad_cut[i0:i1], dc, vib, rng.uniform(0, 6)), p)
    fade = np.ones(n)
    if c0 > 0: fade[:xf] = np.sin(0.5 * np.pi * np.arange(xf) / xf) ** 2
    if c1 < DUR: fade[-xf:] = np.cos(0.5 * np.pi * np.arange(xf) / xf) ** 2
    stems['pad'][:, i0:i1] += seg * fade * pad_lvl[i0:i1] * 0.028
place(rev_send, stems['pad'] * 0.35, 0.0)

# MUSIC ─ brass-like synth stabs on f252 (D minor) and f468 (D major, rings into the final chord)
def brass(notes, n, hold, peak_cut, sus_cut, sus_lvl, release):
    k = np.arange(n) / SR
    cut = sus_cut + (peak_cut - sus_cut) * np.exp(-k / 0.14)
    amp = hit_env(n, 0.22) * (1 - sus_lvl) + sus_lvl * np.minimum(1, k / (FRAME / SR))
    if release: amp *= np.clip(1 - (k - hold) / release, 0, 1)
    out = np.zeros((2, n))
    for m in notes:
        for dc, p in ((-6, -0.35), (5, 0.35)):
            out += pan2(additive_saw(NOTE(m), n, cut, dc, 0.003 * np.sin(2 * np.pi * 5.2 * k), align=FRAME), p)
    return out * amp / len(notes)
st1 = brass((D3, F3, A3, D4), int(1.6 * SR), 0.6, 4200, 900, 0.25, 0.8)
place(stems['brass'], st1, ev(252), gain=0.22)
HITS.append(('brass_stab_1', 252, st1.sum(axis=0) * 0.22, ev(252), 1 / NOTE(D3)))
st2 = brass((D3, Fs3, A3, D4, A4), N - int(ev(468) * SR), 99, 4800, 1500, 0.42, 0)
st2[:, -int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
place(stems['brass'], st2, ev(468), gain=0.29)
HITS.append(('brass_stab_2', 468, st2.sum(axis=0)[: int(1.0 * SR)], ev(468), 1 / NOTE(D3)))
place(rev_send, stems['brass'] * 0.5, 0.0)

# MUSIC ─ original horn fanfare over the sunrise (rises D–F#–A–D, sags with the doze, stab answers)
for m, t0, t1, sag in ((D4, ev(360), ev(396), 0), (Fs4, ev(396), ev(414), 0), (A4, ev(414), ev(432), 0), (D5, ev(432), ev(465), 1)):
    n = int((t1 - t0 + 0.12) * SR); k = np.arange(n) / SR
    bend = 2 ** (-sag * 0.9 * np.clip((k - 0.05) / 0.35, 0, 1) / 12)
    v = additive_saw(NOTE(m), n, 1400 + 900 * np.exp(-k / 0.1), 0, (bend - 1) + 0.004 * np.sin(2 * np.pi * 5 * k))
    env = np.minimum(1, k / 0.025) * np.clip((t1 - t0 + 0.1 - k) / 0.1, 0, 1) * (1 - 0.5 * sag * np.clip(k / 0.5, 0, 1))
    place(stems['horn'], v * env, t0, 0.15, 0.10)
place(rev_send, stems['horn'] * 0.6, 0.0)

# MUSIC ─ timpani roll into f252 (A1 roll over the dominant, D2 accent on the flash)
def timp(f0, vel, n=int(1.4 * SR)):
    k = np.arange(n) / SR; kd = np.maximum(k - 1 / FPS, 0); glide = 1 + 0.025 * np.exp(-k / 0.04)
    gph = 2 * np.pi * f0 * np.cumsum(glide) / SR; gph -= gph[FRAME]
    s = sum(a * np.cos(r * gph) * np.exp(-kd / d)
            for r, a, d in ((1.0, 1.0, 0.9), (1.504, 0.55, 0.6), (1.742, 0.3, 0.45), (2.0, 0.22, 0.4), (2.245, 0.12, 0.3)))
    s += fft_filter(rng.normal(0, 1, n), lo=150, hi=2500, order=2) * np.exp(-kd / 0.008) * 0.6
    return s * hit_env(n, 30.0) * vel
t = 3.0; hand = 0
while t < ev(252) - 0.04:
    prog = (t - 3.0) / (ev(252) - 3.0)
    place(stems['timpani'], timp(NOTE(33), 0.12 + 0.55 * prog ** 1.6), t + rng.normal(0, 0.003), -0.2 if hand else 0.2, 1.0)
    t += 0.072 - 0.012 * prog; hand ^= 1
acc = timp(NOTE(D2), 0.62); place(stems['timpani'], acc, ev(252), 0.0, 1.0)
HITS.append(('timpani_accent', 252, acc))
stems['timpani'] *= 0.30
place(rev_send, stems['timpani'] * 0.3, 0.0)

# ─────────────────────────── reverb (synthetic IR) ─────────────
ir_n = int(2.2 * SR); k = np.arange(ir_n) / SR
ir = rng.normal(0, 1, (2, ir_n)) * np.exp(-k / 0.55)
ir = fft_filter(ir, lo=180, hi=7000, order=1); ir[:, : int(0.018 * SR)] = 0
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
m = 1 << (N + ir_n).bit_length()
wet = np.fft.irfft(np.fft.rfft(rev_send, m) * np.fft.rfft(ir, m), m)[:, :N] * 0.55

# ─────────────────────────── ducking: music under the hits ─────
duck_db = np.zeros(N)
for t0, depth, rel in [(pk(252), 7.0, 0.55), (pk(468), 4.0, 0.3), (pk(432), 3.0, 0.4), (pk(360), 2.0, 0.6)] + [(pk(f), 1.5, 0.2) for f in TL['flares']]:
    i = np.arange(N) / SR - t0
    shape = np.where(i < 0, np.exp(i / 0.012), np.exp(-i / rel))
    duck_db = np.minimum(duck_db, -depth * shape)
duck = 10 ** (duck_db / 20)
music = (stems['pad'] + stems['brass'] + stems['horn'] + stems['timpani']) * duck
sfx = sum(stems[k] for k in ('twinkle', 'pings', 'whoosh', 'boom', 'ticks', 'swell', 'slide', 'pop'))
mix = music + sfx + wet * np.maximum(duck, 0.6)
mix[:, -int(0.012 * SR):] *= np.linspace(1, 0, int(0.012 * SR))

# ─────────────────────────── master: -14 LUFS, ≤ -2 dBTP, limiter ≤ 3 dB ──
def biquad(b, a, x):
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for j in range(len(x)):
        y0 = b[0] * x[j] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        x2, x1, y2, y1 = x1, x[j], y1, y0; y[j] = y0
    return y
def lufs(x):                                   # ITU-R BS.1770-4 integrated loudness (48 kHz coefficients)
    kw = np.stack([biquad([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621],
                   biquad([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], c)) for c in x])
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    z = np.array([(kw[:, i:i + blk] ** 2).mean(axis=1).sum() for i in range(0, kw.shape[1] - blk + 1, hop)])
    lk = -0.691 + 10 * np.log10(z + 1e-12)
    z = z[lk > -70]; rel = -0.691 + 10 * np.log10(z.mean()) - 10
    z = z[-0.691 + 10 * np.log10(z) > rel]
    return -0.691 + 10 * np.log10(z.mean())
def upsample4(x):
    n = x.shape[-1]; X = np.fft.rfft(x); Y = np.zeros(x.shape[:-1] + (2 * n + 1,), complex); Y[..., : X.shape[-1]] = X
    return np.fft.irfft(Y, 4 * n) * 4
def true_peak_db(x): return 20 * np.log10(np.abs(upsample4(x)).max())
def limiter(x, ceil_db, look=0.004, rel=0.09):
    c = 10 ** (ceil_db / 20)
    pk_os = np.abs(upsample4(x)).reshape(2, -1, 4).max(axis=(0, 2))          # true-peak per sample
    need = np.minimum(1, c / np.maximum(pk_os, 1e-9))
    L = int(look * SR)
    g = np.array([need[max(0, j - 0): j + L + 1].min() for j in range(0, len(need))]) if L else need
    out = np.empty_like(g); cur = 1.0; ra = np.exp(-1 / (rel * SR)); aa = np.exp(-1 / (look * SR / 3))
    for j in range(len(g)):
        cur = aa * cur + (1 - aa) * g[j] if g[j] < cur else ra * cur + (1 - ra) * g[j]
        cur = min(cur, g[j]); out[j] = cur
    return x * out, 20 * np.log10(out.min())

TARGET, CEIL = -14.0, -2.3
gain_db = TARGET - lufs(mix)
for it in range(4):
    y, gr = limiter(mix * 10 ** (gain_db / 20), CEIL)
    l = lufs(y); gain_db += TARGET - l
    if abs(TARGET - l) < 0.05: break
y, gr = limiter(mix * 10 ** (gain_db / 20), CEIL)

g_ = 10 ** (gain_db / 20)
for lo, hi in ((4.10, 4.75), (7.78, 7.98)):
    i0, i1 = int(lo * SR), int(hi * SR)
    print(f'[{lo}-{hi}] mix peak {20*np.log10(np.abs(mix[:, i0:i1]).max()*g_):+.1f} dBFS |', ' '.join(f"{k}:{20*np.log10(np.abs(v[:, i0:i1]).max()*g_+1e-9):+.1f}" for k, v in list(stems.items()) + [('wet', wet)]))
import os
if os.environ.get('SOUND_STEMS'): np.savez_compressed(os.environ['SOUND_STEMS'], **stems, wet=wet, mix=mix, y=y)
# ─────────────────────────── write + report ───────────────────
pcm = np.clip(np.round(y.T * 8388607), -8388608, 8388607).astype(np.int32)
b = (np.ascontiguousarray(pcm).astype('<i4').view(np.uint8).reshape(-1, 4)[:, :3]).tobytes()
with wave.open(str(OUT), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(b)

def env_peak(sig, smooth_s=0.001):
    """peak of the amplitude envelope (Hilbert, smoothed over one period of the lowest note) of an isolated hit."""
    x = sig.sum(axis=0) if sig.ndim == 2 else sig
    w = max(int(smooth_s * SR), 1)
    e = np.convolve(hilbert_env(x), np.ones(w) / w, mode='same')
    return int(np.argmax(e[: int(1.5 * SR)]))
checks = []
for h in HITS:
    name, f, sig = h[:3]
    t0 = h[3] if len(h) > 3 else ev(f)
    checks.append((name, f, t0 + env_peak(sig, h[4] if len(h) > 4 else 0.001) / SR))
hits = [dict(name=n, event_frame=f, peak_s=round(p, 4), peak_frame=round(p * FPS, 2), offset_frames=round(p * FPS - f, 2), ok=abs(p * FPS - f - 1) <= 0.25) for n, f, p in checks]
gr_t = np.nonzero(20 * np.log10(np.maximum(np.abs(y).max(axis=0), 1e-9) / np.maximum(np.abs(mix * 10 ** (gain_db / 20)).max(axis=0), 1e-9)) < -1.0)[0]
print('GR>1dB regions (s):', sorted(set(np.round(gr_t / SR, 2))) [:40])
seg = stems['boom'][:, int(ev(fb) * SR): int((ev(fb) + 0.6) * SR)].sum(axis=0)
S = np.abs(np.fft.rfft(seg)) ** 2; fq = np.fft.rfftfreq(len(seg), 1 / SR)
band = lambda a, b_: S[(fq >= a) & (fq < b_)].sum()
rep = dict(lufs_integrated=round(lufs(y), 2), true_peak_dbtp=round(true_peak_db(y), 2), limiter_max_gr_db=round(-gr, 2),
           master_gain_db=round(gain_db, 2), boom_energy_share_120_200=round(band(120, 200) / band(20, 20000), 3),
           boom_energy_share_20_120=round(band(20, 120) / band(20, 20000), 3), hits=hits, all_hits_ok=all(h['ok'] for h in hits))
Path(OUT.with_suffix('.json')).write_text(json.dumps(rep, indent=1))
print(json.dumps({k: v for k, v in rep.items() if k != 'hits'}))
for h in hits: print(('OK  ' if h['ok'] else 'BAD ') + f"{h['name']:16s} event f{h['event_frame']}  peak f{h['peak_frame']}  (+{h['offset_frames']})")
