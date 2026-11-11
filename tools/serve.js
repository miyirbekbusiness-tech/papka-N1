// tiny static server for the repo root (ES modules need http)
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
exports.serve = () => new Promise(res => {
  const s = http.createServer((req, rsp) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end(); }
    rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(rsp);
  });
  s.listen(0, () => res({ url: `http://127.0.0.1:${s.address().port}`, close: () => s.close() }));
});
