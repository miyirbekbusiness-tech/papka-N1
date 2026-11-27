# Record measured connector audio: python3 tools/record.py '<json {"sid": ["genid", {measurement}]}>'
import json, sys
d = json.load(open('script.json', encoding='utf-8')); sc = {s['id']: s for s in d['scenes']}
p = json.load(open('progress.json')); st = p['stages']['3']
st.setdefault('voiced', []); st.setdefault('scenes', {})
for k, (gen, m) in json.loads(sys.argv[1]).items():
    k = int(k)
    json.dump(dict(text=sc[k]['say'], generation_id=gen, **m), open(f'audio/scene_{k:02d}.align.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if k not in st['voiced']: st['voiced'].append(k)
    st['scenes'][str(k)] = dict(gen=gen, chars=len(sc[k]['say']), dur=m['dur'], cps=round(len(sc[k]['say']) / m['dur'], 2))
    st.get('pending_generations', {}).pop(str(k), None)
    if k in st.get('next_unvoiced', []): st['next_unvoiced'].remove(k)
st['voiced'].sort()
st.pop('done_durations_unmeasured', None)
tot = sum(v['dur'] for v in st['scenes'].values())
json.dump(p, open('progress.json', 'w'), indent=2, ensure_ascii=False)
print('voiced', len(st['voiced']), 'total dur', round(tot, 2), 'missing', [s for s in sc if s not in st['voiced']])
