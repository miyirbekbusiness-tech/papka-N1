// Meadow Light — offline renderer.
//   node render.cjs info
//   node render.cjs stills  <outDir> <t1,t2,...> [samples]
//   node render.cjs video   <out.mp4> [samples] [startFrame] [endFrame]
//   node render.cjs audio   <out.wav>
// three@0.160.0 is served from a local npm copy (set THREE_JS) when the CDN is unreachable.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const THREE_JS = process.env.THREE_JS;
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p)) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : 'application/javascript' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

async function open(query) {
  const srv = await serve();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 2000)); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  if (THREE_JS) await page.route(CDN, r => r.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(THREE_JS) }));
  await page.goto(`http://127.0.0.1:${srv.address().port}/meadow.html?render=1&${query || ''}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return { srv, browser, page, close: async () => { await browser.close(); srv.close(); } };
}

async function main() {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === 'info') {
    const s = await open();
    console.log(JSON.stringify(await s.page.evaluate(() => window.__info()), null, 1));
    await s.close();
  } else if (cmd === 'stills') {
    const out = a[0]; const times = a[1].split(',').map(Number); const samples = +(a[2] || 1);
    fs.mkdirSync(out, { recursive: true });
    const s = await open();
    for (const t of times) {
      const t0 = Date.now();
      if (samples > 1) await s.page.evaluate(([f, n]) => window.renderFrameMB(f, n), [Math.round(t * 60), samples]);
      else await s.page.evaluate(t => window.renderAt(t), t);
      const b64 = await s.page.evaluate(() => window.readFrameB64());
      const raw = Buffer.from(b64, 'base64');
      const file = path.join(out, `f${String(Math.round(t * 60)).padStart(3, "0")}.png`);
      await new Promise((res, rej) => {
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1920x1080', '-i', '-', '-vf', 'vflip', file]);
        ff.on('exit', c => c ? rej(new Error('ffmpeg ' + c)) : res()); ff.stdin.end(raw);
      });
      console.log(file, `${Date.now() - t0} ms`);
    }
    await s.close();
  } else if (cmd === 'video') {
    const out = a[0]; const samples = +(a[1] || 12); const f0 = +(a[2] || 0); const f1 = +(a[3] || 600);
    const s = await open();
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1920x1080', '-r', '60', '-i', '-',
      '-vf', 'vflip', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-tune', 'film', '-movflags', '+faststart', out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const tStart = Date.now();
    for (let f = f0; f < f1; f++) {
      await s.page.evaluate(([f, n]) => window.renderFrameMB(f, n), [f, samples]);
      const raw = Buffer.from(await s.page.evaluate(() => window.readFrameB64()), 'base64');
      if (!ff.stdin.write(raw)) await new Promise(r => ff.stdin.once('drain', r));
      const done = f - f0 + 1, el = (Date.now() - tStart) / 1000;
      if (done % 10 === 0 || f === f1 - 1) console.log(`frame ${f + 1}/${f1}  ${(el / done).toFixed(1)} s/frame  eta ${((f1 - f - 1) * el / done / 60).toFixed(1)} min`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('exit', r));
    await s.close();
  } else if (cmd === 'audio') {
    const out = a[0];
    const s = await open();
    const b64 = await s.page.evaluate(() => window.renderSoundtrackB64());
    const f32 = Buffer.from(b64, 'base64');
    // 32-bit float WAV
    const hdr = Buffer.alloc(44);
    hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + f32.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
    hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(3, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(48000, 24);
    hdr.writeUInt32LE(48000 * 8, 28); hdr.writeUInt16LE(8, 32); hdr.writeUInt16LE(32, 34); hdr.write('data', 36); hdr.writeUInt32LE(f32.length, 40);
    fs.writeFileSync(out, Buffer.concat([hdr, f32]));
    console.log('wrote', out);
    await s.close();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
