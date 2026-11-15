#!/usr/bin/env python3
"""shared/audio.py — all sound synthesized with numpy (no samples), 48 kHz stereo.

  audio.py stage N   → stageN/mix_N.wav   (stage N alone, 15.0 s)
  audio.py final     → final_mix.wav      (one continuous 60 s track, all stages)

Music: soft lo-fi piano + warm pad (+ soft bass), 90 BPM, D minor, bar 1 at 0.0 of each stage,
ducked 8 dB under the voice.  Every sfx cue comes from the page's own cue list (meta_N.json), so
each hit peaks within a frame of its picture.  Mix: -14 LUFS, true peak <= -2 dBTP, limiter <= 3 dB.
"""
import json, sys, subprocess
from pathlib import Path
import numpy as np
from scipy import signal
from scipy.ndimage import minimum_filter1d
import pyloudnorm as pyln

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
STAGE_LEN = 15.0
BEAT = 60 / 90
MUS_UP, FX_UP = 8.0, 2.0       # level lift for stages that have no narration


def noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)


def env_ad(n_pre, n_post, curve_a=2.0, curve_d=3.0):
    """envelope that peaks exactly at sample n_pre"""
    a = (np.arange(n_pre) / max(1, n_pre)) ** curve_a
    d = np.exp(-curve_d * np.arange(n_post) / max(1, n_post))
    return np.concatenate([a, d])


class Bus:
    def __init__(self, dur):
        self.n = int(round(dur * SR))
        self.buf = np.zeros((2, self.n))

    def add(self, t_peak, mono, peak_idx=0, gain=1.0, pan=0.0, pan_end=None):
        """place `mono` so that its sample `peak_idx` lands on t_peak"""
        start = int(round(t_peak * SR)) - peak_idx
        x = mono * gain
        if pan_end is None:
            th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
            l, r = np.cos(th) * x, np.sin(th) * x
        else:
            th = (np.clip(np.linspace(pan, pan_end, len(x)), -1, 1) + 1) * np.pi / 4
            l, r = np.cos(th) * x, np.sin(th) * x
        a, b = max(0, start), min(self.n, start + len(x))
        if b <= a:
            return
        self.buf[0, a:b] += l[a - start:b - start]
        self.buf[1, a:b] += r[a - start:b - start]


