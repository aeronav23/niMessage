/* niMessage 1.8: network-first app, offline fallback, QR decoder cached after first online load. */
const CACHE='nimessage-v1-8-help-1';
const QR_LIB='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const CORE=['./','./index.html','./style.css?v=180','./app.js?v=180','./manifest.json','./vendor/pako.min.js','./vendor/qr.js','./icons/icon.svg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(async path=>{
    const url=new URL(path,self.registration.scope);
    const response=await fetch(url,{cache:'reload'});
    if(response.ok)await cache.put(url,response);
  }));
  // CDN script is optional; when online, cache it for offline QR decoding.
  try{const r=await fetch(QR_LIB,{mode:'no-cors',cache:'reload'});await cache.put(QR_LIB,r)}catch(e){}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE&&(k.startsWith('nimessage-')||k.startsWith('airchat-'))).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  const isQR=url.href===QR_LIB;
  if(!isQR&&(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope)))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(req,{cache:'no-store'});
      if(response.ok||response.type==='opaque')await cache.put(req,response.clone());
      return response;
    }catch(e){
      const cached=await cache.match(req,{ignoreSearch:!isQR});
      if(cached)return cached;
      if(req.mode==='navigate')return (await cache.match(new URL('./index.html',self.registration.scope)))||Response.error();
      return Response.error();
    }
  })());
});
