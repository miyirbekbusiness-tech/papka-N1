// kit.js — shared kit for the 60 s Reel (parts 1–4).
// Flat SVG shapes, no outlines, no gradients on characters.
// Every character is a function returning a Rig whose pose object (rig.p) is
// tweened by one paused GSAP timeline; rig.apply(t) writes the pose to the DOM.

export const PALETTE = {
  SKY: '#170E3A', DUSK: '#32246A', GROUND: '#22184D', PINK: '#FF4F8C',
  CREAM: '#F6EFFD', GOLD: '#FFD27B', GREEN: '#49B569', WHITE: '#FFFFFF',
  INK: '#0D0824',
};
const P = PALETTE;
export const W = 1080, H = 1920, FPS = 30, BPM = 120;
export const F = n => n / FPS;                // frames -> seconds
export const SAFE = { x0: 120, x1: 960, y0: 250, y1: 1500, subClear: 460 };

// ---------------------------------------------------------------- helpers
const NS = 'http://www.w3.org/2000/svg';
export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };
export function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
export function rgb2hex(c) { return '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
export function mix(a, b, k) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => lerp(v, B[i], k))); }
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// damped spring ease, damping ratio z (0.55 / 0.6 in the brief)
export function spring(z = 0.6) {
  const w = 4.8 / z, wd = w * Math.sqrt(1 - z * z);
  return k => {
    if (k >= 1) return 1;
    const v = 1 - Math.exp(-z * w * k) * (Math.cos(wd * k) + (z * w / wd) * Math.sin(wd * k));
    return k > 0.9 ? lerp(v, 1, (k - 0.9) / 0.1) : v;
  };
}
export const backOut = (s = 1.7) => k => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
// pulse used for 3-frame squash: 0 -> 1 -> 0
export const pulse = (t, t0, len) => { const k = (t - t0) / len; return k < 0 || k > 1 ? 0 : Math.sin(Math.PI * k); };

