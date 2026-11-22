// Shared Playwright harness: serves intro/ over http, routes the jsDelivr importmap to a local
// three@0.160.0 copy when THREE_VENDOR is set (identical files, no network at render time).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json' };

export function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res({ srv, port: srv.address().port }));
  });
}

export async function openPage(port, { res = '1920x1080', query = '' } = {}) {
  const [w, h] = res.split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const vendor = process.env.THREE_VENDOR;
  if (vendor) await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', (route) => {
    const rel = route.request().url().split('three@0.160.0/')[1];
    route.fulfill({ path: path.join(vendor, rel), contentType: 'text/javascript' });
  });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html?res=${res}&t=0${query}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 300000 });
  return { browser, page, w, h };
}

export async function shot(page, w, h, file) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } });
}
