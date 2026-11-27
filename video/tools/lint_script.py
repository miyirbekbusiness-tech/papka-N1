# Lints script.json cues against the subtitle rules. Prints one line per problem.
import json, re, sys

d = json.load(open(sys.argv[1], encoding='utf-8'))
probs = 0
NUMW = set('bir ikki uch toʻrt besh olti yetti sakkiz toʻqqiz oʻn yigirma oʻttiz qirq ellik oltmish yetmish sakson toʻqson yuz ming million milliard butun oʻndan yuzdan'.split())

def wrap(t, w=42):
    lines, cur = [], ''
    for word in t.split():
        if len(cur) + len(word) + (1 if cur else 0) <= w:
            cur = (cur + ' ' + word).strip()
        else:
            lines.append(cur); cur = word
    lines.append(cur)
    return lines

ROOT = r'(bir|ikki|uch|toʻrt|besh|olti|yetti|sakkiz|toʻqqiz|oʻn|yigirma|oʻttiz|qirq|ellik|oltmish|yetmish|sakson|toʻqson|yuz|ming|butun|oʻndan)'
NUMRE = re.compile('^' + ROOT + r'(ta|tasi|inchi|nchi|ga|da|dan|ni|i|ning)?$')
def isnum(w, nxt):
    if w in ('uch',) and nxt is None: return True
    if w == 'bir':  # article unless followed by a number word
        return nxt is not None and bool(NUMRE.match(nxt))
    return bool(NUMRE.match(w)) and w not in ('uchun', 'biri', 'birga')
def toks(t):
    raw = []
    for w in t.split():
        w = norm(w)
        if not w: continue
        if re.search(r'\d', w):
            parts = w.split('-', 1)
            raw.append('#')
            if len(parts) > 1 and parts[1]: raw.append(parts[1])
        else:
            raw.append(w)
    out = []
    for i, w in enumerate(raw):
        nxt = raw[i + 1] if i + 1 < len(raw) else None
        if w == 'bir' and out and out[-1] == '#': w = '#'
        if w != '#' and isnum(w, nxt) and not (w == 'oʻndan' and out and out[-1] != '#'):
            w = '#'
        if w in ('ta', 'tasi') and out and out[-1] == '#':
            continue
        if w == '#' and out and out[-1] == '#':
            continue
        out.append(w)
    return out

def norm(w):
    return re.sub(r'[^\wʻʼ\-]', '', w.lower())

for s in d['scenes']:
    for i, c in enumerate(s['cues']):
        sub, say = c['sub'], c['say']
        tag = f"S{s['id']}c{i}"
        words = sub.split()
        if not (3 <= len(words) <= 8):
            print(tag, 'WORDS', len(words), '|', sub); probs += 1
        L = wrap(sub)
        if len(L) > 2:
            print(tag, 'LINES', len(L), '|', sub); probs += 1
        if re.search(r'[.?!]\s+\S', sub.strip()):
            print(tag, 'TWO-SENTENCES |', sub); probs += 1
        for t in (sub, say):
            if re.search(r"[‘’'`]", t) or re.search(r'[oOgG][ʼ’\'`]', t):
                print(tag, 'APOSTROPHE |', t); probs += 1
        if re.search(r'\d', say):
            print(tag, 'DIGIT-IN-SAY |', say); probs += 1
        if re.search(r'\b(SSSR|NATO|MDH|KXShT|YeOII|YeI|AQSh)\b', say) and 'NATO' not in say:
            print(tag, 'ABBR-IN-SAY |', say); probs += 1
        a, b = toks(say), toks(sub)
        if a != b:
            print(tag, 'MISMATCH\n   say:', ' '.join(a), '\n   sub:', ' '.join(b)); probs += 1
    for l in s['labels']:
        if norm(l['word']) not in [norm(w) for w in s['cues'][l['cue']]['say'].split()]:
            print(f"S{s['id']}", 'LABEL-WORD-NOT-FOUND', l); probs += 1
    if s['type'] == 'FAKT' and not any(x.startswith('R') for x in s['src']):
        print(f"S{s['id']}", 'FAKT-WITHOUT-R-SOURCE'); probs += 1
print('problems:', probs)
