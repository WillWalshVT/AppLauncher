export const MAX_BYTES=20*1024*1024;
export const MAX_FILES=250;
export const APP_ID=/^[a-z0-9][a-z0-9-]{0,47}$/;
export const mime=path=>({html:'text/html',htm:'text/html',js:'text/javascript',mjs:'text/javascript',css:'text/css',json:'application/json',txt:'text/plain',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',ico:'image/x-icon',woff:'font/woff',woff2:'font/woff2',wasm:'application/wasm',mp3:'audio/mpeg',mp4:'video/mp4'})[path.split('.').pop().toLowerCase()]||'application/octet-stream';
export function cleanPath(path){
 if(typeof path!=='string'||path.length>300||/[\\\x00-\x1f?#%:]/.test(path)||path.startsWith('/')||path.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Use relative file paths without traversal or URL characters.');
 if(path.split('/').some(s=>s.startsWith('.')))throw Error('Hidden files are not app assets.');
 return path;
}
export const slug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'my-app';
export function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
export function fromBase64(s){if(typeof s!=='string'||s.length>MAX_BYTES*1.4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))throw Error('Invalid file encoding.');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
export async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export function validatePackage(pack){
 if(pack?.format!==1||typeof pack.id!=='string'||!APP_ID.test(pack.id)||typeof pack.name!=='string'||!pack.name.trim()||pack.name.length>80||!Array.isArray(pack.files)||!pack.files.length||pack.files.length>MAX_FILES)throw Error('Invalid app package.');
 const seen=new Set();let size=0;
 const files=pack.files.map(f=>{const path=cleanPath(f.path);if(seen.has(path))throw Error('Duplicate file path.');seen.add(path);const data=fromBase64(f.data);size+=data.byteLength;if(size>MAX_BYTES)throw Error('Apps must be smaller than 20 MB.');return {path,data,type:mime(path)};});
 cleanPath(pack.entry);if(!seen.has(pack.entry)||! /\.html?$/i.test(pack.entry))throw Error('Select an HTML file as the entry page.');
 if(pack.icon!==undefined&&(typeof pack.icon!=='string'||pack.icon.length>400000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(pack.icon)))throw Error('Invalid app icon.');
 return {id:pack.id,name:pack.name.trim(),entry:pack.entry,files,size,icon:pack.icon||null,isolation:pack.isolation===true};
}
export async function makePackage(files,{id,name,entry,icon,isolation=false}){
 if(!files.length||files.length>MAX_FILES)throw Error('Choose 1–250 files.');
 let size=0;const content=[];
 for(const file of files){size+=file.size;if(size>MAX_BYTES)throw Error('Apps must be smaller than 20 MB.');content.push({path:cleanPath(file.appPath||file.name),data:toBase64(new Uint8Array(await file.arrayBuffer()))});}
 const pack={format:1,id,name,entry,icon:icon||undefined,isolation,files:content};validatePackage(pack);const bytes=new TextEncoder().encode(JSON.stringify(pack));
 if(bytes.byteLength>MAX_BYTES*1.4+500000)throw Error('Package is too large.');
 return {pack,bytes,version:await digest(bytes),size};
}
export async function decodePackage(bytes,version){
 if(!(bytes instanceof Uint8Array))bytes=new Uint8Array(bytes);
 if(bytes.byteLength>MAX_BYTES*1.4+500000)throw Error('Package is too large.');
 if(await digest(bytes)!==version)throw Error('Transfer integrity check failed.');
 const app=validatePackage(JSON.parse(new TextDecoder().decode(bytes)));return {...app,version,updated:Date.now()};
}

export async function repack(app){const pack={format:1,id:app.id,name:app.name,entry:app.entry,icon:app.icon||undefined,isolation:app.isolation===true,files:app.files.map(f=>({path:f.path,data:toBase64(new Uint8Array(f.data))}))};validatePackage(pack);const bytes=new TextEncoder().encode(JSON.stringify(pack));return {pack,bytes,version:await digest(bytes),size:app.size};}