// ---------------------------------------------------------------- engine
// boot(build) creates the 1080x1920 svg, waits for fonts, builds one paused
// timeline and exposes window.renderAt(t). ?t= freezes on that time.
export async function boot(build, { seed = 7, duration = 15 } = {}) {
  const fontsCss = `@font-face{font-family:Inter;font-weight:700;src:url(fonts/inter-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:Inter;font-weight:800;src:url(fonts/inter-latin-800-normal.woff2) format('woff2')}
html,body{margin:0;background:${P.SKY};overflow:hidden}svg{display:block}`;
  const st = document.createElement('style'); st.textContent = fontsCss; document.head.appendChild(st);
  const probe = 'Tasavvur boʻlsa “…” – 0123456789 $?_';
  await Promise.all([document.fonts.load(`800 56px Inter`, probe), document.fonts.load(`700 34px Inter`, probe)]);
  await document.fonts.ready;

  const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, id: 'stage' });
  document.body.appendChild(svg);
  const defs = el('defs', {}, svg);
  const sky = el('linearGradient', { id: 'skyGrad', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: '0', 'stop-color': P.SKY }, sky);
  el('stop', { offset: '1', 'stop-color': P.DUSK }, sky);
  const bg = el('g', { id: 'bg' }, svg);
  el('rect', { id: 'skyRect', x: 0, y: 0, width: W, height: H, fill: 'url(#skyGrad)' }, bg);
  const camG = el('g', { id: 'cam' }, svg);
  const world = el('g', { id: 'world' }, camG);
  const fx = el('g', { id: 'fx' }, svg);       // screen-space overlays (wipes)
  const ui = el('g', { id: 'ui' }, svg);       // SUB / LABEL, screen space

  const ctx = {
    svg, defs, bg, camG, world, fx, ui, rand: mulberry32(seed), duration,
    tl: gsap.timeline({ paused: true }),
    cam: { x: W / 2, y: H / 2, s: 1, r: 0 }, rigs: [], procs: [], subs: [], labels: [], events: [],
    t: 0,
  };
  ctx.event = (time, name, extra = {}) => ctx.events.push({ t: +time.toFixed(4), name, ...extra });
  await build(ctx);
  ctx.tl.to({}, { duration: 0.0001 }, duration - 0.0001); // pin length
  const applyCam = () => {
    const c = ctx.cam;
    camG.setAttribute('transform', `translate(${W / 2} ${H / 2}) rotate(${c.r}) scale(${c.s}) translate(${-c.x} ${-c.y})`);
  };
  ctx.toScreen = (x, y) => {
    const c = ctx.cam, a = c.r * Math.PI / 180;
    const dx = (x - c.x) * c.s, dy = (y - c.y) * c.s;
    return [W / 2 + dx * Math.cos(a) - dy * Math.sin(a), H / 2 + dx * Math.sin(a) + dy * Math.cos(a)];
  };
  window.renderAt = t => {
    ctx.t = t;
    ctx.tl.seek(t + 1e-4, false); ctx.tl.seek(t, false); // force a render even when t is unchanged
    applyCam();
    for (const r of ctx.rigs) r.apply(t);
    for (const p of ctx.procs) p(t);
    return t;
  };
  window.__ctx = ctx;
  window.__meta = { subs: ctx.subs, labels: ctx.labels.map(l => l.meta), events: ctx.events, duration };
  const q = new URLSearchParams(location.search);
  if (q.has('t')) { window.renderAt(parseFloat(q.get('t')) || 0); window.__ready = true; }
  else if (q.has('f')) { window.renderAt((parseFloat(q.get('f')) || 0) / FPS); window.__ready = true; }
  else {
    window.renderAt(0); window.__ready = true;
    const t0 = performance.now();
    const loop = () => { window.renderAt(((performance.now() - t0) / 1000) % duration); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  return ctx;
}

// camera helpers (one group transform)
export function camSet(ctx, time, v) { ctx.tl.set(ctx.cam, v, time); }
export function camTo(ctx, time, dur, v, ease = 'power2.inOut') { ctx.tl.to(ctx.cam, { ...v, duration: dur, ease }, time); }

// ---------------------------------------------------------------- SUB
const measureCtx = (() => { let c; return () => c || (c = document.createElement('canvas').getContext('2d')); })();
export function textWidth(str, font) { const m = measureCtx(); m.font = font; return m.measureText(str).width; }
function wrap(text, font, maxW) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const tryL = cur ? cur + ' ' + w : w;
    if (textWidth(tryL, font) <= maxW || !cur) cur = tryL; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
// SUB: Inter 800 56/68 (shrinks to 50), WHITE, left x=120, top y=290,
// max width 840, max 2 lines. In over 4 frames (opacity), out as a cut.
export function SUB(ctx, { id, text, t0, t1, color = P.WHITE, x = 120, top = 290, size = 56, lh = 68, minSize = 50, weight = 800, maxW = 840, maxLines = 2, parent }) {
  let s = size, l = lh, lines;
  for (; s >= minSize; s -= 1) {
    l = Math.round(lh * s / size);
    lines = wrap(text, `${weight} ${s}px Inter`, maxW);
    if (lines.length <= maxLines) break;
  }
  if (s < minSize) { s = minSize; l = Math.round(lh * s / size); }
  if (lines.length > maxLines) console.error('SUB does not fit', id, text);
  const g = el('g', { id: 'sub_' + id, opacity: 0, class: 'sub' }, parent || ctx.ui);
  const asc = 0.96875 * s + (l - 1.2109 * s) / 2;
  const tx = el('text', { x, y: top + asc, fill: color, 'font-family': 'Inter', 'font-weight': weight, 'font-size': s }, g);
  lines.forEach((ln, i) => { const ts = el('tspan', { x, y: top + asc + i * l }, tx); ts.textContent = ln; });
  ctx.tl.set(g, { opacity: 0 }, 0);
  ctx.tl.to(g, { opacity: 1, duration: F(4), ease: 'none' }, t0);
  ctx.tl.set(g, { opacity: 0 }, t1);
  const meta = { id, text, t0, t1, size: s, lines: lines.length, words: text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length, box: [x, top, maxW, lines.length * l] };
  ctx.subs.push(meta);
  return { g, meta, text: tx };
}

// LABEL: Inter 700 34 px WHITE on a PINK pill, radius 12, 2 px leader line.
// Screen space; the leader end follows a world anchor through the camera.
export function LABEL(ctx, { id, text, x, y, anchor, t0, t1 = 1e9, z = 0.6, popLen = 0.5 }) {
  const font = '700 34px Inter', tw = textWidth(text, font), pw = tw + 40, ph = 58;
  const g = el('g', { id: 'label_' + id, class: 'label' }, ctx.ui);
  const leader = el('line', { stroke: P.PINK, 'stroke-width': 2 }, g);
  const pill = el('g', {}, g);
  el('rect', { x: -pw / 2, y: -ph / 2, width: pw, height: ph, rx: 12, fill: P.PINK }, pill);
  const tx = el('text', { x: 0, y: 12, 'text-anchor': 'middle', fill: P.WHITE, 'font-family': 'Inter', 'font-weight': 700, 'font-size': 34 }, pill);
  tx.textContent = text;
  const st = { k: 0, lead: 0 };
  ctx.tl.set(st, { k: 0, lead: 0 }, 0);
  // 4-frame anticipation (dip) then spring pop
  ctx.tl.to(st, { lead: 1, duration: F(6), ease: 'expo.out' }, t0 - F(4));
  ctx.tl.to(st, { k: 1, duration: popLen, ease: spring(z) }, t0);
  if (t1 < 1e8) ctx.tl.set(st, { k: 0, lead: 0 }, t1);
  ctx.procs.push(() => {
    const vis = st.k > 0.001 || st.lead > 0.001;
    g.setAttribute('visibility', vis ? 'visible' : 'hidden');
    pill.setAttribute('transform', `translate(${x} ${y}) scale(${Math.max(0, st.k)})`);
    const [ax, ay] = anchor ? anchor() : [x, y + 100];
    const sx = x, sy = y + ph / 2;
    leader.setAttribute('x1', sx); leader.setAttribute('y1', sy);
    leader.setAttribute('x2', lerp(sx, ax, st.lead)); leader.setAttribute('y2', lerp(sy, ay, st.lead));
  });
  const meta = { id, text, t0, t1, box: [x - pw / 2, y - ph / 2, pw, ph] };
  const L = { g, st, meta }; ctx.labels.push(L); return L;
}

// ---------------------------------------------------------------- faces
// Expressions are numeric face targets, so they can be tweened (jaw drops etc.)
export const EXPR = {
  neutral: { browLift: 0, browTilt: 0, browAsym: 0, eyeS: 1, pupilS: 1, lid: 0, lidTilt: 0, happy: 0, lookX: 0, lookY: 0, mW: 22, mUp: 4, mLow: 12, mTilt: 0, mX: 0, cheek: 1, tears: 0 },
  shock: { browLift: 10, browTilt: 0.15, browAsym: 0, eyeS: 1.3, pupilS: 0.8, lid: 0, lidTilt: 0, happy: 0, lookX: 0, lookY: 0, mW: 22, mUp: -16, mLow: 34, mTilt: 0, mX: 0, cheek: 0.6, tears: 0 },
  doubt: { browLift: 2, browTilt: 0, browAsym: 1, eyeS: 1, pupilS: 1, lid: 0.3, lidTilt: 0, happy: 0, lookX: -1, lookY: -0.2, mW: 18, mUp: 2, mLow: 5, mTilt: -10, mX: -4, cheek: 0.8, tears: 0 },
  smile: { browLift: 3, browTilt: 0, browAsym: 0, eyeS: 1, pupilS: 1, lid: 0.1, lidTilt: 0, happy: 0, lookX: 0, lookY: 0, mW: 34, mUp: 2, mLow: 30, mTilt: 0, mX: 0, cheek: 1.15, tears: 0 },
  love: { browLift: 5, browTilt: 0.25, browAsym: 0, eyeS: 1.05, pupilS: 1.35, lid: 0.15, lidTilt: 0, happy: 0, lookX: 0, lookY: -0.1, mW: 28, mUp: 4, mLow: 22, mTilt: 0, mX: 0, cheek: 1.4, tears: 0 },
  sad: { browLift: 2, browTilt: 1, browAsym: 0, eyeS: 0.95, pupilS: 1, lid: 0.35, lidTilt: 1, happy: 0, lookX: 0, lookY: 0.5, mW: 20, mUp: -10, mLow: -2, mTilt: 0, mX: 0, cheek: 0.7, tears: 0 },
  cry: { browLift: 4, browTilt: 1.2, browAsym: 0, eyeS: 0.95, pupilS: 1, lid: 0.45, lidTilt: 1, happy: 0, lookX: 0, lookY: 0.4, mW: 24, mUp: -14, mLow: 10, mTilt: 0, mX: 0, cheek: 1, tears: 1 },
};
export const EXPRESSIONS = Object.keys(EXPR);
// set or tween an expression on the timeline
export function expr(ctx, rig, name, time, dur = F(6), ease = 'power2.out') {
  const tgt = rig.exprs[name]; if (!tgt) throw new Error(rig.name + ' has no expression ' + name);
  ctx.tl.set(rig.p, { expr: name }, time);
  if (dur <= 0) ctx.tl.set(rig.p, { ...tgt }, time);
  else ctx.tl.to(rig.p, { ...tgt, duration: dur, ease }, time);
}

function crescentD(w, up, low) { return `M ${-w / 2} 0 Q 0 ${up} ${w / 2} 0 Q 0 ${low} ${-w / 2} 0 Z`; }
function lidD(r, k) { // segment of circle radius r covering top fraction k of the eye
  if (k <= 0.001) return '';
  const yl = -r + 2 * r * clamp(k, 0, 1); const x = Math.sqrt(Math.max(0, r * r - yl * yl));
  const large = yl > 0 ? 1 : 0;
  return `M ${-x} ${yl} A ${r} ${r} 0 ${large} 1 ${x} ${yl} Z`;
}

// ---------------------------------------------------------------- Rig
const BASE_POSE = {
  x: 0, y: 0, s: 1, flip: 1, sx: 1, sy: 1, rot: 0, opacity: 1, gy: null,
  sit: 0, walk: 0, walkAmp: 0,
  aL: 6, eL: 4, aR: 6, eR: 4, hL: 0, kL: 0, hR: 0, kR: 0,
  tilt: 0, turn: 0, breathe: 1, blink: 1, glow: 0, shadow: 1, drain: 0, liftOff: 0,
  ...EXPR.neutral, expr: 'neutral',
};

class Rig {
  constructor(ctx, spec, opts = {}) {
    this.ctx = ctx; this.spec = spec; this.name = spec.name;
    this.exprs = { ...EXPR, ...(spec.exprs || {}) };
    this.p = { ...BASE_POSE, ...(opts.pose || {}) };
    if (opts.expr) Object.assign(this.p, this.exprs[opts.expr], { expr: opts.expr });
    this.phase = opts.phase ?? (ctx ? ctx.rand() * 3 : 0);
    const parent = opts.parent || (ctx && ctx.world);
    this.wrap = el('g', { class: 'rig rig-' + spec.name }, parent);
    this.shadowEl = el('ellipse', { rx: spec.shadowW, ry: 14, fill: P.INK, 'fill-opacity': 0.2 }, this.wrap);
    this.root = el('g', {}, this.wrap);
    this.build();
    if (ctx) ctx.rigs.push(this);
  }
  build() {
    const S = this.spec, r = this.root;
    this.back = el('g', {}, r);              // behind everything (long hair)
    this.legsG = el('g', {}, r);
    this.legs = [-1, 1].map(side => this.limb(this.legsG, S.legW, S.thigh, S.shin, S.legColor, S.shinColor || S.legColor, side, 'leg'));
    this.upper = el('g', {}, r);             // moves with hip / breathing
    this.headBackG = el('g', {}, this.upper); // long hair behind the body, follows the head
    this.torso = el('g', {}, this.upper);
    this.headG = el('g', {}, this.upper);
    this.armsG = el('g', {}, this.upper);
    this.arms = [-1, 1].map(side => this.limb(this.armsG, S.armW, S.upperArm, S.foreArm, S.sleeve, S.foreColor || S.sleeve, side, 'arm'));
    this.front = el('g', {}, this.upper);    // accessories over arms (scarf ends)
    S.body(this);
    this.buildHead();
    this.legs.forEach(l => S.shoe(this, l));
    this.arms.forEach(a => S.hand(this, a));
    if (S.extra) S.extra(this);
  }
  limb(parent, w, l1, l2, c1, c2, side, kind) {
    const g = el('g', {}, parent);
    const r1 = el('rect', { x: -w / 2, y: -w / 2, width: w, height: l1 + w / 2, rx: w / 2, fill: c1 }, g);
    const j = el('g', {}, g);
    const r2 = el('rect', { x: -w / 2, y: -w / 2, width: w, height: l2 + w / 2, rx: w / 2, fill: c2 }, j);
    const end = el('g', {}, j);              // foot / hand
    const prop = el('g', {}, end);           // upright prop holder (hands)
    return { g, r1, j, r2, end, prop, side, kind, w, l1, l2 };
  }
  buildHead() {
    const S = this.spec, g = this.headG, R = S.headR;
    this.hairBack = el('g', {}, this.headBackG);
    S.hairBack && S.hairBack(this, this.hairBack);
    el('rect', { x: -S.neckW / 2, y: R - 14, width: S.neckW, height: S.neckH + 16, fill: S.neck || S.skinShade, rx: 4 }, g);
    [-1, 1].forEach(sd => el('circle', { cx: sd * (R - 2), cy: 4, r: 10, fill: S.skin }, g));
    this.headShape = el('ellipse', { cx: 0, cy: 0, rx: R * (S.headWide || 1), ry: R, fill: S.skin }, g);
    S.jaw && S.jaw(this, g);
    this.glowEl = el('ellipse', { cx: 0, cy: 0, rx: R * (S.headWide || 1), ry: R, fill: P.GOLD, opacity: 0 }, g);
    this.faceG = el('g', {}, g);
    const f = this.faceG;
    this.cheeks = [-1, 1].map(sd => el('ellipse', { cx: sd * S.cheekX, cy: S.cheekY, rx: 8.5, ry: 5.5, fill: '#F58E94' }, f));
    el('ellipse', { cx: 0, cy: S.noseY, rx: S.noseW || 5, ry: S.noseH || 4, fill: S.skinShade, class: 'nose' }, f);
    this.eyes = [-1, 1].map(sd => {
      const eg = el('g', {}, f);
      const white = el('circle', { r: S.eyeR, fill: P.WHITE }, eg);
      const pupil = el('circle', { r: S.eyeR * 0.5, fill: P.INK }, eg);
      const hi = el('circle', { r: 1.8, fill: P.WHITE }, eg);
      const lid = el('path', { fill: S.skin }, eg);
      const happy = el('path', { fill: P.INK, d: `M ${-S.eyeR} 3 Q 0 ${-S.eyeR * 1.5} ${S.eyeR} 3 Q 0 ${-S.eyeR * 0.5} ${-S.eyeR} 3 Z` }, eg);
      const lash = S.lashes ? el('path', { fill: P.INK, d: `M ${sd * S.eyeR * 0.6} ${-S.eyeR * 0.75} L ${sd * (S.eyeR + 5)} ${-S.eyeR * 0.55} L ${sd * S.eyeR * 0.95} ${-S.eyeR * 0.1} Z` }, eg) : null;
      const tear = el('rect', { x: -3.5, y: S.eyeR * 0.6, width: 7, height: 34, rx: 3.5, fill: P.WHITE, opacity: 0 }, eg);
      return { sd, eg, white, pupil, hi, lid, happy, lash, tear };
    });
    this.brows = [-1, 1].map(sd => el('rect', { x: -S.browW / 2, y: -S.browH / 2, width: S.browW, height: S.browH, rx: S.browH / 2, fill: S.browColor }, f));
    this.mouth = el('path', { fill: P.INK }, f);
    S.faceExtra && S.faceExtra(this, f);
    this.hairFront = el('g', {}, g);
    S.hairFront(this, this.hairFront);
    S.headExtra && S.headExtra(this, g);
  }
  // world point of a named joint (for anchors) — approximate via DOM
  handWorld(side = 1) {
    const a = this.arms[side < 0 ? 0 : 1]; const m = a.end.getCTM(), w = this.ctx.world.getCTM().inverse().multiply(m);
    return [w.e, w.f];
  }
  pointWorld(node, x = 0, y = 0) {
    const m = this.ctx.world.getCTM().inverse().multiply(node.getCTM());
    return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  }
  apply(t) {
    const p = this.p, S = this.spec;
    this.wrap.setAttribute('opacity', p.opacity);
    this.wrap.setAttribute('visibility', p.opacity <= 0.001 ? 'hidden' : 'visible');
    // walk cycle
    let hL = p.hL, hR = p.hR, kL = p.kL, kR = p.kR, bob = 0;
    if (p.walkAmp > 0) {
      const ph = p.walk * Math.PI * 2, A = 22 * p.walkAmp;
      hL += A * Math.sin(ph); hR -= A * Math.sin(ph);
      kL += 16 * p.walkAmp * Math.max(0, -Math.sin(ph)); kR += 16 * p.walkAmp * Math.max(0, Math.sin(ph));
      bob = -6 * p.walkAmp * Math.abs(Math.cos(ph));
    }
    // root transform: feet at (x,y), squash anchored at the feet
    const fl = p.flip < 0 ? -1 : 1;
    this.root.setAttribute('transform', `translate(${p.x} ${p.y + bob * p.s}) rotate(${p.rot}) scale(${p.s * p.sx * fl} ${p.s * p.sy})`);
    const gy = p.gy == null ? p.y : p.gy, air = Math.max(0, gy - p.y);
    const shS = p.s * clamp(1 - air / 300, 0.3, 1) * p.shadow;
    this.shadowEl.setAttribute('cx', p.x); this.shadowEl.setAttribute('cy', gy);
    this.shadowEl.setAttribute('rx', S.shadowW * shS * (1 + 0.25 * p.sit)); this.shadowEl.setAttribute('ry', 13 * shS);
    this.shadowEl.setAttribute('visibility', p.shadow > 0 ? 'visible' : 'hidden');
    // legs (sitting foreshortens the thigh)
    const th = S.thigh * (1 - 0.72 * p.sit);
    const hipStand = -(S.thigh + S.shin + S.shoeH), hipY = -(th + S.shin + S.shoeH);
    this.legs.forEach((l, i) => {
      const sd = l.side, hip = i ? hR : hL, kn = i ? kR : kL;
      const spread = 1 + 0.7 * p.sit;
      l.g.setAttribute('transform', `translate(${sd * S.legX * spread} ${hipY}) rotate(${sd * (hip - 10 * p.sit)})`);
      l.r1.setAttribute('height', th + l.w / 2);
      l.j.setAttribute('transform', `translate(0 ${th}) rotate(${sd * (kn + 14 * p.sit)})`);
      l.end.setAttribute('transform', `translate(0 ${S.shin}) rotate(${-sd * (hip + kn)})`);
    });
    // breathing 2%
    const br = p.breathe ? 0.02 * Math.sin((t + this.phase) * Math.PI * 2 / 3.2) : 0;
    const torsoH = -S.shoulderY + hipStand; // negative number height
    this.upper.setAttribute('transform', `translate(0 ${hipY - hipStand})`);
    this.torso.setAttribute('transform', `translate(0 ${hipStand}) scale(1 ${1 + br}) translate(0 ${-hipStand})`);
    const lift = br * (S.shoulderY - hipStand);
    this.armsG.setAttribute('transform', `translate(0 ${lift})`);
    this.front.setAttribute('transform', `translate(0 ${lift})`);
    const hT = `translate(0 ${S.headCY + lift}) rotate(${p.tilt})`;
    this.headG.setAttribute('transform', hT); this.headBackG.setAttribute('transform', hT);
    if (S.sitPose) S.sitPose(this, p.sit);
    // arms
    this.arms.forEach((a, i) => {
      const sd = a.side, ang = i ? p.aR : p.aL, el_ = i ? p.eR : p.eL;
      a.g.setAttribute('transform', `translate(${sd * S.shoulderX} ${S.shoulderY}) rotate(${-sd * ang})`);
      a.j.setAttribute('transform', `translate(0 ${S.upperArm}) rotate(${-sd * el_})`);
      a.end.setAttribute('transform', `translate(0 ${S.foreArm})`);
      a.prop.setAttribute('transform', `rotate(${sd * (ang + el_) - p.rot - p.tilt * 0})`);
    });
    // face
    const fx = p.turn * 12, R = S.headR;
    this.faceG.setAttribute('transform', `translate(${fx} 0)`);
    this.hairFront.setAttribute('transform', `translate(${p.turn * 4} 0)`);
    this.glowEl.setAttribute('opacity', 0.35 * p.glow);
    let blink = 0;
    if (p.blink) { const k = ((t + this.phase) % 3) / F(1); blink = k < 4 ? Math.sin(Math.PI * k / 4) : 0; }
    this.eyes.forEach(e => {
      const sd = e.sd, er = S.eyeR * p.eyeS;
      const asymLift = p.browAsym * (sd < 0 ? 1 : -0.2);
      e.eg.setAttribute('transform', `translate(${sd * S.eyeX} ${S.eyeY}) scale(1 ${1 - 0.92 * blink})`);
      e.white.setAttribute('r', er);
      const pr = S.eyeR * 0.5 * p.pupilS, px = p.lookX * (er - pr) * 0.75, py = p.lookY * (er - pr) * 0.75;
      e.pupil.setAttribute('cx', px); e.pupil.setAttribute('cy', py); e.pupil.setAttribute('r', pr);
      e.hi.setAttribute('cx', px - pr * 0.35); e.hi.setAttribute('cy', py - pr * 0.4); e.hi.setAttribute('r', Math.max(1.2, pr * 0.3));
      const lidK = clamp(p.lid + (sd < 0 ? 0.2 : -0.1) * p.browAsym * 0, 0, 1);
      e.lid.setAttribute('d', lidD(er + 1.2, lidK));
      e.lid.setAttribute('transform', `rotate(${-sd * 18 * p.lidTilt})`);
      const hp = p.happy > 0.5;
      [e.white, e.pupil, e.hi, e.lid].forEach(n => n.setAttribute('visibility', hp ? 'hidden' : 'visible'));
      e.happy.setAttribute('visibility', hp ? 'visible' : 'hidden');
      e.tear.setAttribute('opacity', 0.8 * p.tears); e.tear.setAttribute('height', 14 + 26 * p.tears);
      if (e.lash) e.lash.setAttribute('visibility', 'visible');
    });
    this.brows.forEach((b, i) => {
      const sd = i ? 1 : -1;
      const lift = p.browLift + p.browAsym * (sd < 0 ? 8 : -3);
      const rot = sd * p.browTilt * 16 + p.browAsym * (sd < 0 ? -12 : 8);
      b.setAttribute('transform', `translate(${sd * S.eyeX} ${S.browY - lift}) rotate(${rot})`);
    });
    this.cheeks.forEach(c => { c.setAttribute('rx', 8.5 * p.cheek); c.setAttribute('ry', 5.5 * p.cheek); });
    this.mouth.setAttribute('d', crescentD(p.mW, p.mUp, p.mLow));
    this.mouth.setAttribute('transform', `translate(${p.mX} ${S.mouthY}) rotate(${p.mTilt})`);
    if (S.onApply) S.onApply(this, t);
  }
}

// ---------------------------------------------------------------- characters
const SKIN = '#D9936B', SHADE = '#B97A58';

// HERO: 25, 5.5 heads tall (550 u), shoulders 1.6 heads (160 u)
const HERO_SPEC = {
  name: 'hero', headR: 50, headCY: -500, neckW: 26, neckH: 6, skin: SKIN, skinShade: SHADE,
  shoulderX: 64, shoulderY: -424, armW: 32, upperArm: 96, foreArm: 86, sleeve: '#23C0B4',
  legX: 26, legW: 38, thigh: 120, shin: 110, shoeH: 20, legColor: '#2A2660', shadowW: 80,
  eyeX: 18, eyeY: -4, eyeR: 11, browY: -24, browW: 20, browH: 6, browColor: '#291B3C', mouthY: 27,
  cheekX: 31, cheekY: 13, noseY: 10,
  body(r) {
    const t = r.torso;
    el('ellipse', { cx: 0, cy: -444, rx: 38, ry: 14, fill: '#14988F' }, t); // hood rim
    el('path', { d: 'M -80 -404 Q -80 -440 -48 -440 L 48 -440 Q 80 -440 80 -404 L 74 -262 Q 73 -244 56 -244 L -56 -244 Q -73 -244 -74 -262 Z', fill: '#23C0B4', class: 'hoodie' }, t);
    el('path', { d: 'M -44 -322 L 44 -322 Q 52 -322 54 -312 L 60 -276 Q 61 -266 52 -266 L -52 -266 Q -61 -266 -60 -276 L -54 -312 Q -52 -322 -44 -322 Z', fill: '#14988F' }, t);
    [-1, 1].forEach(sd => {
      el('rect', { x: sd * 11 - 2, y: -436, width: 4, height: 58, rx: 2, fill: P.WHITE }, t);
      el('circle', { cx: sd * 11, cy: -376, r: 3.5, fill: P.WHITE }, t);
    });
  },
  shoe(r, l) { el('path', { d: 'M -22 -8 Q -22 -14 -14 -14 L 12 -14 Q 26 -14 28 0 L 28 6 Q 28 10 24 10 L -20 10 Q -24 10 -24 6 Z', fill: P.WHITE, transform: `translate(${l.side * 2} 10) scale(${l.side} 1)` }, l.end); },
  hand(r, a) { el('rect', { x: -17, y: -12, width: 34, height: 12, rx: 5, fill: '#14988F' }, a.end); el('circle', { cx: 0, cy: 8, r: 14, fill: SKIN }, a.end); },
  jaw(r, g) { el('path', { d: 'M -45.8 20 A 50 50 0 0 0 45.8 20 Q 0 46 -45.8 20 Z', fill: SHADE }, g); },
  hairFront(r, g) {
    el('path', { d: 'M -51 -2 L -55 -34 L -45 -74 L -32 -54 L -22 -90 L -10 -60 L 2 -96 L 12 -60 L 24 -90 L 32 -54 L 45 -74 L 55 -34 L 51 -2 Q 44 -28 22 -34 Q 2 -26 -16 -36 Q -40 -30 -51 -2 Z', fill: '#291B3C' }, g);
  },
};

// RICH: 55, 10 % wider than HERO, dark suit, gold tie, grey swept hair + moustache, gold watch
const RICH_SPEC = {
  name: 'rich', headR: 50, headWide: 1.06, headCY: -500, neckW: 28, neckH: 6, skin: SKIN, skinShade: SHADE,
  shoulderX: 71, shoulderY: -424, armW: 34, upperArm: 96, foreArm: 86, sleeve: '#0F0B24',
  legX: 29, legW: 40, thigh: 120, shin: 110, shoeH: 20, legColor: '#0F0B24', shadowW: 88,
  eyeX: 19, eyeY: -4, eyeR: 10, browY: -24, browW: 24, browH: 8, browColor: '#C9C6D6', mouthY: 31,
  cheekX: 33, cheekY: 14, noseY: 11, noseW: 7, noseH: 6,
  body(r) {
    const t = r.torso;
    el('path', { d: 'M -88 -402 Q -88 -440 -53 -440 L 53 -440 Q 88 -440 88 -402 L 82 -250 Q 81 -232 62 -232 L 6 -232 L 0 -250 L -6 -232 L -62 -232 Q -81 -232 -82 -250 Z', fill: '#0F0B24' }, t);
    el('path', { d: 'M -24 -440 L 24 -440 L 0 -360 Z', fill: P.WHITE }, t);
    el('path', { d: 'M -7 -436 L 7 -436 L 9 -424 L 4 -418 L 10 -340 L 0 -326 L -10 -340 L -4 -418 L -9 -424 Z', fill: '#F2B33D' }, t);
    [-300, -272].forEach(y => el('circle', { cx: 14, cy: y, r: 4, fill: '#544174' }, t));
  },
  shoe(r, l) { el('path', { d: 'M -22 -8 Q -22 -14 -14 -14 L 12 -14 Q 28 -14 30 2 L 30 6 Q 30 10 26 10 L -20 10 Q -24 10 -24 6 Z', fill: P.INK, transform: `translate(${l.side * 2} 10) scale(${l.side} 1)` }, l.end); },
  hand(r, a) {
    el('rect', { x: -18, y: -10, width: 36, height: 9, rx: 4, fill: a.side < 0 ? '#F2B33D' : P.WHITE }, a.end); // watch (left) / cuff
    el('circle', { cx: 0, cy: 8, r: 15, fill: SKIN }, a.end);
  },
  faceExtra(r, f) { el('path', { d: 'M -24 22 Q -14 10 0 17 Q 14 10 24 22 Q 26 28 18 27 Q 8 24 0 25 Q -8 24 -18 27 Q -26 28 -24 22 Z', fill: '#C9C6D6' }, f); },
  hairFront(r, g) {
    el('path', { d: 'M -53 4 Q -58 -44 -22 -56 Q 18 -68 46 -44 Q 58 -26 53 4 Q 50 -18 40 -26 Q 20 -44 -8 -40 Q -36 -36 -46 -16 Q -50 -6 -53 4 Z', fill: '#C9C6D6' }, g);
    el('path', { d: 'M -30 -46 Q 6 -76 54 -50 Q 30 -56 8 -48 Q -12 -42 -30 -46 Z', fill: '#C9C6D6' }, g);
  },
};

// BRIDE: 24, 5.3 heads tall (530 u), long wavy hair, PINK flower pin, CREAM dress
const BRIDE_SPEC = {
  name: 'bride', headR: 50, headCY: -480, neckW: 22, neckH: 4, skin: SKIN, skinShade: SHADE, neck: SKIN,
  shoulderX: 50, shoulderY: -410, armW: 24, upperArm: 90, foreArm: 82, sleeve: '#F6EFFD', foreColor: SKIN,
  legX: 16, legW: 24, thigh: 116, shin: 110, shoeH: 14, legColor: SKIN, shadowW: 92,
  eyeX: 18, eyeY: -2, eyeR: 11, browY: -24, browW: 18, browH: 5, browColor: '#4A2338', mouthY: 26, lashes: true,
  cheekX: 31, cheekY: 15, noseY: 10, noseW: 4, noseH: 3.5,
  exprs: {},
  body(r) {
    const t = r.torso;
    r.skirt = el('path', { d: 'M -40 -330 L 40 -330 Q 70 -200 106 -30 Q 108 -16 94 -14 Q 0 -4 -94 -14 Q -108 -16 -106 -30 Q -70 -200 -40 -330 Z', fill: '#F6EFFD', class: 'dress' }, t);
    el('path', { d: 'M -56 -392 Q -56 -420 -30 -420 L 30 -420 Q 56 -420 56 -392 L 42 -318 L -42 -318 Z', fill: '#F6EFFD', class: 'dress' }, t);
    el('path', { d: 'M -18 -420 Q 0 -398 18 -420 Z', fill: SKIN }, t);
  },
  sitPose(r, sit) {
    r.skirt.setAttribute('transform', `translate(0 -330) scale(${1 + 0.12 * sit} ${1 - 0.5 * sit}) translate(0 330)`);
  },
  shoe(r, l) { el('path', { d: 'M -14 -6 Q -14 -10 -8 -10 L 10 -10 Q 20 -10 20 0 Q 20 6 14 6 L -12 6 Q -16 6 -14 -6 Z', fill: '#F6EFFD', transform: `translate(${l.side * 2} 8) scale(${l.side} 1)` }, l.end); },
  hand(r, a) { el('circle', { cx: 0, cy: 6, r: 12, fill: SKIN }, a.end); },
  hairBack(r, g) {
    el('path', { d: 'M -50 -24 C -74 40 -80 110 -70 178 Q -60 166 -50 180 Q -40 166 -28 178 L 28 178 Q 40 166 50 180 Q 60 166 70 178 C 80 110 74 40 50 -24 Z', fill: '#4A2338' }, g);
  },
  hairFront(r, g) {
    el('path', { d: 'M -55 10 Q -62 -50 -12 -60 Q 46 -66 57 -4 Q 52 -34 26 -42 Q 6 -20 -22 -36 Q -42 -28 -48 14 Z', fill: '#4A2338' }, g);
    [-1, 1].forEach(sd => el('path', { d: `M ${sd * 48} -12 Q ${sd * 64} 30 ${sd * 52} 60 Q ${sd * 44} 84 ${sd * 56} 110 Q ${sd * 40} 96 ${sd * 38} 70 Q ${sd * 44} 40 ${sd * 38} 0 Z`, fill: '#4A2338' }, g));
    const fl = el('g', { transform: 'translate(36 -40)' }, g);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; el('circle', { cx: Math.cos(a) * 8, cy: Math.sin(a) * 8, r: 7, fill: P.PINK }, fl); }
    el('circle', { r: 4.5, fill: P.GOLD }, fl);
    r.flower = fl;
  },
};

