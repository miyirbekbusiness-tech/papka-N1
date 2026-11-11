const { chromium } = require('playwright'); const {serve}=require('./serve');
(async()=>{const [out='frames/kit.png', scale='1', clip]=process.argv.slice(2);
const srv=await serve(); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1000,height:800},deviceScaleFactor:+scale});
p.on('pageerror',e=>console.log('pageerror',e.message)); p.on('console',m=>console.log(m.text()));
await p.goto(srv.url+'/kit.html'); await p.waitForFunction(()=>window.__ready,null,{timeout:15000});
if(clip){const [x,y,w,h]=clip.split(',').map(Number); await p.setViewportSize({width:2700,height:3000}); await p.screenshot({path:out,clip:{x,y,width:w,height:h}});}
else await (await p.$('#kit')).screenshot({path:out}); await b.close(); srv.close();})()
