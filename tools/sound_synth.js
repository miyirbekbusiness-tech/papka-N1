// Browser-side synthesis: music + foley for the 60 s Reel, rendered in an OfflineAudioContext.
// No samples: every sound is built from oscillators, seeded noise, filters and envelopes.
// Called as window.renderSound(events) -> { left: base64 f32, right: base64 f32, hits: [...] }
window.renderSound = async function (events) {
  const SR = 48000, DUR = 60, FR = 1 / 30;
  const ctx = new OfflineAudioContext(2, SR * DUR, SR);
  let seed = 20261111;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const dB = d => Math.pow(10, d / 20);

  // ---------------- buses
  const master = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 100; hp.Q.value = 0.6; // nothing important below 100 Hz
  master.connect(hp); hp.connect(ctx.destination);
  const music = ctx.createGain(); const duck = ctx.createGain(); const musicCut = ctx.createGain();
  music.connect(musicCut); musicCut.connect(duck); duck.connect(master);
  const foley = ctx.createGain(); foley.gain.value = 1; foley.connect(master);
  const amb = ctx.createGain(); amb.gain.value = 1; amb.connect(master);

  // seeded white noise buffer (4 s, stereo-independent)
  const nb = ctx.createBuffer(2, SR * 4, SR);
  for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
  const noise = (t0, t1, dest) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(dest); s.start(t0, rnd() * 3.5); s.stop(t1); return s; };
  const gainAt = (dest, pan = 0) => { const g = ctx.createGain(); g.gain.value = 0; if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest); } else g.connect(dest); return g; };
  const filt = (type, f, Q = 0.7, dest) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = Q; b.connect(dest); return b; };
  // percussive envelope that PEAKS at tp
  const perc = (g, tp, att, dec, peak) => { g.gain.setValueAtTime(0, Math.max(0, tp - att)); g.gain.linearRampToValueAtTime(peak, tp); g.gain.setTargetAtTime(0, tp, dec / 4); };
  const tone = (type, f, tp, att, dec, peak, dest, f2) => {
    const g = gainAt(dest); const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, Math.max(0, tp - att));
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, tp + dec);
    o.connect(g); perc(g, tp, att, dec, peak); o.start(Math.max(0, tp - att)); o.stop(tp + dec * 1.6 + 0.05); return g;
  };
  const burst = (tp, att, dec, peak, ftype, f, Q, dest, pan = 0) => {
    const g = gainAt(dest, pan); const b = filt(ftype, f, Q, g); noise(Math.max(0, tp - att), tp + dec * 1.6 + 0.05, b); perc(g, tp, att, dec, peak); return g;
  };
  const hits = [];
  const hit = (tp, label) => hits.push({ t: +tp.toFixed(3), label });

  // ================= FOLEY (each hit peaks 1 frame after its picture event)
  const ev = name => events.filter(e => e.name === name);
  const once = list => list.filter((e, i, a) => a.findIndex(x => Math.abs(x.g - e.g) < 1e-3) === i);
  // car roll 0-1.0 and brake at 1.0 (the limo comes in from the right)
  {
    const g = gainAt(foley); const pan = ctx.createStereoPanner(); g.disconnect(); g.connect(pan); pan.connect(foley);
    pan.pan.setValueAtTime(0.75, 0); pan.pan.linearRampToValueAtTime(0.25, 1.0);
    const lp = filt('lowpass', 420, 0.8, g); noise(0, 1.25, lp);
    const hum = ctx.createOscillator(); hum.type = 'triangle'; hum.frequency.setValueAtTime(128, 0); hum.frequency.linearRampToValueAtTime(104, 1.0);
    const hg = ctx.createGain(); hg.gain.value = 0.35; hum.connect(hg); hg.connect(lp); hum.start(0); hum.stop(1.25);
    g.gain.setValueAtTime(0.22, 0); g.gain.linearRampToValueAtTime(0.3, 0.8); g.gain.linearRampToValueAtTime(0.0, 1.0 + FR + 0.12);
  }
  ev('brake').forEach(e => { const tp = e.g + FR; burst(tp, 0.03, 0.28, 0.16, 'bandpass', 1400, 1.5, foley, 0.25); const sq = tone('sine', 2650, tp, 0.03, 0.22, 0.05, foley, 2450); void sq; hit(tp, 'brake'); });
  ev('doorClick').forEach(e => { const tp = e.g + FR; burst(tp, 0.002, 0.03, 0.22, 'bandpass', 2600, 3, foley, 0.35); tone('sine', 150, tp, 0.003, 0.08, 0.15, foley); hit(tp, 'door click'); });
  // footsteps
  const step = (tp, pan, v0 = 0.32) => { const v = v0 * 0.5; burst(tp, 0.004, 0.05, v, 'lowpass', 900, 0.8, foley, pan); tone('sine', 150, tp, 0.004, 0.09, v * 0.9, foley, 105); hit(tp, 'step'); };
  ev('step').forEach(e => {
    const tp = e.g + FR;
    if (e.who === 'both') { step(tp, -0.15, 0.26); step(tp + 0.06, 0.25, 0.24); } else step(tp, e.who === 'rich' ? 0.3 : -0.25, e.who ? 0.34 : 0.26);
  });
  [56.45, 56.7, 56.95, 57.2].forEach((t, i) => step(t + FR, 0.1, i % 2 ? 0.16 : 0.2)); // HERO and CHILD on the path
  // briefcase latch: two clicks + a little metal ring
  ev('latch').forEach(e => { const tp = e.g + FR; [tp - 0.035, tp].forEach(t => { burst(t, 0.001, 0.015, 0.45, 'bandpass', 3600, 5, foley, 0.2); tone('sine', 2900, t, 0.001, 0.09, 0.05, foley); }); hit(tp, 'latch'); });
  // cash-register ding on the first LABEL
  ev('cashDing').forEach(e => { const tp = e.g + FR; burst(tp - 0.06, 0.002, 0.05, 0.14, 'bandpass', 1900, 2, foley); [[1568, 0.08], [2093, 0.055], [3136, 0.03], [4186, 0.018]].forEach(([f, a]) => tone('sine', f, tp, 0.003, 1.3, a, foley)); hit(tp, 'cash ding'); });
  // three bubble pops
  ev('bubblePop').filter(e => e.part === 1).forEach((e, i) => { const tp = e.g + FR; tone('sine', 340 + i * 90, tp, 0.006, 0.07, 0.17, foley, 1000 + i * 180); hit(tp, 'bubble pop'); });
  // bubble burst
  ev('bubbleBurst').forEach(e => { const tp = e.g + FR; tone('sine', 520, tp, 0.004, 0.09, 0.11, foley, 1500); burst(tp, 0.003, 0.18, 0.07, 'highpass', 1800, 0.7, foley); hit(tp, 'bubble burst'); });
  // soft whooshes on the three colour wipes (GOLD, CREAM, SKY); peak on the full-colour frame
  const whoosh = (t0, tp, t1, v = 0.22, pan = 0) => {
    const g = gainAt(foley, pan); const b = filt('bandpass', 400, 0.9, g); noise(t0, t1, b);
    b.frequency.setValueAtTime(350, t0); b.frequency.exponentialRampToValueAtTime(2400, tp); b.frequency.exponentialRampToValueAtTime(700, t1);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, tp); g.gain.linearRampToValueAtTime(0, t1); hit(tp, 'whoosh');
  };
  whoosh(14.0, 14.967 + FR, 15.4, 0.24, 0.3);   // GOLD door wipe -> GOLD slides off
  whoosh(29.5, 29.967 + FR, 30.45, 0.2, 0);     // CREAM circle -> CREAM contracts
  whoosh(44.1, 44.967 + FR, 45.4, 0.18, 0);     // tilt up to SKY -> tilt down
  // glass crack on the MARK
  ev('glassCrack').forEach(e => {
    const tp = e.g + FR; burst(tp, 0.001, 0.06, 0.16, 'highpass', 3000, 0.7, foley);
    for (let k = 0; k < 6; k++) { const t = tp + rnd() * 0.12; burst(t, 0.001, 0.01, 0.09, 'bandpass', 4000 + rnd() * 3000, 4, foley, rnd() - 0.5); tone('sine', 3500 + rnd() * 3000, t, 0.001, 0.25, 0.015, foley); }
    hit(tp, 'glass crack');
  });
  // two heartbeats under S8: lub-dub, lub-dub on the four peaks of the line, shrinking
  { const hb = ev('heartbeat').map(e => e.g); const step_ = hb[1] - hb[0]; const peaks = [0, 1, 2, 3].map(k => hb[0] + k * step_);
    peaks.forEach((t, k) => { const tp = t + FR, a = [0.55, 0.42, 0.32, 0.22][k] * 0.3; tone('sine', 128, tp, 0.012, 0.16, a, foley, 104); tone('sine', 256, tp, 0.012, 0.08, a * 0.35, foley); burst(tp, 0.01, 0.06, a * 0.3, 'lowpass', 400, 0.7, foley); hit(tp, 'heartbeat'); }); }
  // four rising chimes on the ICONS
  ev('chime').forEach(e => { const tp = e.g + FR, m = [74, 78, 81, 86][e.i]; [[1, 0.12], [2.76, 0.035], [5.4, 0.015]].forEach(([r, a]) => tone('sine', mtof(m) * r, tp, 0.004, 1.6, a, foley)); hit(tp, 'chime'); });
  // ring ding
  ev('ringDing').forEach(e => { const tp = e.g + FR; [[1, 0.11], [2.76, 0.04], [5.4, 0.017]].forEach(([r, a]) => tone('sine', mtof(93) * r, tp, 0.003, 1.4, a, foley)); hit(tp, 'ring ding'); });
  // confetti pop + paper falling until 3.5
  ev('confettiPop').forEach(e => {
    const tp = e.g + FR; burst(tp, 0.002, 0.05, 0.25, 'bandpass', 1300, 1.2, foley, 0.3); tone('sine', 190, tp, 0.002, 0.08, 0.13, foley, 120);
    const g = gainAt(foley, 0.15); const b = filt('highpass', 4200, 0.7, g); noise(tp, tp + 1.0, b);
    g.gain.setValueAtTime(0, tp); for (let k = 0; k < 24; k++) { const t = tp + 0.02 + k * 0.04; g.gain.linearRampToValueAtTime((0.05 + rnd() * 0.07) * (1 - k / 24), t); }
    g.gain.linearRampToValueAtTime(0, 33.5); hit(tp, 'confetti pop');
  });
  // rain in the umbrella cut (34.5 - 35.5)
  ev('rainStart').forEach(e => {
    const t0 = e.g, t1 = e.until + 30; const g = gainAt(amb); const b = filt('highpass', 2200, 0.5, g); noise(t0, t1 + 0.05, b);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.065, t0 + 0.05); g.gain.setValueAtTime(0.065, t1 - 0.01); g.gain.linearRampToValueAtTime(0, t1);
    for (let k = 0; k < 26; k++) { const t = t0 + 0.02 + rnd() * (t1 - t0 - 0.06); burst(t, 0.001, 0.012, 0.025 + rnd() * 0.02, 'bandpass', 3000 + rnd() * 4000, 3, amb, rnd() * 1.6 - 0.8); }
  });
  // one soft click for every bulb that goes out
  once(ev('bulbOut')).forEach(e => { const tp = e.g + FR; burst(tp, 0.001, 0.012, 0.3, 'bandpass', 4200, 4, foley, -0.1); tone('sine', 3400, tp, 0.001, 0.04, 0.05, foley); hit(tp, 'bulb click'); });
  // long fading tone while bulbs 5 and 6 die (50.0 - 51.0, tail to ~53)
  ev('fadeTone').forEach(e => {
    const t0 = e.g; [[587.33, 0.06], [880.0, 0.035], [589.1, 0.03]].forEach(([f, a]) => { const g = gainAt(foley); const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + 0.12); g.gain.exponentialRampToValueAtTime(a * 0.25, t0 + 1.0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 2.8); o.start(t0); o.stop(t0 + 2.9); });
  });
  // wind (part 1 and part 4) and leaves
  const wind = (t0, t1, v) => {
    const g = gainAt(amb); const b = filt('bandpass', 520, 0.6, g); noise(t0, t1, b);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.18; const lg = ctx.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(b.frequency); lfo.start(t0); lfo.stop(t1);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.5); g.gain.setValueAtTime(v, t1 - 0.6); g.gain.linearRampToValueAtTime(0, t1);
  };
  wind(0, 14.2, 0.05); wind(45.0, 60, 0.07);
  const rustle = (t0, t1, v, pan = 0) => { const g = gainAt(amb, pan); const b = filt('highpass', 3200, 0.6, g); noise(t0, t1, b); g.gain.setValueAtTime(0, t0); const n = Math.floor((t1 - t0) / 0.05); for (let k = 0; k <= n; k++) { const t = t0 + k * 0.05, env = Math.sin(Math.PI * k / n); g.gain.linearRampToValueAtTime(v * env * (0.4 + rnd() * 0.6), t); } };
  ev('leavesLift').forEach(e => rustle(e.g - 0.1, e.g + 1.9, 0.11, 0.2));
  [3.2, 7.4, 11.8, 46.5, 52.0].forEach(t => rustle(t, t + 0.9, 0.035, rnd() - 0.5));
  // low thud on the split
  ev('splitThud').forEach(e => { const tp = e.g + FR; tone('sine', 118, tp, 0.006, 0.4, 0.16, foley, 100); tone('sine', 176, tp, 0.006, 0.25, 0.08, foley); burst(tp, 0.004, 0.12, 0.08, 'lowpass', 380, 0.7, foley); hit(tp, 'split thud'); });
  // the bottom half slides out (soft swish, not a colour wipe)
  ev('whoosh').filter(e => e.part === 4).forEach(e => { const g = gainAt(foley); const b = filt('bandpass', 1500, 0.8, g); noise(e.g, e.g + 0.35, b); perc(g, e.g + 8 * FR, 0.2, 0.12, 0.08); });

  // ================= MUSIC: warm felt piano + soft strings, D minor, 60 BPM feel on the 120 grid
  const piano = (t, m, v, len = 2.4) => {
    const f = mtof(m), g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = Math.max(-0.5, Math.min(0.5, (m - 62) / 30));
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(Math.min(5200, f * 7), t); lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2.2), t + 1.2);
    g.connect(lp); lp.connect(p); p.connect(music);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.setTargetAtTime(v * 0.45, t + 0.01, 0.15); g.gain.setTargetAtTime(0, t + 0.3, len / 3.2);
    [[1, 1], [2, 0.42], [3, 0.16], [4, 0.07], [5, 0.03]].forEach(([n, a]) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * n * Math.sqrt(1 + 0.00035 * n * n); const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + len + 1.2); });
  };
  const strings = (t0, t1, ms, v, atk = 0.8, rel = 1.0) => ms.forEach((m, i) => {
    const g = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.4; g.connect(lp); lp.connect(music);
    [-7, 7].forEach((c, k) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = c; const pn = ctx.createStereoPanner(); pn.pan.value = k ? 0.45 : -0.45; const og = ctx.createGain(); og.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 4.6 + i * 0.13 + k * 0.2; const lg = ctx.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.detune); lfo.start(t0); lfo.stop(t1 + rel + 0.1);
      o.connect(og); og.connect(pn); pn.connect(g); o.start(t0); o.stop(t1 + rel + 0.1); });
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + atk); g.gain.setValueAtTime(v, t1); g.gain.linearRampToValueAtTime(0, t1 + rel);
  });
  const N = { D2: 38, A2: 45, Bb2: 46, C3: 48, Cs3: 49, D3: 50, E3: 52, F3: 53, Fs3: 54, G3: 55, A3: 57, Bb3: 58, B3: 59, C4: 60, Cs4: 61, D4: 62, E4: 64, F4: 65, Fs4: 66, G4: 67, A4: 69, Bb4: 70, B4: 71, Cs5: 73, D5: 74, E5: 76, F5: 77, Fs5: 78, A5: 81 };
  // A: light and curious, 0 - 21.0 (stops dead)
  const minor = [['D3', 'A3', 'D4', 'F4', 'A4'], ['Bb2', 'F3', 'D4', 'F4', 'Bb4'], ['G3', 'D4', 'G4', 'Bb4', 'D5'], ['A2', 'E3', 'Cs4', 'E4', 'A4']].map(c => c.map(n => N[n]));
  for (let t = 0, k = 0; t < 21 - 1e-6; t += 2, k++) {
    const c = minor[k % 4];
    piano(t, c[0], 0.11, 2.6);
    [[0.5, c[1]], [1.0, c[3]], [1.25, c[2]], [1.5, c[4]], [1.75, c[3]]].forEach(([dt, m], j) => { if (t + dt < 21 - 0.02) piano(t + dt, m + (j === 3 && k % 2 ? 2 : 0), 0.07 + (j === 1 ? 0.02 : 0), 1.3); });
    strings(t, Math.min(t + 2, 21), c.slice(1, 4), 0.012, 0.6, 0.6);
  }
  musicCut.gain.setValueAtTime(1, 0); musicCut.gain.setValueAtTime(1, 21.0 - 0.012); musicCut.gain.linearRampToValueAtTime(0, 21.0);
  // B: returns in D major at 30.0; thins to piano alone from 36.5; stops at 49.5
  const major = [['D3', 'A3', 'Fs4', 'A4', 'D5'], ['Cs3', 'E3', 'A3', 'E4', 'A4'], ['B3', 'Fs3', 'D4', 'Fs4', 'B4'], ['G3', 'D4', 'G4', 'B4', 'D5']].map(c => c.map(n => N[n]));
  const sadder = [major[2], major[3], major[0], major[1]];
  musicCut.gain.setValueAtTime(0, 30.0 - 0.01); musicCut.gain.linearRampToValueAtTime(1, 30.0);
  for (let t = 30, k = 0; t < 49.5 - 1e-6; t += 2, k++) {
    const c = t < 36.5 ? major[k % 4] : sadder[k % 4], v = t < 36.5 ? 1 : 0.8;
    piano(t, c[0], 0.11 * v, 2.6);
    [[0.5, c[1]], [1.0, c[2]], [1.5, c[3]], [1.75, c[4]]].forEach(([dt, m]) => { if (t + dt < 49.5 - 0.05) piano(t + dt, m, 0.075 * v, 1.8); });
    if (t < 36.5) strings(t, Math.min(t + 2, 36.5), c.slice(1, 4), 0.016, t === 30 ? 0.9 : 0.3, t + 2 >= 36.5 ? 0.9 : 0.4);
  }
  musicCut.gain.setValueAtTime(1, 49.5 - 0.02); musicCut.gain.linearRampToValueAtTime(0, 49.5);
  // C: a lone piano from 53.0, resolving on one warm chord at 58.0
  musicCut.gain.setValueAtTime(0, 53.0 - 0.01); musicCut.gain.linearRampToValueAtTime(1, 53.0);
  [[53.0, 'A4', 0.09], [54.5, 'F4', 0.08], [55.5, 'D4', 0.08], [56.5, 'E4', 0.075], [57.25, 'Cs5', 0.07]].forEach(([t, n, v]) => piano(t, N[n], v, 2.2));
  ['D3', 'A3', 'Fs4', 'A4', 'D5'].forEach((n, i) => piano(58.0 + i * 0.03, N[n], 0.05, 3.2));
  strings(58.0, 59.3, [N.D4, N.Fs4, N.A4], 0.014, 0.5, 0.7);
  musicCut.gain.setValueAtTime(1, 59.3); musicCut.gain.linearRampToValueAtTime(0.0, 60.0);

  // ================= ducking: music -6 dB under the hits (40 ms attack, 300 ms release)
  const RES = 200, curve = new Float32Array(DUR * RES).fill(1);
  hits.forEach(h => { for (let i = 0; i < curve.length; i++) { const t = i / RES; let d = 0; if (t >= h.t - 0.04 && t < h.t) d = (t - (h.t - 0.04)) / 0.04; else if (t >= h.t && t < h.t + 0.06) d = 1; else if (t >= h.t + 0.06 && t < h.t + 0.36) d = 1 - (t - h.t - 0.06) / 0.3; curve[i] = Math.min(curve[i], 1 - (1 - dB(-6)) * d); } });
  duck.gain.setValueCurveAtTime(curve, 0, DUR);
  // music sits under the foley
  music.gain.value = dB(1.5);

  const buf = await ctx.startRendering();
  const b64 = a => { const u8 = new Uint8Array(a.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  return { left: b64(buf.getChannelData(0)), right: b64(buf.getChannelData(1)), hits };
};
