import {appStart,manifestURL,installIconURL,appTheme} from './manifest.js';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Safari must see this identity in the document response, before any launcher JS runs.
export function installDocument(html,app,scope,requestURL){
 const start=new URL(requestURL||appStart(scope,app.id));
 if(app.pending&&app.bootstrap){start.searchParams.set('version',app.version);start.hash='receive='+btoa(JSON.stringify(app.bootstrap));}
 const head=`<meta name="theme-color" content="${appTheme(app)}"><style>html,body{background:${appTheme(app)}}</style><title>${escape(app.name)}</title><meta name="apple-mobile-web-app-title" content="${escape(app.name)}"><meta name="app-launcher-identity" content="${escape(app.id)}"><link rel="manifest" href="${escape(manifestURL(app,scope,start.href))}"><link rel="apple-touch-icon" sizes="512x512" href="${escape(installIconURL(app,scope))}"><link rel="icon" type="image/png" sizes="512x512" href="${escape(installIconURL(app,scope))}">`;
 return html.replace(/<title>[\s\S]*?<\/title>/i,'').replace(/<link\b[^>]*rel=["'](?:manifest|apple-touch-icon|apple-touch-icon-precomposed|icon)["'][^>]*>/gi,'').replace(/<meta\b[^>]*name=["'](?:theme-color|apple-mobile-web-app-status-bar-style|apple-mobile-web-app-title|app-launcher-identity)["'][^>]*>/gi,'').replace('</head>',head+'</head>');
}
