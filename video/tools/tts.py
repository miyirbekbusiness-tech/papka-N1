# Voices scenes with ElevenLabs (with-timestamps). Usage: python3 tools/tts.py <first_id> <last_id>
# Rules: credit check before each request; stop on 401/402/429/quota; never re-voice a voiced scene;
# at most one retry for a failed request.
import base64, json, os, subprocess, sys, time
import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.elevenlabs.io'
VOICE_NAME = 'Mirjalol'
MODEL = 'eleven_v4'
SETTINGS = dict(stability=0.5, similarity_boost=0.8, style=0.2, speed=1.0)
SEED = 4242


def env_key():
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        if line.startswith('ELEVENLABS_API_KEY='):
            return line.split('=', 1)[1].strip()
    raise SystemExit('ELEVENLABS_API_KEY missing in .env')


def load(p):
    return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))


def save(p, d):
    json.dump(d, open(os.path.join(ROOT, p), 'w', encoding='utf-8'), indent=2, ensure_ascii=False)


def stop(prog, n_voiced, next_id, why):
    prog['stages']['3']['status'] = 'blocked'
    prog['stages']['3']['blocked_on'] = why
    save('progress.json', prog)
    print(f'STOP: {why}')
    print(f"⛔ ElevenLabs krediti tugadi. {n_voiced}/70 sahna ovozlashtirildi, keyingisi: {next_id}. "
          "Yangi akkaunt API kalitini .env faylga qoʻying va 'davom et' deb yozing.")
    sys.exit(2)


def main():
    a, b = int(sys.argv[1]), int(sys.argv[2])
    H = {'xi-api-key': env_key()}
    script = load('script.json')
    scenes = {s['id']: s for s in script['scenes']}
    order = [s['id'] for s in script['scenes']]
    prog = load('progress.json')
    st = prog['stages']['3']
    st.setdefault('voiced', [])
    st.setdefault('scenes', {})
    voice_id = st.get('voice_id')
    if not voice_id:
        r = requests.get(f'{API}/v2/voices', params={'search': VOICE_NAME}, headers=H, timeout=60)
        r.raise_for_status()
        vs = [v for v in r.json()['voices'] if v['name'].startswith('Mirjalol')]
        if not vs:
            raise SystemExit('VOICE_NOT_FOUND')
        voice_id = vs[0]['voice_id']
        st['voice_id'] = voice_id
        st['model'] = MODEL
        st['settings'] = SETTINGS
        st['seed'] = SEED
        save('progress.json', prog)
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    for sid in order:
        if sid < a or sid > b or sid in st['voiced']:
            continue
        s = scenes[sid]
        text = s['say']
        need = len(text) + 50
        r = requests.get(f'{API}/v1/user/subscription', headers=H, timeout=60)
        if r.status_code in (401, 402, 429):
            stop(prog, len(st['voiced']), sid, f'subscription {r.status_code}')
        sub = r.json()
        left = sub['character_limit'] - sub['character_count']
        if left < need:
            stop(prog, len(st['voiced']), sid, f'credits left {left} < {need}')
        i = order.index(sid)
        body = dict(text=text, model_id=MODEL, voice_settings=SETTINGS, seed=SEED,
                    previous_text=scenes[order[i - 1]]['say'] if i > 0 else None,
                    next_text=scenes[order[i + 1]]['say'] if i + 1 < len(order) else None)
        body = {k: v for k, v in body.items() if v is not None}
        url = f'{API}/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128'
        resp = None
        for attempt in range(2):
            try:
                resp = requests.post(url, headers=H, json=body, timeout=300)
            except requests.RequestException as e:
                print('request error', e)
                resp = None
            if resp is not None and resp.status_code == 200:
                break
            if resp is not None and (resp.status_code in (401, 402, 429) or 'quota' in resp.text.lower()):
                stop(prog, len(st['voiced']), sid, f'tts {resp.status_code}: {resp.text[:200]}')
            print('attempt', attempt + 1, 'failed', resp.status_code if resp is not None else '-', (resp.text[:300] if resp is not None else ''))
            if attempt == 0:
                time.sleep(3)
        if resp is None or resp.status_code != 200:
            prog['stages']['3']['status'] = 'blocked'
            prog['stages']['3']['blocked_on'] = f'scene {sid} failed twice'
            save('progress.json', prog)
            raise SystemExit(f'scene {sid} failed twice')
        j = resp.json()
        mp3 = os.path.join(ROOT, 'audio', f'scene_{sid:02d}.mp3')
        open(mp3, 'wb').write(base64.b64decode(j['audio_base64']))
        al = dict(text=text, alignment=j.get('alignment'), normalized_alignment=j.get('normalized_alignment'))
        save(f'audio/scene_{sid:02d}.align.json', al)
        dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                             '-of', 'csv=p=0', mp3]).decode().strip())
        st['voiced'].append(sid)
        st['scenes'][str(sid)] = dict(chars=len(text), dur=round(dur, 3), cps=round(len(text) / dur, 2),
                                      credits_left_before=left)
        save('progress.json', prog)
        print(f'scene {sid}: {len(text)} chars, {dur:.2f}s, {len(text)/dur:.2f} c/s, credits left before {left}')


if __name__ == '__main__':
    main()
