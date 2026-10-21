import {getApp,base} from './store.js';import {APP_ID,mime} from './package.js';import {appManifest} from './manifest.js';
const PREFIX='app-launcher:'+self.registration.scope+':shell:';
const CACHE=PREFIX+'__VERSION__';const assets='__ASSETS__';
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(assets.map(a=>new Request(new URL(a,self.registration.scope),{cache:'reload'})));await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith(PREFIX)&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data?.type==='STATUS')e.waitUntil((async()=>{const c=await caches.open(CACHE);e.ports[0]?.postMessage({ready:(await Promise.all(assets.map(a=>c.match(new URL(a,self.registration.scope).href)))).every(Boolean)});})());});
const response=(body,type,status=200,headers={})=>new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export function sliceRange(data,header){const m=/^bytes=(\d*)-(\d*)$/.exec(header||'');if(!m||(!m[1]&&!m[2]))return null;const start=m[1]?Number(m[1]):Math.max(0,data.byteLength-Number(m[2]));const end=m[1]?(m[2]?Math.min(Number(m[2]),data.byteLength-1):data.byteLength-1):data.byteLength-1;return start<=end&&start<data.byteLength?{start,end}:null;}
async function appFile(request,u){
 const relative=u.pathname.slice((base+'apps/').length);const slash=relative.indexOf('/');const id=relative.slice(0,slash);if(slash<0||!APP_ID.test(id))return response('Invalid app','text/plain',404);
 const app=await getApp(id);if(!app)return response('App not available in this browser. Open its AppLauncher install page.','text/plain',404);
 let path;try{path=decodeURIComponent(relative.slice(slash+1));}catch{return response('Invalid path','text/plain',400);}
 if(!path||path.endsWith('/'))path+='index.html';const file=app.files.find(f=>f.path===path);if(!file)return response('File not included: '+path,'text/plain',404);
 let data=new Uint8Array(file.data);const type=file.type||mime(path);const headers=app.isolation?{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'}:{};
 if(type==='text/html'){
  let html=new TextDecoder().decode(data);const script='<script src="'+base+'runtime.js?app='+encodeURIComponent(id)+'"></script>';
  html=/<head(?:\s[^>]*)?>/i.test(html)?html.replace(/<head(?:\s[^>]*)?>/i,m=>m+script):script+html;data=new TextEncoder().encode(html);
 }
 const range=request.headers.get('Range');if(range){const bounds=sliceRange(data,range);if(!bounds)return response('',type,416,{'Content-Range':'bytes */'+data.byteLength});return response(data.slice(bounds.start,bounds.end+1),type,206,{...headers,'Accept-Ranges':'bytes','Content-Range':`bytes ${bounds.start}-${bounds.end}/${data.byteLength}`});}
 return response(data,type,200,{...headers,'Accept-Ranges':'bytes'});
}
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(u.origin!==self.location.origin||!u.pathname.startsWith(base)||e.request.method!=='GET')return;
 e.respondWith((async()=>{
  if(u.pathname.startsWith(base+'apps/'))return appFile(e.request,u);
  if(u.pathname===base+'app.webmanifest'){
   const app=await getApp(u.searchParams.get('app'));if(!app)return response('{}','application/manifest+json',404);
   try{return response(JSON.stringify(appManifest(app,self.registration.scope,u.searchParams.get('start')||undefined)),'application/manifest+json');}catch{return response('{}','application/manifest+json',400);}
  }
  if(u.pathname===base+'app-icon.png'){const app=await getApp(u.searchParams.get('app'));if(app?.icon){const b=atob(app.icon.split(',')[1]);return response(Uint8Array.from(b,c=>c.charCodeAt(0)),'image/png');}}
  const c=await caches.open(CACHE);const key=u.pathname===base||u.pathname===base+'index.html'?self.registration.scope:u.origin+u.pathname;const cached=await c.match(key);
  if(cached){if(u.pathname===base+'launch.html'){const app=await getApp(u.searchParams.get('app'));if(app?.isolation){const h=new Headers(cached.headers);h.set('Cross-Origin-Opener-Policy','same-origin');h.set('Cross-Origin-Embedder-Policy','require-corp');return new Response(await cached.arrayBuffer(),{headers:h});}}return cached;}
  return fetch(e.request);
 })().catch(()=>response('Unable to open this app. Check local storage or reconnect to its source.','text/plain',503)));
});
