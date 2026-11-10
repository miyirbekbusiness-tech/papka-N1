// node tools/check.cjs <part> — runs the CHECKS for one part over all 450 frames and prints a report (+ out/check_partN.json)
const { open, ROOT } = require('./lib.cjs');
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const hexLum = h => lum(parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16));
async function raw(buf) { const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
function flat(im) { let mn = [255, 255, 255], mx = [0, 0, 0]; for (let i = 0; i < im.data.length; i += 3) for (let c = 0; c < 3; c++) { const v = im.data[i + c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; } return { flat: mn.every((v, i) => v === mx[i]), color: hex(mn[0], mn[1], mn[2]), max: hex(mx[0], mx[1], mx[2]) }; }
const ranges = fr => { const out = []; let s = null, p = null; for (const f of fr) { if (s === null) { s = p = f; } else if (f === p + 1) p = f; else { out.push(s === p ? 'f' + s : 'f' + s + '-f' + p); s = p = f; } } if (s !== null) out.push(s === p ? 'f' + s : 'f' + s + '-f' + p); return out.join(', ') || 'none'; };

(async () => {
  const part = +process.argv[2];
  const o = await open({ w: 1080, h: 1920, scale: 1 });
  await o.goto('part' + part + '.html?t=0');
  const pg = o.page, R = { part, pass: true, items: [] };
  const item = (name, ok, detail) => { R.items.push({ name, ok, detail }); if (!ok) R.pass = false; console.log((ok ? '  PASS ' : '  FAIL ') + name + ' — ' + detail); };
  const meta = await pg.evaluate(() => ({
    subs: STAGE.subs.map(s => ({ id: s.id, text: s.text, words: s.words, t0: s.t0, t1: s.t1, box: s.box, color: s.color, size: s.size, lines: s.lines })),
    labels: STAGE.labels.map(l => ({ id: l.id, text: l.text, box: l.box, t0: l.t0, t1: l.t1 })),
    texts: STAGE.texts || [], expect: STAGE.expect || {}, groundY: STAGE.groundY, fontsOk: window.FONTS_OK,
    chars: STAGE.chars.map(c => c.name), dur: STAGE.duration
  }));
  console.log('PART ' + part + ' checks');

  /* 1. reading time: every S on screen at least 0.3 s per word + 0.5 s */
  for (const s of meta.subs.concat(meta.texts)) {
    const need = 0.3 * s.words + 0.5, on = Math.min(s.t1, meta.dur) - s.t0;
    item('time ' + s.id, on + 1e-6 >= need, s.words + ' words need ' + need.toFixed(2) + ' s, on screen ' + on.toFixed(3) + ' s (' + s.t0.toFixed(2) + '–' + Math.min(s.t1, meta.dur).toFixed(2) + ')');
  }
  /* 2. text in the safe area x 120-960, y 250-1500 */
  const inSafe = b => b.x >= 119.5 && b.x + b.w <= 960.5 && b.y >= 250 && b.y + b.h <= 1500;
  for (const s of meta.subs.concat(meta.texts)) item('safe ' + s.id, inSafe(s.box) && (s.lines ? s.lines.length <= (s.maxLines || 2) : true), 'x ' + s.box.x.toFixed(0) + '–' + (s.box.x + s.box.w).toFixed(0) + ', y ' + s.box.y.toFixed(0) + '–' + (s.box.y + s.box.h).toFixed(0) + (s.lines ? ', ' + s.lines.length + ' line(s) at ' + s.size + ' px' : ''));
  for (const l of meta.labels) item('safe ' + l.id, inSafe(l.box), 'pill x ' + l.box.x.toFixed(0) + '–' + (l.box.x + l.box.w).toFixed(0) + ', y ' + l.box.y.toFixed(0) + '–' + (l.box.y + l.box.h).toFixed(0));

  /* 3. per-frame scan */
  await pg.evaluate(() => {
    window.__info = function () {
      const st = STAGE, on = st.subs.filter(s => s.node.o > 0.001).map(s => s.id).concat((st.texts || []).filter(s => s.node.o > 0.001).map(s => s.id));
      let top = 1e9, topEl = '';
      const rects = [];
      document.querySelectorAll('[data-fg]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width < 0.5 || r.height < 0.5) return;
        if (r.right < 0 || r.left > 1080 || r.bottom < 0 || r.top > 1920) return;
        const nm = el.getAttribute('data-char') || el.getAttribute('class') || el.id || el.tagName;
        rects.push({ nm, l: r.left, t: r.top, r: r.right, b: r.bottom });
        if (r.top < top) { top = r.top; topEl = nm; }
      });
      const feet = st.chars.filter(c => c.root.o > 0.001 && !c.offGround).map(c => {
        const R = c.root, y = Math.max(c.geo.footL.y, c.geo.footR.y);
        return { n: c.name, y: R.y + R.k * R.sy * (y - c.pose.lift), g: c.groundY === undefined ? st.groundY : c.groundY };
      });
      const bulbs = st.bulbs ? st.bulbs.state.map(s => +s.lit.toFixed(3)) : null;
      const probe = st.probeChar && st.probeChar.root.o > 0.5 ? st.toScreen(st.probeChar.world(st.probeChar.geo.probe).x, st.probeChar.world(st.probeChar.geo.probe).y) : null;
      return { on, top, topEl, rects, feet, bulbs, probe };
    };
    window.__hideText = h => { ['subs', 'labels', 'texts'].forEach(id => { const e = document.getElementById(id); if (e) e.style.visibility = h ? 'hidden' : 'visible'; }); };
  });
  const allText = meta.subs.concat(meta.texts);
  const byId = Object.fromEntries(allText.map(s => [s.id, s]));
  const worst = {}, headBad = [], overlapBad = [], feetBad = [], firstSub = { f: null };
  let minTop = 1e9, minTopAt = '', bulbHist = [];
  for (let f = 0; f < 450; f++) {
    const info = await pg.evaluate(f => { renderAt(f / 30); return window.__info(); }, f);
    if (info.on.length && firstSub.f === null) firstSub.f = f;
    if (info.bulbs) bulbHist.push(info.bulbs);
    for (const ft of info.feet) if (Math.abs(ft.y - ft.g) > 1) feetBad.push({ f, n: ft.n, y: ft.y });
    if (info.on.length) {
      const limit = meta.expect.headroom || 460;
      const fg = info.rects.filter(r => r.nm !== 'label');
      const t = Math.min.apply(null, fg.map(r => r.t).concat([1e9]));
      if (t < minTop) { minTop = t; minTopAt = 'f' + f + ' ' + (fg.find(r => r.t === t) || {}).nm; }
      if (t < limit - 0.5) headBad.push(f);
      let ux0 = 1e9, uy0 = 1e9, ux1 = -1e9, uy1 = -1e9;
      for (const id of info.on) { const b = byId[id].box; ux0 = Math.min(ux0, b.x); uy0 = Math.min(uy0, b.y); ux1 = Math.max(ux1, b.x + b.w); uy1 = Math.max(uy1, b.y + b.h); }
      for (const r of info.rects) if (r.l < ux1 && r.r > ux0 && r.t < uy1 && r.b > uy0) overlapBad.push({ f, nm: r.nm });
      await pg.evaluate(() => window.__hideText(true));
      for (const id of info.on) {
        const b = byId[id].box;
        const im = await raw(await pg.screenshot({ clip: { x: Math.floor(b.x), y: Math.floor(b.y), width: Math.ceil(b.w), height: Math.ceil(b.h) } }));
        let mx = 0; for (let i = 0; i < im.data.length; i += 3) { const L = lum(im.data[i], im.data[i + 1], im.data[i + 2]); if (L > mx) mx = L; }
        const cr = (hexLum(byId[id].color) + 0.05) / (mx + 0.05);
        if (!worst[id] || cr < worst[id].cr) worst[id] = { cr, f };
      }
      await pg.evaluate(() => window.__hideText(false));
    }
  }
  for (const s of allText) if (worst[s.id]) item('contrast ' + s.id, worst[s.id].cr >= 4.5, 'worst ' + worst[s.id].cr.toFixed(2) + ':1 at f' + worst[s.id].f + ' (text ' + s.color + ' vs brightest pixel behind its box, every frame it is on)');
  item('headroom', headBad.length === 0, 'nothing else above y=' + (meta.expect.headroom || 460) + ' while a SUB is on: topmost foreground y=' + minTop.toFixed(1) + ' (' + minTopAt + ')' + (headBad.length ? '; violations ' + ranges(headBad) : ''));
  item('nothing overlaps SUB', overlapBad.length === 0, overlapBad.length ? [...new Set(overlapBad.map(b => b.nm))].join(',') + ' at ' + ranges([...new Set(overlapBad.map(b => b.f))]) : '0 foreground boxes intersect a SUB box on any frame');
  const offFrames = [...new Set(feetBad.map(b => b.f))];
  const allowed = meta.expect.airFrames || [];
  const unexpected = offFrames.filter(f => !allowed.some(a => f >= a[0] && f <= a[1]));
  item('feet on the ground line', unexpected.length === 0, 'ground y=' + meta.groundY + '; off the line only at ' + ranges(offFrames) + (allowed.length ? ' (expected: ' + allowed.map(a => a[2] + ' f' + a[0] + '-f' + a[1]).join('; ') + ')' : '') + (unexpected.length ? ' UNEXPECTED ' + ranges(unexpected) : ''));
  if (meta.expect.noSubBefore !== undefined) item('no SUB before f' + meta.expect.noSubBefore, firstSub.f === null || firstSub.f >= meta.expect.noSubBefore, 'first SUB frame f' + firstSub.f);

  /* bulbs: only go out at the listed times, never relight */
  if (bulbHist.length) {
    const outs = [], relit = [];
    for (let i = 0; i < 6; i++) {
      let wasOut = bulbHist[0][i] <= 0.001;
      for (let f = 1; f < bulbHist.length; f++) {
        const v = bulbHist[f][i], pv = bulbHist[f - 1][i];
        if (v <= 0.001 && pv > 0.001) outs.push({ b: i + 1, f });
        if (v > pv + 1e-6) relit.push({ b: i + 1, f });
      }
    }
    const exp = meta.expect.bulbOut || [];
    const okOut = outs.length === exp.length && exp.every(e => outs.some(u => u.b === e[0] && Math.abs(u.f - e[1]) <= (e[2] || 0)));
    item('bulbs go out only when scheduled', okOut, 'out events: ' + (outs.map(u => 'bulb ' + u.b + ' at f' + u.f + ' (' + (u.f / 30).toFixed(2) + ' s)').join(', ') || 'none') + '; start ' + JSON.stringify(bulbHist[0]) + ' end ' + JSON.stringify(bulbHist[bulbHist.length - 1]));
    item('no bulb relights', relit.length === 0, relit.length ? JSON.stringify(relit.slice(0, 5)) : 'lit level never rises on any bulb');
  }

  /* 4. hoodie probes 23C0B4 */
  const probes = meta.expect.probeFrames || [];
  const pr = [];
  for (const f of probes) {
    const p = await pg.evaluate(f => { renderAt(f / 30); return window.__info().probe; }, f);
    if (!p) { pr.push('f' + f + ' n/a'); continue; }
    const im = await raw(await pg.screenshot({ clip: { x: Math.round(p.x) - 2, y: Math.round(p.y) - 2, width: 5, height: 5 } }));
    const fl = flat(im); pr.push('f' + f + ' ' + fl.color + (fl.flat ? '' : '..' + fl.max));
  }
  if (probes.length) item('hoodie probes 23C0B4', pr.every(s => / #23C0B4$/.test(s)), pr.join(', '));

  /* 5. flat first / last frames */
  for (const [f, want] of [[0, meta.expect.first], [449, meta.expect.last]]) {
    if (!want) continue;
    await pg.evaluate(f => renderAt(f / 30), f);
    const fl = flat(await raw(await pg.screenshot()));
    item('f' + f + ' is full ' + want.name, fl.flat && fl.color === want.hex, 'all 1080x1920 pixels = ' + fl.color + (fl.flat ? '' : ' .. ' + fl.max) + ' (want ' + want.hex + ')');
  }

  /* 6. the ʻ glyph renders (U+02BB is in the loaded Inter, not a fallback) */
  const gl = await pg.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 200; c.height = 120; const x = c.getContext('2d');
    const draw = (font, ch) => { x.clearRect(0, 0, 200, 120); x.font = font; x.fillStyle = '#000'; x.fillText(ch, 20, 90); return Array.from(x.getImageData(0, 0, 200, 120).data).filter((v, i) => i % 4 === 3 && v > 0).length; };
    const a = draw("800 96px Inter", 'ʻ'), tofu = draw("800 96px Inter", '￿'), fb = draw("800 96px monospace", 'ʻ');
    const w = f => { x.font = f; return x.measureText('ʻ').width; };
    return { ink: a, tofu, fb, wInter: w("800 96px Inter"), wMono: w("800 96px monospace"), check: document.fonts.check("800 56px Inter", 'ʻ'), used: STAGE.subs.concat(STAGE.texts || []).filter(s => s.text.indexOf('ʻ') >= 0).map(s => s.id) };
  });
  item('ʻ glyph renders', meta.fontsOk && gl.check && gl.ink > 50 && gl.ink !== gl.tofu, 'Inter U+02BB ink ' + gl.ink + ' px (missing-glyph box ' + gl.tofu + ' px), advance ' + gl.wInter.toFixed(1) + ' vs monospace ' + gl.wMono.toFixed(1) + '; used in ' + (gl.used.join(', ') || 'none'));

  /* 7. determinism: a frozen ?t= page equals the same frame reached by seeking */
  const det = [];
  for (const f of meta.expect.detFrames || [100, 200, 333]) {
    await pg.evaluate(f => { renderAt(14.9); renderAt(f / 30); }, f);
    const a = await raw(await pg.screenshot());
    const o2 = await open({ w: 1080, h: 1920, scale: 1 });
    await o2.goto('part' + part + '.html?t=' + (f / 30));
    const b = await raw(await o2.page.screenshot()); await o2.close();
    det.push('f' + f + (Buffer.compare(a.data, b.data) === 0 ? ' identical' : ' DIFFERENT'));
  }
  item('renderAt is deterministic (?t= vs seek)', det.every(s => /identical/.test(s)), det.join(', '));

  /* 8. exact text */
  if (meta.expect.text) {
    const got = Object.fromEntries(meta.subs.concat(meta.texts).map(s => [s.id, s.text]).concat(meta.labels.map(l => [l.id, l.text])));
    const bad = Object.entries(meta.expect.text).filter(([k, v]) => got[k] !== v).map(([k]) => k);
    item('text matches TEXT exactly', bad.length === 0, bad.length ? 'mismatch: ' + bad.join(',') : Object.keys(meta.expect.text).length + ' strings identical');
  }
  if (o.errs.length) { console.log('PAGE ERRORS:\n' + o.errs.join('\n')); R.pass = false; }
  console.log(R.pass ? 'PART ' + part + ': ALL CHECKS PASS' : 'PART ' + part + ': SOME CHECKS FAILED');
  fs.writeFileSync(path.join(ROOT, 'out', 'check_part' + part + '.json'), JSON.stringify(R, null, 1));
  await o.close();
})().catch(e => { console.error(e); process.exit(1); });
