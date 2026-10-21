import {APP_ID,MAX_BYTES,cleanPath} from './package.js';
export function appOffer(bundle){const p=bundle.pack;return {id:p.id,name:p.name,entry:p.entry,count:p.files.length,size:bundle.size,bytes:bundle.bytes.byteLength,version:bundle.version,icon:p.icon||null,isolation:p.isolation===true};}
export function validateOffer(meta){
 if(!meta||typeof meta.id!=='string'||!APP_ID.test(meta.id)||typeof meta.name!=='string'||!meta.name.trim()||meta.name.length>80||typeof meta.entry!=='string'||! /\.html?$/i.test(meta.entry)||! /^[a-f0-9]{64}$/.test(meta.version)||!Number.isInteger(meta.bytes)||meta.bytes<1||meta.bytes>MAX_BYTES*1.4+500000||!Number.isInteger(meta.count)||meta.count<1||meta.count>250||!Number.isInteger(meta.size)||meta.size<0||meta.size>MAX_BYTES)throw Error('Invalid app offer.');
 cleanPath(meta.entry);if(meta.icon&&(typeof meta.icon!=='string'||meta.icon.length>400000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(meta.icon)))throw Error('Invalid app icon.');return meta;
}
export function pendingApp(meta,invite){validateOffer(meta);return {...meta,files:[],pending:true,bootstrap:invite,updated:Date.now()};}
