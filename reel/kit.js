/* kit.js — shared kit for the 60 s Reel (parts 1-4).
 * Holds PALETTE, SET, BULBS, the SUB and LABEL components and every character as a function.
 * Engine contract: one paused GSAP timeline per part, renderAt(t) seeks it, ?t= freezes a frame.
 * Everything on screen is a pure function of (timeline state, t): seeded random only, no Date/Math.random.
 */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1080, H = 1920, FPS = 30;
  const D2R = Math.PI / 180;

  /* ------------------------------------------------------------------ BRAND */
  const PALETTE = {
    SKY: '#170E3A', DUSK: '#32246A', GROUND: '#22184D', PINK: '#FF4F8C',
    CREAM: '#F6EFFD', GOLD: '#FFD27B', GREEN: '#49B569', WHITE: '#FFFFFF'
  };
  const C = {
    INK: '#0F0B24', SKIN: '#D9936B', HAIR: '#291B3C', STUBBLE: '#B97A58', CHEEK: '#F58E94',
    HOODIE: '#23C0B4', POCKET: '#14988F', TROUSERS: '#2A2660', SUIT: '#0F0B24', TIE: '#F2B33D',
    GREY: '#C9C6D6', BRIDE_HAIR: '#4A2338', BENCH: '#794C6E', LEAF_A: '#FEB13F', LEAF_B: '#FD893B',
    SKYLINE: '#544174', BULB_OUT: '#544174'
  };

  /* ------------------------------------------------------------------ utils */
  function S(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const f2 = v => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
  function rgb2hex(r) { return '#' + r.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase(); }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); }
  function rng(seed) {            // mulberry32
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let UID = 0;
  const uid = p => p + '_' + (++UID);

  /* spring step response with a given damping ratio, usable as a GSAP ease */
  function spring(zeta, settle) {
    const k = settle || 7, w0 = k / zeta, wd = w0 * Math.sqrt(1 - zeta * zeta);
    return function (p) {
      if (p >= 1) return 1; if (p <= 0) return 0;
      return 1 - Math.exp(-zeta * w0 * p) * (Math.cos(wd * p) + (zeta * w0 / wd) * Math.sin(wd * p));
    };
  }

  /* two-bone IK: returns the middle joint and the (possibly clamped) end point */
  function ik(ax, ay, tx, ty, l1, l2, bend) {
    let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy);
    const max = l1 + l2 - 0.01, min = Math.abs(l1 - l2) + 0.01;
    if (d < 1e-6) { dx = 0; dy = 1; d = 1e-6; }
    let dd = clamp(d, min, max);
    if (dd !== d) { dx *= dd / d; dy *= dd / d; d = dd; tx = ax + dx; ty = ay + dy; }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const ux = dx / d, uy = dy / d;
    return { ex: ax + ux * a + bend * h * (-uy), ey: ay + uy * a + bend * h * ux, tx: tx, ty: ty };
  }

  /* ------------------------------------------------------------------ fonts + page */
  const CSS = "@font-face{font-family:'Inter';font-style:normal;font-weight:700;src:url('fonts/inter-latin-700-normal.woff2') format('woff2')}" +
    "@font-face{font-family:'Inter';font-style:normal;font-weight:800;src:url('fonts/inter-latin-800-normal.woff2') format('woff2')}" +
    "html,body{margin:0;height:100%;background:#0B0718;overflow:hidden}" +
    "svg#stage{display:block;height:100vh;width:auto;margin:0 auto}" +
    "svg text{font-family:'Inter',sans-serif;font-kerning:normal}";
  (function () { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); })();

  function ready() {
    const probe = 'Aaʻ“”…–—$?_1';
    return Promise.all([
      document.fonts.load("800 56px 'Inter'", probe),
      document.fonts.load("700 34px 'Inter'", probe)
    ]).then(() => document.fonts.ready).then(() => {
      const ok = document.fonts.check("800 56px 'Inter'", 'ʻ') && document.fonts.check("700 34px 'Inter'", 'ʻ');
      global.FONTS_OK = ok;
      if (!ok) console.error('Inter failed to load');
      return ok;
    });
  }

  /* ------------------------------------------------------------------ STAGE */
  function stage(opts) {
    opts = opts || {};
    const host = opts.host || document.body;
    const svg = S('svg', { id: 'stage', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, host);
    const defs = S('defs', {}, svg);
    S('rect', { x: 0, y: 0, width: W, height: H, fill: PALETTE.SKY }, svg);
    const world = S('g', { id: 'world' }, svg);
    const ui = S('g', { id: 'ui' }, svg);
    const st = {
      svg: svg, defs: defs, world: world, ui: ui, W: W, H: H, fps: FPS,
      part: opts.part || 0, duration: opts.duration || 15,
      nodes: [], pre: [], post: [], chars: [], subs: [], labels: [], events: [],
      cam: { x: W / 2, y: H / 2, s: 1, r: 0 }, t: 0,
      rand: rng(opts.seed || 1)
    };
    st.tl = gsap.timeline({ paused: true });
    st.tl.set({}, {}, st.duration);              // pin the timeline length

    /* transform nodes: plain state tweened by GSAP, written to the DOM in apply() */
    st.node = function (el, init) {
      const n = Object.assign({ el: el, x: 0, y: 0, r: 0, sx: 1, sy: 1, o: 1, px: 0, py: 0, kx: 0 }, init || {});
      st.nodes.push(n);
      return n;
    };
    function applyNode(n) {
      if (n.o <= 0.001) { if (n._d !== 0) { n.el.setAttribute('display', 'none'); n._d = 0; } return; }
      if (n._d === 0) { n.el.removeAttribute('display'); n._d = 1; }
      let tr = 'translate(' + f2(n.x) + ' ' + f2(n.y) + ')';
      if (n.r) tr += ' rotate(' + f2(n.r) + ')';
      if (n.kx) tr += ' skewX(' + f2(n.kx) + ')';
      if (n.sx !== 1 || n.sy !== 1) tr += ' scale(' + n.sx.toFixed(4) + ' ' + n.sy.toFixed(4) + ')';
      if (n.px || n.py) tr += ' translate(' + f2(-n.px) + ' ' + f2(-n.py) + ')';
      n.el.setAttribute('transform', tr);
      if (n.o < 0.999) n.el.setAttribute('opacity', n.o.toFixed(3)); else n.el.removeAttribute('opacity');
    }
    st.apply = function (t) {
      st.t = t;
      for (let i = 0; i < st.pre.length; i++) st.pre[i](t);
      for (let i = 0; i < st.chars.length; i++) st.chars[i].update(t);
      for (let i = 0; i < st.post.length; i++) st.post[i](t);
      for (let i = 0; i < st.nodes.length; i++) applyNode(st.nodes[i]);
      const c = st.cam;
      world.setAttribute('transform', 'translate(' + W / 2 + ' ' + H / 2 + ') scale(' + c.s.toFixed(5) + ')' +
        (c.r ? ' rotate(' + f2(c.r) + ')' : '') + ' translate(' + (-c.x).toFixed(3) + ' ' + (-c.y).toFixed(3) + ')');
    };
    st.renderAt = function (t) {
      t = clamp(+t || 0, 0, st.duration);
      st.tl.seek(t, true);
      st.apply(t);
      return t;
    };
    st.toScreen = (x, y) => ({ x: W / 2 + (x - st.cam.x) * st.cam.s, y: H / 2 + (y - st.cam.y) * st.cam.s });
    st.toWorld = (x, y) => ({ x: st.cam.x + (x - W / 2) / st.cam.s, y: st.cam.y + (y - H / 2) / st.cam.s });

    /* timeline sugar: to() tweens, cut() = zero-length set that lands just before the frame */
    st.to = (obj, vars, t) => st.tl.to(obj, vars, t);
    st.cut = function (obj, vars, t) {
      if (t <= 0.0011) { Object.assign(obj, vars); return; }      // state at t = 0 is simply the initial state
      st.tl.set(obj, vars, t - 0.001);
    };
    st.F = f => f / FPS;

    /* sound events live on the timeline as labels; sound.html reads them back */
    st.sfx = function (type, t, data) {
      const id = 'sfx|' + type + '|' + st.events.length;
      st.tl.addLabel(id, t);
      st.events.push(Object.assign({ id: id, type: type, t: t }, data || {}));
    };

    /* ---- text measuring ---- */
    const meas = S('text', { x: 0, y: -4000, 'font-family': 'Inter', visibility: 'hidden' }, svg);
    st.measure = function (text, size, weight, ls) {
      meas.setAttribute('font-size', size); meas.setAttribute('font-weight', weight);
      meas.setAttribute('letter-spacing', ls || 0);
      meas.textContent = text;
      return meas.getComputedTextLength();
    };
    const PUNCT = /[.,:;?!…—”]$/;
    function wrap2(text, size, weight, maxW, maxLines, ls) {
      if (st.measure(text, size, weight, ls) <= maxW) return [text];
      if (maxLines < 2) return null;
      const words = text.split(' ');
      let best = null, bestCost = 1e9;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const wa = st.measure(a, size, weight, ls), wb = st.measure(b, size, weight, ls);
        if (wa > maxW || wb > maxW) continue;
        let cost = Math.abs(wa - wb);
        if (PUNCT.test(words[i - 1])) cost -= 140;
        if (words.length - i === 1) cost += 120;
        if (cost < bestCost) { bestCost = cost; best = [a, b]; }
      }
      return best;
    }
    function wrapN(text, size, weight, maxW, ls) {   // greedy, any number of lines
      const words = text.split(' '), lines = []; let cur = '';
      for (const w of words) {
        const tryL = cur ? cur + ' ' + w : w;
        if (st.measure(tryL, size, weight, ls) <= maxW || !cur) cur = tryL; else { lines.push(cur); cur = w; }
      }
      if (cur) lines.push(cur);
      return lines;
    }
    st.wrapN = wrapN;

    /* ---- SUB: Inter 800 56/68 (shrinks to 50), left x=120, top y=290, max 840 px, max 2 lines.
           In over 4 frames (opacity), out as a cut, never moves. ---- */
    const subLayer = st.subLayer = S('g', { id: 'subs' }, ui);
    const ASC = 1984 / 2048, DESC = 494 / 2048;
    st.sub = function (id, text, t0, t1, o) {
      o = o || {};
      const color = o.color || PALETTE.WHITE, maxLines = o.maxLines || 2, ls = -0.4;
      let size = o.size || 56, lines = null;
      const sizes = o.size ? [o.size] : [56, 54, 52, 50];
      for (const s of sizes) { lines = wrap2(text, s, 800, 840, maxLines, ls); if (lines) { size = s; break; } }
      if (!lines) { console.error('SUB does not fit: ' + id); lines = wrapN(text, 50, 800, 840, ls); size = 50; }
      const lh = Math.round(68 * size / 56), top = o.top !== undefined ? o.top : 290;
      const g = S('g', { class: 'sub', id: id }, subLayer);
      const txt = S('text', { 'font-family': 'Inter', 'font-weight': 800, 'font-size': size, 'letter-spacing': ls, fill: color }, g);
      lines.forEach((l, i) => {
        const base = top + i * lh + (lh - (ASC + DESC) * size) / 2 + ASC * size;
        S('tspan', { x: 120, y: f2(base) }, txt).textContent = l;
      });
      const n = st.node(g, { o: 0 });
      const tin = Math.max(0, t0);
      st.cut(n, { o: 0.25 }, tin);
      st.tl.to(n, { o: 1, duration: 3 / FPS, ease: 'none' }, tin);
      st.cut(n, { o: 0 }, t1);
      const widths = lines.map(l => st.measure(l, size, 800, ls));
      const rec = {
        id: id, text: text, color: color, t0: t0, t1: t1, size: size, lh: lh, lines: lines, node: n, el: g,
        words: text.split(/\s+/).filter(w => /[0-9A-Za-zʻ]/.test(w)).length,
        box: { x: 120, y: top, w: Math.max.apply(null, widths), h: lines.length * lh }
      };
      st.subs.push(rec);
      return rec;
    };

    /* ---- LABEL: Inter 700 34 px WHITE on a PINK pill (radius 12) with a 2 px leader line ---- */
    const labelLayer = st.labelLayer = S('g', { id: 'labels' }, ui);
    st.label = function (id, text, o) {
      const fs = 34, padX = 22, h = 62;
      const tw = st.measure(text, fs, 700, 0), w = Math.ceil(tw + padX * 2);
      const g = S('g', { class: 'label', id: id, 'data-fg': 1 }, labelLayer);
      const line = S('line', { x1: o.tx, y1: o.ty, x2: o.tx, y2: o.ty, stroke: PALETTE.PINK, 'stroke-width': 2 }, g);
      const dot = S('circle', { cx: o.tx, cy: o.ty, r: 6, fill: PALETTE.PINK }, g);
      const pg = S('g', {}, g);
      S('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 12, fill: PALETTE.PINK }, pg);
      const tx = S('text', { x: 0, y: f2(fs * 0.727 / 2), 'text-anchor': 'middle', 'font-family': 'Inter', 'font-weight': 700, 'font-size': fs, fill: PALETTE.WHITE }, pg);
      tx.textContent = text;
      const all = st.node(g, { o: 0 });
      const pill = st.node(pg, { x: o.x, y: o.y, sx: 0, sy: 0 });
      const lead = { p: 0, d: 0 };
      // the leader attaches to the pill edge nearest the target
      const ax = clamp(o.tx, o.x - w / 2 + 14, o.x + w / 2 - 14);
      const ay = o.ty > o.y ? o.y + h / 2 : o.y - h / 2;
      st.post.push(function () {
        line.setAttribute('x2', f2(lerp(o.tx, ax, lead.p))); line.setAttribute('y2', f2(lerp(o.ty, ay, lead.p)));
        dot.setAttribute('r', f2(6 * lead.d));
      });
      const t0 = o.t0, A = 4 / FPS;                      // 4-frame anticipation: the leader draws first
      st.cut(all, { o: 1 }, t0 - A);
      st.tl.to(lead, { d: 1, duration: 2 / FPS, ease: 'power2.out' }, t0 - A);
      st.tl.to(lead, { p: 1, duration: A, ease: 'power2.in' }, t0 - A);
      st.tl.to(pill, { sx: 1, sy: 1, duration: 14 / FPS, ease: spring(o.damping || 0.6) }, t0);
      st.cut(all, { o: 0 }, o.t1);
      const rec = { id: id, text: text, t0: t0, t1: o.t1, el: g, box: { x: o.x - w / 2, y: o.y - h / 2, w: w, h: h } };
      st.labels.push(rec);
      return rec;
    };

    return st;
  }

  /* run(): wire renderAt / ?t= freeze / realtime preview, and publish sound events */
  function run(st) {
    const q = new URLSearchParams(location.search);
    global.STAGE = st;
    global.renderAt = st.renderAt;
    global.SFX = st.events;
    if (q.has('t')) {
      st.renderAt(parseFloat(q.get('t')) || 0);
    } else {
      st.renderAt(0);
      const start = performance.now();
      const tick = function (now) {
        const el = ((now - start) / 1000) % st.duration;
        st.renderAt(Math.floor(el * FPS + 1e-6) / FPS);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    global.READY = true;
    if (global.parent && global.parent !== global) {
      try { global.parent.postMessage({ reel: 1, part: st.part, duration: st.duration, events: st.events, labels: st.tl.labels }, '*'); } catch (e) { /* ignore */ }
    }
  }

  /* ------------------------------------------------------------------ CHARACTERS */
  const NEUTRAL = {
    eye: 1, lidL: 0, lidR: 0, arc: 0, pupX: 0, pupY: 0, pupS: 1, hl: 0,
    browY: 0, browT: 0, browYL: 0, browYR: 0, browRL: 0, browRR: 0,
    mw: 11, ma: 2, mb: 6.5, mx: 0, my: 0, mrot: 0, teeth: 0,
    cheek: 1, tearL: 0, tearR: 0, jaw: 0
  };
  const EXPR = {
    neutral: {},
    shock: { eye: 1.3, pupS: 0.72, browY: 9, mw: 11, ma: -13, mb: 30, cheek: 0.9, jaw: 14 },
    doubt: { eye: 0.97, lidL: 0.4, lidR: 0.1, pupX: -4.5, pupY: -0.5, browYL: -3, browYR: 7, browRL: 8, browRR: -12, mw: 9, ma: 0.5, mb: 5, mx: 7, mrot: -10 },
    smile: { browY: 2, mw: 16, ma: 5, mb: 15, cheek: 1.12 },
    love: { eye: 1.08, pupS: 1.35, hl: 1, browY: 5, mw: 18, ma: 1, mb: 25, teeth: 1, cheek: 1.4 },
    sad: { lidL: 0.28, lidR: 0.28, pupY: 2.5, browY: 2, browT: 16, mw: 11, ma: -7, mb: -2.5 },
    cry: { lidL: 0.8, lidR: 0.8, browY: 1, browT: 22, mw: 15, ma: -18, mb: 8, tearL: 0.62, tearR: 0.55, cheek: 1.1 }
  };
  function expr(name, sp) {
    const base = Object.assign({}, NEUTRAL, EXPR[name] || {});
    if (sp && sp.tweak && sp.tweak[name]) Object.assign(base, sp.tweak[name]);
    return base;
  }

  function mouthPath(w, a, b) {
    const k = 0.55 + 0.45 * clamp(Math.abs(b - a) / 22, 0, 1);
    const cx = f2(w * k);
    return 'M' + f2(-w) + ',0 C' + (-cx) + ',' + f2(a) + ' ' + cx + ',' + f2(a) + ' ' + f2(w) + ',0 C' + cx + ',' + f2(b) + ' ' + (-cx) + ',' + f2(b) + ' ' + f2(-w) + ',0 Z';
  }
  function blinkAmt(t, phase) {
    const u = (((t + phase) % 3) + 3) % 3, k = Math.round((u - 2.8) * FPS * 1000) / 1000;
    if (k < 0) return 0; if (k < 1) return 0.6; if (k < 3) return 1; if (k < 4) return 0.5; return 0;
  }

  /* generic rig: IK arms and legs, leaning torso, turning head, parametric face */
  function character(st, parent, sp, o) {
    o = o || {};
    const c = { spec: sp, name: sp.name, st: st, phase: o.phase || 0, breathAmt: 1, noBlink: false, lightDir: 1 };
    const g = c.g = S('g', { class: 'char', 'data-char': sp.name, 'data-fg': 1 }, parent);
    c.root = { x: o.x || 0, y: o.y || 0, k: o.k || 1, sx: 1, sy: 1, r: 0, o: 1 };
    c.shadowEl = S('ellipse', { cx: 0, cy: 0, rx: sp.shadow, ry: f2(sp.shadow * 0.17), fill: C.INK, opacity: 0.2 }, g);
    const body = c.body = S('g', {}, g);
    const L = c.layers = {};
    ['hairBack', 'armBack', 'legs', 'lower', 'torso', 'head', 'hairOver', 'armFront', 'over'].forEach(k => { L[k] = S('g', {}, body); });
    c.slots = { back: S('g', {}, L.hairBack), torso: null, head: null, over: L.over };

    /* pose */
    c.pose = {
      dx: 0, dy: 0, lift: 0, lean: 0, sit: 0, tsx: 1, hipS: 1,
      headRot: 0, headX: 0, headY: 0, turn: 0, hairSwing: 0, hem: 0,
      aL: { x: 0, y: 0, w: 0, bend: 1, sw: 0, back: 0 },
      aR: { x: 0, y: 0, w: 0, bend: -1, sw: 0, back: 0 },
      fL: { x: -sp.footX, y: 0, r: 0, dir: -1 },
      fR: { x: sp.footX, y: 0, r: 0, dir: 1 },
      kL: 1, kR: -1
    };
    c.face = Object.assign({ light: 0 }, expr(o.expr || 'neutral', sp));
    c.exprName = o.expr || 'neutral';
    c.geo = {};

    /* legs */
    const P = c.parts = {};
    ['L', 'R'].forEach(function (s) {
      P['leg' + s] = S('path', { fill: 'none', stroke: sp.legColor, 'stroke-width': sp.legW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.legs);
      P['foot' + s] = S('g', {}, L.legs);
      sp.drawFoot(P['foot' + s]);
    });
    if (sp.drawLower) sp.drawLower(c, L.lower);

    /* torso */
    P.torso = S('g', {}, L.torso);
    sp.drawTorso(P.torso, c);
    c.slots.torso = S('g', {}, P.torso);

    /* head */
    const hairBackG = P.hairBack = S('g', {}, L.hairBack);
    P.hairBackIn = S('g', {}, hairBackG);
    if (sp.drawHairBack) sp.drawHairBack(P.hairBackIn, c);
    L.hairBack.appendChild(c.slots.back);              // slot sits above the back hair
    const head = P.head = S('g', {}, L.head);
    if (sp.drawBehindHead) sp.drawBehindHead(head, c);
    const clipId = uid('hc');
    const cp = S('clipPath', { id: clipId }, st.defs);
    P.clipRect = S('rect', { x: -sp.r, y: -sp.r, width: sp.r * 2, height: sp.r * 2, rx: sp.r, ry: sp.r }, cp);
    P.skull = S('rect', { x: -sp.r, y: -sp.r, width: sp.r * 2, height: sp.r * 2, rx: sp.r, ry: sp.r, fill: C.SKIN }, head);
    const clipG = S('g', { 'clip-path': 'url(#' + clipId + ')' }, head);
    if (sp.drawJaw) { P.jawG = S('g', {}, clipG); sp.drawJaw(P.jawG, c); }
    /* flat GOLD light on the side of the face (under the features) */
    P.light = S('circle', { cx: 0, cy: 0, r: sp.r * 1.02, fill: PALETTE.GOLD, opacity: 0, display: 'none' }, clipG);
    const face = P.face = S('g', {}, clipG);
    const fs = sp.face;
    P.cheekL = S('circle', { cx: -fs.cheekX, cy: fs.cheekY, r: fs.cheekR, fill: C.CHEEK }, face);
    P.cheekR = S('circle', { cx: fs.cheekX, cy: fs.cheekY, r: fs.cheekR, fill: C.CHEEK }, face);
    if (fs.noseRx) P.nose = S('ellipse', { cx: 0, cy: fs.noseY, rx: fs.noseRx, ry: fs.noseRy, fill: C.STUBBLE }, face);
    ['L', 'R'].forEach(function (s) {
      const eg = P['eye' + s] = S('g', {}, face);
      S('circle', { cx: 0, cy: 0, r: fs.eyeR, fill: PALETTE.WHITE }, eg);
      P['pup' + s] = S('circle', { cx: 0, cy: 0, r: fs.pupR, fill: C.INK }, eg);
      P['hl' + s] = S('circle', { cx: 0, cy: 0, r: f2(fs.pupR * 0.36), fill: PALETTE.WHITE, display: 'none' }, eg);
      if (fs.lash) S('path', { d: (s === 'L' ? 'M-' : 'M') + (fs.eyeR - 2) + ',-5 l' + (s === 'L' ? '-' : '') + '7,-5 l' + (s === 'L' ? '' : '-') + '2,8 Z', fill: C.INK }, eg);
      P['arc' + s] = S('path', { fill: C.INK, display: 'none' }, face);
      P['brow' + s] = S('rect', { x: -fs.browW / 2, y: -fs.browH / 2, width: fs.browW, height: fs.browH, rx: fs.browH / 2, fill: sp.browColor }, face);
      P['tear' + s] = S('path', { d: 'M0,-7 C4,-2 5,1 5,3.5 A5,5 0 0 1 -5,3.5 C-5,1 -4,-2 0,-7 Z', fill: PALETTE.CREAM, display: 'none' }, face);
    });
    const mclip = uid('mc');
    const mcp = S('clipPath', { id: mclip }, st.defs);
    P.mouthClip = S('path', {}, mcp);
    P.mouthG = S('g', {}, face);
    P.mouth = S('path', { fill: C.HAIR }, P.mouthG);
    const mIn = S('g', { 'clip-path': 'url(#' + mclip + ')' }, P.mouthG);
    P.tongue = S('ellipse', { cx: 0, cy: 0, rx: 5, ry: 3, fill: C.CHEEK }, mIn);
    P.teeth = S('rect', { x: -20, y: 0, width: 40, height: 6, fill: PALETTE.WHITE }, mIn);
    if (sp.drawOverMouth) { P.overMouth = S('g', {}, face); sp.drawOverMouth(P.overMouth, c); }
    /* back-of-head cover (for turning away) */
    P.cover = S('rect', { x: -sp.r, y: -sp.r, width: sp.r * 2, height: sp.r * 2 + 6, rx: sp.r, fill: sp.hairColor, display: 'none' }, clipG);
    P.hairFront = S('g', {}, head);
    if (sp.drawHairFront) sp.drawHairFront(P.hairFront, c);
    c.slots.head = S('g', {}, head);
    P.hairOver = S('g', { display: 'none' }, L.hairOver);
    if (sp.drawHairOver) sp.drawHairOver(P.hairOver, c);

    /* arms */
    c.arms = {};
    ['L', 'R'].forEach(function (s) {
      const ag = S('g', {}, L.armFront);
      const A = c.arms[s] = { g: ag, where: 'front', extra: [], detached: null };
      const as = sp.arm;
      A.sleeve = S('path', { fill: 'none', stroke: as.color, 'stroke-width': as.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ag);
      A.extraG = S('g', {}, ag);
      if (as.cap) A.cap = S('path', { fill: 'none', stroke: as.cap.color, 'stroke-width': as.cap.w, 'stroke-linecap': 'round' }, ag);
      if (as.cuff) A.cuff = S('path', { fill: 'none', stroke: as.cuff.color, 'stroke-width': as.cuff.w, 'stroke-linecap': 'butt' }, ag);
      if (as.watch && s === as.watch.side) A.watch = S('path', { fill: 'none', stroke: as.watch.color, 'stroke-width': as.watch.w, 'stroke-linecap': 'butt' }, ag);
      A.hand = S('circle', { r: as.hand, fill: C.SKIN }, ag);
    });
    /* extra sleeve over the kit sleeve (jackets): follows the arm, stops short of the cuff */
    c.addSleeve = function (color, w, stop) {
      ['L', 'R'].forEach(function (s) {
        const e = S('path', { fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, c.arms[s].extraG);
        c.arms[s].extra.push({ el: e, stop: stop === undefined ? 14 : stop });
      });
    };
    /* draw one arm in another parent (so it can pass in front of another character) */
    c.detachArm = function (s, parentG) {
      const dg = S('g', { 'data-fg': 1 }, parentG);
      dg.appendChild(c.arms[s].g);
      c.arms[s].detached = dg;
    };

    c.setExpr = function (name) { Object.assign(c.face, expr(name, sp)); c.exprName = name; };
    c.exprVars = function (name, extra) { return Object.assign({}, expr(name, sp), extra || {}); };
    /* tween to an expression on the stage timeline */
    c.toExpr = function (name, t, dur, ease, extra) {
      st.tl.to(c.face, Object.assign(c.exprVars(name, extra), { duration: dur === undefined ? 4 / FPS : dur, ease: ease || 'power2.out' }), t);
    };

    c.world = function (pt) {
      const R = c.root;
      return { x: R.x + R.k * R.sx * pt.x, y: R.y + R.k * R.sy * (pt.y - c.pose.lift) };
    };
    c.toLocal = function (wx, wy) {
      const R = c.root;
      return { x: (wx - R.x) / (R.k * R.sx), y: (wy - R.y) / (R.k * R.sy) + c.pose.lift };
    };
    c.hand = function (s) { return c.world(c.geo['hand' + s] || { x: 0, y: 0 }); };
    c.headPos = function () { return c.world(c.geo.head || { x: 0, y: -sp.hip - sp.torso - sp.neck - sp.r }); };
    c.chest = function () { return c.world(c.geo.chest || { x: 0, y: -sp.hip - sp.torso * 0.62 }); };

    c.update = function (t) {
      const R = c.root, p = c.pose;
      if (R.o <= 0.001) {
        if (c._d !== 0) { g.setAttribute('display', 'none'); c._d = 0; ['L', 'R'].forEach(s => { if (c.arms[s].detached) c.arms[s].detached.setAttribute('display', 'none'); }); }
        return;
      }
      if (c._d === 0) { g.removeAttribute('display'); c._d = 1; ['L', 'R'].forEach(s => { if (c.arms[s].detached) c.arms[s].detached.removeAttribute('display'); }); }
      const rootTr = 'translate(' + f2(R.x) + ' ' + f2(R.y) + ')' + (R.r ? ' rotate(' + f2(R.r) + ')' : '') +
        ' scale(' + (R.k * R.sx).toFixed(4) + ' ' + (R.k * R.sy).toFixed(4) + ')';
      g.setAttribute('transform', rootTr);
      if (R.o < 0.999) g.setAttribute('opacity', R.o.toFixed(3)); else g.removeAttribute('opacity');
      const liftTr = 'translate(0 ' + f2(-p.lift) + ')';
      body.setAttribute('transform', liftTr);
      const shS = 1 - clamp(p.lift / 260, 0, 0.55);
      c.shadowEl.setAttribute('transform', 'scale(' + shS.toFixed(3) + ')');

      const br = 1 + 0.01 * c.breathAmt * (1 + Math.sin(2 * Math.PI * (t + c.phase) / 3.4));   // 2 % breathing
      const pel = { x: p.dx, y: -sp.hip + p.dy };
      const ln = p.lean * D2R, cl = Math.cos(ln), sl = Math.sin(ln);
      const tp = (x, y) => ({ x: pel.x + x * p.tsx * cl - y * br * sl, y: pel.y + x * p.tsx * sl + y * br * cl });
      P.torso.setAttribute('transform', 'translate(' + f2(pel.x) + ' ' + f2(pel.y) + ') rotate(' + f2(p.lean) + ') scale(' + p.tsx.toFixed(4) + ' ' + br.toFixed(4) + ')');

      /* head */
      const nk = tp(0, -sp.torso), hdeg = p.lean + p.headRot, hr = hdeg * D2R, hd = sp.neck + sp.r;
      const hc = { x: nk.x + hd * Math.sin(hr) + p.headX, y: nk.y - hd * Math.cos(hr) + p.headY };
      const headTr = 'translate(' + f2(hc.x) + ' ' + f2(hc.y) + ') rotate(' + f2(hdeg) + ')';
      head.setAttribute('transform', headTr);
      hairBackG.setAttribute('transform', headTr);
      c.slots.back.setAttribute('transform', headTr);
      P.hairBackIn.setAttribute('transform', 'rotate(' + f2(p.hairSwing) + ') scale(' + (1 - Math.min(0.12, Math.abs(p.hairSwing) / 220)).toFixed(3) + ' 1)');
      P.hairOver.setAttribute('transform', headTr + ' rotate(' + f2(p.hairSwing) + ')');
      c.geo.head = hc; c.geo.neck = nk; c.geo.chest = tp(0, -sp.torso * 0.62); c.geo.pelvis = pel;
      c.geo.probe = tp(sp.probe ? sp.probe.x : 0, sp.probe ? sp.probe.y : -sp.torso * 0.6);

      /* legs */
      ['L', 'R'].forEach(function (s) {
        const sg = s === 'L' ? -1 : 1, ft = p['f' + s];
        const hip = { x: pel.x + sg * sp.hipW * p.hipS, y: pel.y };
        const th = sp.thigh * (1 - 0.72 * p.sit);
        const k = ik(hip.x, hip.y, ft.x, ft.y - sp.ankle, th, sp.shin, p['k' + s]);
        P['leg' + s].setAttribute('d', 'M' + f2(hip.x) + ',' + f2(hip.y) + ' L' + f2(k.ex) + ',' + f2(k.ey) + ' L' + f2(k.tx) + ',' + f2(k.ty));
        P['foot' + s].setAttribute('transform', 'translate(' + f2(k.tx) + ' ' + f2(k.ty + sp.ankle) + ') rotate(' + f2(ft.r) + ') scale(' + (ft.dir < 0 ? -1 : 1) + ' 1)');
        c.geo['knee' + s] = { x: k.ex, y: k.ey }; c.geo['foot' + s] = { x: k.tx, y: k.ty + sp.ankle };
      });
      if (sp.updateLower) sp.updateLower(c, tp, pel);

      /* arms */
      ['L', 'R'].forEach(function (s) {
        const sg = s === 'L' ? -1 : 1, a = p['a' + s], A = c.arms[s], as = sp.arm;
        const sh = tp(sg * sp.shX, -sp.torso + sp.shY);
        const len = (sp.L1 + sp.L2) * 0.997, sw = a.sw * D2R + ln * 0.4;
        const rx = sh.x + sg * 1 + len * Math.sin(sw), ry = sh.y + len * Math.cos(sw);
        const tx = lerp(rx, a.x, a.w), ty = lerp(ry, a.y, a.w);
        const k = ik(sh.x, sh.y, tx, ty, sp.L1, sp.L2, a.bend);
        const fx = k.tx - k.ex, fy = k.ty - k.ey, fl = Math.hypot(fx, fy) || 1, ux = fx / fl, uy = fy / fl;
        const pt = d => f2(k.tx - ux * d) + ',' + f2(k.ty - uy * d);
        const sEnd = as.cuff ? as.cuff.len : 0;
        A.sleeve.setAttribute('d', 'M' + f2(sh.x) + ',' + f2(sh.y) + ' L' + f2(k.ex) + ',' + f2(k.ey) + ' L' + pt(sEnd * 0.5));
        if (A.cap) {
          const ux1 = k.ex - sh.x, uy1 = k.ey - sh.y, l1 = Math.hypot(ux1, uy1) || 1;
          A.cap.setAttribute('d', 'M' + f2(sh.x) + ',' + f2(sh.y) + ' L' + f2(sh.x + ux1 / l1 * as.cap.len) + ',' + f2(sh.y + uy1 / l1 * as.cap.len));
        }
        if (A.cuff) A.cuff.setAttribute('d', 'M' + pt(as.cuff.len) + ' L' + pt(0));
        if (A.watch) A.watch.setAttribute('d', 'M' + pt(as.watch.at + as.watch.len) + ' L' + pt(as.watch.at));
        A.extra.forEach(function (e) {
          e.el.setAttribute('d', 'M' + f2(sh.x) + ',' + f2(sh.y) + ' L' + f2(k.ex) + ',' + f2(k.ey) + ' L' + pt(e.stop));
        });
        const hx = k.tx + ux * as.hand * 0.55, hy = k.ty + uy * as.hand * 0.55;
        A.hand.setAttribute('cx', f2(hx)); A.hand.setAttribute('cy', f2(hy));
        c.geo['hand' + s] = { x: hx, y: hy }; c.geo['elbow' + s] = { x: k.ex, y: k.ey }; c.geo['sh' + s] = sh;
        if (A.detached) {
          A.detached.setAttribute('transform', rootTr + ' ' + liftTr);
          if (R.o < 0.999) A.detached.setAttribute('opacity', R.o.toFixed(3)); else A.detached.removeAttribute('opacity');
        } else {
          const want = a.back ? 'back' : 'front';
          if (A.where !== want) { (want === 'back' ? L.armBack : L.armFront).appendChild(A.g); A.where = want; }
        }
      });

      /* face */
      const f = c.face;
      const jaw = Math.max(0, f.jaw);
      P.skull.setAttribute('height', f2(sp.r * 2 + jaw)); P.clipRect.setAttribute('height', f2(sp.r * 2 + jaw));
      if (P.jawG) P.jawG.setAttribute('transform', 'translate(0 ' + f2(jaw) + ')');
      const turn = p.turn, at = Math.abs(turn), sg = turn < 0 ? -1 : 1;
      const off = at <= 1 ? turn * sp.turnPx : sg * (sp.turnPx + (at - 1) * sp.r * 2.3);
      face.setAttribute('transform', 'translate(' + f2(off) + ' 0)');
      if (at > 1.02) {
        P.cover.removeAttribute('display');
        P.cover.setAttribute('transform', 'translate(' + f2(-sg * (2 - Math.min(2, at)) * sp.r * 2.15) + ' 0)');
      } else P.cover.setAttribute('display', 'none');
      if (sp.drawHairOver) { if (at > 1.5) P.hairOver.removeAttribute('display'); else P.hairOver.setAttribute('display', 'none'); }
      if (sp.onTurn) sp.onTurn(c, turn);
      const bl = (c.noBlink || Math.abs(f.arc) > 0.2) ? 0 : blinkAmt(t, c.phase * 1.7);
      ['L', 'R'].forEach(function (s) {
        const sgn = s === 'L' ? -1 : 1;
        const ex = sgn * fs.eyeX * (1 + 0.45 * (f.eye - 1)), ey = fs.eyeY;
        const lid = Math.max(f['lid' + s], bl), aa = Math.abs(f.arc);
        const eg = P['eye' + s], arc = P['arc' + s];
        if (aa > 0.5) {
          eg.setAttribute('display', 'none'); arc.removeAttribute('display');
          const r = fs.eyeR * 0.95, d = f.arc > 0 ? -1 : 1, q = 0.55 + 0.9 * (aa - 0.5);
          arc.setAttribute('d', 'M' + f2(-r) + ',0 Q0,' + f2(d * r * 1.5 * q) + ' ' + f2(r) + ',0 Q0,' + f2(d * r * 0.72 * q) + ' ' + f2(-r) + ',0 Z');
          arc.setAttribute('transform', 'translate(' + f2(ex) + ' ' + f2(ey + (f.arc > 0 ? 3 : -1)) + ')');
        } else {
          arc.setAttribute('display', 'none'); eg.removeAttribute('display');
          const open = Math.max(0.07, (1 - lid * 0.93) * (1 - 2 * aa));
          eg.setAttribute('transform', 'translate(' + f2(ex) + ' ' + f2(ey) + ') scale(' + f.eye.toFixed(3) + ' ' + (f.eye * open).toFixed(3) + ')');
          const pr = fs.pupR * f.pupS, lim = Math.max(0, fs.eyeR - pr - 0.6);
          let px = f.pupX, py = f.pupY; const pl = Math.hypot(px, py);
          if (pl > lim && pl > 0) { px *= lim / pl; py *= lim / pl; }
          const pu = P['pup' + s]; pu.setAttribute('cx', f2(px)); pu.setAttribute('cy', f2(py)); pu.setAttribute('r', f2(pr));
          const hl = P['hl' + s];
          if (f.hl > 0.5) { hl.removeAttribute('display'); hl.setAttribute('cx', f2(px + pr * 0.38)); hl.setAttribute('cy', f2(py - pr * 0.4)); } else hl.setAttribute('display', 'none');
        }
        const brow = P['brow' + s];
        const rot = (s === 'L' ? -f.browT : f.browT) + f['browR' + s];
        brow.setAttribute('transform', 'translate(' + f2(sgn * fs.browX) + ' ' + f2(fs.browY - f.browY - f['browY' + s] - (f.eye - 1) * fs.eyeR) + ') rotate(' + f2(rot) + ')');
        const tv = f['tear' + s], te = P['tear' + s];
        if (tv > 0.01) {
          te.removeAttribute('display');
          te.setAttribute('transform', 'translate(' + f2(ex + sgn * 1.5) + ' ' + f2(ey + fs.eyeR + 4 + tv * 30) + ') scale(' + f2(0.6 + 0.6 * Math.min(1, tv * 3)) + ')');
          te.setAttribute('opacity', f2(Math.min(1, tv * 6) * clamp((1 - tv) * 7, 0, 1)));
        } else te.setAttribute('display', 'none');
      });
      P.cheekL.setAttribute('r', f2(fs.cheekR * f.cheek)); P.cheekR.setAttribute('r', f2(fs.cheekR * f.cheek));
      const ms = fs.ms, mw = f.mw * ms, ma = f.ma * ms, mb = f.mb * ms;
      const md = mouthPath(mw, ma, mb);
      P.mouth.setAttribute('d', md); P.mouthClip.setAttribute('d', md);
      P.mouthG.setAttribute('transform', 'translate(' + f2(f.mx * ms) + ' ' + f2(fs.mouthY + f.my + jaw * 0.6) + ') rotate(' + f2(f.mrot) + ')');
      const gap = mb - ma;
      if (gap > 12 * ms && mb > 7) {
        P.tongue.removeAttribute('display');
        P.tongue.setAttribute('cy', f2(mb * 0.74)); P.tongue.setAttribute('rx', f2(mw * 0.62)); P.tongue.setAttribute('ry', f2(gap * 0.2));
      } else P.tongue.setAttribute('display', 'none');
      if (f.teeth > 0.5 && gap > 11 * ms) {
        P.teeth.removeAttribute('display');
        P.teeth.setAttribute('y', f2(Math.min(0, ma * 0.75) - 2)); P.teeth.setAttribute('height', f2(6.5 * ms + Math.max(0, ma * 0.75)));
      } else P.teeth.setAttribute('display', 'none');
      if (P.overMouth) P.overMouth.setAttribute('transform', 'translate(0 ' + f2(jaw * 0.25) + ')');
      if (f.light > 0.01) {
        P.light.removeAttribute('display');
        P.light.setAttribute('cx', f2(c.lightDir * sp.r * 1.25)); P.light.setAttribute('cy', f2(sp.r * 0.35));
        P.light.setAttribute('opacity', f2(0.5 * f.light));
      } else P.light.setAttribute('display', 'none');
    };

    st.chars.push(c);
    return c;
  }

  /* ---- shared shoe ---- */
  function sneaker(color, sole) {
    return function (g) {
      S('path', { d: 'M-17,0 L31,0 Q39,0 39,-9 Q39,-19 24,-22 L10,-27 L-13,-27 Q-21,-27 -21,-19 L-21,-4 Q-21,0 -17,0 Z', fill: color }, g);
      if (sole) S('path', { d: 'M-17,0 L31,0 Q39,0 39,-7 L-21,-7 L-21,-4 Q-21,0 -17,0 Z', fill: sole }, g);
    };
  }
  function pol(deg, r) { return [f2(r * Math.sin(deg * D2R)), f2(-r * Math.cos(deg * D2R))]; }

  /* ---- HERO: 25, 5.5 heads tall, shoulders 1.6 heads wide ---- */
  const HERO_SPEC = {
    name: 'HERO', r: 50, hip: 250, torso: 190, neck: 10, shX: 60, shY: 20, L1: 92, L2: 86,
    hipW: 27, legW: 46, thigh: 122, shin: 116, ankle: 12, footX: 30, shadow: 100, turnPx: 13,
    legColor: C.TROUSERS, hairColor: C.HAIR, browColor: C.HAIR, probe: { x: -32, y: -118 },
    arm: { color: C.HOODIE, w: 40, hand: 19, cuff: { color: C.POCKET, len: 13, w: 42 } },
    face: { eyeX: 18, eyeY: -3, eyeR: 12.5, pupR: 5.8, browX: 18, browY: -24, browW: 22, browH: 6.5, cheekX: 31, cheekY: 13, cheekR: 8.5, noseY: 8, noseRx: 4.6, noseRy: 3.6, mouthY: 26, ms: 1 },
    drawFoot: sneaker(PALETTE.WHITE, C.GREY),
    drawTorso: function (g) {
      const T = 190;
      S('ellipse', { cx: 0, cy: -T - 4, rx: 50, ry: 27, fill: C.POCKET }, g);                               // hood
      S('rect', { x: -15, y: -T - 16, width: 30, height: 26, fill: C.SKIN }, g);                            // neck
      S('path', { d: 'M-62,' + (-T + 8) + ' Q-62,' + (-T - 3) + ' -48,' + (-T - 4) + ' L48,' + (-T - 4) + ' Q62,' + (-T - 3) + ' 62,' + (-T + 8) + ' L59,14 Q59,26 47,26 L-47,26 Q-59,26 -59,14 Z', fill: C.HOODIE }, g);
      S('ellipse', { cx: 0, cy: -T - 2, rx: 23, ry: 10, fill: C.POCKET }, g);                               // collar opening
      S('rect', { x: -59, y: 12, width: 118, height: 14, rx: 7, fill: C.POCKET }, g);                       // hem band
      S('path', { d: 'M-33,-80 L33,-80 Q40,-80 42,-73 L54,-24 Q56,-15 47,-15 L-47,-15 Q-56,-15 -54,-24 L-42,-73 Q-40,-80 -33,-80 Z', fill: C.POCKET }, g);   // pocket
      S('path', { d: 'M-13,' + (-T + 5) + ' L-15,' + (-T + 54), stroke: PALETTE.WHITE, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, g);   // two white strings
      S('path', { d: 'M13,' + (-T + 5) + ' L15,' + (-T + 48), stroke: PALETTE.WHITE, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, g);
    },
    drawBehindHead: function (g) {
      S('circle', { cx: -48, cy: 5, r: 9, fill: C.SKIN }, g); S('circle', { cx: 48, cy: 5, r: 9, fill: C.SKIN }, g);
    },
    drawJaw: function (g) {                                                                                  // jaw stubble
      S('path', { d: 'M-51,15 Q-37,22 -25,21 Q0,14 25,21 Q37,22 51,15 L51,70 L-51,70 Z', fill: C.STUBBLE }, g);
    },
    drawHairFront: function (g) {                                                                            // five-spike hair
      const n = 5, a0 = -84, a1 = 84, pts = [];
      pts.push(pol(a0 - 12, 52));
      for (let i = 0; i < n; i++) {
        const a = a0 + (a1 - a0) * (i + 0.5) / n;
        pts.push(pol(a + 7, 77 + (i === 2 ? 5 : i === 1 || i === 3 ? 2 : -3)));
        if (i < n - 1) pts.push(pol(a0 + (a1 - a0) * (i + 1) / n + 3, 55));
      }
      const end = pol(a1 + 12, 52);
      let d = 'M' + pts[0].join(',');
      for (let i = 1; i < pts.length; i++) d += ' L' + pts[i].join(',');
      d += ' L' + end.join(',') + ' C46,-24 18,-33 2,-27 C-12,-22 -38,-24 ' + pts[0].join(',') + ' Z';
      S('path', { d: d, fill: C.HAIR, 'stroke-linejoin': 'round' }, g);
    }
  };

  /* ---- RICH: 55, 10 % wider than HERO ---- */
  const LAPEL = mix(C.SUIT, PALETTE.DUSK, 0.42);
  const RICH_SPEC = {
    name: 'RICH', r: 52, hip: 250, torso: 186, neck: 8, shX: 66, shY: 22, L1: 92, L2: 86,
    hipW: 30, legW: 50, thigh: 122, shin: 116, ankle: 12, footX: 33, shadow: 110, turnPx: 13,
    legColor: C.SUIT, hairColor: C.GREY, browColor: C.GREY, probe: { x: -40, y: -60 },
    arm: { color: C.SUIT, w: 44, hand: 20, cuff: { color: PALETTE.WHITE, len: 9, w: 44 }, watch: { side: 'L', color: PALETTE.GOLD, len: 9, w: 47, at: 9 } },
    face: { eyeX: 19, eyeY: -5, eyeR: 10.5, pupR: 5.2, browX: 19, browY: -23, browW: 25, browH: 8, cheekX: 34, cheekY: 12, cheekR: 8, noseY: 6, noseRx: 6.5, noseRy: 5.2, mouthY: 30, ms: 0.95 },
    tweak: { smile: { mw: 15, ma: 6, mb: 15 } },
    drawFoot: sneaker(C.HAIR, null),
    drawTorso: function (g) {
      const T = 186;
      S('rect', { x: -16, y: -T - 14, width: 32, height: 24, fill: C.SKIN }, g);
      S('path', { d: 'M-68,' + (-T + 8) + ' Q-68,' + (-T - 3) + ' -54,' + (-T - 4) + ' L54,' + (-T - 4) + ' Q68,' + (-T - 3) + ' 68,' + (-T + 8) + ' L71,-30 Q73,20 62,26 L-62,26 Q-73,20 -71,-30 Z', fill: C.SUIT }, g);
      S('path', { d: 'M-24,' + (-T - 4) + ' L24,' + (-T - 4) + ' L0,' + (-T + 66) + ' Z', fill: PALETTE.WHITE }, g);                 // shirt
      S('path', { d: 'M-8,' + (-T - 1) + ' L8,' + (-T - 1) + ' L5,' + (-T + 13) + ' L-5,' + (-T + 13) + ' Z', fill: C.TIE }, g);     // gold tie
      S('path', { d: 'M-5,' + (-T + 13) + ' L5,' + (-T + 13) + ' L10,' + (-T + 50) + ' L0,' + (-T + 64) + ' L-10,' + (-T + 50) + ' Z', fill: C.TIE }, g);
      S('path', { d: 'M-24,' + (-T - 4) + ' L-42,' + (-T - 4) + ' L-47,' + (-T + 30) + ' L-5,' + (-T + 74) + ' L0,' + (-T + 66) + ' Z', fill: LAPEL }, g);
      S('path', { d: 'M24,' + (-T - 4) + ' L42,' + (-T - 4) + ' L47,' + (-T + 30) + ' L5,' + (-T + 74) + ' L0,' + (-T + 66) + ' Z', fill: LAPEL }, g);
      S('path', { d: 'M30,' + (-T + 52) + ' L50,' + (-T + 52) + ' L46,' + (-T + 40) + ' L40,' + (-T + 47) + ' L34,' + (-T + 39) + ' Z', fill: C.TIE }, g);  // pocket square
      S('circle', { cx: 0, cy: -T + 92, r: 4.5, fill: LAPEL }, g);
    },
    drawBehindHead: function (g) {
      S('circle', { cx: -50, cy: 4, r: 9.5, fill: C.SKIN }, g); S('circle', { cx: 50, cy: 4, r: 9.5, fill: C.SKIN }, g);
      S('rect', { x: -55, y: -30, width: 14, height: 32, rx: 6, fill: C.GREY }, g); S('rect', { x: 41, y: -30, width: 14, height: 32, rx: 6, fill: C.GREY }, g);
    },
    drawOverMouth: function (g) {                                                                           // grey moustache
      S('path', { d: 'M0,13 C-7,8 -20,11 -27,22 C-18,25 -7,23 0,19 C7,23 18,25 27,22 C20,11 7,8 0,13 Z', fill: C.GREY }, g);
    },
    drawHairFront: function (g) {                                                                           // swept grey hair
      S('path', { d: 'M-54,-6 C-60,-44 -34,-70 2,-68 C22,-70 44,-62 54,-46 C60,-34 58,-18 54,-6 C52,-22 42,-34 26,-38 C8,-32 -22,-36 -40,-26 C-46,-20 -50,-14 -54,-6 Z', fill: C.GREY }, g);
      S('path', { d: 'M-40,-52 C-24,-70 20,-76 50,-56 C34,-62 10,-64 -8,-56 C-20,-52 -32,-48 -40,-52 Z', fill: PALETTE.WHITE, opacity: 0.55 }, g);
    }
  };

  /* ---- BRIDE: 24, 5.3 heads tall ---- */
  const BRIDE_HAIR_D = 'M0,-60 C34,-62 60,-40 60,-6 C60,14 68,26 64,46 C60,62 70,78 66,98 C62,116 68,130 58,146 C46,160 28,152 14,158 C4,162 -4,162 -14,158 C-28,152 -46,160 -58,146 C-68,130 -62,116 -66,98 C-70,78 -60,62 -64,46 C-68,26 -60,14 -60,-6 C-60,-40 -34,-62 0,-60 Z';
  const BRIDE_SPEC = {
    name: 'BRIDE', r: 48, hip: 236, torso: 165, neck: 12, shX: 44, shY: 14, L1: 84, L2: 78,
    hipW: 17, legW: 20, thigh: 114, shin: 110, ankle: 12, footX: 19, shadow: 92, turnPx: 12,
    legColor: C.SKIN, hairColor: C.BRIDE_HAIR, browColor: C.BRIDE_HAIR, probe: { x: 0, y: -80 },
    arm: { color: C.SKIN, w: 24, hand: 15, cap: { color: PALETTE.CREAM, len: 20, w: 31 } },
    face: { eyeX: 17, eyeY: -1, eyeR: 12, pupR: 6.2, browX: 17, browY: -20, browW: 19, browH: 4.6, cheekX: 30, cheekY: 13, cheekR: 8.5, noseY: 9, noseRx: 3, noseRy: 2.4, mouthY: 25, ms: 0.9, lash: true },
    drawFoot: function (g) { S('path', { d: 'M-12,0 L26,0 Q33,0 32,-7 Q30,-14 16,-15 L-10,-17 Q-16,-17 -16,-10 L-16,-4 Q-16,0 -12,0 Z', fill: PALETTE.CREAM }, g); },
    drawLower: function (c, g) { c.parts.skirt = S('path', { fill: PALETTE.CREAM }, g); },
    updateLower: function (c, tp, pel) {
      const p = c.pose, wl = tp(-29, -50), wr = tp(29, -50);
      const hemY = -40, cx = (p.fL.x + p.fR.x) / 2 + p.hem, hw = 82 - 14 * p.sit;
      const h = hemY - wl.y, k = Math.max(20, h * 0.45);
      c.parts.skirt.setAttribute('d', 'M' + f2(wl.x) + ',' + f2(wl.y) + ' C' + f2(wl.x - 14) + ',' + f2(wl.y + k) + ' ' + f2(cx - hw) + ',' + f2(hemY - k) + ' ' + f2(cx - hw) + ',' + hemY +
        ' Q' + f2(cx) + ',' + (hemY + 12) + ' ' + f2(cx + hw) + ',' + hemY + ' C' + f2(cx + hw) + ',' + f2(hemY - k) + ' ' + f2(wr.x + 14) + ',' + f2(wr.y + k) + ' ' + f2(wr.x) + ',' + f2(wr.y) + ' Z');
    },
    drawTorso: function (g) {
      const T = 165;
      S('rect', { x: -9.5, y: -T - 16, width: 19, height: 30, fill: C.SKIN }, g);                            // neck
      S('path', { d: 'M-46,' + (-T + 6) + ' Q-22,' + (-T - 4) + ' 0,' + (-T + 14) + ' Q22,' + (-T - 4) + ' 46,' + (-T + 6) + ' L44,' + (-T + 40) + ' Q32,-84 29,-52 L31,4 L-31,4 L-29,-52 Q-32,-84 -44,' + (-T + 40) + ' Z', fill: PALETTE.CREAM }, g);
      S('path', { d: 'M-18,' + (-T + 4) + ' Q0,' + (-T + 30) + ' 18,' + (-T + 4) + ' Q0,' + (-T + 12) + ' -18,' + (-T + 4) + ' Z', fill: C.SKIN }, g);   // neckline
    },
    drawHairBack: function (g) { S('path', { d: BRIDE_HAIR_D, fill: C.BRIDE_HAIR }, g); },
    drawBehindHead: function (g) {                                                                           // locks over the shoulders
      S('path', { d: 'M-45,-8 C-58,10 -53,40 -58,62 C-60,82 -50,98 -43,106 C-40,86 -45,62 -41,42 C-38,24 -40,10 -39,0 Z', fill: C.BRIDE_HAIR }, g);
      S('path', { d: 'M45,-8 C58,10 53,40 58,62 C60,82 50,98 43,106 C40,86 45,62 41,42 C38,24 40,10 39,0 Z', fill: C.BRIDE_HAIR }, g);
    },
    drawHairFront: function (g, c) {
      S('path', { d: 'M-48.6,6 C-56,-34 -32,-57 2,-55 C34,-55 56,-34 48.6,6 C46,-13 38,-27 22,-34 C10,-39 -1,-37 -8,-41 C-12,-27 -30,-12 -48.6,6 Z', fill: C.BRIDE_HAIR }, g);
      const pin = c.parts.pin = S('g', { transform: 'translate(36 -33)' }, g);                              // PINK flower pin
      for (let i = 0; i < 5; i++) { const a = i * 72 * D2R; S('circle', { cx: f2(7.4 * Math.sin(a)), cy: f2(-7.4 * Math.cos(a)), r: 6.3, fill: PALETTE.PINK }, pin); }
      S('circle', { cx: 0, cy: 0, r: 4.6, fill: PALETTE.GOLD }, pin);
    },
    drawHairOver: function (g) {
      S('path', { d: BRIDE_HAIR_D, fill: C.BRIDE_HAIR }, g);
    },
    onTurn: function (c, turn) {       // the pin sits on one side of the head: hide it when she faces away
      c.parts.pin.setAttribute('display', Math.abs(turn) > 1.3 ? 'none' : 'inline');
    }
  };

  /* ---- CHILD: toddler, 2.5 heads tall, BRIDE's hair, teal dungarees ---- */
  const CHILD_SPEC = {
    name: 'CHILD', r: 46, hip: 66, torso: 68, neck: 4, shX: 28, shY: 12, L1: 31, L2: 29,
    hipW: 15, legW: 27, thigh: 28, shin: 28, ankle: 10, footX: 17, shadow: 58, turnPx: 11,
    legColor: C.HOODIE, hairColor: C.BRIDE_HAIR, browColor: C.BRIDE_HAIR, probe: { x: 0, y: -30 },
    arm: { color: PALETTE.CREAM, w: 22, hand: 11.5 },
    face: { eyeX: 16.5, eyeY: 3, eyeR: 12, pupR: 6.8, browX: 16.5, browY: -15, browW: 15, browH: 4.4, cheekX: 30, cheekY: 18, cheekR: 9.5, noseY: 12, noseRx: 2.6, noseRy: 2, mouthY: 26, ms: 0.78 },
    drawFoot: function (g) { S('path', { d: 'M-11,0 L18,0 Q25,0 25,-7 Q25,-15 13,-16 L-9,-17 Q-15,-17 -15,-10 L-15,-4 Q-15,0 -11,0 Z', fill: PALETTE.WHITE }, g); },
    drawTorso: function (g) {
      const T = 68;
      S('path', { d: 'M-30,' + (-T + 8) + ' Q-30,' + (-T - 2) + ' -20,' + (-T - 2) + ' L20,' + (-T - 2) + ' Q30,' + (-T - 2) + ' 30,' + (-T + 8) + ' L30,2 L-30,2 Z', fill: PALETTE.CREAM }, g);   // shirt
      S('path', { d: 'M-32,-26 L32,-26 L32,6 Q32,14 24,14 L-24,14 Q-32,14 -32,6 Z', fill: C.HOODIE }, g);       // dungaree seat
      S('rect', { x: -21, y: -T + 18, width: 42, height: 30, rx: 6, fill: C.HOODIE }, g);                       // bib
      S('path', { d: 'M-17,' + (-T + 22) + ' L-22,' + (-T - 1), stroke: C.HOODIE, 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none' }, g);
      S('path', { d: 'M17,' + (-T + 22) + ' L22,' + (-T - 1), stroke: C.HOODIE, 'stroke-width': 9, 'stroke-linecap': 'round', fill: 'none' }, g);
      S('rect', { x: -10, y: -T + 27, width: 20, height: 13, rx: 4, fill: C.POCKET }, g);
      S('circle', { cx: -15.5, cy: -T + 23, r: 3, fill: PALETTE.GOLD }, g); S('circle', { cx: 15.5, cy: -T + 23, r: 3, fill: PALETTE.GOLD }, g);
    },
    drawHairBack: function (g) {
      S('path', { d: 'M0,-54 C30,-56 54,-36 54,-4 C54,10 60,20 54,32 C48,40 40,34 38,26 L-38,26 C-40,34 -48,40 -54,32 C-60,20 -54,10 -54,-4 C-54,-36 -30,-56 0,-54 Z', fill: C.BRIDE_HAIR }, g);
    },
    drawBehindHead: function (g) {
      S('circle', { cx: -45, cy: 8, r: 8, fill: C.SKIN }, g); S('circle', { cx: 45, cy: 8, r: 8, fill: C.SKIN }, g);
    },
    drawHairFront: function (g) {
      S('path', { d: 'M-46.6,4 C-54,-34 -30,-54 0,-52 C30,-54 54,-34 46.6,4 C42,-12 32,-24 16,-28 C6,-22 -8,-20 -20,-25 C-30,-20 -42,-10 -46.6,4 Z', fill: C.BRIDE_HAIR }, g);
      S('path', { d: 'M-4,-50 C-12,-66 4,-74 10,-64 C6,-66 0,-62 4,-50 Z', fill: C.BRIDE_HAIR }, g);          // curl
    }
  };

  const hero = (st, parent, o) => character(st, parent, HERO_SPEC, Object.assign({ phase: 0.0 }, o));
  const rich = (st, parent, o) => character(st, parent, RICH_SPEC, Object.assign({ phase: 1.1 }, o));
  const bride = (st, parent, o) => character(st, parent, BRIDE_SPEC, Object.assign({ phase: 2.0 }, o));
  const child = (st, parent, o) => character(st, parent, CHILD_SPEC, Object.assign({ phase: 0.6 }, o));

  /* ready-made poses (assign onto c.pose / tween towards them) */
  const POSE = {
    sit: function (sp) { return { dy: sp.hip - (sp.shin + sp.ankle + sp.thigh * 0.28) + 4, sit: 1 }; }
  };

  /* walk: n steps of `stride` world px, each `stepDur` s. The planted foot never slides,
     the body dips at each contact, arms swing; a 'step' sound event is logged per contact. */
  function walk(st, c, o) {
    const p = c.pose, sp = c.spec, dir = o.dir || 1, n = o.steps, sd = o.stepDur, k = c.root.k;
    const S_ = o.stride / k, half = S_ / 2, reach = sp.thigh + sp.shin, hipH = sp.hip - sp.ankle;
    const base = o.dy || 0, dip = base + hipH - Math.sqrt(Math.max(1, reach * reach - half * half)) + 3;
    const t0 = o.t0;
    st.cut(p, { kL: -dir, kR: -dir }, t0);
    st.cut(p.fL, { dir: dir }, t0); st.cut(p.fR, { dir: dir }, t0);
    st.tl.to(p, { hipS: 0.25, duration: 4 / FPS, ease: 'power1.out' }, t0);       // profile walk: hips in line
    let plant = dir > 0 ? 'R' : 'L', along = o.fromWalk ? half : sp.footX;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * sd, sw = plant === 'R' ? 'L' : 'R', fs = p['f' + sw], fp = p['f' + plant];
      st.tl.to(c.root, { x: '+=' + f2(dir * (along + half) * k), duration: sd, ease: 'none' }, t);
      st.tl.to(fp, { x: -dir * half, duration: sd, ease: 'none' }, t);
      st.tl.to(fs, { x: dir * half, duration: sd, ease: 'sine.inOut' }, t);
      st.tl.to(fs, { y: -20, r: -dir * 8, duration: sd / 2, ease: 'sine.out' }, t);
      st.tl.to(fs, { y: 0, r: 0, duration: sd / 2, ease: 'sine.in' }, t + sd / 2);
      st.tl.to(p, { dy: base, duration: sd / 2, ease: 'sine.out' }, t);
      st.tl.to(p, { dy: dip, duration: sd / 2, ease: 'sine.in' }, t + sd / 2);
      if (!o.noArms) {
        st.tl.to(p['a' + sw], { sw: -dir * 16, duration: sd, ease: 'sine.inOut' }, t);
        st.tl.to(p['a' + plant], { sw: dir * 16, duration: sd, ease: 'sine.inOut' }, t);
      }
      st.sfx('step', t + sd, { who: c.name, gain: o.gain === undefined ? 1 : o.gain });
      plant = sw; along = half;
    }
    return t0 + n * sd;
  }

  /* landing squash: 1.15 x 0.85 for 3 frames */
  function squash(st, obj, t, sx, sy, frames) {
    st.cut(obj, { sx: sx === undefined ? 1.15 : sx, sy: sy === undefined ? 0.85 : sy }, t);
    st.tl.to(obj, { sx: 1, sy: 1, duration: (frames || 3) / FPS, ease: 'power1.in' }, t);
  }

  /* ------------------------------------------------------------------ SET */
  const SET = {};
  /* sky: flat SKY above y0, SKY -> DUSK gradient from y0 down to the horizon */
  SET.sky = function (st, parent, o) {
    o = Object.assign({ y0: 0, horizon: 1210, x0: -3000, x1: 4080 }, o || {});
    const id = uid('sky');
    const lg = S('linearGradient', { id: id, gradientUnits: 'userSpaceOnUse', x1: 0, y1: o.y0, x2: 0, y2: o.horizon }, st.defs);
    S('stop', { offset: 0, 'stop-color': PALETTE.SKY }, lg); S('stop', { offset: 1, 'stop-color': PALETTE.DUSK }, lg);
    const g = S('g', {}, parent);
    S('rect', { x: o.x0, y: o.y0 - 9000, width: o.x1 - o.x0, height: 9001, fill: PALETTE.SKY }, g);
    S('rect', { x: o.x0, y: o.y0, width: o.x1 - o.x0, height: o.horizon - o.y0 + 2, fill: 'url(#' + id + ')' }, g);
    return g;
  };
  /* skyline 544174 with GOLD windows */
  SET.skyline = function (st, parent, o) {
    o = Object.assign({ x0: -200, x1: 1280, base: 1210, minH: 110, maxH: 320, seed: 7, lit: 0.34 }, o || {});
    const r = rng(o.seed), g = S('g', {}, parent);
    let x = o.x0;
    while (x < o.x1) {
      const w = 62 + Math.floor(r() * 70), h = o.minH + Math.floor(r() * (o.maxH - o.minH));
      S('rect', { x: x, y: o.base - h, width: w + 1, height: h + 2, fill: C.SKYLINE }, g);
      if (r() < 0.3) S('rect', { x: x + w * 0.3, y: o.base - h - 26, width: w * 0.4, height: 28, fill: C.SKYLINE }, g);
      const cols = Math.floor((w - 16) / 22), rows = Math.floor((h - 24) / 30);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if (r() < o.lit) S('rect', { x: f2(x + 12 + i * 22 + (w - 16 - cols * 22) / 2), y: o.base - h + 16 + j * 30, width: 10, height: 15, fill: PALETTE.GOLD }, g);
      }
      x += w;
    }
    return g;
  };
  SET.ground = function (st, parent, o) {
    o = Object.assign({ y: 1210, x0: -3000, x1: 4080, pathY: 1392, pathH: 86 }, o || {});
    const g = S('g', {}, parent);
    S('rect', { x: o.x0, y: o.y, width: o.x1 - o.x0, height: 4000, fill: PALETTE.GROUND }, g);
    if (o.pathH) S('rect', { x: o.x0, y: o.pathY, width: o.x1 - o.x0, height: o.pathH, fill: mix(PALETTE.GROUND, PALETTE.DUSK, 0.55) }, g);
    return g;
  };
  /* tree: orange FEB13F / FD893B in autumn, GREEN in spring */
  SET.tree = function (st, parent, o) {
    o = Object.assign({ x: 0, base: 1300, h: 620, r: 150, season: 'autumn' }, o || {});
    const A = o.season === 'spring' ? PALETTE.GREEN : C.LEAF_A;
    const B = o.season === 'spring' ? mix(PALETTE.GREEN, PALETTE.GROUND, 0.28) : C.LEAF_B;
    const g = S('g', {}, parent), r = o.r, cy = o.base - o.h + r, tw = Math.max(12, r * 0.17);
    S('rect', { x: o.x - tw / 2, y: cy, width: tw, height: o.base - cy, fill: C.BENCH }, g);
    S('path', { d: 'M' + o.x + ',' + (cy + r * 1.2) + ' L' + f2(o.x + r * 0.42) + ',' + f2(cy + r * 0.55), stroke: C.BENCH, 'stroke-width': f2(tw * 0.55), 'stroke-linecap': 'round', fill: 'none' }, g);
    S('circle', { cx: f2(o.x - r * 0.5), cy: f2(cy + r * 0.34), r: f2(r * 0.7), fill: B }, g);
    S('circle', { cx: o.x, cy: cy, r: r, fill: A }, g);
    S('circle', { cx: f2(o.x + r * 0.55), cy: f2(cy + r * 0.38), r: f2(r * 0.64), fill: A }, g);
    S('circle', { cx: f2(o.x + r * 0.28), cy: f2(cy + r * 0.5), r: f2(r * 0.46), fill: B }, g);
    return { g: g, x: o.x, top: cy - r, cy: cy, r: r };
  };
  /* lamp post with a 12 % white cone; state.on is tweenable (0 = dark, 1 = lit) */
  SET.lamp = function (st, parent, coneParent, o) {
    o = Object.assign({ x: 170, base: 1425, h: 830, dir: 1, on: 1, reach: 86, coneW: 470, coneY: 1452 }, o || {});
    const g = S('g', {}, parent), top = o.base - o.h, hx = o.x + o.dir * o.reach, hy = top + 44, ccx = o.coneCx === undefined ? hx : o.coneCx;
    const cone = S('path', { d: 'M' + (hx - 18) + ',' + (hy + 10) + ' L' + (hx + 18) + ',' + (hy + 10) + ' L' + (ccx + o.coneW / 2) + ',' + o.coneY + ' L' + (ccx - o.coneW / 2) + ',' + o.coneY + ' Z', fill: PALETTE.WHITE, opacity: 0.12 }, coneParent || parent);
    S('rect', { x: o.x - 17, y: o.base - 20, width: 34, height: 22, rx: 4, fill: C.INK }, g);
    S('rect', { x: o.x - 6.5, y: top + 30, width: 13, height: o.h - 40, fill: C.INK }, g);
    S('path', { d: 'M' + o.x + ',' + (top + 36) + ' Q' + o.x + ',' + top + ' ' + f2(o.x + o.dir * o.reach * 0.55) + ',' + top + ' Q' + hx + ',' + top + ' ' + hx + ',' + (top + 30), stroke: C.INK, 'stroke-width': 11, 'stroke-linecap': 'round', fill: 'none' }, g);
    const bulb = S('circle', { cx: hx, cy: hy + 6, r: 15, fill: PALETTE.GOLD }, g);
    S('path', { d: 'M' + (hx - 27) + ',' + (hy + 4) + ' Q' + (hx - 24) + ',' + (hy - 20) + ' ' + hx + ',' + (hy - 22) + ' Q' + (hx + 24) + ',' + (hy - 20) + ' ' + (hx + 27) + ',' + (hy + 4) + ' Z', fill: C.INK }, g);
    const lamp = { g: g, cone: cone, bulb: bulb, state: { on: o.on }, hx: hx, hy: hy, top: top - 6 };
    st.post.push(function () {
      const v = clamp(lamp.state.on, 0, 1);
      bulb.setAttribute('fill', mix(C.BULB_OUT, PALETTE.GOLD, v));
      if (v <= 0.001) cone.setAttribute('display', 'none'); else { cone.removeAttribute('display'); cone.setAttribute('opacity', (0.12 * v).toFixed(4)); }
    });
    return lamp;
  };
  /* bench 794C6E; x = centre, y = ground line */
  SET.bench = function (st, parent, o) {
    o = Object.assign({ x: 330, y: 1420, w: 320 }, o || {});
    const g = S('g', {}, parent), dark = mix(C.BENCH, C.INK, 0.42), x0 = o.x - o.w / 2;
    [0.14, 0.86].forEach(function (u) {
      S('rect', { x: f2(x0 + o.w * u - 8), y: o.y - 262, width: 16, height: 130, fill: dark }, g);
      S('rect', { x: f2(x0 + o.w * u - 9), y: o.y - 128, width: 18, height: 133, fill: dark }, g);
    });
    S('rect', { x: x0, y: o.y - 268, width: o.w, height: 30, rx: 8, fill: C.BENCH }, g);
    S('rect', { x: x0, y: o.y - 228, width: o.w, height: 30, rx: 8, fill: C.BENCH }, g);
    S('rect', { x: x0 - 8, y: o.y - 148, width: o.w + 16, height: 24, rx: 8, fill: C.BENCH }, g);
    return { g: g, x: o.x, y: o.y, seatY: o.y - 148, w: o.w };
  };
  /* at most 8 leaves falling on a slow sine (procedural, seeded) */
  SET.leaves = function (st, parent, o) {
    o = Object.assign({ n: 8, seed: 11, spawn: [{ x0: 0, x1: 120, y0: 760 }, { x0: 960, x1: 1080, y0: 760 }], y1: 1420, colors: [C.LEAF_A, C.LEAF_B] }, o || {});
    const n = Math.min(8, o.n), r = rng(o.seed), g = S('g', {}, parent), L = [];
    for (let i = 0; i < n; i++) {
      const sp = o.spawn[i % o.spawn.length];
      const el = S('path', { d: 'M-11,0 Q0,-9 11,0 Q0,9 -11,0 Z', fill: o.colors[i % o.colors.length] }, g);
      L.push({ el: el, x: sp.x0 + r() * (sp.x1 - sp.x0), y0: sp.y0, T: 7 + r() * 5, ph: r(), amp: 22 + r() * 26, rot: r() * 360 });
    }
    const state = { o: 1 };
    st.post.push(function (t) {
      for (const l of L) {
        const u = (((t / l.T + l.ph) % 1) + 1) % 1, y = lerp(l.y0, o.y1, u);
        const w = 2 * Math.PI * (t / 2.8 + l.ph * 3);
        const op = clamp(u * 9, 0, 1) * clamp((1 - u) * 14, 0, 1) * state.o;
        if (op <= 0.002) { l.el.setAttribute('display', 'none'); continue; }
        l.el.removeAttribute('display');
        l.el.setAttribute('transform', 'translate(' + f2(l.x + l.amp * Math.sin(w)) + ' ' + f2(y) + ') rotate(' + f2(l.rot + 40 * Math.cos(w)) + ')');
        l.el.setAttribute('opacity', op.toFixed(3));
      }
    });
    return { g: g, state: state };
  };

  /* ------------------------------------------------------------------ BULBS
     six round GOLD bulbs on one wire; lit = 30 % glow disc, out = 544174 */
  function bulbs(st, parent, o) {
    o = Object.assign({ x0: 300, y0: 600, x1: 780, y1: 600, sag: 46, r: 14, lit: [1, 1, 1, 1, 1, 1] }, o || {});
    const g = S('g', { class: 'bulbs', 'data-fg': 1 }, parent);
    const at = u => ({ x: lerp(o.x0, o.x1, u), y: lerp(o.y0, o.y1, u) + o.sag * 4 * u * (1 - u) });
    let d = '';
    for (let i = 0; i <= 24; i++) { const p = at(i / 24); d += (i ? ' L' : 'M') + f2(p.x) + ',' + f2(p.y); }
    S('path', { d: d, fill: 'none', stroke: C.SKYLINE, 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    const B = { g: g, state: [], pos: [], at: at, r: o.r };
    for (let i = 0; i < 6; i++) {
      const p = at((i + 0.5) / 6), y = p.y + o.r + 9;
      const glow = S('circle', { cx: f2(p.x), cy: f2(y), r: f2(o.r * 2.5), fill: PALETTE.GOLD, opacity: 0.3 }, g);
      S('rect', { x: f2(p.x - 5), y: f2(p.y - 1), width: 10, height: 11, rx: 2, fill: C.INK }, g);
      const bulb = S('circle', { cx: f2(p.x), cy: f2(y), r: o.r, fill: PALETTE.GOLD }, g);
      B.pos.push({ x: p.x, y: y, wire: p });
      B.state.push({ lit: o.lit[i], flick: 0, glow: glow, bulb: bulb, level: o.lit[i] });
    }
    st.post.push(function (t) {
      for (const s of B.state) {
        let v = clamp(s.lit, 0, 1);
        if (s.flick > 0) v *= 1 - 0.72 * s.flick * (Math.sin(2 * Math.PI * 2 * t) < 0 ? 1 : 0);    // 2 Hz flicker
        s.level = v;
        s.bulb.setAttribute('fill', mix(C.BULB_OUT, PALETTE.GOLD, v));
        if (v <= 0.002) s.glow.setAttribute('display', 'none'); else { s.glow.removeAttribute('display'); s.glow.setAttribute('opacity', (0.3 * v).toFixed(4)); }
      }
    });
    return B;
  }

  /* ------------------------------------------------------------------ thought bubble + MARK figure */
  function bubble(st, parent, o) {
    o = Object.assign({ w: 300, h: 220, seed: 5, fill: PALETTE.CREAM }, o || {});
    const g = S('g', { class: 'bubble', 'data-fg': 1 }, parent), rx = o.w / 2, ry = o.h / 2, r = rng(o.seed), shapes = [];
    shapes.push(S('ellipse', { cx: 0, cy: 0, rx: f2(rx * 0.86), ry: f2(ry * 0.84), fill: o.fill }, g));
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3, br = Math.min(rx, ry) * (0.3 + 0.12 * r());
      shapes.push(S('circle', { cx: f2(Math.cos(a) * (rx - br * 0.95)), cy: f2(Math.sin(a) * (ry - br * 0.95)), r: f2(br), fill: o.fill }, g));
    }
    return { g: g, shapes: shapes, content: S('g', {}, g), setFill: function (c) { shapes.forEach(s => s.setAttribute('fill', c)); } };
  }
  /* dark silhouette in a crooked veil with the MARK for a face */
  function markFigure(st, parent, o) {
    o = Object.assign({ mark: '?' }, o || {});
    const g = S('g', {}, parent), dark = C.HAIR, veil = C.SKYLINE;
    const vb = S('g', { transform: 'rotate(-11 0 -30)' }, g);                 // veil, hanging crooked behind the bust
    S('path', { d: 'M-46,-56 C-30,-86 30,-88 47,-56 C62,-18 78,40 94,98 L68,84 L46,102 L23,84 L0,102 L-23,84 L-46,102 L-66,86 L-90,100 C-76,40 -60,-18 -46,-56 Z', fill: veil }, vb);
    S('path', { d: 'M-72,98 Q-72,38 -27,31 L27,31 Q72,38 72,98 Z', fill: dark }, g);
    S('rect', { x: -12, y: 8, width: 24, height: 30, fill: dark }, g);
    S('circle', { cx: 0, cy: -28, r: 40, fill: dark }, g);
    S('path', { d: 'M-43,-36 C-40,-74 -14,-80 6,-78 C30,-76 46,-60 44,-36 C30,-54 -20,-58 -43,-36 Z', fill: veil, transform: 'rotate(-11 0 -30)' }, g);
    const tx = S('text', { x: 0, y: -6, 'text-anchor': 'middle', 'font-family': 'Inter', 'font-weight': 800, 'font-size': 58, fill: PALETTE.CREAM }, g);
    tx.textContent = o.mark;
    return { g: g, text: tx };
  }

  /* ------------------------------------------------------------------ export */
  global.KIT = {
    W: W, H: H, FPS: FPS, PALETTE: PALETTE, C: C, SET: SET, EXPR: EXPR, EXPR_NAMES: Object.keys(EXPR),
    S: S, mix: mix, rng: rng, clamp: clamp, lerp: lerp, spring: spring, ik: ik,
    ready: ready, stage: stage, run: run,
    HERO: hero, RICH: rich, BRIDE: bride, CHILD: child, hero: hero, rich: rich, bride: bride, child: child,
    SPECS: { HERO: HERO_SPEC, RICH: RICH_SPEC, BRIDE: BRIDE_SPEC, CHILD: CHILD_SPEC },
    POSE: POSE, walk: walk, squash: squash,
    BULBS: bulbs, bulbs: bulbs, bubble: bubble, markFigure: markFigure
  };
})(window);
