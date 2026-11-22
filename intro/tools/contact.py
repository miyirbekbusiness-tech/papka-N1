"""python3 tools/contact.py FRAMEDIR OUT.png  — 3x3 sheet of the CHECKS frames at half size (960x540)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
FR = [0, 72, 144, 252, 324, 360, 432, 468, 575]
d, out = Path(sys.argv[1]), sys.argv[2]
tw, th, lab, pad = 960, 540, 34, 8
sheet = Image.new('RGB', (3 * tw + 4 * pad, 3 * (th + lab) + 4 * pad), (24, 24, 26))
dr = ImageDraw.Draw(sheet)
try: fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
except OSError: fnt = ImageFont.load_default()
for k, f in enumerate(FR):
    im = Image.open(d / f'f{f:04d}.png').convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = pad + (k % 3) * (tw + pad), pad + (k // 3) * (th + lab + pad)
    sheet.paste(im, (x, y))
    dr.text((x + 6, y + th + 5), f'f{f}  ({f/60:.2f} s)', fill=(220, 220, 220), font=fnt)
sheet.save(out)
print(out, sheet.size)
