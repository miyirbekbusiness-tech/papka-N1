"""python3 tools/checks.py CHECKDIR [FINAL_FRAME_PNG] — image CHECKS: colour probes, contrast, crispness."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

d = Path(sys.argv[1]); img = d / 'img'
geo = json.loads((d / 'geometry.json').read_text())
# optional 2nd arg: directory of frames decoded from the delivered MP4 (f%04d.png); masks stay from CHECKDIR
src = Path(sys.argv[2]) if len(sys.argv) > 2 else img
final_png = src / 'f0575.png'
res, ok = {}, True
def lin(c): c = c / 255.0; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lum(a): l = lin(a.astype(np.float64)); return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]
def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.int32)
def masks(f):
    m = load(img / f'mask_f{f:04d}.png')
    ident = np.rint(m[..., 0] / 20.0).astype(int)              # letter id 1..9
    caps = (m[..., 1] > 200) & (m[..., 2] < 40); anyl = (m[..., 1] > 90) & (m[..., 2] < 40)
    return ident, caps, anyl

# geometry
inter = geo['intersections']
res['intersections'] = dict(inter, ok=inter['framesWithIntersections'] == 0)
arcs = {a['f']: (a['p'], max(a['dist'])) for a in geo['arcs']}
res['arcs'] = dict(f251_progress=arcs[251][0], f251_maxdist=arcs[251][1], f252_progress=arcs[252][0], f252_maxdist=arcs[252][1],
                   ok=arcs[251][0] < 1 and arcs[251][1] > 0 and arcs[252][0] == 1 and arcs[252][1] < 1e-9)
built, spec = geo['text']['built'], geo['text']['spec']
res['text'] = dict(built=built, spec=spec, ok=built == spec.replace(' ', '') and spec == 'dangasa Ai')

# final frame colour probes
ident, caps, _ = masks(575)
fin = load(final_png)
if fin.shape[:2] != caps.shape: fin = np.asarray(Image.open(final_png).convert('RGB').resize(caps.shape[::-1], Image.LANCZOS)).astype(np.int32)
core = ndi.binary_erosion(caps, iterations=3)
probe = {}
for name, ids, tgt in (('ivory', range(1, 8), (0xF4, 0xEF, 0xE6)), ('amber', (8, 9), (0xF2, 0xA9, 0x3B))):
    sel = core & np.isin(ident, list(ids))
    px = fin[sel]
    med = np.median(px, axis=0); mean = px.mean(axis=0)
    per_letter = [np.median(fin[core & (ident == i)], axis=0).round().astype(int).tolist() for i in ids]
    worst = max(int(np.max(np.abs(np.array(pl) - tgt))) for pl in per_letter)
    probe[name] = dict(target='#%02X%02X%02X' % tgt, median=med.round(1).tolist(), mean=mean.round(1).tolist(), n=int(sel.sum()),
                       max_delta_median=float(np.max(np.abs(med - tgt))), per_letter_median=per_letter, worst_letter_delta=worst,
                       ok=bool(np.max(np.abs(med - tgt)) <= 8 and worst <= 8))
res['colour'] = dict(probe, ok=all(v['ok'] for v in probe.values()))

# contrast from 5.4 s (every 3rd frame)
rows = []
for p in sorted(img.glob('mask_f*.png')):
    f = int(p.stem[6:])
    ident, caps, anyl = masks(f)
    a = load(src / f'f{f:04d}.png'); L = lum(a)
    txt = ndi.binary_erosion(anyl, iterations=2)
    ring = ndi.binary_dilation(anyl, iterations=14) & ~ndi.binary_dilation(anyl, iterations=3)
    lt, lb = L[txt], L[ring]
    c_mean = (lt.mean() + 0.05) / (lb.mean() + 0.05)
    c_worst = (np.percentile(lt, 5) + 0.05) / (np.percentile(lb, 95) + 0.05)
    rows.append((f, c_mean, c_worst))
cm = min(r[1] for r in rows); cw = min(r[2] for r in rows)
res['contrast'] = dict(frames=len(rows), min_mean_ratio=round(cm, 2), min_worst_ratio_p5_vs_p95=round(cw, 2),
                       worst_frame=min(rows, key=lambda r: r[2])[0], ok=cw >= 4.5)

# crispness: 10-90 % edge rise width across horizontal letter edges in the final frame
ident, caps, anyl = masks(575)
L = lum(fin)
widths = []
ys, xs = np.nonzero(anyl[:, 1:] & ~anyl[:, :-1])
for y, x in zip(ys, xs):
    seg = L[y, max(x - 5, 0): x + 7]
    lo, hi = seg.min(), seg.max()
    if hi - lo < 0.25: continue
    widths.append(int(np.sum((seg > lo + 0.1 * (hi - lo)) & (seg < lo + 0.9 * (hi - lo)))))
res['crisp'] = dict(edges=len(widths), median_10_90_px=float(np.median(widths)), p90=float(np.percentile(widths, 90)),
                    ok=float(np.median(widths)) <= 2.0)
# whole: all 9 letters on screen, none clipped, each with its own pixels
fr = geo['framing']['575']
cover = [int(((ident == i) & anyl).sum()) for i in range(1, 10)]
res['whole'] = dict(letter_pixels=cover, bbox=fr, ok=all(c > 500 for c in cover) and 0 < fr['x0'] and fr['x1'] < 1 and 0 < fr['yTop'] and fr['yBot'] < 1)
res['framing'] = dict(width_frac_324=round(geo['framing']['324']['widthFrac'], 4), width_frac_575=round(fr['widthFrac'], 4),
                      horizon_y=geo['horizonY'], ok=abs(geo['framing']['324']['widthFrac'] - 0.62) < 0.005)
for k, v in res.items():
    ok &= bool(v['ok'])
    print(f"{'PASS' if v['ok'] else 'FAIL'}  {k:13s} {json.dumps({a: b for a, b in v.items() if a != 'ok'})}")
(d / ('checks_mp4.json' if src != img else 'checks.json')).write_text(json.dumps(res, indent=1, default=float))
print('ALL PASS' if ok else 'SOME CHECKS FAIL')
