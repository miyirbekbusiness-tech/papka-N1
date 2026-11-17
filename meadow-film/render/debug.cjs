const path=require('path'); const { chromium } = require('playwright'); const http=require('http'); const fs=require('fs'); const {spawnSync}=require('child_process');
(async()=>{
 const ROOT=path.resolve(__dirname,'..');
 const srv=http.createServer((q,r)=>{const p=path.join(ROOT,q.url.split('?')[0]); r.writeHead(200,{'content-type':p.endsWith('.html')?'text/html':'application/javascript'}); fs.createReadStream(p).pipe(r);}).listen(0);
 await new Promise(r=>srv.on('listening',r));
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-watchdog']}); const pg=await b.newPage();
 pg.on('console', m=>{ if(m.type()==='error') console.error(m.text().slice(0,800)); });
 await pg.route('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', r=>r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(process.env.THREE_JS)}));
 await pg.goto(`http://127.0.0.1:${srv.address().port}/meadow.html?render=1&scale=${process.env.SC||0.5}`); await pg.waitForFunction(()=>window.__ready);
 const b64 = await pg.evaluate(([T,code])=>{ (new Function('sc','T', code))(window.__scene, T); return window.readFrameB64(); }, [parseFloat(process.argv[2]), process.argv[3]]);
 spawnSync('ffmpeg',['-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',(process.env.SC==="1"?"1920x1080":"960x540"),'-i','-','-vf','vflip',process.argv[4]],{input:Buffer.from(b64,'base64')});
 await b.close(); srv.close();
})();
