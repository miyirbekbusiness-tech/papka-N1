#!/usr/bin/env python3
"""Compose half-size tiles (540x960) into a contact sheet: sheet.py <tile_dir> <out.png> [cols] [scale]"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
files = sorted(glob.glob(os.path.join(d, '*.png')))
tw, th = int(540 * sc), int(960 * sc)
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 8) + 8, rows * (th + 44) + 8), (24, 20, 40))
dr = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
except Exception: font = ImageFont.load_default()
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = 8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 44)
    sheet.paste(im, (x, y))
    dr.text((x + 4, y + th + 6), os.path.basename(f)[:-4], fill=(240, 240, 240), font=font)
sheet.save(out)
print(out, sheet.size)
