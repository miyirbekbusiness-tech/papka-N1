// Render stills of video/aql-va-ong.html, build a contact sheet and run the CHECKS.
// usage: node video/tools/stills.cjs <out-prefix> <t1,t2,...> [--from s --to s]
// env: GSAP_LOCAL=/path/to/gsap.min.js serves GSAP locally when cdnjs is unreachable.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const HTML = path.resolve(__dirname, '..', 'aql-va-ong.html');
const [outPrefix, timesArg] = process.argv.slice(2);
const argv = process.argv.slice(4);
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? parseFloat(argv[i + 1]) : null; };
const from = opt('--from') ?? 0, to = opt('--to') ?? 90;
const times = timesArg.split(',').map(Number);

(async () => {
  const launch = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
  if (process.env.GSAP_LOCAL) await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ path: process.env.GSAP_LOCAL, contentType: 'application/javascript' }));
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + HTML + '?t=0');
  await page.waitForFunction(() => window.__ready).catch(() => {});
  await page.evaluate(() => window.__ready);
  const report = { errors, fontsOK: await page.evaluate(() => window.__fontsOK) };

  // subtitle widths / line counts, exact text
  const subs = await page.evaluate(() => window.__subsReport());
  report.subtitles = subs.filter(s => s.start >= from && s.start < to).map(s => `${s.start.toFixed(2).padStart(5)}s f${String(s.frame).padStart(4)}  ${s.lines} line(s)  [${s.widths.join(', ')}] px  ${s.text}`);
  report.subtitleFail = subs.filter(s => s.lines > 2 || s.maxW > 840).map(s => s.text);
  report.lineText = await page.evaluate(() => window.__lineText());

  // each page starts on its exact frame: first word invisible on f-1, visible on f
  const starts = await page.evaluate(() => window.__pages());
  report.startFrames = [];
  for (let i = 0; i < starts.length; i++) {
    const st = starts[i];
    if (st < from || st >= to) continue;
    let before = 0;
    if (st > 0) { await page.evaluate(t => renderAt(t), st - 1 / 30); before = await page.evaluate(i => __firstWordOpacity(i), i); }
    await page.evaluate(t => renderAt(t), st);
    const at = await page.evaluate(i => __firstWordOpacity(i), i);
    report.startFrames.push({ t: st, frame: Math.round(st * 30), before: +before.toFixed(3), at: +at.toFixed(3), ok: st === 0 ? at === 1 : (before === 0 && at > 0) });
  }

  // which font actually renders each text node (no fallback allowed)
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '#subs .page, .title, .label, .mono, .q, .bubble span' });
  const fams = {};
  for (const id of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: id });
    for (const f of fonts) fams[`${f.familyName}${f.isCustomFont ? ' (webfont)' : ' (SYSTEM)'}`] = (fams[`${f.familyName}${f.isCustomFont ? ' (webfont)' : ' (SYSTEM)'}`] || 0) + f.glyphCount;
  }
  report.platformFonts = fams;

  // stills + per-frame audit
  fs.mkdirSync(path.dirname(outPrefix), { recursive: true });
  const shots = [];
  report.audit = [];
  for (const t of times) {
    await page.evaluate(t => renderAt(t), t);
    const a = await page.evaluate(() => window.__audit());
    report.audit.push({ t, textOut: a.textOut, contrastLow: a.contrastLow, overlap: a.overlap, minContrast: a.minContrast, texts: a.texts });
    const file = `${outPrefix}_${String(t).replace('.', '_')}.jpg`;
    await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
    shots.push([t, file]);
  }
  await browser.close();
  execFileSync('python3', [path.join(__dirname, 'sheet.py'), outPrefix + '.jpg', ...shots.flatMap(([t, f]) => [String(t), f])]);
  fs.writeFileSync(outPrefix + '_report.json', JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ ...report, audit: report.audit.map(a => ({ t: a.t, textOut: a.textOut, contrastLow: a.contrastLow, overlap: a.overlap, minContrast: a.minContrast })) }, null, 1));
})();