# ----------------------------------------------------------------------------- sfx
def sfx(cue, seed):
    """returns (mono, peak_index, gain, pan, pan_end)"""
    ty = cue['type']; g = cue.get('gain', 1.0); pan = cue.get('pan', 0.0); dur = cue.get('dur', 0.3)
    rng = np.random.default_rng(seed)
    t = lambda s: np.arange(int(s * SR)) / SR
    if ty == 'whoosh':                          # soft whoosh on every cut, peaks on the cut frame
        pre, post = int(0.30 * SR), int(0.22 * SR)
        nz = noise(pre + post, seed)
        e = env_ad(pre, post, 2.6, 4.0)
        k = np.linspace(0, 1, pre + post)
        x = bp(nz, 250, 900) * (1 - k) + bp(nz, 900, 3200) * k
        return x * e * 0.55, pre, g * 0.9, -0.3, 0.3
    if ty in ('thud', 'land', 'stamp'):
        n = int(0.5 * SR); tt = t(0.5)
        f = 46 + 60 * np.exp(-tt * 18)
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * (9 if ty != 'land' else 14))
        click = lp(noise(n, seed), 1800) * np.exp(-tt * 70) * 0.5
        x = body + click
        a = int(0.004 * SR); x[:a] *= np.linspace(0, 1, a)
        return np.tanh(x * 1.4), a, g * (1.0 if ty != 'land' else 0.7), pan, None
    if ty == 'windup':
        tt = t(0.14); f = 380 + 700 * (tt / tt[-1]) ** 1.5
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.abs(np.sin(np.pi * tt / tt[-1])) ** 2
        return x * 0.18, len(x) // 2, g, pan, None
    if ty == 'scrub':                            # rubber eraser scrub
        n = int(dur * SR); tt = t(dur)
        nz = bp(noise(n, seed), 1400, 4200)
        am = 0.55 + 0.45 * np.sin(2 * np.pi * rng.uniform(26, 34) * tt) ** 2
        sq = np.sin(2 * np.pi * np.cumsum(900 + 250 * np.sin(2 * np.pi * 7 * tt)) / SR) * 0.12
        e = np.abs(np.sin(np.pi * tt / tt[-1])) ** 1.2
        return (nz * am * 0.5 + sq) * e, n // 2, g * 0.55, pan, None
    if ty == 'crumb':
        tt = t(0.06)
        x = hp(noise(len(tt), seed), 2500) * np.exp(-tt * 120) + np.sin(2 * np.pi * rng.uniform(2200, 3800) * tt) * np.exp(-tt * 90) * 0.4
        return x * 0.35, 2, g, pan, None
    if ty == 'creak':                            # chair spinning to rest (ζ 0.6)
        tt = t(dur)
        damp = np.exp(-0.6 * 2 * np.pi * 0.7 * tt) * np.abs(np.cos(2 * np.pi * 0.7 * np.sqrt(1 - .36) * tt))
        f = 520 + 140 * np.sin(2 * np.pi * 0.7 * tt)
        x = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(2.01 * f) / SR)) * damp * 0.18
        x += bp(noise(len(tt), seed), 300, 1200) * damp * 0.25
        return x, 0, g, pan, None
    if ty == 'tick':
        tt = t(0.05)
        x = np.sin(2 * np.pi * 3100 * tt) * np.exp(-tt * 160) + hp(noise(len(tt), seed), 3000) * np.exp(-tt * 400) * 0.6
        return x * 0.4, 1, g, pan, None
    if ty == 'bus':                              # passes left → right
        n = int((dur + 0.8) * SR); tt = np.arange(n) / SR; c = tt[-1] / 2
        e = np.exp(-((tt - c) / (dur * 0.42)) ** 2)
        hum = np.sin(2 * np.pi * np.cumsum(64 * (1 + 0.05 * np.tanh((c - tt) * 3))) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(128 * (1 + 0.05 * np.tanh((c - tt) * 3))) / SR)
        x = lp(noise(n, seed), 500) * 1.2 + hum * 0.35 + bp(noise(n, seed + 1), 800, 2400) * 0.4
        return x * e * 0.45, n // 2, g, -0.85, 0.85
    if ty in ('tinkle', 'chime'):                # window-light tinkle, ascending D minor pentatonic
        i = cue.get('i', 0)
        scale = [74, 77, 79, 81, 84] if not cue.get('major') else [74, 76, 78, 81, 83]
        midi = scale[i % 5] + 12 * ((i // 5) % 2)
        f = 440 * 2 ** ((midi - 69) / 12); tt = t(0.9)
        x = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * d) for a, m, d in [(1, 1, 5), (.35, 2.76, 9), (.15, 5.4, 14)])
        a = int(0.002 * SR); x[:a] *= np.linspace(0, 1, a)
        return x * 0.16, a, g, pan, None
    if ty == 'cloth':
        tt = t(0.22); x = lp(noise(len(tt), seed), 2200) * np.abs(np.sin(np.pi * tt / tt[-1])) ** 2
        return x * 0.22, len(x) // 2, g, pan, None
    if ty in ('draw', 'pencil'):                 # pencil / chalk line
        n = int(dur * SR); tt = t(dur)
        gr = (rng.random(n) < 0.02).astype(float)
        gr = np.convolve(gr, np.hanning(60), 'same')
        x = bp(noise(n, seed), 2500, 6000) * (0.4 + gr) * np.abs(np.sin(np.pi * tt / tt[-1])) ** 0.6
        return x * 0.3, 0, g, pan, None
    if ty in ('pop', 'fillpop'):
        tt = t(0.12); f = 500 + 500 * (1 - np.exp(-tt * 60))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 40)
        a = int(0.003 * SR); x[:a] *= np.linspace(0, 1, a)
        return x * 0.35, a, g, pan, None
    if ty == 'flicker':
        n = int(dur * SR) + 1200; tt = np.arange(n) / SR
        x = np.sign(np.sin(2 * np.pi * 100 * tt)) * 0.3 + hp(noise(n, seed), 2000) * (rng.random(n) < 0.05)
        x = lp(x, 3000) * np.exp(-tt * 6)
        return x * 0.22, 0, g, pan, None
    if ty == 'fizz':                             # inner light goes out
        n = int(dur * SR); tt = t(dur)
        cr = (rng.random(n) < 0.03) * rng.standard_normal(n)
        x = (hp(noise(n, seed), 3500) * 0.5 + hp(cr, 1500)) * np.exp(-tt * 5)
        a = int(0.01 * SR); x[:a] *= np.linspace(0, 1, a)
        sweep = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-tt * 3) + 120) / SR) * np.exp(-tt * 6) * 0.2
        return x * 0.35 + sweep, a, g, pan, None
    if ty in ('swell', 'innerlight'):            # warm inner-light swell, peaks at the cue
        pre, post = int(dur * 0.7 * SR), int(dur * 0.6 * SR); n = pre + post; tt = np.arange(n) / SR
        e = env_ad(pre, post, 2.0, 3.0)
        x = sum(np.sin(2 * np.pi * f * tt + p) * a for f, a, p in [(293.66, 1, 0), (440, .6, 1), (587.3, .35, 2), (880, .15, 3)])
        x *= 1 + 0.1 * np.sin(2 * np.pi * 5 * tt)
        return x * e * 0.16, pre, g, pan, None
    if ty == 'slide':                            # book / copier / card slide
        n = int(dur * SR); tt = t(dur)
        x = bp(noise(n, seed), 400, 2500) * np.abs(np.sin(np.pi * tt / tt[-1])) ** 1.5
        return x * 0.35, n // 2, g, pan, cue.get('pan_end')
    if ty == 'zip':                              # ray zip
        n = int(dur * SR); tt = t(dur); f = 600 + 2400 * (tt / tt[-1]) ** 1.3
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) * 0.25 + bp(noise(n, seed), 2000, 7000) * 0.15 * np.sin(np.pi * tt / tt[-1])
        return x, n - 1, g, pan, cue.get('pan_end')
    if ty == 'blip':
        tt = t(0.07); f = cue.get('f', 1200)
        x = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 55)
        a = int(0.002 * SR); x[:a] *= np.linspace(0, 1, a)
        return x * 0.2, a, g, pan, None
    if ty == 'ding':
        tt = t(1.0); f = cue.get('f', 1174.7)
        x = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * d) for a, m, d in [(1, 1, 4), (.4, 2, 7), (.2, 3.01, 10)])
        a = int(0.002 * SR); x[:a] *= np.linspace(0, 1, a)
        return x * 0.22, a, g, pan, None
    if ty == 'crunch':                           # apple bite
        n = int(0.28 * SR); tt = t(0.28)
        gr = (rng.random(n) < 0.04) * rng.standard_normal(n)
        x = bp(gr + noise(n, seed) * 0.3, 900, 6000) * np.exp(-tt * 14)
        a = int(0.004 * SR); x[:a] *= np.linspace(0, 1, a)
        return x * 0.7, a, g, pan, None
    if ty == 'swoosh':                           # lens / shrug swoosh: short sweep peaking on cue
        pre, post = int(0.16 * SR), int(0.14 * SR); nz = noise(pre + post, seed)
        x = bp(nz, 1200, 5000) * env_ad(pre, post, 2, 4)
        return x * 0.45, pre, g, pan, cue.get('pan_end')
    if ty == 'hum':                              # scanner hum
        n = int(dur * SR); tt = t(dur)
        x = (np.sin(2 * np.pi * 120 * tt) + 0.5 * np.sin(2 * np.pi * 240 * tt) + 0.3 * bp(noise(n, seed), 1500, 3000)) * np.abs(np.sin(np.pi * tt / tt[-1])) ** 0.5
        return x * 0.16, 0, g, pan, None
    if ty == 'hop':
        tt = t(0.12); f = 300 + 500 * tt / tt[-1]
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) * 0.2
        return x, len(x) // 2, g, pan, None
    if ty == 'chatter':
        tt = t(0.09); f = cue.get('f', 520)
        x = np.sign(np.sin(2 * np.pi * f * tt)) * 0.5 * np.sin(np.pi * tt / tt[-1])
        return lp(x, 2500) * 0.18, len(x) // 2, g, pan, None
    if ty == 'giggle':
        out = []
        for k in range(5):
            tt = t(0.08); f = 700 + 60 * k + 120 * np.sin(2 * np.pi * 18 * tt)
            out.append(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1])); out.append(np.zeros(int(0.03 * SR)))
        x = np.concatenate(out); return lp(x, 3000) * 0.15, 0, g, pan, None
    if ty == 'boing':
        tt = t(0.6); f = 180 + 120 * np.sin(2 * np.pi * 9 * tt) * np.exp(-tt * 5)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4.5)
        a = int(0.003 * SR); x[:a] *= np.linspace(0, 1, a)
        return x * 0.4, a, g, pan, None
    if ty == 'step':
        tt = t(0.12)
        x = lp(noise(len(tt), seed), 900) * np.exp(-tt * 45) + np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 40) * 0.5
        return x * 0.3, 1, g, pan, None
    if ty == 'wind':
        n = int(dur * SR); tt = t(dur)
        x = bp(noise(n, seed), 250, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * tt + 1)) * np.minimum(1, np.minimum(tt / 0.8, (tt[-1] - tt) / 0.8))
        return x * 0.22, 0, g, -0.4, 0.4
    if ty == 'drain':
        n = int(dur * SR); tt = t(dur); f = 700 * np.exp(-tt * 3) + 120
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2) * 0.2 + lp(noise(n, seed), 1500) * np.exp(-tt * 3) * 0.2
        return x, 0, g, pan, None
    if ty in ('click', 'spark'):
        tt = t(0.08)
        x = hp(noise(len(tt), seed), 2500) * np.exp(-tt * 140) * 0.5 + np.sin(2 * np.pi * (1800 if ty == 'click' else 3200) * tt) * np.exp(-tt * 60) * 0.5
        a = int(0.002 * SR); x[:a] *= np.linspace(0, 1, a)
        return x * 0.16, a, g, pan, None
    raise ValueError('unknown sfx ' + ty)


