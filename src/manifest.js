import {APP_ID} from './package.js';
export function appStart(base,id){if(typeof id!=='string'||!APP_ID.test(id))throw Error('Invalid app ID.');return new URL('launch.html?app='+id,base).href;}
export function iconURL(app,base){const u=new URL('install/'+app.id+'/icon.png',base);if(app.version)u.searchParams.set('v',app.version);return u.href;}
// Native Home Screen icon consumers must not depend on a controlled page's worker.
// Safari 26+ supports PNG data URLs for interface/Home Screen icons.
export function installIconURL(app,base){return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(app.icon||'')?app.icon:new URL('icon.png',base).href;}
export function manifestURL(app,base,start=appStart(base,app.id)){const u=new URL('install/'+app.id+'/manifest.webmanifest',base);u.searchParams.set('start',start);if(app.version)u.searchParams.set('v',app.version);return u.href;}
export function appTheme(app){const entry=app.files?.find(f=>f.path===app.entry);if(entry){const html=new TextDecoder().decode(new Uint8Array(entry.data));const tag=html.match(/<meta\b[^>]*name=["']theme-color["'][^>]*>/i)?.[0];const color=tag?.match(/content=["'](#[a-f0-9]{3,8})["']/i)?.[1];if(color)return color;}return '#121617';}
export function appManifest(app,base,start=appStart(base,app.id)){
 const url=new URL(start,base);if(url.origin!==new URL(base).origin||url.pathname!==new URL('launch.html',base).pathname||url.searchParams.get('app')!==app.id)throw Error('Invalid app launch URL.');
 return {id:appStart(base,app.id),name:app.name,short_name:app.name.slice(0,24),start_url:url.href,scope:new URL('./',base).href,display:'standalone',background_color:appTheme(app),theme_color:appTheme(app),icons:[512].map(size=>({src:installIconURL(app,base),sizes:size+'x'+size,type:'image/png',purpose:'any'}))};
}
