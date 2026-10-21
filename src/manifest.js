import {APP_ID} from './package.js';
export function appStart(base,id){if(typeof id!=='string'||!APP_ID.test(id))throw Error('Invalid app ID.');return new URL('launch.html?app='+id,base).href;}
export function iconURL(app,base){const u=new URL('install/'+app.id+'/icon.png',base);if(app.version)u.searchParams.set('v',app.version);return u.href;}
export function manifestURL(app,base,start=appStart(base,app.id)){const u=new URL('install/'+app.id+'/manifest.webmanifest',base);u.searchParams.set('start',start);if(app.version)u.searchParams.set('v',app.version);return u.href;}
export function appManifest(app,base,start=appStart(base,app.id)){
 const url=new URL(start,base);if(url.origin!==new URL(base).origin||url.pathname!==new URL('launch.html',base).pathname||url.searchParams.get('app')!==app.id)throw Error('Invalid app launch URL.');
 return {id:appStart(base,app.id),name:app.name,short_name:app.name.slice(0,24),start_url:url.href,scope:new URL('./',base).href,display:'standalone',background_color:'#121617',theme_color:'#121617',icons:[512].map(size=>({src:app.icon?iconURL(app,base):new URL('icon.png',base).href,sizes:size+'x'+size,type:'image/png',purpose:'any'}))};
}