# ----------------------------------------------------------------------------- music
def midi_f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def piano(f, dur, vel):
    n = int((dur + 1.6) * SR); tt = np.arange(n) / SR
    x = np.zeros(n); B = 0.00035
    for k in range(1, 9):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > SR / 2.2:
            break
        x += np.sin(2 * np.pi * fk * tt + k) * (1 / k ** 1.6) * np.exp(-tt * (1.1 + 0.55 * k) * (f / 260) ** 0.35)
    rel = np.ones(n); r0 = int(dur * SR); rel[r0:] = np.exp(-np.arange(n - r0) / SR * 9)
    a = int(0.006 * SR); x[:a] *= np.linspace(0, 1, a)
    return np.tanh(x * rel * vel * 1.3) * 0.5


def pad_voice(f, n, seed):
    tt = np.arange(n) / SR; x = np.zeros(n)
    for d in (-0.11, 0.0, 0.13):                 # detuned saws (band-limited sum)
        ff = f * 2 ** (d / 12)
        for k in range(1, 7):
            x += np.sin(2 * np.pi * ff * k * tt + seed + k) / k
    return x


CHORDS_MIN = [  # (bass, [voicing])  i – VI – iv – v
    (38, [50, 53, 57, 60, 64]), (34, [50, 53, 57, 62]), (31, [46, 50, 53, 57, 62]), (33, [49, 52, 55, 57, 64])]
