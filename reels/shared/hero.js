/* shared/hero.js — HERO: posable flat-vector SVG rig with the face set.  Used unchanged by all stages.
   Local units: px at full-body scale, origin = ground point between the feet, up = -y.
   Height 768 = 3.2 heads (head 220x240). */
(function (G) {
  'use strict';
  const S = G.STYLE, P = S.PAL, el = S.el;
  const SH = c => S.shade(c, 0.12);                 // shadow side, 12% darker
  const circ = (cx, cy, r) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  const ell = (cx, cy, rx, ry) => `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0Z`;
  const MOUTH_COL = '#4A1B34';

  const MOUTHS = {
    neutral: 'M-20,-2Q0,14 20,-2Q0,6 -20,-2Z',
    wonder: ell(0, 2, 10, 13),
    O: ell(0, 4, 16, 20),
    worried: 'M-20,6Q-10,-3 0,4Q10,11 20,2Q10,8 0,9Q-10,3 -20,6Z',
    thinking: 'M-6,2L22,-4Q25,0 22,2L-6,8Q-9,5 -6,2Z',
    happy: 'M-28,-6Q0,-3 28,-6Q26,30 0,30Q-26,30 -28,-6Z',
    sad: 'M-20,9Q0,-8 20,9Q0,0 -20,9Z',
    blissful: 'M-26,-4Q0,22 26,-4Q0,10 -26,-4Z',
    A: 'M-16,-4Q0,-6 16,-4Q14,18 0,18Q-14,18 -16,-4Z',
    E: 'M-22,-2Q0,-4 22,-2Q18,10 0,10Q-18,10 -22,-2Z',
    M: 'M-14,0Q0,3 14,0Q0,6 -14,0Z',
    laugh: 'M-30,-8Q0,-4 30,-8Q28,34 0,34Q-28,34 -30,-8Z',
    bite: 'M-18,-4Q0,-2 18,-4Q16,10 0,12Q-16,10 -18,-4Z'
  };
  // brows: [leftRot, rightRot], browY offset; eyes: open | happy ; eyeS: white scale
  const FACES = {
    neutral: { m: 'neutral', bl: 0, br: 0, by: 0, eyes: 'open', eyeS: 1, lx: 0, ly: 0, blush: .30 },
    wonder: { m: 'wonder', bl: -6, br: 6, by: -10, eyes: 'open', eyeS: 1.12, lx: 0, ly: -2, blush: .30 },
    worried: { m: 'worried', bl: -15, br: 15, by: -3, eyes: 'open', eyeS: 1.05, lx: 0, ly: 1, blush: .30 },
    thinking: { m: 'thinking', bl: -10, br: 4, by: -4, eyes: 'open', eyeS: 1, lx: 4, ly: -4, blush: .30 },
    happy: { m: 'happy', bl: -4, br: 4, by: -7, eyes: 'open', eyeS: 1, lx: 0, ly: 0, blush: .38 },
    sad: { m: 'sad', bl: -17, br: 17, by: 2, eyes: 'open', eyeS: .95, lx: 0, ly: 4, blush: .30 },
    blissful: { m: 'blissful', bl: -5, br: 5, by: -8, eyes: 'happy', eyeS: 1, lx: 0, ly: 0, blush: .55 },
    laugh: { m: 'laugh', bl: -5, br: 5, by: -9, eyes: 'happy', eyeS: 1, lx: 0, ly: 0, blush: .45 },
    talk: { m: 'A', bl: -3, br: 3, by: -4, eyes: 'open', eyeS: 1, lx: 0, ly: 0, blush: .30 }
  };

  const L1 = 118, L2 = 114;                       // upper arm, forearm (to hand centre)
  const SHOULDER = { L: [-112, -495], R: [112, -495] };
  const HEAD_C = [0, -648];

  function create(svg, parent, opt) {
    opt = opt || {};
    const id = S.uid(opt.id || 'hero');
    const shapes = [];                              // outline-able shapes
    const add = (tag, a, par, kind) => { const e = el(tag, a, par); shapes.push({ e, kind: kind || 'fill' }); return e; };
    const clipOf = d => { const cid = S.uid(id + 'c'); const cp = el('clipPath', { id: cid }, S.defs(svg)); el('path', { d }, cp); return `url(#${cid})`; };

    const root = el('g', { class: 'hero', 'data-check': 'hero' }, parent);
    const shadow = el('ellipse', { cx: 0, cy: 0, rx: 150, ry: 22, fill: P.ink, opacity: .25 }, root);
    const body = el('g', {}, root);

    /* ---- legs ---- */
    const legs = el('g', {}, body);
    const mkLeg = (side) => {
      const sx = side === 'L' ? -1 : 1, col = side === 'L' ? P.trousers : SH(P.trousers);
      const g = el('g', {}, legs);
      add('path', { d: S.rrect(sx * 47 - 41, -300, 82, 262, 30), fill: col }, g);
      const shoeX = side === 'L' ? -106 : 6;
      const shoeCol = side === 'L' ? '#FBFAF7' : SH('#FBFAF7');
      add('path', { d: S.rrect(shoeX, -56, 100, 56, 24), fill: shoeCol }, g);
      add('path', { d: 'M' + (shoeX + 4) + ',-16H' + (shoeX + 96) + 'Q' + (shoeX + 100) + ',-16 ' + (shoeX + 100) + ',-10V-6Q' + (shoeX + 100) + ',0 ' + (shoeX + 92) + ',0H' + (shoeX + 8) + 'Q' + shoeX + ',0 ' + shoeX + ',-6V-10Q' + shoeX + ',-16 ' + (shoeX + 4) + ',-16Z', fill: side === 'L' ? P.coral : SH(P.coral) }, g);
      return g;
    };
    const legL = mkLeg('L'), legR = mkLeg('R');
    add('path', { d: S.rrect(-104, -318, 208, 80, 34), fill: P.trousers }, legs);
    el('path', { d: S.rrect(30, -318, 74, 80, 30), fill: SH(P.trousers), class: 'sh' }, legs);

    /* ---- upper body ---- */
    const upper = el('g', {}, body);
    const neck = add('path', { d: S.rrect(-30, -566, 60, 50, 14), fill: SH(P.skin) }, upper);
    const torsoD = S.rrect(-118, -524, 236, 262, 56);
    add('path', { d: torsoD, fill: P.amber, 'data-swatch': 'sweater' }, upper);
    const torsoSh = el('g', { 'clip-path': clipOf(torsoD), class: 'sh' }, upper);
    el('rect', { x: 46, y: -530, width: 80, height: 280, fill: SH(P.amber) }, torsoSh);
    el('rect', { x: -130, y: -292, width: 260, height: 40, fill: SH(P.amber) }, torsoSh);
    const chest = el('g', { transform: 'translate(0,-420)' }, upper);       // slot: chest centre

    /* scarf */
    const scarfWrapD = S.rrect(-98, -552, 196, 58, 29);
    add('path', { d: scarfWrapD, fill: P.teal }, upper);
    const scarfSh = el('g', { 'clip-path': clipOf(scarfWrapD), class: 'sh' }, upper);
    el('rect', { x: 40, y: -560, width: 70, height: 70, fill: SH(P.teal) }, scarfSh);
    const tail = el('g', {}, upper);
    const tailIn = el('g', {}, tail);
    add('path', { d: S.rrect(-24, -8, 48, 160, 20), fill: P.teal }, tailIn);
    el('rect', { x: -24, y: 118, width: 48, height: 14, fill: SH(P.teal), class: 'sh' }, tailIn);

    /* arms */
    const mkArm = (side) => {
      const lit = side === 'L';
      const sleeve = lit ? P.amber : SH(P.amber), skin = lit ? P.skin : SH(P.skin);
      const g = el('g', {}, upper);
      add('path', { d: S.rrect(-28, -28, 56, L1 + 56, 28), fill: sleeve }, g);
      const fore = el('g', {}, g);
      add('path', { d: S.rrect(-26, -26, 52, L2 - 6 + 26, 26), fill: sleeve }, fore);
      const hand = el('g', { transform: `translate(0,${L2})` }, fore);
      const fist = add('path', { d: circ(0, 0, 27), fill: skin }, hand);
      const finger = add('path', { d: S.rrect(-8, 8, 16, 40, 8), fill: skin }, hand);
      const palm = add('path', { d: 'M-24,-10Q-26,30 -12,40L-10,52Q-8,60 -2,52L-1,42 3,58Q6,64 10,56L10,42 16,52Q20,58 22,48L22,36 26,40Q32,40 28,30L26,-8Q20,-26 0,-26Q-22,-26 -24,-10Z', fill: skin }, hand);
      const slot = el('g', {}, hand);
      return { g, fore, hand, fist, finger, palm, slot };
    };
    const armL = mkArm('L'), armR = mkArm('R');

    /* head */
    const head = el('g', {}, upper);
    const headIn = el('g', {}, head);
    const earL = add('path', { d: circ(-112, 8, 24), fill: P.skin }, headIn);
    const earR = add('path', { d: circ(112, 8, 24), fill: SH(P.skin) }, headIn);
    const headD = S.rrect(-110, -120, 220, 240, 84);
    add('path', { d: headD, fill: P.skin, 'data-check': 'face' }, headIn);
    const headShG = el('g', { 'clip-path': clipOf(headD), class: 'sh' }, headIn);
    const headSh = el('rect', { x: 62, y: -130, width: 80, height: 260, fill: SH(P.skin) }, headShG);
    const inside = el('g', {}, headIn);                                     // slot: inside the head (x-ray)
    const face = el('g', {}, headIn);
    const blushL = el('path', { d: ell(-76, 44, 22, 12), fill: P.blush, opacity: .3 }, face);
    const blushR = el('path', { d: ell(76, 44, 22, 12), fill: P.blush, opacity: .3 }, face);
    add('path', { d: ell(0, 30, 9, 6), fill: SH(P.skin) }, face);
    const mouthG = el('g', { transform: 'translate(0,74)' }, face);
    const mouth = add('path', { d: MOUTHS.neutral, fill: MOUTH_COL }, mouthG);
    const mkEye = (x) => {
      const g = el('g', { transform: `translate(${x},2)` }, face);
      const open = el('g', {}, g);
      add('path', { d: ell(0, 0, 13, 15), fill: '#FFFFFF' }, open);
      const pupil = el('g', {}, open);
      add('path', { d: circ(0, 0, 6), fill: P.ink }, pupil);
      el('circle', { cx: 2, cy: -2.5, r: 1.8, fill: '#FFFFFF' }, pupil);
      const happy = add('path', { d: 'M-14,4Q0,-16 14,4Q0,-6 -14,4Z', fill: P.hair }, g);
      return { g, open, pupil, happy };
    };
    const eyeL = mkEye(-48), eyeR = mkEye(48);
    const glasses = el('g', {}, face);
    const lensFill = [el('circle', { cx: -48, cy: 0, r: 31, fill: '#FFFFFF', opacity: .08 }, glasses), el('circle', { cx: 48, cy: 0, r: 31, fill: '#FFFFFF', opacity: .08 }, glasses)];
    const glint = el('g', { 'clip-path': clipOf(circ(-48, 0, 31) + circ(48, 0, 31)) }, glasses);   // glint sweep slot
    const glintBar = el('path', { d: 'M-30,-60L-6,-60L-46,60L-70,60Z M2,-60L12,-60L-28,60L-38,60Z', fill: '#FFFFFF', opacity: .55 }, glint);
    const gl = { stroke: P.hair, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' };
    add('path', Object.assign({ d: circ(-48, 0, 34) }, gl), glasses, 'stroke');
    add('path', Object.assign({ d: circ(48, 0, 34) }, gl), glasses, 'stroke');
    add('path', Object.assign({ d: 'M-14,-4Q0,-13 14,-4' }, gl), glasses, 'stroke');
    add('path', Object.assign({ d: 'M-82,-6L-106,-2M82,-6L106,-2' }, gl), glasses, 'stroke');
    const browL = add('path', { d: S.rrect(-18, -4.5, 36, 9, 4.5), fill: P.hair }, el('g', {}, face));
    const browR = add('path', { d: S.rrect(-18, -4.5, 36, 9, 4.5), fill: P.hair }, el('g', {}, face));
    /* hair: 7 overlapping circles r 38–52, a cloud, no spikes */
    const hair = el('g', {}, headIn);
    const HAIR = [[-108, -56, 40], [-92, -94, 44], [-55, -126, 48], [-8, -140, 52], [40, -132, 50], [82, -108, 46], [106, -70, 38]];
    HAIR.forEach(([x, y, r]) => add('path', { d: circ(x, y, r), fill: x > 60 ? SH(P.hair) : P.hair }, hair));
    const backHair = add('path', { d: S.rrect(-116, -150, 232, 250, 96), fill: P.hair }, headIn);   // back view only
    const headSlot = el('g', {}, headIn);                                    // slot: on the head (front)

    /* ---------- pose state (tween these) ---------- */
    const pose = {
      x: 0, y: 0, s: 1, flip: 1, rot: 0, sx: 1, sy: 1, hop: 0, sit: 0, back: 0,
      tilt: 0, turn: 0, lookX: 0, lookY: 0, pupil: 1, headY: 0,
      aL1: 10, aL2: -8, aR1: -10, aR2: 8, legL: 0, legR: 0,
      handL: 'fist', handR: 'fist', wind: 0, breath: 1, blink: 1,
      fill: 1, line: 0, dash: 0, lineColor: P.paper, lineW: 5, glint: -1, opacity: 1
    };
    let faceName = 'neutral', mouthName = null, lastKey = '';
    const rnd = S.rng(opt.seed || 7);
    const blinks = []; { let t = 0.5 + rnd() * 1.2; while (t < 40) { blinks.push(t); t += 3 + rnd(); } }

    function ik(side, tx, ty, bendOut = true) {
      const [sx, sy] = SHOULDER[side];
      let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
      d = Math.min(Math.max(d, 30), L1 + L2 - 1);
      const base = Math.atan2(-dx, dy) * 180 / Math.PI;
      const alpha = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)) * 180 / Math.PI;
      const beta = Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)) * 180 / Math.PI;
      const sgn = (side === 'L' ? 1 : -1) * (bendOut ? 1 : -1);
      return { a1: base + sgn * alpha, a2: -sgn * (180 - beta) };
    }

    function setFace(name, mouth) { faceName = name || faceName; mouthName = mouth || null; }

    function apply(t) {
      const p = pose, F = FACES[faceName] || FACES.neutral;
      root.setAttribute('transform', `translate(${p.x},${p.y}) scale(${p.s})`);
      root.style.opacity = p.opacity;
      const hs = Math.max(0.55, 1 - p.hop / 900);
      shadow.setAttribute('transform', `scale(${hs})`);
      shadow.setAttribute('opacity', 0.25 * p.fill * hs);
      body.setAttribute('transform', `translate(0,${-p.hop + p.sit * 262}) rotate(${p.rot}) scale(${p.flip * p.sx},${p.sy})`);
      legs.style.opacity = 1 - p.sit;
      legL.setAttribute('transform', `rotate(${p.legL},-47,-290)`);
      legR.setAttribute('transform', `rotate(${p.legR},47,-290)`);
      const br = p.breath * 0.015 * Math.sin(2 * Math.PI * 0.25 * t);
      upper.setAttribute('transform', `translate(0,-290) scale(${1 + br * 0.35},${1 + br}) translate(0,290)`);
      const tw = p.wind * (10 + 7 * Math.sin(2 * Math.PI * 1.4 * t) + 4 * Math.sin(2 * Math.PI * 2.9 * t + 1));
      tail.setAttribute('transform', `translate(-40,-512) rotate(${8 + tw})`);
      tailIn.setAttribute('transform', `scale(1,${1 - p.wind * 0.08 * Math.abs(Math.sin(2 * Math.PI * 1.4 * t))})`);
      const arm = (A, side, a1, a2, hand) => {
        const [sx, sy] = SHOULDER[side];
        A.g.setAttribute('transform', `translate(${sx},${sy}) rotate(${a1})`);
        A.fore.setAttribute('transform', `translate(0,${L1}) rotate(${a2})`);
        A.fist.style.display = hand === 'open' ? 'none' : '';
        A.finger.style.display = hand === 'point' ? '' : 'none';
        A.palm.style.display = hand === 'open' ? '' : 'none';
      };
      arm(armL, 'L', p.aL1, p.aL2, p.handL); arm(armR, 'R', p.aR1, p.aR2, p.handR);
      head.setAttribute('transform', `translate(${HEAD_C[0]},${HEAD_C[1] + p.headY}) rotate(${p.tilt})`);
      const tx = p.turn * 30;
      face.setAttribute('transform', `translate(${tx},0) scale(${1 - Math.abs(p.turn) * 0.08},1)`);
      hair.setAttribute('transform', `translate(${tx * 0.25},0)`);
      earL.setAttribute('transform', `translate(${-Math.min(0, p.turn) * -10 + Math.max(0, p.turn) * 14},0)`);
      earR.setAttribute('transform', `translate(${Math.max(0, p.turn) * -10 + Math.min(0, p.turn) * 14},0)`);
      headSh.setAttribute('x', 62 - p.turn * 40);
      // back view
      face.style.display = p.back > 0.5 ? 'none' : '';
      backHair.style.display = p.back > 0.5 ? '' : 'none';
      // face
      const m = MOUTHS[mouthName || F.m] || MOUTHS.neutral;
      if (mouth._d !== m) { mouth.setAttribute('d', m); mouth._d = m; }
      browL.parentNode.setAttribute('transform', `translate(-48,${-50 + F.by}) rotate(${F.bl})`);
      browR.parentNode.setAttribute('transform', `translate(48,${-50 + F.by}) rotate(${F.br})`);
      blushL.setAttribute('opacity', F.blush); blushR.setAttribute('opacity', F.blush);
      let bk = 1;
      if (p.blink) for (const b of blinks) { const f = (t - b) * 30; if (f >= 0 && f < 6) { bk = [1, .45, .08, .35, .75, 1][Math.floor(f)]; break; } }
      const open = F.eyes === 'open';
      [eyeL, eyeR].forEach(E => {
        E.open.style.display = open ? '' : 'none';
        E.happy.style.display = open ? 'none' : '';
        E.open.setAttribute('transform', `scale(${F.eyeS},${F.eyeS * bk})`);
        E.pupil.setAttribute('transform', `translate(${F.lx + p.lookX},${F.ly + p.lookY}) scale(${p.pupil})`);
      });
      glint.style.display = p.glint < 0 ? 'none' : '';
      glintBar.setAttribute('transform', `translate(${-60 + p.glint * 200},0)`);
      // line-draw / dashed outline look
      const key = [p.fill, p.line, p.dash, p.lineColor, p.lineW, p.s].join('|');
      if (key !== lastKey) {
        lastKey = key;
        const outline = p.line > 0 || p.dash > 0;
        const sw = p.lineW / Math.max(0.05, p.s);
        shapes.forEach(({ e, kind }) => {
          if (kind === 'stroke') {
            e.style.strokeOpacity = outline ? 1 : p.fill;
            e.setAttribute('stroke', outline && p.fill < 1 ? p.lineColor : P.hair);
          } else {
            e.style.fillOpacity = p.fill;
            if (outline) { e.setAttribute('stroke', p.lineColor); e.setAttribute('stroke-width', sw); e.setAttribute('stroke-linejoin', 'round'); }
            else e.removeAttribute('stroke');
          }
          if (outline) {
            e.setAttribute('pathLength', 100);
            if (p.dash > 0) { e.style.strokeDasharray = '3.2 2.4'; e.style.strokeDashoffset = 0; e.style.strokeOpacity = p.dash; }
            else { e.style.strokeDasharray = '100 100'; e.style.strokeDashoffset = 100 * (1 - p.line); if (kind !== 'stroke') e.style.strokeOpacity = 1; }
          } else { e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; e.removeAttribute('pathLength'); }
        });
        root.querySelectorAll('.sh').forEach(s => s.style.opacity = p.fill);
        [blushL, blushR, ...lensFill, mouth].forEach(e => e.style.fillOpacity = p.fill);
      }
    }

    return {
      root, pose, apply, setFace, ik, FACES, MOUTHS,
      slots: { head: headSlot, inside, chest, handL: armL.slot, handR: armR.slot },
      parts: { head, headIn, face, mouth, torso: upper, glasses, armL, armR }
    };
  }

  G.HERO = { create, FACES, MOUTHS, HEIGHT: 768, HEAD_W: 220, HEAD_C };
})(window);
