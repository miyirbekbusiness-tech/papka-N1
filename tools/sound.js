// node tools/sound.js -> sound.wav (-14 LUFS, TP <= -2 dBTP) and music_bed.wav (-20 LUFS)
// Renders tools/sound_synth.js in headless Chrome (OfflineAudioContext), then masters with ffmpeg.
const { chromium } = require('playwright'); const { serve } = require('./serve');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
function measure(file) {
  const r = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = r.stderr; const I = +/I:\s+(-?[\d.]+) LUFS/.exec(s.slice(s.lastIndexOf('Summary')))[1]; const TP = +/Peak:\s+(-?[\d.inf]+) dBFS/.exec(s.slice(s.lastIndexOf('True peak')))[1];
  return { I, TP };
}
(async () => {
  const events = JSON.parse(fs.readFileSync(path.join(ROOT, 'sound/events.json'), 'utf8'));
  const srv = await serve(); const b = await chromium.launch(); const p = await b.newPage();
  p.on('console', m => console.log('page:', m.text())); p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto(`${srv.url}/kit.html`); await p.addScriptTag({ path: path.join(__dirname, 'sound_synth.js') });
  const t0 = Date.now();
  const res = await p.evaluate(ev => window.renderSound(ev), events);
  console.log(`rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s, ${res.hits.length} hits`);
  await b.close(); srv.close();
  const L = new Float32Array(Buffer.from(res.left, 'base64').buffer.slice(0)), R = new Float32Array(Buffer.from(res.right, 'base64').buffer.slice(0));
  const inter = new Float32Array(L.length * 2); for (let i = 0; i < L.length; i++) { inter[2 * i] = L[i]; inter[2 * i + 1] = R[i]; }
  fs.mkdirSync(path.join(ROOT, 'sound'), { recursive: true });
  const raw = path.join(ROOT, 'sound/raw.f32'); fs.writeFileSync(raw, Buffer.from(inter.buffer));
  const rawWav = path.join(ROOT, 'sound/mix_raw.wav');
  ff(['-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', raw, '-c:a', 'pcm_f32le', rawWav]); fs.unlinkSync(raw);
  fs.writeFileSync(path.join(ROOT, 'sound/hits.json'), JSON.stringify(res.hits, null, 1));
  const m0 = measure(rawWav); console.log('raw', m0);
  // master with the true-peak limiter (tools/master.py): -14 LUFS, <= -2 dBTP; music bed -20 LUFS
  const out = path.join(ROOT, 'sound.wav'), mb = path.join(ROOT, 'music_bed.wav');
  const r1 = execFileSync('python3', [path.join(__dirname, 'master.py'), rawWav, out, '-14', '-2']).toString(); console.log(r1);
  const r2 = execFileSync('python3', [path.join(__dirname, 'master.py'), rawWav, mb, '-20', '-2']).toString(); console.log(r2);
  const mm = measure(out), mbm = measure(mb), gr = +/GR=([\d.]+)/.exec(r1)[1];
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim();
  const rep = `sound.wav: ${dur} s, 48 kHz stereo, integrated ${mm.I} LUFS, true peak ${mm.TP} dBTP, limiter gain reduction <= ${gr.toFixed(2)} dB\nmusic_bed.wav: integrated ${mbm.I} LUFS, true peak ${mbm.TP} dBTP\n`;
  fs.writeFileSync(path.join(ROOT, 'sound/report.txt'), rep); console.log(rep);
})();