CHORDS_MAJ = [  # D major turn: I – vi – IV – V(6)
    (38, [50, 54, 57, 61, 64]), (35, [50, 54, 57, 62]), (31, [47, 50, 54, 59, 62]), (33, [49, 52, 54, 57, 64])]
MEL_MIN = [62, 65, 69, 67, 64, 62, 60, 57]
MEL_MAJ = [62, 66, 69, 71, 69, 66, 64, 62]


def music_stage(cfg, dur_out, seed):
    """music for one stage starting at its own 0.0 (bar 1); returns stereo array incl. tails"""
    n = int((dur_out + 3.0) * SR)
    out = np.zeros((2, n))
    bar = 4 * BEAT
    major_from = cfg.get('major_from')
    end = cfg.get('end', STAGE_LEN)
    rng = np.random.default_rng(seed)
    nbars = int(np.ceil(STAGE_LEN / bar))
    for b in range(nbars):
        t0 = b * bar
        if t0 >= end - 0.05:
            break
        maj = major_from is not None and t0 + bar > major_from + 1e-6
        prog = CHORDS_MAJ if maj else CHORDS_MIN
        bass, voic = prog[b % 4]
        # if the key turn falls inside this bar, the bar starts in minor and turns at major_from
        segs = [(t0, min(t0 + bar, end), prog)]
        if major_from is not None and t0 < major_from < t0 + bar:
            segs = [(t0, major_from, CHORDS_MIN), (major_from, min(t0 + bar, end), CHORDS_MAJ)]
        for s0, s1, pr in segs:
            bass, voic = pr[b % 4]
            L = s1 - s0
            if L <= 0.05:
                continue
            # pad (slow attack, release into the next bar)
            pn = int((L + 1.4) * SR); tt = np.arange(pn) / SR
            pe = np.minimum(1, tt / 0.5) * np.where(tt < L, 1, np.exp(-(tt - L) / 0.45))
            pv = sum(pad_voice(midi_f(m), pn, k) for k, m in enumerate(voic[1:])) * pe
            pv = lp(pv, 900) * 0.05
            i0 = int(s0 * SR); i1 = min(n, i0 + pn)
            out[0, i0:i1] += pv[:i1 - i0] * 0.95; out[1, i0:i1] += pv[:i1 - i0] * 1.05
            # bass
            for bt in (0, 2):
                tb = s0 + bt * BEAT
                if tb >= s1 - 0.05 or tb >= end - 0.05:
                    continue
                bn = int(1.6 * SR); tt = np.arange(bn) / SR
                bx = (np.sin(2 * np.pi * midi_f(bass + 12) * tt) + 0.25 * np.sin(4 * np.pi * midi_f(bass + 12) * tt)) * np.exp(-tt * 2.2) * np.minimum(1, tt / 0.01)
                i0 = int(tb * SR); i1 = min(n, i0 + bn)
                out[:, i0:i1] += bx[:i1 - i0] * 0.12
            # piano: rolled chord on 1, upper dyad on the "and" of 2 (lazy swing), melody notes
            hits = [(0.0, voic, 0.55, 1.6), (1.5 * BEAT + 0.03, voic[-2:], 0.32, 0.6), (3.5 * BEAT + 0.03, voic[-3:-1], 0.28, 0.5)]
            mel = MEL_MAJ if pr is CHORDS_MAJ else MEL_MIN
            hits.append((2 * BEAT, [mel[(b * 2) % 8] + 12], 0.30, 0.9))
            hits.append((3 * BEAT, [mel[(b * 2 + 1) % 8] + 12], 0.24, 0.7))
            for off, notes, vel, nd in hits:
                th = s0 + off
                if th >= s1 - 0.05 or th >= end - 0.05:
                    continue
                for k, m in enumerate(notes):
                    x = piano(midi_f(m), nd, vel * rng.uniform(0.85, 1.05))
                    i0 = int((th + k * 0.022) * SR); i1 = min(n, i0 + len(x))
                    p = 0.5 + 0.3 * ((m - 60) / 24)
                    out[0, i0:i1] += x[:i1 - i0] * (1 - p) * 1.2; out[1, i0:i1] += x[:i1 - i0] * p * 1.2
    # soft lo-fi warmth: gentle lowpass + tape-ish saturation
    out = np.tanh(lp(out, 5200) * 1.1)
    return out


