import assert from 'node:assert/strict';
import {writeFile,rm} from 'node:fs/promises';
export async function verifyUpdates({browser,base}){
 const context=await browser.newContext(),page=await context.newPage();
 try{
  await page.goto(base);await page.locator('#offline.ready').waitFor();
  await page.evaluate(async()=>{localStorage.setItem('update-preserve','keep');const request=indexedDB.open('app-launcher:'+location.pathname,2);request.onupgradeneeded=()=>{for(const name of ['apps','installs'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'});};const db=await new Promise(ok=>request.onsuccess=()=>ok(request.result));await new Promise(ok=>{const t=db.transaction('apps','readwrite');t.objectStore('apps').put({id:'keep',name:'Keep me',entry:'index.html',files:[{path:'index.html',data:new TextEncoder().encode('<h1>Keep me</h1>'),type:'text/html'}],size:16,version:'a'.repeat(64),updated:1});t.oncomplete=ok;});});
  if(!process.env.BASE_URL){
   await writeFile('dist/legacy-worker.js',`const name='app-launcher:'+self.registration.scope+':shell:legacy-fixture';self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(name);await c.put(self.registration.scope,new Response('<!doctype html><title>Old engine</title><h1>Old engine</h1>',{headers:{'Content-Type':'text/html'}}));await self.skipWaiting();})()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith((async()=>{const c=await caches.open(name);return await c.match(e.request.url.split('?')[0])||fetch(e.request);})());});self.addEventListener('message',e=>{if(e.data.type==='STATUS')e.ports[0].postMessage({ready:true});});`);
   await page.evaluate(async()=>{await navigator.serviceWorker.register('legacy-worker.js',{scope:'./',type:'module'});});
   await page.getByRole('heading',{name:'Old engine',exact:true}).waitFor();
   // This page is not precached by old engines and must be able to replace their worker.
   await page.goto(new URL('update.html',base).href);
  }else await page.locator('#engine-update').click();
  await page.locator('#my-apps').waitFor({timeout:40000});await page.locator('#offline.ready').waitFor();
  assert.match(new URL(page.url()).searchParams.get('updated'),/^[a-f0-9]{8}$/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('update-preserve')),'keep');
  await page.locator('#my-apps').click();await page.getByRole('button',{name:'Keep me',exact:false}).waitFor();
  assert.ok(!(await page.evaluate(()=>caches.keys())).some(k=>k.endsWith(':legacy-fixture')));
  // A failed online check must provide recovery without deleting user data.
  await context.addInitScript(()=>{const original=window.fetch;window.fetch=(input,options)=>String(input).includes('release.json')?Promise.reject(Error('Network unavailable')):original(input,options);});
  if(browser.browserType().name()==='chromium')await context.setOffline(true);await page.goto(new URL('update.html',base).href);await page.locator('#retry-update:not([hidden])').waitFor();assert.match(await page.locator('#update-state').textContent(),/Network unavailable/);assert.equal(await page.evaluate(()=>localStorage.getItem('update-preserve')),'keep');
  console.log('PASS: engine update preserves cached apps and app data, replaces a legacy cached engine, and offers recovery when offline.');
 }finally{await context.close();if(!process.env.BASE_URL)await rm('dist/legacy-worker.js',{force:true});}
}
