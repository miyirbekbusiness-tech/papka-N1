import sys
from PIL import Image, ImageDraw, ImageFont
out, rest = sys.argv[1], sys.argv[2:]
items = [(rest[i], rest[i + 1]) for i in range(0, len(rest), 2)]
TW, TH, CAP, COLS = 360, 640, 40, min(5, len(items))
rows = (len(items) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (TW + 16) + 16, rows * (TH + CAP + 16) + 16), (24, 22, 32))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf', 24)
except Exception: font = ImageFont.load_default()
for k, (t, f) in enumerate(items):
    im = Image.open(f).resize((TW, TH), Image.LANCZOS)
    x, y = 16 + (k % COLS) * (TW + 16), 16 + (k // COLS) * (TH + CAP + 16)
    sheet.paste(im, (x, y + CAP))
    d.text((x, y + 6), f't = {float(t):.2f} s  ·  f{round(float(t) * 30)}', fill=(230, 225, 250), font=font)
sheet.save(out, quality=86)
