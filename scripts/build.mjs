import {build} from 'esbuild';import {cp,mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
await rm('dist',{recursive:true,force:true});await mkdir('dist');await cp('public','dist',{recursive:true});
await build({entryPoints:['src/launcher.js','src/pairing.js','src/scanner.js'],bundle:true,external:['./pairing.js','./scanner.js'],format:'esm',outdir:'dist',minify:true,target:['safari17']});
await build({entryPoints:['src/sw.js'],bundle:true,format:'esm',outdir:'dist',minify:true,target:['safari17']});
const hash=createHash('sha256');for(const f of (await readdir('dist')).sort())hash.update(f).update(await readFile('dist/'+f));
const assets=['./',...(await readdir('dist')).filter(f=>f!=='sw.js'&&!f.startsWith('.')).map(f=>'./'+f)];let sw=await readFile('dist/sw.js','utf8');sw=sw.replaceAll('__VERSION__',hash.digest('hex')).replaceAll('"__ASSETS__"',JSON.stringify(assets));await writeFile('dist/sw.js',sw);await writeFile('dist/.nojekyll','');console.log('Built AppLauncher');
