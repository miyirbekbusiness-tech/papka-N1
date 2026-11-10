// node tools/contact.cjs <part> [frames,comma] — contact sheet of every beat -> out/contact_partN.png (+ single frames)
const { open, ROOT } = require('./lib.cjs');
const fs = require('fs'), path = require('path');
(async () => {
  const part = process.argv[2], only = process.argv[3];
  const o = await open({ w: 1080, h: 1920, scale: 0.5 });
  await o.goto('part' + part + '.html?t=0');
  const beats = only ? only.split(',').map(Number) : await o.page.evaluate('STAGE.beats');
  const dir = path.join(ROOT, 'out', 'frames_part' + part); fs.mkdirSync(dir, { recursive: true });
  const shots = [];
  for (const f of beats) {
    await o.page.evaluate(f => renderAt(f / 30), f);
    const buf = await o.page.screenshot({ type: 'png' });
    fs.writeFileSync(path.join(dir, 'f' + String(f).padStart(3, '0') + '.png'), buf);
    shots.push({ f, b64: buf.toString('base64') });
  }
  if (o.errs.length) console.log(o.errs.join('\n'));
  if (!only) {
    const cols = Math.min(6, Math.ceil(Math.sqrt(shots.length * 1.9)));
    const cw = 360, ch = 640;
    const html = '<html><body style="margin:0;background:#0B0718;font-family:Inter,Arial,sans-serif"><div style="padding:24px 24px 6px;color:#fff;font-weight:800;font-size:34px">PART ' + part +
      ' · contact sheet · ' + shots.length + ' beats</div><div style="display:grid;grid-template-columns:repeat(' + cols + ',' + cw + 'px);gap:14px;padding:18px 24px 24px">' +
      shots.map(s => '<div><img src="data:image/png;base64,' + s.b64 + '" style="width:' + cw + 'px;height:' + ch + 'px;display:block;border-radius:10px"><div style="color:#FFD27B;font-weight:700;font-size:20px;padding:6px 2px 4px">f' + s.f + ' <span style="color:#C9C6D6;font-weight:400">· ' + (s.f / 30).toFixed(2) + ' s</span></div></div>').join('') + '</div></body></html>';
    const pg = await o.page.context().browser().newPage({ viewport: { width: cols * (cw + 14) + 34, height: 800 }, deviceScaleFactor: 1 });
    await pg.setContent(html); await pg.waitForLoadState('networkidle');
    await pg.screenshot({ path: path.join(ROOT, 'out', 'contact_part' + part + '.png'), fullPage: true });
    console.log('contact sheet:', shots.length, 'frames, cols', cols);
  }
  await o.close();
})().catch(e => { console.error(e); process.exit(1); });