def apply_drops(m, drops, offset):
    g = np.ones(m.shape[1])
    for d0, d1 in drops:
        a = int((offset + d0 - 0.06) * SR); b = int((offset + d0) * SR)
        c = int((offset + d1) * SR); d = int((offset + d1 + 0.35) * SR)
        a, b, c, d = [min(max(0, v), len(g)) for v in (a, b, c, d)]
        g[a:b] = np.minimum(g[a:b], np.linspace(1, 0, b - a)); g[b:c] = 0
        g[c:d] = np.minimum(g[c:d], np.linspace(0, 1, d - c) ** 2)
    return m * g


def compress(x, thr_db, ratio, att=0.005, rel=0.12, knee=6.0):
    """feed-forward compressor on |x| (mono or stereo-linked), 1 ms control steps"""
    mono = np.abs(x) if x.ndim == 1 else np.abs(x).max(axis=0)
    step = 48; nb = int(np.ceil(len(mono) / step))
    pk = np.pad(mono, (0, nb * step - len(mono))).reshape(nb, step).max(axis=1)
    lv = 20 * np.log10(pk + 1e-9)
    over = lv - thr_db
    gr = np.where(over <= -knee / 2, 0, np.where(over >= knee / 2, over * (1 - 1 / ratio), (1 - 1 / ratio) * (over + knee / 2) ** 2 / (2 * knee)))
    a, r = 1 - np.exp(-1e-3 / att), 1 - np.exp(-1e-3 / rel)
    sm = np.empty_like(gr); s_ = 0.0
    for i, g_ in enumerate(gr):
        s_ += (g_ - s_) * (a if g_ > s_ else r); sm[i] = s_
    g = np.repeat(10 ** (-sm / 20), step)[:len(mono)]
    return x * g


