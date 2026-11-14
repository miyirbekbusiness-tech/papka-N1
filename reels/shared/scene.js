/* shared/scene.js — stage framework: one paused GSAP timeline, renderAt(t), shots + cameras,
   screen-space labels (PILL), INNER_LIGHT, city, stars, chair, sfx cue list, self-checks.
   Used unchanged by all stages. */
(function (G) {
  'use strict';
  const S = G.STYLE, P = S.PAL, el = S.el, FPS = S.FPS;

  function circPath(cx, cy, r) { return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`; }

  function init(cfg) {
    const stage = cfg.stage, DUR = cfg.duration || 15;
    const root = document.getElementById('frame');
    const svg = el('svg', { width: S.W, height: S.H, viewBox: `0 0 ${S.W} ${S.H}`, id: 'svg' }, root);
    el('defs', null, svg);
    el('rect', { x: 0, y: 0, width: S.W, height: S.H, fill: P.ink }, svg);
    const world = el('g', { id: 'world' }, svg);
    const screen = el('g', { id: 'screen' }, svg);
    const overlay = el('g', { id: 'overlay' }, svg);                  // full-frame grade (fade to dark etc.)
    const fade = el('rect', { x: -10, y: -10, width: S.W + 20, height: S.H + 20, fill: P.ink, opacity: 0 }, overlay);
    const tl = gsap.timeline({ paused: true });
    const procs = [], shots = [], sfx = [], checks = { labels: [], cuts: [] };
    let words = [], subs = null;
    const SC = { stage, svg, world, screen, overlay, tl, DUR, procs, shots, sfx, checks, music: cfg.music || {}, fade: { v: 0 }, fadeEl: fade };

    SC.words = () => words;
    // time of the n-th (0-based) occurrence of a subtitle word — exactly on its frame
    SC.F = (w, n = 0) => {
      const strip = s => s.replace(/[.,?!:;«»]/g, '');
      const hits = words.filter(x => strip(x.word) === w || x.word === w);
      if (!hits[n]) throw new Error('cue word not found: ' + w + ' #' + n);
      return hits[n].frame;
    };
    SC.W = (w, n = 0) => SC.F(w, n) / FPS;
    SC.on = fn => procs.push(fn);
    SC.cue = (t, type, o) => sfx.push(Object.assign({ t: +(+t).toFixed(4), type }, o || {}));

    /* shots: {name, start (frame), cut:'hard'|'match', build(shot)} */
    SC.shot = (o) => {
      const g = el('g', { 'data-shot': o.name }, world);
      const cam = el('g', {}, g);
      const scr = el('g', { 'data-shot': o.name }, screen);
      const sh = Object.assign({ g, cam, w: cam, scr, camState: { x: 540, y: 960, s: 1, r: 0 } }, o);
      shots.push(sh);
      return sh;
    };
    SC.camApply = sh => { const c = sh.camState; sh.cam.setAttribute('transform', `translate(540,960) rotate(${c.r}) scale(${c.s}) translate(${-c.x},${-c.y})`); };
    // world point of a shot → screen point (for leader lines)
    SC.toScreen = (node, x, y) => {
      const m = node.getScreenCTM(); const r = svg.getBoundingClientRect();
      return [m.a * x + m.c * y + m.e - r.left, m.b * x + m.d * y + m.f - r.top];
    };

    /* PILL: rounded label, white Montserrat 700 30px, 1px leader line to what it names */
    SC.pill = (parent, o) => {
      const size = o.size || 30, padX = o.padX || 26, h = Math.round(size * 1.9);
      const g = el('g', { 'data-check': 'label' }, parent);
      const lead = el('g', {}, parent);
      parent.insertBefore(lead, g);
      const line = el('line', { stroke: o.leadColor || P.paper, 'stroke-width': 1, 'stroke-opacity': .9 }, lead);
      const dot = el('circle', { r: 4, fill: o.leadColor || P.paper }, lead);
      const inner = el('g', {}, g);
      const txt = el('text', { 'font-family': 'Montserrat', 'font-weight': o.weight || 700, 'font-size': size, fill: o.textColor || '#FFFFFF', 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 1 }, null);
      txt.textContent = o.text;
      inner.appendChild(txt);
      const tw = txt.getComputedTextLength();
      const w = Math.round(tw + padX * 2);
      const bg = el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: o.color || P.coral }, null);
      inner.insertBefore(bg, txt);
      g.setAttribute('transform', `translate(${o.x},${o.y})`);
      const st = { p: 0, lead: 0, sx: 1, sy: 1 };
      const pill = { g, inner, st, w, h, o, line, lead };
      pill.update = () => {
        inner.setAttribute('transform', `scale(${st.p * st.sx},${st.p * st.sy})`);
        g.style.opacity = st.p > 0.01 ? 1 : 0;
        const show = o.target && st.lead > 0.01;
        lead.style.display = show ? '' : 'none';
        if (show) {
          const [tx, ty] = o.target();
          // leave from the pill edge nearest the target
          const ex = Math.max(o.x - w / 2 + h / 2, Math.min(o.x + w / 2 - h / 2, tx));
          const ey = ty > o.y ? o.y + h / 2 : o.y - h / 2;
          const lx = ex + (tx - ex) * st.lead, ly = ey + (ty - ey) * st.lead;
          line.setAttribute('x1', ex); line.setAttribute('y1', ey); line.setAttribute('x2', lx); line.setAttribute('y2', ly);
          dot.setAttribute('cx', lx); dot.setAttribute('cy', ly);
          dot.style.opacity = st.lead >= 1 ? 1 : 0;
        }
      };
      SC.on(pill.update);
      checks.labels.push({ text: o.text, g, color: o.color || P.coral, textColor: o.textColor || '#FFFFFF' });
      return pill;
    };
    // pop a pill in (ease-out-back) or stamp it (4-frame wind-up, 1.3→1.0, squash)
    SC.popIn = (pill, t, o = {}) => {
      const st = pill.st;
      if (o.stamp) {
        tl.fromTo(st, { p: 0 }, { p: 1.3, duration: 4 / FPS, ease: S.E.inCubic }, t - 4 / FPS);
        tl.to(st, { p: 1, duration: 8 / FPS, ease: S.E.spring(0.6) }, t);
        tl.fromTo(st, { sx: 1, sy: 1 }, { sx: 1.15, sy: 0.85, duration: 2 / FPS, ease: S.E.outCubic }, t);
        tl.to(st, { sx: 1, sy: 1, duration: 10 / FPS, ease: S.E.spring(0.55) }, t + 2 / FPS);
      } else {
        tl.fromTo(st, { p: 0 }, { p: 1, duration: 10 / FPS, ease: t2 => S.E.outBack(t2, 2.0) }, t);
      }
      tl.fromTo(st, { lead: 0 }, { lead: 1, duration: 8 / FPS, ease: S.E.outCubic }, t + 6 / FPS);
    };

    /* INNER_LIGHT: core FFD27A r18, soft halo FFC857 r90 at 35% — the only glow */
    SC.innerLight = (parent, o = {}) => {
      const g = el('g', { transform: `translate(${o.x || 0},${o.y || 0})`, 'data-inner-light': 1 }, parent);
      const sc = el('g', {}, g);
      const halo = el('circle', { r: 90, fill: S.radGrad(svg, S.softStops(P.orbHalo, 0.35)) }, sc);
      const core = el('circle', { r: 18, fill: P.orbCore }, sc);
      const st = { s: 1, k: 1, core: 18 };
      const L = { g, sc, halo, core, st };
      L.update = () => {
        sc.setAttribute('transform', `scale(${st.s})`);
        halo.style.opacity = S.clamp(st.k); core.style.opacity = S.clamp(st.k * 1.4);
        core.setAttribute('r', st.core);
        g.style.display = st.k <= 0.001 ? 'none' : '';
      };
      SC.on(L.update);
      return L;
    };
    // unlit grey orb outline (TWIN)
    SC.greyOrb = (parent, o = {}) => el('circle', { cx: o.x || 0, cy: o.y || 0, r: 18, fill: 'none', stroke: P.grey, 'stroke-width': 4 }, parent);

    /* city skyline with lightable windows */
    SC.city = (parent, o) => {
      const r = S.rng(o.seed || 11), wins = [];
      const g = el('g', {}, parent);
      (o.layers || [{ col: S.back(P.wall, 2), h: [300, 600], w: [90, 160], lit: .5 }]).forEach((L, li) => {
        let x = o.x0;
        while (x < o.x1) {
          const w = r.range(L.w[0], L.w[1]), h = r.range(L.h[0], L.h[1]);
          const bx = x, by = o.base - h;
          el('path', { d: S.rrect(bx, by, w, h + 40, L.round ?? 8), fill: L.col }, g);
          if (L.roofCol) el('rect', { x: bx + w * 0.3, y: by - 18, width: w * 0.12, height: 20, fill: L.col }, g);
          const ww = L.win || 14, wh = (L.win || 14) * 1.3, gx = L.gap || 12;
          for (let yy = by + 22; yy < o.base - 20; yy += wh + gx) for (let xx = bx + 14; xx < bx + w - ww - 8; xx += ww + gx) {
            if (r() > (L.density ?? 0.55)) continue;
            const lit0 = r() < (L.lit ?? 0.4);
            const e = el('rect', { x: xx, y: yy, width: ww, height: wh, rx: 2.5, fill: lit0 ? P.win : (L.darkWin || S.shade(L.col, -0.25)) }, g);
            wins.push({ e, x: xx, y: yy, layer: li, lit0, off: L.darkWin || S.mix(L.col, '#FFFFFF', 0.08), on: L.winCol || P.win });
          }
          x += w + r.range(o.gap?.[0] ?? 4, o.gap?.[1] ?? 20);
        }
      });
      return { g, wins };
    };

    /* twinkling stars (static positions, seeded) */
    SC.stars = (parent, o) => {
      const r = S.rng(o.seed || 5), list = [];
      for (let i = 0; i < (o.n || 60); i++) {
        const e = el('circle', { cx: r.range(o.x0, o.x1), cy: r.range(o.y0, o.y1), r: r.range(1.6, 3.6), fill: P.paper }, parent);
        list.push({ e, ph: r() * 6.28, f: r.range(0.3, 0.9), base: r.range(0.35, 0.8) });
      }
      SC.on(t => list.forEach(s => s.e.setAttribute('opacity', (s.base * (0.65 + 0.35 * Math.sin(s.ph + t * 2 * Math.PI * s.f))).toFixed(3))));
      return list;
    };

    /* office swivel chair, front view; spin(θ) turns the seat+back around the column */
    SC.chair = (parent, o = {}) => {
      const g = el('g', { transform: `translate(${o.x || 0},${o.y || 0}) scale(${o.s || 1})` }, parent);
      const c = o.col || P.coral, cs = S.shade(c, 0.12), metal = o.metal || '#6B5BA8', ms = S.shade(metal, 0.12);
      el('ellipse', { cx: 0, cy: 6, rx: 170, ry: 20, fill: P.ink, opacity: .25 }, g);
      // base star + wheels
      el('path', { d: 'M-150,-18L150,-18L140,-2L-140,-2Z', fill: ms }, g);
      el('path', { d: S.rrect(-12, -150, 24, 140, 10), fill: metal }, g);
      [-150, -60, 60, 150].forEach(x => el('circle', { cx: x, cy: -4, r: 14, fill: P.ink }, g));
      const spin = el('g', {}, g);
      const seatG = el('g', {}, spin);
      el('path', { d: S.rrect(-150, -196, 300, 56, 26), fill: c }, seatG);
      el('path', { d: S.rrect(60, -196, 90, 56, 26), fill: cs }, seatG);
      const backG = el('g', {}, spin);
      el('path', { d: S.rrect(-14, -260, 28, 70, 8), fill: ms }, backG);
      const backFace = el('path', { d: S.rrect(-130, -470, 260, 220, 60), fill: c }, backG);
      const backSh = el('path', { d: S.rrect(40, -470, 90, 220, 50), fill: cs }, backG);
      const st = { a: 0 };
      const ch = { g, spin, seatG, backG, backFace, backSh, st };
      ch.update = () => {
        const a = st.a * Math.PI / 180, k = Math.cos(a), sn = Math.sin(a);
        backG.setAttribute('transform', `translate(${sn * 30},0) scale(${Math.max(0.08, Math.abs(k))},1)`);
        backFace.setAttribute('fill', k >= 0 ? c : cs); backSh.style.opacity = k >= 0 ? 1 : 0;
        seatG.setAttribute('transform', `scale(${0.85 + 0.15 * Math.abs(k)},1)`);
      };
      SC.on(ch.update);
      return ch;
    };

    /* question mark that line-draws (stroke-dashoffset) */
    SC.question = (parent, o) => {
      const g = el('g', { transform: `translate(${o.x},${o.y}) scale(${o.s || 1})`, 'data-check': 'label' }, parent);
      const hook = el('path', { d: 'M-62,-70C-62,-150 62,-150 62,-72C62,-20 0,-12 0,40L0,58', fill: 'none', stroke: o.col || P.paper, 'stroke-width': 34, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 100, 'stroke-dasharray': '100 100', 'stroke-dashoffset': 100 }, g);
      const dot = el('circle', { cx: 0, cy: 122, r: 22, fill: o.col || P.paper }, g);
      const st = { d: 0, dot: 0 };
      SC.on(() => { hook.setAttribute('stroke-dashoffset', 100 * (1 - st.d)); hook.style.opacity = st.d > 0.001 ? 1 : 0; dot.setAttribute('transform', `translate(0,122) scale(${st.dot}) translate(0,-122)`); });
      checks.labels.push({ text: '?', g, color: null, textColor: o.col || P.paper });
      return { g, hook, dot, st };
    };

    /* ---------- lifecycle ---------- */
    SC.renderAt = (t) => {
      t = Math.max(0, Math.min(DUR - 1e-6, t));
      const fr = Math.round(t * FPS);
      tl.seek(t, false);
      shots.forEach((sh, i) => {
        const on = fr >= sh.f0 && fr < sh.f1;
        sh.g.style.display = on ? '' : 'none';
        sh.scr.style.display = on ? '' : 'none';
        if (on) SC.camApply(sh);
      });
      procs.forEach(f => f(t, fr));
      fade.setAttribute('opacity', SC.fade.v);
      if (subs) subs.render(t);
      SC.t = t;
    };

    SC.start = async (build) => {
      words = (await (await fetch(`words_${stage}.json`)).json()).words;
      await document.fonts.load('800 64px Montserrat', 'ʻAa?'); await document.fonts.load('700 30px Montserrat', 'ʻAa');
      await document.fonts.ready;
      build(SC);
      shots.sort((a, b) => a.f0 - b.f0);
      shots.forEach((sh, i) => { sh.f1 = i < shots.length - 1 ? shots[i + 1].f0 : Math.round(DUR * FPS); });
      shots.forEach((sh, i) => { if (i > 0) SC.cue(sh.f0 / FPS, 'whoosh', { cut: sh.cut || 'hard' }); });
      subs = G.SUBS.create(document.getElementById('frame'), words);
      tl.to({}, { duration: 0.0001 }, DUR - 0.0001);                    // timeline spans the stage
      const q = new URLSearchParams(location.search);
      G.__meta = {
        stage, fps: FPS, duration: DUR, frames: Math.round(DUR * FPS),
        shots: shots.map(s => ({ name: s.name, cue: s.cueWord || null, f0: s.f0, f1: s.f1, dur: (s.f1 - s.f0) / FPS, cut: s.cut || (s.f0 === 0 ? 'open' : 'hard') })),
        sfx: sfx.slice().sort((a, b) => a.t - b.t), music: SC.music, words,
        phrases: subs.phrases.map(p => ({ f0: p.f0, fClear: p.fClear, text: p.idx.map(i => words[i].word).join(' ') }))
      };
      G.renderAt = SC.renderAt;
      if (q.has('t')) { SC.renderAt(parseFloat(q.get('t'))); }
      else if (!q.has('static')) { const t0 = performance.now(); const loop = () => { SC.renderAt(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
      G.__ready = true;
    };
    return SC;
  }

  G.SCENE = { init, circPath };
})(window);
