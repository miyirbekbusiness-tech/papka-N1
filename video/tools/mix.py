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
sf.write(os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'voice_only.wav'), voice, SR)
sfx, _ = librosa.load(f'{IN}/sfx.flac', sr=SR, mono=True)
mus, _ = librosa.load(f'{IN}/music.flac', sr=SR, mono=True)
sfx = np.pad(sfx, (0, max(0, N - len(sfx))))[:N]
mus = np.pad(mus, (0, max(0, N - len(mus))))[:N]

meter = pyln.Meter(SR)
Lv = meter.integrated_loudness(voice)
Lm = meter.integrated_loudness(mus)
gm = 10 ** ((Lv - 26 - Lm) / 20)          # quiet bed: 26 dB under the voice integrated
mus *= gm
# adaptive ducking: in every 50 ms block where the voice talks keep music >= 19 dB under the voice (3 s RMS), smoothed
blk = int(0.05 * SR); nb = N // blk
win = 8  # 0.4 s
vr = np.sqrt(np.convolve((voice[:nb * blk].reshape(nb, blk) ** 2).mean(1), np.ones(win) / win, mode='same'))
mr = np.sqrt(np.convolve((mus[:nb * blk].reshape(nb, blk) ** 2).mean(1), np.ones(win) / win, mode='same'))
g = np.ones(nb)
talk = vr > 1e-3
need = np.where(talk, np.minimum(1.0, (vr * 10 ** (-21 / 20)) / np.maximum(mr, 1e-9)), 1.0)
g = np.minimum(g, need)
g = -np.convolve(-g, np.ones(1), mode='same')
g = np.minimum.reduce([np.roll(g, k) for k in range(-4, 5)])  # look-ahead/hold 0.2 s so the duck is down before words
g = np.convolve(g, np.ones(4) / 4, mode='same')  # 0.2 s smoothing
genv = np.repeat(g, blk)
genv = np.pad(genv, (0, N - len(genv)), constant_values=1.0)
mus *= genv
gs = 10 ** ((-8) / 20) * np.abs(voice).max() / max(1e-9, np.abs(sfx).max())  # SFX peaks 8 dB under voice peak
sfx *= gs
mix = voice + mus + sfx
# check: voice vs music on 0.4 s blocks where the voice is talking (voice block RMS within 30 dB of its loud blocks)
b4 = int(0.4 * SR); nb4 = N // b4
vb = np.sqrt((voice[:nb4 * b4].reshape(nb4, b4) ** 2).mean(1)); mb = np.sqrt((mus[:nb4 * b4].reshape(nb4, b4) ** 2).mean(1))
act = vb > np.percentile(vb[vb > 1e-4], 90) * 10 ** (-20 / 20)
gaps = list(20 * np.log10(vb[act] / np.maximum(mb[act], 1e-9)))
sf.write(os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'mix_raw.wav'), mix / max(1.0, np.abs(mix).max()), SR, subtype='FLOAT')
# two-pass loudnorm to -14 LUFS, TP -1.5 dBTP
raw = os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'mix_raw.wav')
mixed = os.path.join(os.environ.get('MIX_TMP', '/workspace'), 'mix.wav')
Lm_raw = meter.integrated_loudness(sf.read(raw)[0])
gain_db = -14.0 - Lm_raw
for _ in range(4):  # gain -> 4x oversampled limiter at -2.3 dB, re-measure, correct the gain
    af = f"volume={gain_db:.2f}dB,aresample=192000,alimiter=limit={10 ** (-2.3 / 20):.4f}:attack=1:release=60:level=false,aresample=48000"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', af, '-ar', '48000', '-c:a', 'pcm_f32le', mixed], check=True)
    Lo = meter.integrated_loudness(sf.read(mixed)[0])
    if abs(Lo + 14.0) < 0.15:
        break
    gain_db += -14.0 - Lo
out = os.environ.get('OUT', '/workspace/out')
os.makedirs(out, exist_ok=True)
dst = f'{out}/Agarda_SSSR_yana_tiklansa.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{IN}/video.mp4', '-i', mixed, '-map', '0:v:0', '-map', '1:a:0',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', dst], check=True)
# verify loudness of the final file
r2 = subprocess.run(['ffmpeg', '-hide_banner', '-i', dst, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
m2 = json.loads(r2[r2.rindex('{'):r2.rindex('}') + 1])
probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,sample_rate,bit_rate:format=duration', '-of', 'json', dst], capture_output=True, text=True).stdout
print(json.dumps(dict(voice_lufs=round(Lv, 2), music_gain_db=round(20 * np.log10(gm), 2), min_voice_over_music_db=round(min(gaps), 1), p5_voice_over_music_db=round(float(np.percentile(gaps, 5)), 1), gain_db=round(gain_db, 2),
                      final_I=m2['input_i'], final_TP=m2['input_tp'], probe=json.loads(probe))))
