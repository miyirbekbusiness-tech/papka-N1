#!/usr/bin/env python3
"""True-peak limiter + loudness for the 60 s mix.
master.py in.wav out.wav target_LUFS ceiling_dBTP
Upsamples 4x (ffmpeg soxr) to estimate inter-sample peaks, builds a look-ahead
gain curve (5 ms attack, 120 ms release), applies it at 48 kHz, and iterates the
make-up gain until integrated loudness hits the target. Prints max gain reduction."""
import sys, subprocess, re, numpy as np
src, dst, target, ceil = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
SR = 48000
def read(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-af', f'aresample={sr}:resampler=soxr', '-f', 'f32le', '-ac', '2', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
def write(path, x):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', path], input=x.astype(np.float32).tobytes(), check=True)
def measure(path):
    s = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = s[s.rfind('Summary'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'True peak:\s+Peak:\s+(-?[\d.]+) dBFS', s, re.S).group(1))
x = read(src)
up = read(src, SR * 4)
pk = np.abs(up).max(1)[: len(x) * 4].reshape(-1, 4).max(1)            # true-peak estimate per 48 kHz sample
pk = np.pad(pk, (0, len(x) - len(pk)))
I0, _ = measure(src)
gain_db = target - I0
lim = 10 ** ((ceil - 0.3) / 20)
for it in range(6):
    g0 = 10 ** (gain_db / 20)
    need = np.minimum(1.0, lim / np.maximum(pk * g0, 1e-12))         # required gain per sample
    att, rel = int(0.005 * SR), 0.120
    # look-ahead: minimum over the next `att` samples
    from numpy.lib.stride_tricks import sliding_window_view
    padded = np.concatenate([need, np.ones(att)])
    la = sliding_window_view(padded, att + 1).min(1)[: len(need)]
    # smooth: instant attack (already looked ahead), exponential release
    g = np.empty_like(la); a = np.exp(-1 / (rel * SR)); cur = 1.0
    for i, v in enumerate(la):
        cur = v if v < cur else a * cur + (1 - a) * v
        g[i] = cur
    y = x * g0 * g[:, None]
    write(dst, y)
    I, TP = measure(dst)
    gr = -20 * np.log10(g.min())
    print(f'pass {it}: makeup {gain_db:+.2f} dB, I {I} LUFS, TP {TP} dBTP, max limiter GR {gr:.2f} dB')
    if abs(I - target) <= 0.15 and TP <= ceil: break
    gain_db += target - I
worst = np.argsort(-pk)[:1]
print(f'RESULT I={I} TP={TP} GR={gr:.2f}')
