const CACHE='rst-v30';
const FILES=['./','index.html','firebase-config.js','qrgen.js','jsQR.js','THIRD-PARTY-LICENSES.txt','manifest.webmanifest','icon-192.png','icon-512.png','icon-512-maskable.png','apple-touch-icon.png'];
// Firebase's scripts live on Google's servers. They're saved here too so live sync still starts when the phone has no signal.
// Keep the version in step with FBV in index.html.
const EXTRA=['https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE)
    .then(c=>Promise.all([...FILES.map(f=>fetch(new Request(f,{cache:'reload'})).then(r=>{if(r.ok)return c.put(f,r)}).catch(()=>{})),
      ...EXTRA.map(u=>fetch(new Request(u,{mode:'no-cors'})).then(r=>c.put(u,r)).catch(()=>{}))]))
    .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
// Network first (so updates show up), falling back to the saved copy when offline or slow.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(EXTRA.includes(e.request.url)){
    e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request.url))||fetch(e.request).then(r=>{c.put(e.request.url,r.clone());return r})));
    return;
  }
  if(url.origin!==location.origin)return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const res=await Promise.race([
        fetch(e.request.url,{cache:'no-cache'}),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),3000))
      ]);
      if(res&&res.ok)cache.put(e.request,res.clone());
      return res;
    }catch(err){
      const hit=(await cache.match(e.request,{ignoreSearch:true}))||(e.request.mode==='navigate'?await cache.match('index.html'):null);
      return hit||Response.error();
    }
  })());
});
