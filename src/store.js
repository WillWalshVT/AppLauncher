export const base=new URL('./',import.meta.url).pathname;
let opening;
export const database=()=>opening ||= new Promise((resolve,reject)=>{const r=indexedDB.open('app-launcher:'+base,2);r.onupgradeneeded=()=>{for(const name of ['apps','installs'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'});};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};r.onerror=()=>{opening=null;reject(r.error);};});
export async function tx(mode,task,stores=['apps']){const db=await database();return new Promise((resolve,reject)=>{const t=db.transaction(stores,mode);let result;try{result=task(t.objectStore(stores[0]),t);}catch(e){t.abort();reject(e);}t.oncomplete=()=>resolve(result?.result);t.onerror=t.onabort=()=>reject(t.error||Error('Unable to save app. Check available storage.'));});}
export const getApp=id=>tx('readonly',s=>s.get(id));
export const getInstall=id=>tx('readonly',s=>s.get(id),['installs']);
export const stageInstall=meta=>tx('readwrite',s=>s.put({...meta,updated:Date.now()}),['installs']);
export const saveApp=app=>tx('readwrite',(s,t)=>{s.put({...app,pending:false,updated:Date.now()});t.objectStore('installs').delete(app.id);},['apps','installs']);
export const deleteApp=id=>tx('readwrite',(s,t)=>{s.delete(id);t.objectStore('installs').delete(id);},['apps','installs']);
export async function listApps(){const [apps,installs]=await Promise.all([tx('readonly',s=>s.getAll()),tx('readonly',s=>s.getAll(),['installs'])]);const map=new Map(apps.map(a=>[a.id,a]));for(const a of installs)if(!map.has(a.id))map.set(a.id,a);return [...map.values()];}