// CHILD: toddler, 2.5 heads tall (250 u), BRIDE's hair, teal dungarees
const CHILD_SPEC = {
  name: 'child', headR: 50, headCY: -200, neckW: 18, neckH: 0, skin: SKIN, skinShade: SHADE, neck: SKIN,
  shoulderX: 34, shoulderY: -142, armW: 20, upperArm: 36, foreArm: 30, sleeve: '#F6EFFD', foreColor: SKIN,
  legX: 14, legW: 22, thigh: 36, shin: 30, shoeH: 12, legColor: '#23C0B4', shadowW: 46,
  eyeX: 18, eyeY: 2, eyeR: 12, browY: -20, browW: 14, browH: 5, browColor: '#4A2338', mouthY: 28,
  cheekX: 30, cheekY: 18, noseY: 14, noseW: 4, noseH: 3,
  body(r) {
    const t = r.torso;
    el('path', { d: 'M -40 -124 Q -40 -150 -20 -150 L 20 -150 Q 40 -150 40 -124 L 38 -86 L -38 -86 Z', fill: '#F6EFFD' }, t);
    el('path', { d: 'M -26 -122 L 26 -122 L 28 -96 Q 40 -92 40 -80 L 40 -72 Q 40 -64 30 -64 L -30 -64 Q -40 -64 -40 -72 L -40 -80 Q -40 -92 -28 -96 Z', fill: '#23C0B4', class: 'dungarees' }, t);
    [-1, 1].forEach(sd => { el('rect', { x: sd * 22 - 4, y: -150, width: 8, height: 30, fill: '#23C0B4' }, t); el('circle', { cx: sd * 20, cy: -118, r: 3.5, fill: P.WHITE }, t); });
  },
  shoe(r, l) { el('ellipse', { cx: l.side * 3, cy: 4, rx: 15, ry: 8, fill: P.WHITE }, l.end); },
  hand(r, a) { el('circle', { cx: 0, cy: 4, r: 10, fill: SKIN }, a.end); },
  hairFront(r, g) {
    el('path', { d: 'M -54 10 Q -64 -50 -10 -62 Q 50 -68 58 2 Q 50 -20 34 -30 Q 26 -14 10 -30 Q -6 -16 -20 -32 Q -38 -20 -46 0 Z', fill: '#4A2338' }, g);
    el('path', { d: 'M -4 -60 Q 6 -84 22 -70 Q 10 -72 6 -62 Z', fill: '#4A2338' }, g);
  },
};

