#!/usr/bin/env node
/* shared/render.js — headless Chromium driver.
   node render.js meta   N              → stageN/meta_N.json (shots, sfx cues, music, words, phrases)
   node render.js sheet  N              → stageN/sheet/*.png half-size tiles (3 per shot)
   node render.js check  N              → stageN/check_N.json (+ nosub frames for contrast)
   node render.js frames N [workers]    → stageN/frames/f0000.png … at 2x (2160x3840)
   node render.js stills N t1 t2 …      → stageN/stills/t_<t>.png at 1x
   GSAP is requested from cdnjs exactly as the HTML says; this sandbox blocks cdnjs, so the
   identical 3.12.5 build (from npm) is served for that URL. */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const GSAP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
const GSAP_LOCAL = path.join(__dirname, 'vendor', 'gsap.min.js');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

async function openPage(browser, base, n, dpr, query = 'static=1') {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await page.route(GSAP_URL, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(GSAP_LOCAL) }));
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(`${base}/stage${n}/part${n}.html?${query}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  return page;
}
const frameEl = page => page.locator('#frame');

async function main() {
  const [cmd, nStr, ...rest] = process.argv.slice(2);
  const n = +nStr, dir = path.join(ROOT, `stage${n}`);
  const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  try {
    if (cmd === 'meta') {
      const page = await openPage(browser, base, n, 1);
      const meta = await page.evaluate(() => window.__meta);
      fs.writeFileSync(path.join(dir, `meta_${n}.json`), JSON.stringify(meta, null, 1));
      console.log(meta.shots.map(s => `${s.name}: f${s.f0}-${s.f1} ${s.dur.toFixed(3)}s ${s.cut}`).join('\n'));
      console.log('phrases:\n' + meta.phrases.map(p => `  ${p.f0}-${p.fClear} ${p.text}`).join('\n'));
      console.log(`${meta.sfx.length} sfx cues`);
    } else if (cmd === 'sheet' || cmd === 'stills') {
      const page = await openPage(browser, base, n, cmd === 'sheet' ? 0.5 : 1);
      const meta = await page.evaluate(() => window.__meta);
      const out = path.join(dir, cmd === 'sheet' ? 'sheet' : 'stills'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
      let times = rest.map(Number);
      const labels = [];
      if (cmd === 'sheet') {
        times = [];
        meta.shots.forEach((s, i) => { const a = s.f0, b = s.f1 - 1; [a, Math.round((a + b) / 2), b].forEach((f, k) => { times.push(f / 30); labels.push(`${i + 1}${'abc'[k]}`); }); });
      }
      for (let i = 0; i < times.length; i++) {
        await page.evaluate(t => window.renderAt(t), times[i]);
        const name = cmd === 'sheet' ? `${String(i).padStart(2, '0')}_${labels[i]}_f${Math.round(times[i] * 30)}.png` : `t_${times[i].toFixed(3)}.png`;
        await frameEl(page).screenshot({ path: path.join(out, name) });
      }
      console.log(`${times.length} images → ${out}`);
    } else if (cmd === 'check') {
      const page = await openPage(browser, base, n, 1);
      const res = await page.evaluate(() => {
        const M = window.__meta, out = { subs: [], cuts: [], safe: [], labels: [] };
        const spans = [...document.querySelectorAll('.subs span')];
        // 1. every word visible on its own start frame, invisible the frame before
        M.words.forEach((w, i) => {
          const s = spans[i];
          window.renderAt(w.frame / 30); const on = +s.style.opacity;
          let before = 0; if (w.frame > 0) { window.renderAt((w.frame - 1) / 30); before = +s.style.opacity; }
          if (!(on > 0.5 && before < 0.01) || s.textContent !== w.word) out.subs.push({ word: w.word, frame: w.frame, on, before, text: s.textContent });
        });
        // 2. cuts on cue frames, shot lengths
        M.shots.forEach((s, i) => {
          const cueF = s.cue ? M.words.find(w => w.word.replace(/[.,?!:;«»]/g, '') === s.cue || w.word === s.cue)?.frame : 0;
          out.cuts.push({ shot: s.name, f0: s.f0, cueFrame: i === 0 ? 0 : cueF, onCue: i === 0 ? s.f0 === 0 : cueF === s.f0, dur: +s.dur.toFixed(3), lenOK: s.dur >= 3.5 - 1e-6 && s.dur <= 5.0 + 1e-6 });
        });
        // 3. text, labels and faces inside x 120–960, y 250–1500 (sampled every 3 frames)
        const vis = e => { let n = e; while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; n = n.parentNode; } return true; };
        const bad = {};
        for (let f = 0; f < M.frames; f += 3) {
          window.renderAt(f / 30);
          document.querySelectorAll('[data-check]').forEach(e => {
            const kind = e.dataset.check; if (kind === 'hero') return;
            if (!vis(e)) return;
            const r = e.getBoundingClientRect(); if (r.width < 2) return;
            const ok = r.left >= 119.5 && r.right <= 960.5 && r.top >= 249.5 && r.bottom <= 1500.5;
            if (!ok) { const key = kind + ':' + (e.textContent || '').slice(0, 20); (bad[key] = bad[key] || []).push([f, Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]); }
          });
        }
        out.safe = Object.entries(bad).map(([k, v]) => ({ el: k, frames: v.length, first: v[0], last: v[v.length - 1] }));
        // subtitle boxes per phrase (for pixel contrast)
        out.phraseBoxes = [];
        M.phrases.forEach(p => [p.f0 + 3, Math.round((p.f0 + p.fClear) / 2), p.fClear - 1].forEach(f => {
          const t = f / 30; window.renderAt(t);
          let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
          spans.forEach(s => { if (+s.style.opacity > 0.05) { const r = s.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); } });
          out.phraseBoxes.push({ text: p.text, t, f, box: [x0, y0, x1, y1].map(Math.round), fEnd: p.fClear });
        }));
        // sweater swatch location for colour check (lit side) at mid-shot frames where the hero is shown
        out.swatch = [];
        M.shots.forEach(s => {
          const f = Math.round((s.f0 + s.f1) / 2); window.renderAt(f / 30);
          document.querySelectorAll('[data-swatch=sweater]').forEach(e => { if (!vis(e)) return; const r = e.getBoundingClientRect(); if (r.width > 20) out.swatch.push({ shot: s.name, f, x: Math.round(r.left + r.width * 0.15), y: Math.round(r.top + r.height * 0.80) }); });
        });
        return out;
      });
      // render phrase frames with subtitles hidden for the pixel contrast check
      const cdir = path.join(dir, 'check'); fs.rmSync(cdir, { recursive: true, force: true }); fs.mkdirSync(cdir);
      for (let i = 0; i < res.phraseBoxes.length; i++) {
        await page.evaluate(t => { window.renderAt(t); document.querySelector('.subs').style.display = 'none'; }, res.phraseBoxes[i].t);
        await frameEl(page).screenshot({ path: path.join(cdir, `phrase_${i}.png`) });
        await page.evaluate(() => { document.querySelector('.subs').style.display = ''; });
      }
      fs.writeFileSync(path.join(dir, `check_${n}.json`), JSON.stringify(res, null, 1));
      console.log(JSON.stringify({ subsBad: res.subs, cuts: res.cuts, safeBad: res.safe }, null, 1));
    } else if (cmd === 'frames') {
      const workers = +(rest[0] || 4);
      const out = path.join(dir, 'frames'); fs.mkdirSync(out, { recursive: true });
      const probe = await openPage(browser, base, n, 1);
      const total = await probe.evaluate(() => window.__meta.frames); await probe.context().close();
      const todo = []; for (let f = 0; f < total; f++) if (!fs.existsSync(path.join(out, `f${String(f).padStart(4, '0')}.png`))) todo.push(f);
      const chunk = Math.ceil(todo.length / workers); const t0 = Date.now(); let done = 0;
      await Promise.all([...Array(workers)].map(async (_, k) => {
        const list = todo.slice(k * chunk, (k + 1) * chunk); if (!list.length) return;
        const page = await openPage(browser, base, n, 2);
        for (const f of list) {
          await page.evaluate(t => window.renderAt(t), f / 30);
          await frameEl(page).screenshot({ path: path.join(out, `f${String(f).padStart(4, '0')}.png`) });
          if (++done % 50 === 0) console.log(`${done}/${todo.length} frames, ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
        }
        await page.context().close();
      }));
      console.log(`rendered ${todo.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    }
  } finally { await browser.close(); srv.close(); }
}
main().catch(e => { console.error(e); process.exit(1); });