def voice_env(v):
    w = int(0.02 * SR)
    e = np.sqrt(np.convolve(v ** 2, np.ones(w) / w, 'same'))
    act = (e > 10 ** (-38 / 20) * max(1e-9, np.abs(v).max() / 0.5)).astype(float)
    # attack 40 ms, release 300 ms
    out = np.zeros_like(act); s = 0.0
    a, r = 1 - np.exp(-1 / (0.04 * SR)), 1 - np.exp(-1 / (0.30 * SR))
    for i in range(0, len(act), 48):           # 1 ms steps
        s += (act[i] - s) * (a if act[i] > s else r) * 48
        s = min(1, max(0, s)); out[i:i + 48] = s
    return out


def load_voice(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=1)
    return 20 * np.log10(np.abs(up).max() + 1e-12)


def limiter(x, ceiling_db=-2.3, max_gr_db=3.0):
    """look-ahead true-peak limiter; returns (y, max gain reduction dB)"""
    thr = 10 ** (ceiling_db / 20)
    up = np.abs(signal.resample_poly(x, 4, 1, axis=1)).max(axis=0)
    pk = up.reshape(-1, 4).max(axis=1)[:x.shape[1]] if len(up) >= 4 * x.shape[1] else np.pad(up, (0, 4 * x.shape[1] - len(up))).reshape(-1, 4).max(axis=1)
    need = np.minimum(1.0, thr / np.maximum(pk, 1e-9))
    la = int(0.003 * SR)                        # 3 ms look-ahead: min over a window, then smooth
    need = minimum_filter1d(need, size=2 * la + 1, mode='nearest')
    g = np.empty_like(need); s = 1.0; rel = 1 - np.exp(-1 / (0.08 * SR))
    for i in range(len(need)):
        s = need[i] if need[i] < s else s + (need[i] - s) * rel
        g[i] = s
    g = np.convolve(np.pad(g, (la, la), mode='edge'), np.ones(la) / la, 'same')[la:-la]
    g = np.minimum(g, need)
    gr = -20 * np.log10(g.min())
    return x * g, gr


