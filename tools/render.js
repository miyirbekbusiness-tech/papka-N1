// node tools/render.js 1 [from] [to]  -> parts/part1.mp4
// Captures frames 0-449 of partN.html (opened with ?t=) in headless Chrome at device scale 2
// (2160x3840), Lanczos-downsamples to 1080x1920, adds 1 % grain + TPDF dither, and pipes raw
// RGB frames to ffmpeg: H.264 High, 30 fps, CRF 14, yuv420p, bt709.
const { chromium } = require('playwright'); const { serve } = require('./serve');
const sharp = require('sharp'); const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
sharp.concurrency(1);
const W = 1080, H = 1920, N = 450;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
(async () => {
  const part = +process.argv[2], from = +(process.argv[3] || 0), to = +(process.argv[4] || N - 1);
  fs.mkdirSync('parts', { recursive: true });
  const out = `parts/part${part}.mp4`;
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', '30', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '14',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv', '-r', '30', '-g', '60', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const srv = await serve(); const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto(`${srv.url}/part${part}.html?t=0`); await p.waitForFunction(() => window.__ready === true);
  const cdp = await p.context().newCDPSession(p);
  const t0 = Date.now();
  for (let f = from; f <= to; f++) {
    await p.evaluate(t => window.renderAt(t), f / 30);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: 2 } });
    if (f === from) { const m = await sharp(Buffer.from(shot.data, 'base64')).metadata(); console.log(`capture ${m.width}x${m.height}`); if (m.width !== 2 * W) throw new Error('capture is not at device scale 2'); }
    const png = Buffer.from(shot.data, 'base64');
    const { data, info } = await sharp(png).removeAlpha().resize(W, H, { kernel: 'lanczos3' }).raw({ depth: 'float' }).toBuffer({ resolveWithObject: true });
    if (info.width !== W || info.height !== H) throw new Error('bad size ' + info.width + 'x' + info.height);
    const fl = new Float32Array(data.buffer, data.byteOffset, data.length / 4);
    const r = rng(part * 100003 + f * 7919), o = Buffer.allocUnsafe(W * H * 3);
    for (let i = 0, j = 0; i < W * H; i++, j += 3) {
      // 1 % monochrome grain (gaussian, sigma = 2.55) + TPDF dither before rounding to 8 bit
      const u1 = r() || 1e-9, u2 = r(); const gr = 2.55 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(6.283185307 * u2);
      for (let c = 0; c < 3; c++) { const v = fl[j + c] + gr + (r() - r()); o[j + c] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }
    }
    if (!ff.stdin.write(o)) await new Promise(res => ff.stdin.once('drain', res));
    if (f % 50 === 0) console.log(`part${part} f${f} ${((Date.now() - t0) / 1000 / (f - from + 1)).toFixed(2)} s/frame`);
  }
  ff.stdin.end(); await new Promise(res => ff.on('close', res));
  await b.close(); srv.close();
  console.log(`part${part} done in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${out}`);
})();
