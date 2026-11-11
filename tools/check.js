// node tools/check.js part1.html '{"first":null,"last":"#FFD27B","hoodie":true,"feet":[...]}'
// Runs the CHECKS for one part and prints a report (also saved to checks/<part>.txt).
const { chromium } = require('playwright'); const { serve } = require('./serve');
const sharp = require('sharp'); const fs = require('fs'); const path = require('path');
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
const hex = h => [0, 2, 4].map(i => parseInt(h.replace('#', '').substr(i, 2), 16));
(async () => {
  const [page, cfgS = '{}'] = process.argv.slice(2);
  const cfg = JSON.parse(cfgS);
  const out = []; let fails = 0;
  const log = (ok, msg) => { out.push(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails++; };
  const srv = await serve(); const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => out.push('pageerror ' + e.message));
  await p.goto(`${srv.url}/${page}?t=0`); await p.waitForFunction(() => window.__ready === true);
  const meta = await p.evaluate(() => JSON.parse(JSON.stringify(window.__meta)));
  const grab = async (t, clip) => { await p.evaluate(t => window.renderAt(t), t); const buf = await p.screenshot({ clip: clip || { x: 0, y: 0, width: 1080, height: 1920 } }); return sharp(buf).raw().toBuffer({ resolveWithObject: true }); };

  // 1. timing: >= 0.3 s per word + 0.5 s, and order
  for (const s of meta.subs) {
    const need = 0.3 * s.words + 0.5, have = s.t1 - s.t0;
    log(have + 1e-6 >= need, `${s.id} on screen ${have.toFixed(2)} s (needs ${need.toFixed(2)} s for ${s.words} words), ${s.lines} line(s) at ${s.size}px`);
  }
  if (cfg.noSubBefore != null) { const first = Math.min(...meta.subs.map(s => s.t0)); log(first >= cfg.noSubBefore - 1e-6, `no SUB before ${cfg.noSubBefore}s (first at ${first}s)`); }
  // 2. glyph ʻ renders with Inter (not a fallback)
  const g = await p.evaluate(() => {
    const c = document.createElement('canvas').getContext('2d');
    const w = f => { c.font = f; return c.measureText('boʻlsa ʻʻʻ').width; };
    const inter = w('800 56px Inter'), fb1 = w('800 56px serif'), fb2 = w('800 56px monospace');
    const texts = [...document.querySelectorAll('#ui text')].map(t => t.textContent).join(' ');
    return { loaded: document.fonts.check('800 56px Inter', 'ʻ'), inter, fb1, fb2, has: texts.includes('ʻ'), fam: [...document.querySelectorAll('#ui text')].every(t => getComputedStyle(t).fontFamily.includes('Inter')) };
  });
  log(g.loaded && g.fam && Math.abs(g.inter - g.fb1) > 1 && Math.abs(g.inter - g.fb2) > 1, `ʻ glyph: Inter loaded=${g.loaded}, text uses Inter=${g.fam}, width Inter ${g.inter.toFixed(1)} vs serif ${g.fb1.toFixed(1)} / mono ${g.fb2.toFixed(1)}${g.has ? '' : ' (no ʻ in this part)'}`);
  // 3. safe area for all text boxes (SUB + LABEL), measured live at mid-time
  const boxes = await p.evaluate(() => {
    const r = [];
    for (const s of window.__meta.subs) { window.renderAt((s.t0 + s.t1) / 2); const bb = document.getElementById('sub_' + s.id).getBoundingClientRect(); r.push({ id: s.id, x0: bb.left, y0: bb.top, x1: bb.right, y1: bb.bottom }); }
    for (const l of window.__meta.labels) { window.renderAt(Math.min(l.t1 - 0.05, l.t0 + 1)); const n = document.getElementById('label_' + l.id); const bb = n.lastElementChild.getBoundingClientRect(); r.push({ id: l.id, x0: bb.left, y0: bb.top, x1: bb.right, y1: bb.bottom }); }
    return r;
  });
  // SUBs: measure the actual ink (text alone on a magenta backdrop)
  for (const bx of boxes) {
    const sub = meta.subs.find(s => s.id === bx.id);
    if (sub) {
      await p.evaluate(() => { ['bg', 'cam', 'fx'].forEach(id => document.getElementById(id).style.display = 'none'); document.querySelectorAll('.label').forEach(n => n.style.display = 'none'); document.body.style.background = '#FF00FF'; });
      const { data, info } = await grab((sub.t0 + sub.t1) / 2);
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; if (!(data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 255)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      await p.evaluate(() => { ['bg', 'cam', 'fx'].forEach(id => document.getElementById(id).style.display = ''); document.querySelectorAll('.label').forEach(n => n.style.display = ''); document.body.style.background = ''; });
      Object.assign(bx, { x0, x1: x1 + 1, y0, y1: y1 + 1 });
    }
    log(bx.x0 >= 119.5 && bx.x1 <= 960.5 && bx.y0 >= 249.5 && bx.y1 <= 1500.5, `${bx.id} inside safe area (ink): x ${bx.x0.toFixed(0)}–${bx.x1.toFixed(0)}, y ${bx.y0.toFixed(0)}–${bx.y1.toFixed(0)}`);
  }
  // 4. per-frame: contrast behind SUB and nothing else above y=460 while a SUB is on
  const step = cfg.step || 2; let worst = 99, worstAt = null, dirty = 0, dirtyAt = [];
  const subColor = Object.fromEntries((await p.evaluate(() => [...document.querySelectorAll('.sub text')].map(t => [t.parentNode.id.slice(4), t.getAttribute('fill')]))));
  for (let f = 0; f < 450; f += step) {
    const t = f / 30;
    const on = meta.subs.filter(s => t >= s.t0 && t < s.t1);
    if (!on.length) continue;
    // contrast: hide text, sample background under every SUB box
    await p.evaluate(() => { document.getElementById('ui').style.display = 'none'; });
    for (const s of on) {
      const [x, y, w, h] = s.box;
      const { data, info } = await grab(t, { x, y, width: w, height: h });
      const col = hex(subColor[s.id] || '#FFFFFF');
      for (let i = 0; i < data.length; i += info.channels * 7) { const c = contrast(col, [data[i], data[i + 1], data[i + 2]]); if (c < worst) { worst = c; worstAt = `${s.id} f${f}`; } }
    }
    // clear zone: hide sky, magenta backdrop, look above y=460 (labels stay visible)
    await p.evaluate(() => { const u = document.getElementById('ui'); u.style.display = ''; u.querySelectorAll('.sub').forEach(n => n.style.display = 'none'); document.querySelectorAll('.backdrop').forEach(n => n.style.display = 'none'); document.getElementById('bg').style.display = 'none'; document.body.style.background = '#FF00FF'; });
    const { data } = await grab(t, { x: 0, y: 0, width: 1080, height: 460 });
    let n = 0; for (let i = 0; i < data.length; i += 3) if (!(data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 255)) n++;
    if (n) { dirty++; dirtyAt.push(`f${f}:${n}px`); }
    await p.evaluate(() => { document.getElementById('ui').querySelectorAll('.sub').forEach(n => n.style.display = ''); document.querySelectorAll('.backdrop').forEach(n => n.style.display = ''); document.getElementById('bg').style.display = ''; document.body.style.background = ''; });
  }
  log(worst >= 4.5, `SUB contrast worst ${worst.toFixed(2)}:1 (${worstAt}), sampled every ${step} frames`);
  log(dirty === 0, `nothing but sky above y=460 while a SUB is on${dirty ? ': ' + dirtyAt.slice(0, 8).join(' ') : ''}`);
  // 5. feet on the ground line
  if (cfg.feet) for (const [t, who, gy] of cfg.feet) {
    const r = await p.evaluate(([t, who]) => {
      window.renderAt(t); const ctx = window.__ctx; const rig = ctx.rigs.find(r => r.name === who);
      let maxY = -1e9; const inv = ctx.world.getCTM().inverse();
      rig.legs.forEach(l => { const m = inv.multiply(l.end.getCTM()); const bb = l.end.getBBox(); [[bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].forEach(([x, y]) => { maxY = Math.max(maxY, m.b * x + m.d * y + m.f); }); });
      return { maxY, y: rig.p.y };
    }, [t, who]);
    log(Math.abs(r.maxY - gy) <= 2, `${who} feet at t=${t}s: sole y=${r.maxY.toFixed(1)} vs ground ${gy}`);
  }
  // 6. hoodie probe
  if (cfg.hoodie) for (const t of cfg.hoodie) {
    const pt = await p.evaluate(t => { window.renderAt(t); const ctx = window.__ctx; const h = ctx.rigs.find(r => r.name === 'hero'); const bb = h.torso.querySelector('.hoodie').getBoundingClientRect(); return [Math.round(bb.left + bb.width * 0.22), Math.round(bb.top + bb.height * 0.3)]; }, t);
    const { data } = await grab(t, { x: pt[0], y: pt[1], width: 1, height: 1 });
    const c = '#' + [data[0], data[1], data[2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    log(c === '#23C0B4', `hoodie probe t=${t}s at (${pt}) reads ${c}`);
  }
  // 7. flat first / last frames
  for (const [key, f] of [['first', 0], ['last', 449]]) if (cfg[key]) {
    const { data } = await grab(f / 30); const want = hex(cfg[key]); let bad = 0;
    for (let i = 0; i < data.length; i += 3) if (Math.abs(data[i] - want[0]) > 0 || Math.abs(data[i + 1] - want[1]) > 0 || Math.abs(data[i + 2] - want[2]) > 0) bad++;
    log(bad === 0, `f${f} is full ${cfg[key]} (${bad} other pixels)`);
  }
  if (cfg.extra) for (const [name, js] of cfg.extra) { const r = await p.evaluate(js); log(r.ok, name + ': ' + r.msg); }
  await b.close(); srv.close();
  const txt = `CHECKS ${page}  (${new Date().toISOString()})\n` + out.join('\n') + `\n${fails ? fails + ' FAILED' : 'ALL PASS'}\n`;
  fs.mkdirSync('checks', { recursive: true }); fs.writeFileSync(path.join('checks', page.replace('.html', '.txt')), txt);
  console.log(txt);
})();
