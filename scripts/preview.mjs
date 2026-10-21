// Optional foreground development preview. GitHub Pages needs no Node server.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root=resolve('dist');
const prefix=process.env.PREVIEW_PREFIX || '/';
const port=Number(process.env.PORT || 8080);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{
  let path=new URL(req.url,'http://localhost').pathname;
  if(!path.startsWith(prefix))throw Error();
  path=path.slice(prefix.length);if(!path)path='index.html';
  const file=resolve(root,decodeURIComponent(path));if(!file.startsWith(root+'/'))throw Error();
  const body=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://localhost:${port}${prefix}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
