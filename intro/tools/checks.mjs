// node tools/checks.mjs OUTDIR  — geometry checks for every frame + renders for image checks
import fs from 'node:fs';
import path from 'node:path';
import { serve, openPage, shot } from './harness.mjs';
const out = process.argv[2] || 'checks'; fs.mkdirSync(out, { recursive: true });
const { srv, port } = await serve();
const { browser, page, w, h } = await openPage(port, { res: '1920x1080' });
const r = {};
// 1. letters never intersect each other or Earth — every frame logged
const log = []; let bad = 0, minClear = Infinity;
for (let f = 0; f < 576; f++) {
  const c = await page.evaluate((f) => window.diag.checkFrame(f / 60), f);
  if (c.pairs.length || c.earthHits.length) bad++;
  if (isFinite(c.minClear)) minClear = Math.min(minClear, c.minClear);
  log.push(`f${String(f).padStart(3, '0')} letters=${c.s.filter((s) => s > 1e-4).length} pairs=${JSON.stringify(c.pairs)} earth=${JSON.stringify(c.earthHits)} minEarthClear=${isFinite(c.minClear) ? c.minClear.toFixed(3) : '-'}`);
}
fs.writeFileSync(path.join(out, 'intersections.log'), log.join('\n') + '\n');
r.intersections = { framesWithIntersections: bad, minEarthClearance: minClear };
// 2. arcs arrive exactly at f252
r.arcs = [];
for (const f of [250, 251, 252, 253]) r.arcs.push(await page.evaluate((f) => window.diag.arcCheck(f), f));
// 3. text identity + framing
r.text = { built: await page.evaluate(() => window.diag.text()), spec: await page.evaluate(() => window.diag.textSpec) };
r.framing = {};
for (const f of [324, 360, 432, 450, 468, 575]) r.framing[f] = await page.evaluate((f) => window.diag.projectedText(f / 60), f);
r.horizonY = { 324: await page.evaluate(() => window.diag.horizonY(5.4)), 575: await page.evaluate(() => window.diag.horizonY(575 / 60)) };
r.sun = { 360: await page.evaluate(() => window.diag.sunScreen(6.0)), 575: await page.evaluate(() => window.diag.sunScreen(575 / 60)) };
r.timeline = await page.evaluate(() => window.TIMELINE);
fs.writeFileSync(path.join(out, 'geometry.json'), JSON.stringify(r, null, 1));
fs.writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(r.timeline, null, 1));
if (process.argv.includes('--geo-only')) { await browser.close(); srv.close(); console.log(JSON.stringify(r.intersections), log.filter((l) => !l.includes('pairs=[] earth=[]')).join(' | ')); process.exit(0); }
// 4. renders: contact frames + contrast frames (every 3rd from f324) with matching masks
const contact = [0, 72, 144, 252, 324, 360, 432, 468, 575];
const contrast = []; for (let f = 324; f < 576; f += 3) contrast.push(f); contrast.push(575);
const all = [...new Set([...contact, ...contrast])].sort((a, b) => a - b);
fs.mkdirSync(path.join(out, 'img'), { recursive: true });
for (const f of all) {
  await page.evaluate((f) => window.renderAt(f / 60), f);
  await shot(page, w, h, path.join(out, 'img', `f${String(f).padStart(4, '0')}.png`));
  if (f >= 324) { await page.evaluate((f) => window.diag.renderMask(f / 60), f); await shot(page, w, h, path.join(out, 'img', `mask_f${String(f).padStart(4, '0')}.png`)); }
}
await browser.close(); srv.close();
console.log(JSON.stringify({ intersections: r.intersections, arcs: r.arcs.map((a) => [a.f, a.p, Math.max(...a.dist)]), text: r.text, w324: r.framing[324].widthFrac, horizon: r.horizonY, sun: r.sun, locks: r.timeline.letterLocks }, null, 0));
