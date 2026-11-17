const path=require('path'); const { chromium } = require('playwright'); const http=require('http'); const fs=require('fs');
(async()=>{
 const ROOT=path.resolve(__dirname,'..');
 const srv=http.createServer((q,r)=>{const p=path.join(ROOT,q.url.split('?')[0]); r.writeHead(200,{'content-type':p.endsWith('.html')?'text/html':'application/javascript'}); fs.createReadStream(p).pipe(r);}).listen(0);
 await new Promise(r=>srv.on('listening',r));
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-watchdog']}); const pg=await b.newPage();
 pg.on('console', m=>{ if(m.type()==='error') console.error(m.text().slice(0,800)); });
 pg.on('pageerror', e=>console.error(e.message));
 await pg.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r=>r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(process.env.THREE_JS)}));
 await pg.goto(`http://127.0.0.1:${srv.address().port}/meadow.html?render=1&scale=${process.env.SC||1}`); await pg.waitForFunction(()=>window.__ready);
 console.log('tiles', await pg.evaluate(()=>window.__grassTiles));
 for (const T of process.argv[2].split(',').map(Number)) {
   const dt = await pg.evaluate(([T,process_mb])=>{ const gl=window.__renderer.getContext(); const px=new Uint8Array(4); window.renderAt(T); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
     const t0=performance.now(); if (process_mb) window.renderFrameMB(Math.round(T*60), 12); else window.renderAt(T+0.01); gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px); return performance.now()-t0; }, [T, !!process.env.MB]);
   console.log(T, dt.toFixed(0)+' ms');
 }
 await b.close(); srv.close();
})();
