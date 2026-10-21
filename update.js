const root=new URL('./',location.href),state=document.querySelector('#update-state'),retry=document.querySelector('#retry-update'),back=document.querySelector('#return');
let target=root;try{const input=new URL(decodeURIComponent(location.hash.replace(/^#return=/,'')));if(input.origin===root.origin&&input.pathname.startsWith(root.pathname)&&input.pathname!==location.pathname)target=input;}catch{}
back.href=target.href;
const within=(promise,ms)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('The update timed out. Check your connection and retry.')),ms))]).finally(()=>clearTimeout(timer));};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function status(worker){return new Promise(resolve=>{if(!worker)return resolve(null);const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(null);},1000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};worker.postMessage({type:'STATUS'},[channel.port2]);});}
async function update(){retry.hidden=true;back.hidden=true;state.textContent='Fetching the latest engine…';const limit=Date.now()+35000;
 try{
  const releaseURL=new URL('release.json',root);releaseURL.searchParams.set('fresh',Date.now());
  const r=await fetch(releaseURL,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Cannot reach the latest release. Check your connection and retry.');const release=await r.json();if(!/^[a-f0-9]{64}$/.test(release.version))throw Error('Invalid engine release. Please retry after deployment finishes.');
  document.querySelector('#update-version').textContent='Engine '+release.version.slice(0,8);state.textContent='Downloading the latest engine…';
  const registration=await within(navigator.serviceWorker.register(new URL('sw.js',root),{type:'module',updateViaCache:'none'}),10000);await within(registration.update(),10000);
  while(Date.now()<limit){const info=await status(navigator.serviceWorker.controller);if(info?.ready&&info.version===release.version){state.textContent='Updated. Opening AppLauncher…';target.searchParams.set('updated',release.version.slice(0,8));location.replace(target.href);return;}if(registration.installing?.state==='redundant')throw Error('The engine download failed. Your cached apps are unchanged; retry when online.');await pause(200);}
  throw Error('The update did not finish. Check your connection, then retry.');
 }catch(e){state.textContent=e.message;retry.hidden=false;back.hidden=false;}
}
retry.onclick=update;update();
