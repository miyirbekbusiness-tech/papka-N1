# Final audio mix + mux. Runs in the ElevenLabs sandbox (default paths) or locally with MIX_IN/MIX_TMP/OUT set.
# Inputs in MIX_IN: hook.mp3, sNN.mp3 (scene voices), sfx.flac, music.flac, video.mp4, plan.json.
# Output: $OUT/Agarda_SSSR_yana_tiklansa.mp4 (+ mix report on stdout).
import json, os, subprocess, sys
import numpy as np, soundfile as sf, pyloudnorm as pyln, librosa

SR = 48000
IN = os.environ.get('MIX_IN', '/workspace/in')
plan = json.load(open(f'{IN}/plan.json'))
N = int(plan['total'] * SR) + SR
voice = np.zeros(N)
for item in plan['voices']:  # {file, start, trim}
    y, _ = librosa.load(f"{IN}/{item['file']}", sr=SR, mono=True)
    y = y[:int(item['trim'] * SR)]
    fade = int(0.01 * SR); y[-fade:] *= np.linspace(1, 0, fade)
    a = int(item['start'] * SR); voice[a:a + len(y)] += y[:N - a]
sfx, _ = librosa.load(f'{IN}/sfx.flac', sr=SR, mono=True)
mus, _ = librosa.load(f'{IN}/music.flac', sr=SR, mono=True)
sfx = np.pad(sfx, (0, max(0, N - len(sfx))))[:N]
mus = np.pad(mus, (0, max(0, N - len(mus))))[:N]

meter = pyln.Meter(SR)
Lv = meter.integrated_loudness(voice)
Lm = meter.integrated_loudness(mus)
gm = 10 ** ((Lv - 20 - Lm) / 20)          # music 20 dB under the voice (>= 18 dB rule)
mus *= gm
gs = 10 ** ((-8) / 20) * np.abs(voice).max() / max(1e-9, np.abs(sfx).max())  # SFX peaks 8 dB under voice peak
sfx *= gs
mix = voice + mus + sfx
# check: short-term (3 s) music level vs voice level where voice talks
win = 3 * SR
gaps = []
for s0 in range(0, N - win, win):
    v = voice[s0:s0 + win]; m = mus[s0:s0 + win]
    if np.sqrt(np.mean(v ** 2)) > 1e-3:
        gaps.append(20 * np.log10(np.sqrt(np.mean(v ** 2)) / max(1e-9, np.sqrt(np.mean(m ** 2)))))
sf.write(os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'mix_raw.wav'), mix / max(1.0, np.abs(mix).max()), SR, subtype='FLOAT')
# two-pass loudnorm to -14 LUFS, TP -1.5 dBTP
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'mix_raw.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                   capture_output=True, text=True).stderr
m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'mix_raw.wav'), '-af', af, '-ar', '48000', os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'mix.wav')], check=True)
out = os.environ.get('OUT', '/workspace/out')
os.makedirs(out, exist_ok=True)
dst = f'{out}/Agarda_SSSR_yana_tiklansa.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{IN}/video.mp4', '-i', os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'mix.wav'), '-map', '0:v:0', '-map', '1:a:0',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', dst], check=True)
# verify loudness of the final file
r2 = subprocess.run(['ffmpeg', '-hide_banner', '-i', dst, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
m2 = json.loads(r2[r2.rindex('{'):r2.rindex('}') + 1])
probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,sample_rate,bit_rate:format=duration', '-of', 'json', dst], capture_output=True, text=True).stdout
print(json.dumps(dict(voice_lufs=round(Lv, 2), music_gain_db=round(20 * np.log10(gm), 2), min_voice_over_music_db=round(min(gaps), 1),
                      final_I=m2['input_i'], final_TP=m2['input_tp'], probe=json.loads(probe))))
