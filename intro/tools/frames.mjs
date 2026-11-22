// node tools/frames.mjs --res 3840x2160 --out DIR --frames 0-575 [--workers 3] [--mask]
import fs from 'node:fs';
import path from 'node:path';
import { serve, openPage, shot } from './harness.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const res = arg('res', '1920x1080'), out = arg('out', 'frames'), workers = +arg('workers', 1);
const mask = process.argv.includes('--mask');
const list = arg('frames', '0-575').split(',').flatMap((r) => { const [a, b] = r.split('-').map(Number); return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });
fs.mkdirSync(out, { recursive: true });
const todo = list.filter((f) => !fs.existsSync(path.join(out, `${mask ? 'mask_' : ''}f${String(f).padStart(4, '0')}.png`)));
const { srv, port } = await serve();
let next = 0; const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(workers, todo.length) }, async () => {
  const { browser, page, w, h } = await openPage(port, { res });
  while (next < todo.length) {
    const f = todo[next++];
    await page.evaluate(([f, mask]) => mask ? window.diag.renderMask(f / 60) : window.renderAt(f / 60), [f, mask]);
    await shot(page, w, h, path.join(out, `${mask ? 'mask_' : ''}f${String(f).padStart(4, '0')}.png`));
    if (f % 24 === 0) console.log(`f${f}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}));
srv.close();
console.log(`rendered ${todo.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
