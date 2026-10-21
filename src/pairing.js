import {joinRoom,getRelaySockets} from 'trystero';
import {decodePackage,repack,validatePackage} from './package.js';
import {appOffer,validateOffer} from './install.js';
const token=()=>[...crypto.getRandomValues(new Uint8Array(24))].map(v=>v.toString(16).padStart(2,'0')).join('');
export const newInvite=(minutes=10)=>({v:1,room:token(),secret:token(),expires:Date.now()+minutes*60*1000});
export function inviteLink(invite,base=new URL('./',location.href)){const url=new URL(base);url.hash='receive='+btoa(JSON.stringify(invite));return url.href;}
export function parseInvite(hash){let i;try{i=JSON.parse(atob(hash.replace(/^#receive=/,'')));}catch{throw Error('Invalid invitation. Create a new QR.');}if(i?.v!==1||! /^[a-f0-9]{48}$/.test(i.room)||! /^[a-f0-9]{48}$/.test(i.secret)||!Number.isFinite(i.expires)||i.expires<Date.now()||i.expires>Date.now()+61*60*1000)throw Error('Invitation expired. Create a new QR.');return i;}
export function connect({invite,role,bundle,onStatus,onOffer,onApp,onProgress,onDone,onError,onPrepared,allowPrepare=true}){
 if(invite.expires<=Date.now())throw Error('Invitation expired.');
 let closed=false,remote=null,offered=null,accepted=false;const sending=new Set(),children=new Map(),offeredPeers=new Set();let prepared=false;
 const status=s=>{if(!closed)onStatus?.(s);};
 const room=joinRoom({appId:'willwalshvt-app-launcher-v1',password:invite.secret,relayConfig:{urls:['wss://nos.lol','wss://bucket.coracle.social','wss://relay.primal.net']},trickleIce:true},invite.room,{onJoinError:()=>onError?.(Error('Connection failed. Try the same Wi-Fi and a new QR.'))});
 const hello=room.makeAction('hello'),offer=room.makeAction('offer'),accept=room.makeAction('accept'),payload=room.makeAction('payload'),receipt=room.makeAction('receipt'),prepare=room.makeAction('prepare'),ready=room.makeAction('prepared');
 const send=(action,data,peerId)=>action.send(data,{target:peerId}).catch(e=>{if(!closed)onError?.(e);});
 const sendOffer=peerId=>{if(offeredPeers.has(peerId))return;offeredPeers.add(peerId);return send(offer,appOffer(bundle),peerId);};
 room.onPeerJoin=peerId=>{status('Connected to '+(role==='send'?'phone':'laptop'));if(role==='send')sendOffer(peerId);else send(hello,{role},peerId);};
 hello.onMessage=async(data,{peerId})=>{if(closed||!['send','receive'].includes(data?.role)||data.role===role)return;if(role==='receive'){if(remote&&remote!==peerId)return;if(!remote){remote=peerId;await send(hello,{role},peerId);}}else await sendOffer(peerId);};
 offer.onMessage=(meta,{peerId})=>{
  if(role!=='receive'||closed||(remote&&peerId!==remote)||offered)return;
  try{validateOffer(meta);}catch(e){onError?.(e);return;}
  remote=peerId;offered=meta;status('App details received');onOffer?.(meta);
 };
 prepare.onMessage=async(data,{peerId})=>{
  if(role!=='send'||closed||!allowPrepare||data?.version!==bundle.version||children.has(peerId)||children.size>=20)return;
  children.set(peerId,null);
  try{
   let transfer=bundle;if(data.icon&&data.icon!==bundle.pack.icon){validateOffer({...appOffer(bundle),icon:data.icon});const app=validatePackage(bundle.pack);transfer=await repack({...app,icon:data.icon});}
   const ticket=newInvite(60);const child=connect({invite:ticket,role:'send',bundle:transfer,allowPrepare:false,onStatus,onProgress,onDone,onError});children.set(peerId,child);
   await send(ready,{invite:ticket,meta:appOffer(transfer)},peerId);status('Phone ready to install. Waiting for the app to open…');
  }catch(e){children.delete(peerId);onError?.(e);}
 };
 ready.onMessage=(data,{peerId})=>{if(role!=='receive'||closed||peerId!==remote||prepared||!offered)return;try{const ticket=parseInvite('#receive='+btoa(JSON.stringify(data.invite)));const meta=validateOffer(data.meta);if(meta.id!==offered.id||meta.name!==offered.name||meta.entry!==offered.entry)throw Error('Installation differs from the offered app.');prepared=true;onPrepared?.({invite:ticket,meta});close();}catch(e){onError?.(e);}};
 accept.onMessage=async(data,{peerId})=>{if(role!=='send'||closed||data?.version!==bundle.version||sending.has(peerId))return;sending.add(peerId);onProgress?.(0,bundle.bytes.byteLength);status('Transferring app…');try{await payload.send(bundle.bytes,{target:peerId,onProgress:p=>onProgress?.(p,role==='send'?bundle.bytes.byteLength:offered.bytes)});status('Waiting for saved confirmation…');}catch(e){onError?.(e);}finally{sending.delete(peerId);}};
 payload.onReceiveProgress=(p,{peerId})=>{if(role==='receive'&&accepted&&peerId===remote)onProgress?.(p,role==='send'?bundle.bytes.byteLength:offered.bytes);};
 payload.onMessage=async(bytes,{peerId})=>{if(role!=='receive'||!accepted||closed||peerId!==remote)return;accepted=false;try{const raw=new Uint8Array(bytes);if(raw.byteLength!==offered.bytes)throw Error('Transfer size mismatch.');status('Verifying and saving app…');const app=await decodePackage(raw,offered.version);if(app.id!==offered.id||app.name!==offered.name||app.entry!==offered.entry||app.size!==offered.size||app.files.length!==offered.count||app.icon!==(offered.icon||null))throw Error('App differs from accepted offer.');await onApp(app);await receipt.send({version:app.version},{target:peerId});onDone?.();close();}catch(e){onError?.(e);close();}};
 receipt.onMessage=(data,{peerId})=>{if(role==='send'&&data?.version===bundle.version){status('Installed app saved. You can close this source.');onDone?.(peerId);}};
 room.onPeerLeave=peerId=>{if(role==='receive'&&peerId===remote&&!closed){onError?.(Error('Laptop disconnected.'));close();}};
 const expires=setTimeout(()=>{onStatus?.(allowPrepare?'Share QR expired. Prepared installations can still finish.':'Installation session ended. Prepare installation again at the source.');close(false);},invite.expires-Date.now());
 const relay=setInterval(()=>{if(closed||remote||sending.size)return;const n=Object.values(getRelaySockets()).filter(s=>s.readyState===1).length;if(role==='receive')status(n?'Finding laptop…':'Connecting to signaling…');},2500);
 function close(withChildren=true){if(withChildren){for(const child of children.values())child?.close();children.clear();}if(closed)return;closed=true;clearTimeout(expires);clearInterval(relay);room.leave();}
 return {close,prepare:icon=>{if(!offered||!remote)return;status('Preparing installation…');return send(prepare,{version:offered.version,icon},remote);},accept:()=>{if(!offered||!remote||accepted)return;accepted=true;status('Transferring app…');return send(accept,{version:offered.version},remote);}};
}