export function HERO(ctx, opts) { return new Rig(ctx, HERO_SPEC, opts); }
export function RICH(ctx, opts) { return new Rig(ctx, RICH_SPEC, opts); }
export function BRIDE(ctx, opts) { return new Rig(ctx, BRIDE_SPEC, opts); }
export function CHILD(ctx, opts) { return new Rig(ctx, CHILD_SPEC, opts); }
export const CHARACTERS = { HERO, RICH, BRIDE, CHILD };
export const SPECS = { HERO: HERO_SPEC, RICH: RICH_SPEC, BRIDE: BRIDE_SPEC, CHILD: CHILD_SPEC };

// ---------------------------------------------------------------- BULBS
// six round GOLD bulbs on one wire; lit = 30 % glow disc, out = 544174
export function BULBS(ctx, { x1, y1, x2, y2, sag = 60, parent, r = 18 } = {}) {
  const g = el('g', { class: 'bulbs' }, parent || ctx.world);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag * 2;
  el('path', { d: `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`, fill: 'none', stroke: '#544174', 'stroke-width': 4 }, g);
  const pt = k => [(1 - k) * (1 - k) * x1 + 2 * (1 - k) * k * mx + k * k * x2, (1 - k) * (1 - k) * y1 + 2 * (1 - k) * k * my + k * k * y2];
  const level = [1, 1, 1, 1, 1, 1], flick = [0, 0, 0, 0, 0, 0];
  const items = level.map((_, i) => {
    const [bx, by] = pt((i + 1) / 7);
    const b = el('g', { transform: `translate(${bx} ${by})` }, g);
    const disc = el('circle', { cx: 0, cy: 16 + r, r: r * 2.7, fill: P.GOLD, opacity: 0.3 }, b);
    el('rect', { x: -6, y: 0, width: 12, height: 16, rx: 3, fill: '#544174' }, b);
    const bulb = el('circle', { cx: 0, cy: 16 + r, r, fill: P.GOLD }, b);
    return { b, disc, bulb, x: bx, y: by + 16 + r };
  });
  const B = { g, level, flick, items, flickFrom: [1e9, 1e9, 1e9, 1e9, 1e9, 1e9], dim: 1 };
  ctx.procs.push(t => {
    items.forEach((it, i) => {
      let k = level[i] * B.dim;
      if (t >= B.flickFrom[i]) k *= (Math.floor((t - B.flickFrom[i]) * 4) % 2 === 0) ? 1 : 0.15; // 2 Hz on/off
      it.bulb.setAttribute('fill', mix('#544174', P.GOLD, clamp(k)));
      it.disc.setAttribute('opacity', 0.3 * clamp(k));
    });
  });
  // click out at time (instant), stays out
  B.out = (time, i) => { ctx.tl.set(level, { [i]: 0 }, time); ctx.event(time, 'bulbOut', { i }); };
  B.fade = (time, i, dur) => { ctx.tl.to(level, { [i]: 0, duration: dur, ease: 'power1.in' }, time); };
  B.flicker = (time, i) => { ctx.tl.set(B.flickFrom, { [i]: time }, 0); };
  return B;
}

