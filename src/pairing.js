import {joinRoom,getRelaySockets} from 'trystero';
import {MAX_BYTES,APP_ID,decodePackage} from './package.js';
const token=()=>[...crypto.getRandomValues(new Uint8Array(24))].map(v=>v.toString(16).padStart(2,'0')).join('');
export const newInvite=()=>({v:1,room:token(),secret:token(),expires:Date.now()+10*60*1000});
export function inviteLink(invite,base=new URL('./',location.href)){const url=new URL(base);url.hash='receive='+btoa(JSON.stringify(invite));return url.href;}
export function parseInvite(hash){let i;try{i=JSON.parse(atob(hash.replace(/^#receive=/,'')));}catch{throw Error('Invalid invitation. Create a new QR.');}if(i?.v!==1||! /^[a-f0-9]{48}$/.test(i.room)||! /^[a-f0-9]{48}$/.test(i.secret)||!Number.isFinite(i.expires)||i.expires<Date.now()||i.expires>Date.now()+11*60*1000)throw Error('Invitation expired. Create a new QR.');return i;}
export function connect({invite,role,bundle,onStatus,onOffer,onApp,onProgress,onDone,onError}){
 if(invite.expires<=Date.now())throw Error('Invitation expired.');
 let closed=false,remote=null,offered=null,accepted=false;const sending=new Set();
 const status=s=>{if(!closed)onStatus?.(s);};
 const room=joinRoom({appId:'willwalshvt-app-launcher-v1',password:invite.secret,relayConfig:{redundancy:3},trickleIce:true},invite.room,{onJoinError:()=>onError?.(Error('Connection failed. Try the same Wi-Fi and a new QR.'))});
 const hello=room.makeAction('hello'),offer=room.makeAction('offer'),accept=room.makeAction('accept'),payload=room.makeAction('payload'),receipt=room.makeAction('receipt');
 const send=(action,data,peerId)=>action.send(data,{target:peerId}).catch(e=>{if(!closed)onError?.(e);});
 room.onPeerJoin=peerId=>{status('Connected');send(hello,{role},peerId);};
 hello.onMessage=async(data,{peerId})=>{if(closed||!['send','receive'].includes(data?.role)||data.role===role)return;if(role==='receive'){if(remote&&remote!==peerId)return;if(!remote){remote=peerId;await send(hello,{role},peerId);}}else await send(offer,{id:bundle.pack.id,name:bundle.pack.name,entry:bundle.pack.entry,count:bundle.pack.files.length,size:bundle.size,bytes:bundle.bytes.byteLength,version:bundle.version,icon:bundle.pack.icon},peerId);};
 offer.onMessage=(meta,{peerId})=>{
  if(role!=='receive'||closed||peerId!==remote||offered)return;
  if(!meta||typeof meta.id!=='string'||!APP_ID.test(meta.id)||typeof meta.name!=='string'||!meta.name.trim()||meta.name.length>80||typeof meta.entry!=='string'||! /^[a-f0-9]{64}$/.test(meta.version)||!Number.isInteger(meta.bytes)||meta.bytes<1||meta.bytes>MAX_BYTES*1.4+500000||!Number.isInteger(meta.count)||meta.count<1||meta.count>250||!Number.isInteger(meta.size)||meta.size<0||meta.size>MAX_BYTES||meta.icon&&(typeof meta.icon!=='string'||meta.icon.length>400000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(meta.icon))){onError?.(Error('Invalid app offer.'));return;}
  offered=meta;status('Ready to add');onOffer?.(meta);
 };
 accept.onMessage=async(data,{peerId})=>{if(role!=='send'||closed||data?.version!==bundle.version||sending.has(peerId))return;sending.add(peerId);status('Sending…');try{await payload.send(bundle.bytes,{target:peerId,onProgress:p=>onProgress?.(p)});status('Waiting for saved confirmation…');}catch(e){onError?.(e);}finally{sending.delete(peerId);}};
 payload.onReceiveProgress=(p,{peerId})=>{if(role==='receive'&&accepted&&peerId===remote)onProgress?.(p);};
 payload.onMessage=async(bytes,{peerId})=>{if(role!=='receive'||!accepted||closed||peerId!==remote)return;accepted=false;try{const raw=new Uint8Array(bytes);if(raw.byteLength!==offered.bytes)throw Error('Transfer size mismatch.');status('Saving…');const app=await decodePackage(raw,offered.version);if(app.id!==offered.id||app.name!==offered.name||app.entry!==offered.entry||app.size!==offered.size||app.files.length!==offered.count||app.icon!==(offered.icon||null))throw Error('App differs from accepted offer.');await onApp(app);await receipt.send({version:app.version},{target:peerId});onDone?.();close();}catch(e){onError?.(e);close();}};
 receipt.onMessage=(data,{peerId})=>{if(role==='send'&&data?.version===bundle.version){status('Saved. Keep this page open until the installed app opens.');onDone?.(peerId);}};
 room.onPeerLeave=peerId=>{if(role==='receive'&&peerId===remote&&!closed){onError?.(Error('Source disconnected. Create a new QR.'));close();}};
 const expires=setTimeout(()=>{onError?.(Error('Invitation expired. Create a new QR.'));close();},invite.expires-Date.now());
 const relay=setInterval(()=>{if(closed||remote||sending.size)return;const n=Object.values(getRelaySockets()).filter(s=>s.readyState===1).length;if(role==='receive')status(n?'Waiting for source…':'Connecting…');},2500);
 function close(){if(closed)return;closed=true;clearTimeout(expires);clearInterval(relay);room.leave();}
 return {close,accept:()=>{if(!offered||!remote||accepted)return;accepted=true;status('Receiving…');return send(accept,{version:offered.version},remote);}};
}
