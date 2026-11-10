// Shared helpers: static file server + headless Chromium page for the reel.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.wav': 'audio/wav', '.json': 'application/json', '.css': 'text/css' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); rsp.end('nf'); return; }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, base: 'http://127.0.0.1:' + srv.address().port }));
  });
}
async function open(opts) {
  opts = opts || {};
  const { srv, base } = await serve();
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  const ctx = await browser.newContext({ viewport: { width: opts.w || 1080, height: opts.h || 1920 }, deviceScaleFactor: opts.scale || 1 });
  const page = await ctx.newPage();
  // cdnjs is blocked in this sandbox: answer it from the npm copy of GSAP 3.12.5 (same bytes)
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ path: path.join(ROOT, 'vendor/gsap.min.js'), contentType: 'text/javascript' }));
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const goto = async (rel) => { await page.goto(base + '/' + rel); await page.waitForFunction('window.READY === true', null, { timeout: 30000 }); };
  const close = async () => { await browser.close(); srv.close(); };
  return { page, base, goto, close, errs, ROOT };
}
module.exports = { open, serve, ROOT };
