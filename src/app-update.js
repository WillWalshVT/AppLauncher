import {MAX_BYTES,MAX_FILES,APP_ID,cleanPath,digest,fromBase64,toBase64,validatePackage,repack} from './package.js';
// Semantic versions are optional for older packages; the content digest remains
// the fallback identity. Both forms are retained in the installed app record.
export function compareVersions(a,b){
 const parse=v=>typeof v==='string'&&/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v)?v.split('.').map(Number):null;
 const x=parse(a),y=parse(b);if(!x||!y)return null;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0;
}
function installedRelease(app){
 if(!app)return {};let bundled={};try{const file=app.files?.find(f=>f.path==='release.json');if(file)bundled=JSON.parse(new TextDecoder().decode(typeof file.data==='string'?fromBase64(file.data):file.data));}catch{}
 return {version:app.releaseVersion||bundled.version,appVersion:app.appVersion||bundled.appVersion||app.reportedAppVersion};
}
// Each file is verified before the caller commits the new package in one transaction.
export async function downloadUpdate(source,id,progress=()=>{},fetcher=fetch,current=null){
 const root=new URL(source);if(root.protocol!=='https:'&&!(root.protocol==='http:'&&['localhost','127.0.0.1'].includes(root.hostname)))throw Error('Updates require an HTTPS source.');
 if(root.search||root.hash||!root.pathname.endsWith('/'))throw Error('Use the app release directory URL.');
 const signal=AbortSignal.timeout(60000);
 const response=await fetcher(new URL('release.json?fresh='+Date.now(),root),{cache:'no-store',signal});if(!response.ok)throw Error('Cannot reach the app release. Check your connection and retry.');
 const release=await response.json();
 if(release.format!==1||!APP_ID.test(id)||release.id!==id||typeof release.name!=='string'||!Array.isArray(release.files)||!release.files.length||release.files.length>MAX_FILES||!/^[a-f0-9]{64}$/.test(release.version||''))throw Error('Invalid app release.');
 const paths=new Set();let total=0;
 for(const f of release.files){cleanPath(f.path);if(paths.has(f.path)||!Number.isSafeInteger(f.size)||f.size<0||!/^[a-f0-9]{64}$/.test(f.sha256||''))throw Error('Invalid release file.');paths.add(f.path);total+=f.size;}
 if(total>MAX_BYTES||!paths.has(release.entry)||!paths.has(release.icon))throw Error('Invalid release contents.');
 if(await digest(new TextEncoder().encode(JSON.stringify(release.files)))!==release.version)throw Error('Release integrity check failed.');
 const installed=installedRelease(current),order=compareVersions(release.appVersion,installed.appVersion);
 if(current&&(release.version===installed.version||order!==null&&order<=0))return {upToDate:true,appVersion:installed.appVersion||release.appVersion,availableVersion:release.appVersion};
 let loaded=0,next=0;const files=new Array(release.files.length);
 await Promise.all(Array.from({length:Math.min(6,files.length)},async()=>{while(next<files.length){const i=next++,f=release.files[i];const r=await fetcher(new URL(f.path,root),{cache:'no-store',signal});if(!r.ok)throw Error('Could not download '+f.path+'. Retry when online.');
 const chunks=[];let size=0;const reader=r.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>f.size){await reader.cancel();throw Error('Release file size mismatch. Retry after deployment finishes.');}chunks.push(value);loaded+=value.length;progress('Downloading app… '+Math.floor(loaded/total*100)+'%');}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
 if(size!==f.size||await digest(bytes)!==f.sha256)throw Error('Release file verification failed. Retry after deployment finishes.');files[i]={path:f.path,data:toBase64(bytes)};
 }}));
 const iconFile=files.find(f=>f.path===release.icon);const app=validatePackage({format:1,id,name:release.name,entry:release.entry,icon:'data:image/png;base64,'+iconFile.data,isolation:release.isolation===true,files});
 const bundle=await repack(app);return {...app,version:bundle.version,releaseVersion:release.version,appVersion:release.appVersion,updated:Date.now()};
}
