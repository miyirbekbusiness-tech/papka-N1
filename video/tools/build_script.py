# Builds script.json from the scene table below.
# Each cue = (say, sub, keyword). say = TTS text (numbers as words); sub = on-screen text (digits allowed).
# Labels: (text, cue_index, trigger_word_in_say)
import json, sys

S = []
def sc(id, typ, src, bg, kind, visual, labels, cues):
    S.append(dict(id=id, type=typ, src=src, bg=bg, kind=kind, visual=visual,
                  labels=[dict(text=t, cue=c, word=w) for t, c, w in labels],
                  cues=[dict(say=a, sub=b, kw=k) for a, b, k in cues]))

exec(open(__file__.replace('build_script.py','scenes.py'), encoding='utf-8').read())

for s in S:
    s['say'] = ' '.join(c['say'] for c in s['cues'])

json.dump(dict(title='Agarda SSSR yana tiklansa?', voice='Mirjalol Professional Voice',
               scenes=S), open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
tot = sum(len(s['say']) for s in S)
print('scenes', len(S), 'say chars', tot, 'est sec @14', round(tot / 14, 1))
