export async function normalizeIcon(input,name='App'){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle='#243832';c.fillRect(0,0,512,512);
 if(input){const url=typeof input==='string'?input:URL.createObjectURL(input);try{const img=new Image();img.src=url;await img.decode();if(!img.width||!img.height)throw Error();const scale=Math.min(440/img.width,440/img.height);c.drawImage(img,(512-img.width*scale)/2,(512-img.height*scale)/2,img.width*scale,img.height*scale);}catch{throw Error('Choose a supported PNG, JPEG, WebP or SVG image.');}finally{if(typeof input!=='string')URL.revokeObjectURL(url);}}
 else{c.fillStyle='#c4eddc';c.font='600 210px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText([...name.trim()][0]?.toUpperCase()||'A',256,270);}
 return canvas.toDataURL('image/png');
}
export async function discover(files,entry){
 const map=new Map(files.map(f=>[f.appPath||f.name,f]));const htmlFile=map.get(entry);if(!htmlFile)return {};
 const doc=new DOMParser().parseFromString(await htmlFile.text(),'text/html');const root='https://local.invalid/';const from=new URL(entry,root);
 const local=(ref,fromURL=from)=>{try{const u=new URL(ref,fromURL);if(u.origin!==new URL(root).origin)return;return map.get(decodeURIComponent(u.pathname.slice(1)));}catch{}};
 let name=doc.title?.trim(),icon,isolation=false;
 const config=map.get('launcher.json');if(config){try{const data=JSON.parse(await config.text());if(typeof data.name==='string')name=data.name;isolation=data.isolation===true;}catch{throw Error('launcher.json is not valid JSON.');}}
 const manifestFile=local(doc.querySelector('link[rel="manifest"]')?.getAttribute('href'));
 if(manifestFile){try{const manifest=JSON.parse(await manifestFile.text());name=manifest.name||manifest.short_name||name;for(const i of [...(manifest.icons||[])].reverse()){const f=local(i.src,new URL(manifestFile.appPath||manifestFile.name,root));if(f){icon=await normalizeIcon(f,name);break;}}}catch{}}
 if(!icon){for(const el of doc.querySelectorAll('link[rel="apple-touch-icon"],link[rel~="icon"]')){const f=local(el.getAttribute('href'));if(f){try{icon=await normalizeIcon(f,name);break;}catch{}}}}
 if(!icon){const f=map.get('icon.png')||map.get('favicon.png');if(f){try{icon=await normalizeIcon(f,name);}catch{}}}
 return {name:String(name||entry.replace(/\.html?$/i,'')).slice(0,80),icon,isolation};
}
