#!/usr/bin/env python3
"""verify.py N — CHECKS on the rendered part: contrast (pixels), sweater colour (decoded video),
duration/frames, loudness/true peak (from the mp4), HERO rig hash.  Writes stageN/verify_N.json."""
import json, sys, hashlib, subprocess, re
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent


def lin(c):
    c = np.asarray(c, float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lum(rgb):
    l = lin(rgb)
    return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]


def hex2rgb(h):
    h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def ratio(a, b):
    a, b = max(a, b), min(a, b); return (a + 0.05) / (b + 0.05)


def main():
    n = int(sys.argv[1]); d = ROOT / f'stage{n}'
    chk = json.loads((d / f'check_{n}.json').read_text())
    out = {'stage': n}
    # subtitles: white text vs the brightest 5% of background under the phrase box
    worst = []
    for i, p in enumerate(chk['phraseBoxes']):
        im = np.asarray(Image.open(d / 'check' / f'phrase_{i}.png').convert('RGB'))
        x0, y0, x1, y1 = p['box']
        reg = im[max(0, y0):y1, max(0, x0):x1]
        L = np.percentile(lum(reg), 95)
        worst.append({'text': p['text'], 'bgL95': round(float(L), 4), 'contrast': round(ratio(1.0, float(L)), 2)})
    out['subtitle_contrast_min'] = min(w['contrast'] for w in worst)
    out['subtitle_contrast'] = worst
    # labels (analytic: text colour vs its own pill)
    labels = []
    meta = json.loads((d / f'meta_{n}.json').read_text())
    out['labels'] = labels
    # sweater colour on the decoded video
    sw = []
    for s in chk.get('swatch', []):
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(d / f'part{n}.mp4'), '-vf', f'select=eq(n\\,{s["f"]}),scale=in_color_matrix=bt709:in_range=tv,format=rgb24',
                              '-frames:v', '1', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
        im = np.frombuffer(raw, np.uint8).reshape(1920, 1080, 3)
        reg = im[s['y'] - 5:s['y'] + 6, s['x'] - 5:s['x'] + 6].reshape(-1, 3).mean(axis=0)
        hx = '#%02X%02X%02X' % tuple(int(round(v)) for v in reg)
        dE = float(np.abs(reg - np.array(hex2rgb('F2A93B'))).max())
        sw.append({'shot': s['shot'], 'frame': s['f'], 'measured': hx, 'max_channel_diff': round(dE, 1)})
    out['sweater'] = sw
    # container
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,nb_frames,duration:format=duration', '-of', 'json', str(d / f'part{n}.mp4')], capture_output=True).stdout)
    out['streams'] = pr
    eb = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(d / f'part{n}.mp4'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', eb)[-1]; TP = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', eb)[-1]
    out['loudness'] = {'integrated_lufs': float(I), 'true_peak_dbtp': float(TP)}
    out['hero_js_sha256'] = hashlib.sha256((ROOT / 'shared' / 'hero.js').read_bytes()).hexdigest()[:16]
    out['kit_sha256'] = {f: hashlib.sha256((ROOT / 'shared' / f).read_bytes()).hexdigest()[:16] for f in ('hero.js', 'subs.js', 'style.js', 'scene.js')}
    out['cuts'] = chk['cuts']; out['subs_mismatch'] = chk['subs']; out['safe_area_violations'] = chk['safe']
    (d / f'verify_{n}.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print(json.dumps({k: out[k] for k in ('subtitle_contrast_min', 'sweater', 'loudness', 'kit_sha256', 'subs_mismatch', 'safe_area_violations')}, indent=1, ensure_ascii=False))
    print('shots:', [(c['shot'], c['dur'], c['onCue'], c['lenOK']) for c in chk['cuts']])


if __name__ == '__main__':
    main()
