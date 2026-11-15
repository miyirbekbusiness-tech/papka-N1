#!/usr/bin/env python3
"""film_check.py — final.mp4 checks: every shot (all stages) with its length, subtitle/voice sync per
stage (from the stage checks), and a contact sheet of the whole film taken from final.mp4 itself."""
import json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
rows, frames = [], []
for n in range(1, 5):
    meta = json.loads((ROOT / f'stage{n}' / f'meta_{n}.json').read_text())
    chk = json.loads((ROOT / f'stage{n}' / f'check_{n}.json').read_text())
    for s in meta['shots']:
        g0 = (n - 1) * 450 + s['f0']; g1 = (n - 1) * 450 + s['f1']
        rows.append({'stage': n, 'shot': s['name'], 'start_s': round(g0 / 30, 3), 'dur_s': round(s['dur'], 3), 'cut': s['cut'], 'len_ok': 3.5 - 1e-6 <= s['dur'] <= 5.0 + 1e-6})
        frames.append((g0 + g1) // 2)
    rows.append({'stage': n, 'subs_on_voice_frames': len(chk['subs']) == 0, 'words': len(meta['words']), 'provisional_timing': bool(json.loads((ROOT / f'stage{n}' / f'words_{n}.json').read_text()).get('provisional'))})
# contact sheet from the final file
tw, th = 270, 480
sheet = Image.new('RGB', (8 * (tw + 6) + 6, 2 * (th + 34) + 6), (24, 20, 40)); dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
except Exception: font = ImageFont.load_default()
shots = [r for r in rows if 'shot' in r]
for i, (f, r) in enumerate(zip(frames, shots)):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / 'final.mp4'), '-vf', f'select=eq(n\\,{f}),scale={tw}:{th}:flags=lanczos', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    im = Image.frombytes('RGB', (tw, th), raw)
    x, y = 6 + (i % 8) * (tw + 6), 6 + (i // 8) * (th + 34)
    sheet.paste(im, (x, y)); dr.text((x + 2, y + th + 6), f"{i + 1}. {r['start_s']:.2f}s  {r['dur_s']:.2f}s", fill=(235, 235, 235), font=font)
sheet.save(ROOT / 'final_contact.png')
(ROOT / 'final_check.json').write_text(json.dumps(rows, indent=1, ensure_ascii=False))
for r in rows: print(r)
print('contact sheet →', ROOT / 'final_contact.png')
