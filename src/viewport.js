// This surface must belong to the top-level document: WebKit's scroll-edge
// treatment cannot see a fixed header inside an embedded app.
export function mountAppViewport(frame){
 // Reserve an opaque buffer below iOS standalone chrome, including when env()
 // reports zero because the native web view already excludes the status bar.
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const clearance=ios&&(navigator.standalone||matchMedia('(display-mode: standalone)').matches)?20:0;
 document.documentElement.style.setProperty('--app-top-clearance',clearance+'px');
 const surface=document.createElement('div');surface.id='app-top-surface';surface.setAttribute('aria-hidden','true');surface.style.cssText='position:fixed;top:0;left:0;right:0;height:'+(clearance+1)+'px;padding-top:env(safe-area-inset-top,0px);box-sizing:content-box;background:var(--app-background,#ffffff);pointer-events:none;z-index:1000';
 const probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';document.body.append(surface,probe);
 const sync=()=>{try{const doc=frame.contentDocument;if(!doc?.documentElement)return;const color=doc.querySelector('meta[name=theme-color]')?.content||'#ffffff';if(CSS.supports('color',color)){document.documentElement.style.setProperty('--app-background',color);document.documentElement.style.background=color;document.body.style.background=color;document.querySelector('meta[name=theme-color]')?.setAttribute('content',color);}document.documentElement.style.colorScheme=getComputedStyle(doc.documentElement).colorScheme;const insets=getComputedStyle(probe);for(const side of ['top','right','bottom','left'])doc.documentElement.style.setProperty('--app-safe-area-'+side,insets.getPropertyValue('padding-'+side));}catch{}};
 frame.addEventListener('load',sync);window.addEventListener('resize',sync);window.visualViewport?.addEventListener('resize',sync);
 return ()=>{frame.removeEventListener('load',sync);window.removeEventListener('resize',sync);window.visualViewport?.removeEventListener('resize',sync);surface.remove();probe.remove();document.documentElement.style.removeProperty('--app-top-clearance');};
}