def master(mix, target=-14.0):
    meter = pyln.Meter(SR)
    mix = compress(mix, 20 * np.log10(np.abs(mix).max() + 1e-9) - 7, 2.0, 0.003, 0.12)   # mix-bus glue 2:1
    lufs0 = meter.integrated_loudness(mix.T)
    mix = mix * 10 ** ((target - lufs0) / 20)
    ref = mix.copy()                                  # level before any limiting
    for _ in range(4):
        mix, _gr = limiter(mix, -2.8)
        lufs = meter.integrated_loudness(mix.T)
        mix = mix * 10 ** ((target - lufs) / 20)
        ref = ref * 10 ** ((target - lufs) / 20)
    mix, _gr = limiter(mix, -2.8)
    nz = np.abs(ref) > 1e-4
    gr = float(np.max(20 * np.log10(np.abs(ref[nz]) / np.maximum(np.abs(mix[nz]), 1e-12))))
    lufs = meter.integrated_loudness(mix.T)
    return mix, lufs, true_peak(mix), gr


def render(stages, t_start, t_end, voices, seed=1):
    """stages: list of (n, meta) with absolute offsets 15*(n-1)"""
    dur = t_end - t_start
    music = np.zeros((2, int(round(dur * SR))))
    fx = Bus(dur)
    vbus = np.zeros(int(round(dur * SR)))
    for n, meta in stages:
        off = STAGE_LEN * (n - 1) - t_start
        cfg = dict(meta.get('music') or {})
        m = music_stage(cfg, STAGE_LEN, seed + n)
        m = apply_drops(m, cfg.get('drops', []), 0)
        if cfg.get('tail'):                      # soft 1 s tail: last second rings out, nothing new
            tt = np.arange(m.shape[1]) / SR
            m = m * np.clip(1 - (tt - (STAGE_LEN - 1.0)) / 1.0, 0, 1) ** 1.5
        i0 = int(round(off * SR)); a, b = max(0, i0), min(music.shape[1], i0 + m.shape[1])
        if b > a:
            music[:, a:b] += m[:, a - i0:b - i0]
        for k, c in enumerate(meta['sfx']):
            mono, pk, g, pan, pan_end = sfx(c, seed * 1000 + n * 100 + k)
            fx.add(off + c['t'], mono, pk, g, pan, pan_end)
        v = voices.get(n)
        if v is not None:
            i0 = int(round(off * SR)); a, b = max(0, i0), min(len(vbus), i0 + len(v))
            if b > a:
                vbus[a:b] += v[a - i0:b - i0]
    # levels: voice on top, music ~-19 dB under it, ducked 8 dB more while the voice speaks
    vpk = np.abs(vbus).max() + 1e-9
    vbus = vbus / vpk * 0.5
    vbus = compress(vbus, 20 * np.log10(0.5) - 14, 3.0, 0.004, 0.10)          # voice: gentle 3:1
    vbus = vbus / (np.abs(vbus).max() + 1e-9) * 0.5
    duck = 10 ** (-8 * voice_env(vbus) / 20)
    mus_rms = np.sqrt(np.mean(music ** 2)) + 1e-9
    v_rms = np.sqrt(np.mean(vbus[np.abs(vbus) > 0.01] ** 2)) if np.any(np.abs(vbus) > 0.01) else 0.1
    music = music / mus_rms * v_rms * 10 ** (-12 / 20) * duck
    fxb = compress(fx.buf, 20 * np.log10(np.abs(fx.buf).max() + 1e-9) - 9, 4.0, 0.002, 0.08)
    fx_buf = fxb / (np.sqrt(np.mean(fxb[:, np.abs(fxb).max(axis=0) > 1e-4] ** 2)) + 1e-9) * v_rms * 10 ** (-9 / 20)
    # stages without narration: effects 4 dB lower (sit just under the music); 50 ms crossfade at joins
    # stages without narration: the music fills the space (+MUS_UP dB) and effects sit just under it;
    # 50 ms crossfades at the joins, so loudness matches the narrated stages
    curve, mcurve = np.ones(fx_buf.shape[1]), np.ones(fx_buf.shape[1])
    for n, _m in stages:
        if n in voices:
            continue
        a = int(round((STAGE_LEN * (n - 1) - t_start) * SR)); b = a + int(round(STAGE_LEN * SR))
        a, b = max(0, a), min(len(curve), b)
        if b > a:
            curve[a:b] = 10 ** (FX_UP / 20); mcurve[a:b] = 10 ** (MUS_UP / 20)
    k = int(0.05 * SR)
    sm = lambda c: np.convolve(np.pad(c, (k, k), mode='edge'), np.ones(k) / k, 'same')[k:-k]
    fx_buf = fx_buf * sm(curve); music = music * sm(mcurve)
    mix = music + fx_buf + np.vstack([vbus, vbus]) * 0.7071
    # no clicks at the very start/end of a file
    e = int(0.003 * SR); mix[:, :e] *= np.linspace(0, 1, e)
    return mix