// ---------------------------------------------------------------- SET
// night city park: lamp post, bench 794C6E, orange trees, skyline with GOLD windows
export const GROUND_Y = 1580;
export function SKYLINE(ctx, { parent, y = 1230, x0 = -700, x1 = 1900, seed = 3 } = {}) {
  const g = el('g', { class: 'skyline' }, parent || ctx.world);
  const rnd = mulberry32(seed);
  let x = x0;
  while (x < x1) {
    const w = 90 + Math.floor(rnd() * 90), h = 200 + Math.floor(rnd() * 220);
    el('rect', { x, y: y - h, width: w, height: h + 2, fill: '#544174' }, g);
    for (let wy = y - h + 26; wy < y - 30; wy += 38) for (let wx = x + 16; wx < x + w - 22; wx += 28)
      if (rnd() < 0.32) el('rect', { x: wx, y: wy, width: 12, height: 18, fill: P.GOLD }, g);
    x += w + 8 + Math.floor(rnd() * 30);
  }
  return g;
}
export function TREE(parent, { x, y = GROUND_Y - 80, s = 1, colors = ['#FEB13F', '#FD893B'] }) {
  const g = el('g', { transform: `translate(${x} ${y}) scale(${s})` }, parent);
  el('rect', { x: -12, y: -170, width: 24, height: 175, rx: 6, fill: '#794C6E' }, g);
  el('circle', { cx: 0, cy: -260, r: 110, fill: colors[1] }, g);
  el('circle', { cx: -70, cy: -200, r: 70, fill: colors[1] }, g);
  el('circle', { cx: 60, cy: -310, r: 80, fill: colors[0] }, g);
  el('circle', { cx: -30, cy: -300, r: 70, fill: colors[0] }, g);
  el('circle', { cx: 72, cy: -200, r: 60, fill: colors[0] }, g);
  return g;
}
export function BENCH(parent, { x, y = GROUND_Y, w = 300 }) {
  const g = el('g', { transform: `translate(${x} ${y})`, class: 'bench' }, parent);
  el('rect', { x: -w / 2 + 16, y: -150, width: 14, height: 150, fill: '#544174' }, g);
  el('rect', { x: w / 2 - 30, y: -150, width: 14, height: 150, fill: '#544174' }, g);
  el('rect', { x: -w / 2, y: -300, width: w, height: 30, rx: 8, fill: '#794C6E' }, g);
  el('rect', { x: -w / 2, y: -258, width: w, height: 30, rx: 8, fill: '#794C6E' }, g);
  el('rect', { x: -w / 2 - 10, y: -176, width: w + 20, height: 26, rx: 8, fill: '#794C6E' }, g);
  return g;
}
export function LAMP(parent, { x, y = GROUND_Y, h = 700, arm = 120, cone = true, lit = 1 }) {
  const g = el('g', { transform: `translate(${x} ${y})`, class: 'lamp' }, parent);
  const coneEl = cone ? el('path', { d: `M ${arm - 22} ${-h + 30} L ${arm + 22} ${-h + 30} L ${arm + 170} 0 L ${arm - 170} 0 Z`, fill: P.WHITE, opacity: 0.12 * lit }, g) : null;
  el('rect', { x: -10, y: -h, width: 20, height: h, rx: 6, fill: '#544174' }, g);
  el('rect', { x: -22, y: -20, width: 44, height: 22, rx: 6, fill: '#544174' }, g);
  el('path', { d: `M 0 ${-h + 8} Q 0 ${-h - 40} ${arm} ${-h - 34} L ${arm} ${-h - 20} Q 14 ${-h - 26} 14 ${-h + 8} Z`, fill: '#544174' }, g);
  el('path', { d: `M ${arm - 30} ${-h - 4} L ${arm + 30} ${-h - 4} L ${arm + 20} ${-h - 30} L ${arm - 20} ${-h - 30} Z`, fill: '#544174' }, g);
  const head = el('circle', { cx: arm, cy: -h + 6, r: 18, fill: P.GOLD, opacity: lit ? 1 : 0 }, g);
  const headOff = el('circle', { cx: arm, cy: -h + 6, r: 18, fill: '#544174', opacity: lit ? 0 : 1 }, g);
  return { g, cone: coneEl, head, headOff, tip: [x + arm, y - h + 6] };
}
// falling leaves (max 8) on a slow sine
export function LEAVES(ctx, { n = 8, parent, x0 = 0, x1 = 1080, y0 = 400, y1 = 1700, color = ['#FEB13F', '#FD893B'], seed = 11 } = {}) {
  n = Math.min(8, n);
  const g = el('g', { class: 'leaves' }, parent || ctx.world);
  const rnd = mulberry32(seed);
  const L = [...Array(n)].map((_, i) => ({
    e: el('path', { d: 'M 0 -12 Q 10 0 0 12 Q -10 0 0 -12 Z', fill: color[i % 2] }, g),
    x: x0 + rnd() * (x1 - x0), ph: rnd() * 10, sp: 40 + rnd() * 30, amp: 30 + rnd() * 30,
  }));
  ctx.procs.push(t => L.forEach(l => {
    const span = y1 - y0, y = y0 + ((l.ph * 90 + t * l.sp) % span);
    const x = l.x + l.amp * Math.sin((t + l.ph) * 0.9);
    l.e.setAttribute('transform', `translate(${x} ${y}) rotate(${40 * Math.sin((t + l.ph) * 1.1)})`);
    l.e.setAttribute('opacity', clamp((y - y0) / 80) * clamp((y1 - y) / 80));
  }));
  return g;
}
export function PARK(ctx, { parent, season = 'autumn', lamp = true, bench = true, benchX = 300, lampX = 110, trees = [[560, 0.9], [960, 1.05], [-150, 1.0]] } = {}) {
  const g = el('g', { class: 'park' }, parent || ctx.world);
  el('rect', { x: -1500, y: 1226, width: 4500, height: 1600, fill: P.GROUND }, g);
  const sky = SKYLINE(ctx, { parent: g });
  const colors = season === 'spring' ? [P.GREEN, '#3E9C5A'] : ['#FEB13F', '#FD893B'];
  const treeG = el('g', {}, g);
  trees.forEach(([x, s]) => TREE(treeG, { x, s, y: 1300, colors }));
  el('rect', { x: -1500, y: 1500, width: 4500, height: 130, fill: '#2A2060' }, g); // path
  const out = { g, skyline: sky, trees: treeG };
  if (bench) out.bench = BENCH(g, { x: benchX });
  if (lamp) out.lamp = LAMP(g, { x: lampX, h: 720, arm: 150 });
  return out;
}
export const SET = { PARK, SKYLINE, TREE, BENCH, LAMP, LEAVES, GROUND_Y };

