# Builds src/data/timing.json: per scene audio duration, frames, cue in/out (s), label times (s).
# Cue boundaries = measured pauses chosen by DP against the character-proportional expectation.
import json, os, re
FPS = 30
BREATH = 0.35
CPS = 15.79  # calibrated (STAGE 3)

d = json.load(open('script.json', encoding='utf-8'))
out = {'fps': FPS, 'scenes': {}}


def choose(bounds_exp, gaps, strong):
    """Pick len(bounds_exp) gaps in order minimizing cost; returns list of (gapstart,gapend) or None."""
    n, g = len(bounds_exp), len(gaps)
    if n == 0:
        return []
    if g < n:
        return None
    INF = 1e9
    cost = [[INF] * (g + 1) for _ in range(n + 1)]
    back = [[-1] * (g + 1) for _ in range(n + 1)]
    for j in range(g + 1):
        cost[0][j] = 0
    for i in range(1, n + 1):
        for j in range(i, g + 1):
            # boundary i uses gap j-1
            gs, ge = gaps[j - 1]
            mid = (gs + ge) / 2
            c = abs(mid - bounds_exp[i - 1]) - (0.25 if strong[i - 1] and ge - gs > 0.18 else 0)
            best = INF; bk = -1
            for k in range(i - 1, j):
                if cost[i - 1][k] < best:
                    best = cost[i - 1][k]; bk = k
            cost[i][j] = best + c; back[i][j] = bk
    j = min(range(n, g + 1), key=lambda x: cost[n][x])
    picks = []
    i = n
    while i > 0:
        picks.append(gaps[j - 1]); j = back[i][j]; i -= 1
    return picks[::-1]


for s in d['scenes']:
    sid = s['id']
    f = f'audio/scene_{sid:02d}.align.json'
    cues = [c['say'] for c in s['cues']]
    lens = [len(c) for c in cues]
    if os.path.exists(f):
        m = json.load(open(f, encoding='utf-8'))
        st, en, gaps = m['start'], m['end'], m['gaps']
        dur = round(min(m['dur'], en + 0.06), 3)  # trailing silence trimmed in the mix
        measured = True
    else:
        dur = len(s['say']) / CPS - 0.1
        st, en, gaps = 0.03, dur - 0.12, []
        measured = False
    tot = sum(lens)
    cum = 0; exp = []
    for L in lens[:-1]:
        cum += L + 1
        exp.append(st + (en - st) * cum / (tot + len(lens) - 1))
    strong = [bool(re.search(r'[.?!:]$', c.strip())) for c in cues[:-1]]
    picks = choose(exp, gaps, strong) if measured else None
    if picks is None:
        picks = [(e - 0.1, e + 0.1) for e in exp]
    starts = [st] + [p[1] for p in picks]
    ends = [p[0] for p in picks] + [en]
    cue_t = []
    for i, c in enumerate(s['cues']):
        tin = starts[i]
        tout = starts[i + 1] if i + 1 < len(starts) else min(en + 0.3, dur + BREATH)
        if tout - tin < 1.0:
            tout = tin + 1.0
        cue_t.append(dict(tin=round(tin, 3), tout=round(tout, 3), speech_end=round(ends[i], 3)))
    labels = []
    for l in s['labels']:
        ci = l['cue']; text = cues[ci].lower()
        w = l['word'].lower()
        pos = text.find(w)
        pos = (pos + len(w)) if pos >= 0 else len(text)
        a, b = starts[ci], ends[ci]
        labels.append(round(a + (b - a) * pos / max(1, len(text)), 3))
    out['scenes'][str(sid)] = dict(dur=dur, measured=measured, frames=round((dur + BREATH) * FPS), cues=cue_t, label_t=labels)

tot = sum(v['frames'] for v in out['scenes'].values()) / FPS
out['total_s'] = round(tot, 2)
os.makedirs('src/data', exist_ok=True)
json.dump(out, open('src/data/timing.json', 'w'), indent=1)
json.dump(d, open('src/data/script.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('scenes', len(out['scenes']), 'total s (no hook)', round(tot, 2), 'measured', sum(v['measured'] for v in out['scenes'].values()))
