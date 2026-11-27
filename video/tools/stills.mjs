// Render middle frame (or given fraction) of scenes to sheets/frames/sXX.png. Usage: node tools/stills.mjs [ids...] [--at=0.5]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'fs';
import path from 'path';
const args = process.argv.slice(2);
const at = parseFloat((args.find((a) => a.startsWith('--at=')) || '--at=0.6').slice(5));
const timing = JSON.parse(fs.readFileSync('src/data/timing.json', 'utf8'));
let ids = args.filter((a) => !a.startsWith('--')).map(Number);
if (!ids.length) ids = Object.keys(timing.scenes).map(Number);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
fs.mkdirSync('sheets/frames', {recursive: true});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell';
for (const id of ids) {
  const comp = await selectComposition({serveUrl, id: 'Scene', inputProps: {id}, browserExecutable, chromiumOptions: {gl: 'swangle'}});
  const frame = Math.floor(comp.durationInFrames * at);
  await renderStill({composition: comp, serveUrl, output: `sheets/frames/s${String(id).padStart(2, '0')}.png`, frame, inputProps: {id}, scale: 0.5, browserExecutable, chromiumOptions: {gl: 'swangle'}});
  process.stdout.write(id + ' ');
}
console.log('done');