// ---------------------------------------------------------------- pops
// Pop(ctx, g, cx, cy): scales g about (cx, cy) by st.k; pop() adds a 4-frame
// anticipation then a damped spring (ease-out); vanish() shrinks in half the time.
export function Pop(ctx, g, cx = 0, cy = 0, k0 = 0) {
  const st = { k: k0, o: 1, r: 0 };
  ctx.tl.set(st, { k: k0, o: 1, r: 0 }, 0);
  ctx.procs.push(() => {
    g.setAttribute('transform', `translate(${cx} ${cy}) rotate(${st.r}) scale(${Math.max(0, st.k)}) translate(${-cx} ${-cy})`);
    g.setAttribute('opacity', st.o);
    g.setAttribute('visibility', st.k > 0.002 && st.o > 0.002 ? 'visible' : 'hidden');
  });
  return st;
}
export function pop(ctx, st, t0, { z = 0.6, dur = 0.5, to = 1 } = {}) {
  ctx.tl.to(st, { k: to * 0.14, duration: F(2), ease: 'none' }, t0 - F(4));
  ctx.tl.to(st, { k: to * 0.08, duration: F(2), ease: 'none' }, t0 - F(2));
  ctx.tl.to(st, { k: to, duration: dur, ease: spring(z) }, t0);
}
export function burst(ctx, st, t0, frames = 4) {
  ctx.tl.to(st, { k: st.k * 1.15 || 1.15, o: 0, duration: F(frames), ease: 'power2.in' }, t0);
}
// landing squash 1.15 x 0.85 for 3 frames
export function land(ctx, rig, t0, sx = 1.15, sy = 0.85, frames = 3) {
  ctx.tl.to(rig.p, { sx, sy, duration: F(1), ease: 'none' }, t0);
  ctx.tl.to(rig.p, { sx: 1, sy: 1, duration: F(frames - 1), ease: 'power2.out' }, t0 + F(1));
}

