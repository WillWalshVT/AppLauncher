export const base=new URL('./',import.meta.url).pathname;
let opening;
export const database=()=>opening ||= new Promise((resolve,reject)=>{const r=indexedDB.open('app-launcher:'+base,1);r.onupgradeneeded=()=>r.result.createObjectStore('apps',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(r.error);};});
export async function tx(mode,task){const db=await database();return new Promise((resolve,reject)=>{const t=db.transaction('apps',mode);let result;try{result=task(t.objectStore('apps'));}catch(e){t.abort();reject(e);}t.oncomplete=()=>resolve(result?.result);t.onerror=t.onabort=()=>reject(t.error||Error('Unable to save app. Check available storage.'));});}
export const listApps=()=>tx('readonly',s=>s.getAll());
export const getApp=id=>tx('readonly',s=>s.get(id));
export const saveApp=app=>tx('readwrite',s=>s.put({...app,updated:Date.now()}));
export const deleteApp=id=>tx('readwrite',s=>s.delete(id));
