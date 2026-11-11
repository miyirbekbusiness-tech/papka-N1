// node tools/sheet.js part1.html out.png "0,1,2.5,..." [cols]
// contact sheet: one tile per time, captioned with seconds and frame number
const { chromium } = require('playwright'); const { serve } = require('./serve');
(async () => {
  const [page, out, times, cols = '5', title = page] = process.argv.slice(2);
  const T = times.split(',').map(Number);
  const srv = await serve(); const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto(`${srv.url}/${page}?t=0`); await p.waitForFunction(() => window.__ready === true);
  const shots = [];
  for (const t of T) { await p.evaluate(t => window.renderAt(t), t); shots.push((await p.screenshot({ type: 'jpeg', quality: 85 })).toString('base64')); }
  const C = +cols, tw = 324, th = 576;
  const html = `<html><body style="margin:0;background:#0b0820;font:700 20px Inter,Arial;color:#fff"><div style="padding:14px 16px;font-size:26px">${title}</div>
  <div style="display:grid;grid-template-columns:repeat(${C},${tw}px);gap:12px;padding:0 16px 16px">${shots.map((s, i) => `<div><img src="data:image/jpeg;base64,${s}" style="width:${tw}px;height:${th}px;display:block"><div style="padding:4px 0">${T[i].toFixed(2)} s · f${Math.round(T[i] * 30)}</div></div>`).join('')}</div></body></html>`;
  const q = await b.newPage({ viewport: { width: 16 + C * (tw + 12) + 4, height: 400 } });
  await q.setContent(html); await q.screenshot({ path: out, fullPage: true });
  await b.close(); srv.close();
})();
