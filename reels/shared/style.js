/* shared/style.js — palette, easings, seeded random, SVG helpers.  Used unchanged by all stages. */
(function (G) {
  'use strict';
  const PAL = {
    sky0: '#130A31', sky1: '#2E245B', wall: '#33256B', floor: '#473585', win: '#FFC857',
    amber: '#F2A93B', teal: '#22BFB2', coral: '#E94F6B', green: '#3DD68C', ink: '#0F0B24',
    paper: '#F4F1EC', skin: '#C68A5F', blush: '#F08A8A', hair: '#231A3D', trousers: '#2A2350',
    violet: '#5B4B9A', orbCore: '#FFD27A', orbHalo: '#FFC857', apple: '#E8453C', pencil: '#F2C14E',
    grey: '#4A3F7A', white: '#FFFFFF'
  };
  const FPS = 30, W = 1080, H = 1920;

  /* ---------- colour ---------- */
  const hex2rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const shade = (h, k = 0.12) => rgb2hex(hex2rgb(h).map(v => v * (1 - k)));           // 2-tone shadow side
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
  // depth by value: each level back = 30% darker, 20% bluer
  const back = (h, lv = 1) => { let c = h; for (let i = 0; i < lv; i++) c = mix(shade(c, 0.30), '#1C2A8A', 0.20); return c; };

  /* ---------- easing (GSAP accepts plain functions) ---------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const E = {
    linear: t => t,
    outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
    outQuint: t => 1 - Math.pow(1 - t, 5),
    inQuint: t => t * t * t * t * t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inCubic: t => t * t * t,
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
    // damped spring 0→1, zeta in [0.55, 0.8]; settles by t=1
    spring: (zeta = 0.6) => {
      const wn = 6.2 / zeta, wd = wn * Math.sqrt(1 - zeta * zeta);
      return t => t >= 1 ? 1 : 1 - Math.exp(-zeta * wn * t) * (Math.cos(wd * t) + (zeta * wn / wd) * Math.sin(wd * t));
    }
  };
  // value of a damped oscillation that starts at amplitude 1 and rests at 0 (for wobble / spin-to-rest)
  const damp = (t, zeta = 0.6, freq = 1.2) => {
    if (t <= 0) return 1;
    const wn = 2 * Math.PI * freq, wd = wn * Math.sqrt(1 - zeta * zeta);
    return Math.exp(-zeta * wn * t) * Math.cos(wd * t);
  };
  // exit ease-in 40% shorter than the enter
  const exitDur = d => d * 0.6;

  /* ---------- seeded random ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.range = (lo, hi) => lo + (hi - lo) * f();
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    return f;
  }

  /* ---------- svg helpers ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) { if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  let _uid = 0; const uid = p => (p || 'u') + (++_uid);
  function defs(svg) { return svg.querySelector('defs') || el('defs', null, svg); }
  // stops: [[offset, color, opacity?], ...]
  function linGrad(svg, stops, o) {
    o = o || {}; const id = uid('lg');
    const g = el('linearGradient', { id, x1: o.x1 ?? 0, y1: o.y1 ?? 0, x2: o.x2 ?? 0, y2: o.y2 ?? 1, gradientUnits: o.units }, defs(svg));
    stops.forEach(s => el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] ?? 1 }, g));
    return `url(#${id})`;
  }
  function radGrad(svg, stops, o) {
    o = o || {}; const id = uid('rg');
    const g = el('radialGradient', { id, cx: o.cx ?? 0.5, cy: o.cy ?? 0.5, r: o.r ?? 0.5, fx: o.fx, fy: o.fy, gradientUnits: o.units }, defs(svg));
    stops.forEach(s => el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] ?? 1 }, g));
    return `url(#${id})`;
  }
  // soft radial falloff, stops eased so the edge has no ring
  function softStops(color, peak) {
    return [0, .15, .35, .55, .75, 1].map(o => [o, color, peak * Math.pow(1 - o, 2.2)]);
  }
  function rrect(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`; }

  G.STYLE = { PAL, FPS, W, H, hex2rgb, rgb2hex, shade, mix, back, E, clamp, damp, exitDur, rng, el, uid, defs, linGrad, radGrad, softStops, rrect, NS };
})(window);
