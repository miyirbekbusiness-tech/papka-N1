// collect the picture events of all four timelines (global seconds) -> sound/events.json
const { chromium } = require('playwright'); const { serve } = require('./serve'); const fs = require('fs');
(async () => {
  const srv = await serve(); const b = await chromium.launch(); const out = [];
  for (let i = 1; i <= 4; i++) {
    const p = await b.newPage(); await p.goto(`${srv.url}/part${i}.html?t=0`); await p.waitForFunction(() => window.__ready);
    const m = await p.evaluate(() => JSON.parse(JSON.stringify(window.__meta)));
    m.events.forEach(e => out.push({ ...e, part: i, g: +(e.t + (i - 1) * 15).toFixed(4) }));
    m.subs.forEach(s => out.push({ name: 'sub', id: s.id, part: i, t: s.t0, g: +(s.t0 + (i - 1) * 15).toFixed(4) }));
    await p.close();
  }
  out.sort((a, b) => a.g - b.g);
  fs.mkdirSync('sound', { recursive: true }); fs.writeFileSync('sound/events.json', JSON.stringify(out, null, 1));
  console.log(out.map(e => `${e.g.toFixed(3)} p${e.part} ${e.name}${e.id ? ' ' + e.id : ''}${e.i != null ? ' i' + e.i : ''}${e.who ? ' ' + e.who : ''}`).join('\n'));
  await b.close(); srv.close();
})();
