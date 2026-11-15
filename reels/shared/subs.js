/* shared/subs.js — white word-by-word subtitles, top-left.  Used unchanged by all stages.
   Montserrat 800 64px, x 120, top y 300, max width 840, max 2 lines.
   Each word: rise 12px + opacity over 4 frames (ease-out-expo), visible on its own start frame.
   A phrase clears 6 frames after its last word ends (3-frame ease-in fade), never overlapping the next. */
(function (G) {
  'use strict';
  const S = G.STYLE, FPS = S.FPS;
  const OPT = { x: 120, y: 300, maxW: 840, size: 64, lh: 80, font: '800 64px Montserrat' };

  function layout(words) {
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = OPT.font;
    const sp = cv.measureText(' ').width;
    const wid = words.map(w => cv.measureText(w.word).width);
    // clauses: break after , : ; . ? ! and around a lone dash
    const clauses = []; let cur = [];
    words.forEach((w, i) => {
      cur.push(i);
      const next = words[i + 1];
      if (/[.?!,:;—]$/.test(w.word)) { clauses.push(cur); cur = []; }
    });
    if (cur.length) clauses.push(cur);
    const fits = (idx) => {           // returns line assignment or null if > 2 lines
      let line = 0, x = 0; const pos = [];
      for (const i of idx) {
        if (x > 0 && x + sp + wid[i] > OPT.maxW) { line++; x = 0; }
        if (line > 1) return null;
        pos.push([x + (x > 0 ? sp : 0), line]); x += (x > 0 ? sp : 0) + wid[i];
      }
      return pos;
    };
    const phrases = []; let ph = [];
    const endsSentence = i => /[.?!]$/.test(words[i].word);
    clauses.forEach(c => {
      const merged = ph.concat(c);
      if (ph.length && !endsSentence(ph[ph.length - 1]) && fits(merged)) { ph = merged; return; }
      if (ph.length) phrases.push(ph);
      ph = [];
      // clause too long for 2 lines: split into the most balanced pieces that fit
      const split = (idx) => {
        if (fits(idx)) return [idx];
        let best = null, bestScore = 1e9;
        const tot = idx.reduce((a, i) => a + wid[i], 0);
        for (let k = 1; k < idx.length; k++) {
          const a = idx.slice(0, k), b = idx.slice(k);
          const wa = a.reduce((s, i) => s + wid[i], 0);
          const score = Math.abs(wa - (tot - wa)) + (fits(a) ? 0 : 1e6) + (fits(b) ? 0 : 1e5);
          if (score < bestScore) { bestScore = score; best = [a, b]; }
        }
        return split(best[0]).concat(split(best[1]));
      };
      const parts = split(c);
      parts.slice(0, -1).forEach(p => phrases.push(p));
      ph = parts[parts.length - 1];
    });
    if (ph.length) phrases.push(ph);
    return phrases.map(idx => ({ idx, pos: fits(idx) }));
  }

  function create(container, words) {
    const phrases = layout(words);
    const box = document.createElement('div');
    box.className = 'subs';
    Object.assign(box.style, { position: 'absolute', left: OPT.x + 'px', top: OPT.y + 'px', width: OPT.maxW + 'px', height: (OPT.lh * 2) + 'px', pointerEvents: 'none' });
    container.appendChild(box);
    const spans = [];
    phrases.forEach((ph, pi) => {
      const first = words[ph.idx[0]], last = words[ph.idx[ph.idx.length - 1]];
      const next = phrases[pi + 1] ? words[phrases[pi + 1].idx[0]] : null;
      const f0 = first.frame;
      let fEnd = Math.round(last.end * FPS) + 6;                   // clear 6 frames after last word
      if (next) fEnd = Math.min(fEnd, next.frame - 3);
      fEnd = Math.max(fEnd, last.frame + 4);
      ph.f0 = f0; ph.fClear = fEnd;
      ph.idx.forEach((i, k) => {
        const s = document.createElement('span');
        s.textContent = words[i].word;
        s.dataset.check = 'text';
        Object.assign(s.style, {
          position: 'absolute', left: ph.pos[k][0] + 'px', top: (ph.pos[k][1] * OPT.lh) + 'px', whiteSpace: 'nowrap',
          font: OPT.font, lineHeight: OPT.lh + 'px', color: '#FFFFFF', textShadow: '0 4px 12px rgba(15,11,36,0.6)', opacity: 0
        });
        box.appendChild(s);
        spans.push({ s, w: words[i], ph });
      });
    });
    function render(t) {
      const fr = t * FPS;
      for (const o of spans) {
        const f0 = o.w.frame, ph = o.ph;
        let op = 0, dy = 12;
        if (fr >= f0 - 0.001 && fr < ph.fClear + 3) {
          const p = S.clamp((fr - f0 + 1) / 4);                    // frame f0 already shows step 1/4
          const e = S.E.outExpo(p); op = e; dy = 12 * (1 - e);
          if (fr >= ph.fClear) op *= 1 - S.E.inCubic(S.clamp((fr - ph.fClear + 1) / 3));
        }
        o.s.style.opacity = op.toFixed(3);
        o.s.style.transform = `translateY(${dy.toFixed(2)}px)`;
        o.s.style.visibility = op > 0.001 ? 'visible' : 'hidden';
      }
    }
    return { render, phrases, spans, box };
  }
  G.SUBS = { create, OPT, layout };
})(window);