def write_wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', str(path)],
                   input=np.ascontiguousarray(x.T).astype(np.float64).tobytes(), check=True)


def main():
    mode = sys.argv[1]
    if mode == 'stage':
        n = int(sys.argv[2])
        stages, voices = [], {}
        for k in range(1, n + 1):                # earlier stages contribute their tails
            mp = ROOT / f'stage{k}' / f'meta_{k}.json'
            if mp.exists():
                stages.append((k, json.loads(mp.read_text())))
        vp = ROOT / f'stage{n}' / f'voice_{n}.mp3'
        if vp.exists():
            voices[n] = load_voice(vp)                 # no voice file → music + sfx only
        # tails of earlier stages' sfx/music only; earlier voices end before 15 s
        t0 = STAGE_LEN * (n - 1)
        mix = render(stages, t0, t0 + STAGE_LEN, voices)
        mix, lufs, tp, gr = master(mix)
        write_wav(ROOT / f'stage{n}' / f'mix_{n}.wav', mix)
        print(json.dumps({'stage': n, 'lufs': round(lufs, 2), 'true_peak_dbtp': round(tp, 2), 'limiter_gr_db': round(gr, 2)}))
    elif mode == 'final':
        stages = [(k, json.loads((ROOT / f'stage{k}' / f'meta_{k}.json').read_text())) for k in range(1, 5)]
        global FX_UP
        skip = set(int(a) for a in sys.argv[2:])        # e.g. `final 1 2 3 4` → no voice at all
        if skip:
            FX_UP = -2.0                                  # all-instrumental cut: effects a touch lower
        voices = {k: load_voice(ROOT / f'stage{k}' / f'voice_{k}.mp3') for k in range(1, 5)
                  if k not in skip and (ROOT / f'stage{k}' / f'voice_{k}.mp3').exists()}
        mix = render(stages, 0.0, 4 * STAGE_LEN, voices)
        mix, lufs, tp, gr = master(mix)
        write_wav(ROOT / ('final_mix.wav' if not skip else 'final_mix_novoice.wav'), mix)
        print(json.dumps({'lufs': round(lufs, 2), 'true_peak_dbtp': round(tp, 2), 'limiter_gr_db': round(gr, 2)}))


if __name__ == '__main__':
    main()