// ---------------------------------------------------------------- shared props
// thought bubble with a dark silhouette in a crooked veil, MARK "?" for a face
export function MARKBUBBLE(ctx, { parent, x, y, w = 380, h = 340 } = {}) {
  const g = el('g', { class: 'markbubble' }, parent || ctx.world);
  const inner = el('g', {}, g);
  const cloud = el('g', {}, inner);
  el('ellipse', { cx: 0, cy: 0, rx: w / 2, ry: h / 2, fill: P.CREAM }, cloud);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; el('circle', { cx: Math.cos(a) * w * 0.43, cy: Math.sin(a) * h * 0.42, r: h * 0.2, fill: P.CREAM }, cloud); }
  const fig = el('g', { transform: `translate(0 ${h * 0.04})` }, inner);
  el('path', { d: 'M -34 -70 L 62 -58 L 104 96 L -70 104 Z', fill: P.WHITE, transform: 'rotate(-9)' }, fig);  // crooked veil
  el('path', { d: 'M -80 104 Q -72 30 0 26 Q 72 30 80 104 Z', fill: '#32246A' }, fig);
  el('circle', { cx: 0, cy: -26, r: 48, fill: '#32246A' }, fig);
  el('path', { d: 'M -50 -36 Q -14 -100 54 -66 L 46 -50 Q -2 -76 -42 -24 Z', fill: P.WHITE }, fig);
  const q = el('text', { x: 4, y: 2, 'text-anchor': 'middle', fill: P.WHITE, 'font-family': 'Inter', 'font-weight': 800, 'font-size': 80 }, fig);
  q.textContent = '?';
  return { g, inner, cloud, fig };
}
