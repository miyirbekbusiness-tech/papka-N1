// node tools/shot.js page.html out.png [t] [scale] [selector]
const { chromium } = require('playwright');
const path = require('path');
const { serve } = require('./serve');
(async () => {
  const [page, out, t = '0', scale = '1', sel] = process.argv.slice(2);
  const srv = await serve();
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: +scale });
  p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') console.log('console:', m.text()); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(`${srv.url}/${page}?t=${t}`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
  if (sel) await (await p.$(sel)).screenshot({ path: out }); else await p.screenshot({ path: out });
  await b.close(); srv.close();
})();
