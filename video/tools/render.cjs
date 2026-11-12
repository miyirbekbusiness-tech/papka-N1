// Render video/aql-va-ong.html to MP4 (1080x1920, 30 fps, 2700 frames).
// usage: node video/tools/render.cjs <out.mp4> [workers=4] [fromFrame] [toFrame]
// env: GSAP_LOCAL=/path/to/gsap.min.js serves GSAP locally when cdnjs is unreachable.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { spawn, execFileSync } = require('child_process');
const HTML = path.resolve(__dirname, '..', 'aql-va-ong.html');
const out = path.resolve(process.argv[2] || 'aql-va-ong.mp4');
const workers = +(process.argv[3] || 4), F0 = +(process.argv[4] || 0), F1 = +(process.argv[5] || 2700);
const tmp = out + '.parts'; fs.mkdirSync(tmp, { recursive: true });

async function renderRange(browser, a, b, file) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
  if (process.env.GSAP_LOCAL) await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ path: process.env.GSAP_LOCAL, contentType: 'application/javascript' }));
  await page.goto('file://' + HTML + '?t=0');
  await page.evaluate(() => window.__ready);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) {
    await page.evaluate(f => renderFrame(f), f);
    const png = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - a) % 150 === 0) console.log(`frames ${a}-${b}: at ${f}`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  await page.close();
}

(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
  const n = F1 - F0, step = Math.ceil(n / workers), parts = [];
  for (let i = 0; i < workers; i++) {
    const a = F0 + i * step, b = Math.min(F1, a + step);
    if (a < b) parts.push([a, b, path.join(tmp, `part${i}.mp4`)]);
  }
  await Promise.all(parts.map(([a, b, f]) => renderRange(browser, a, b, f)));
  await browser.close();
  fs.writeFileSync(path.join(tmp, 'list.txt'), parts.map(p => `file '${p[2]}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', out]);
  fs.rmSync(tmp, { recursive: true });
  console.log('done', out);
})();
