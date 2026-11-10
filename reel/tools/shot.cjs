// node tools/shot.cjs <page.html[?t=..]> <out.png> [w h scale] — one screenshot (full page if h=0)
const { open } = require('./lib.cjs');
(async () => {
  const [rel, out, w, h, scale] = process.argv.slice(2);
  const full = +h === 0;
  const o = await open({ w: +w || 1080, h: full ? 1000 : (+h || 1920), scale: +scale || 1 });
  await o.goto(rel);
  await o.page.screenshot({ path: out, fullPage: full });
  if (o.errs.length) console.log(o.errs.join('\n'));
  console.log('fonts ok:', await o.page.evaluate('window.FONTS_OK'));
  await o.close();
})().catch(e => { console.error(e); process.exit(1); });
