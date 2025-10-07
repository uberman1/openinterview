#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();

const TARGET_ROUTES = ['/home.html','/uploads.html','/subscription.html','/password.html','/profiles.html'];

function cp(relSrc, relDst){
  const src = path.join(__dirname,'..',relSrc);
  const dst = path.join(repo, relDst);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log('✔ Copied', relDst);
}

cp('public/js/topmenu.unify.bind.js','public/js/topmenu.unify.bind.js');

const idx = path.join(repo,'index.js');
if (!fs.existsSync(idx)) { console.error('index.js not found'); process.exit(1); }
let src = fs.readFileSync(idx,'utf8');

function ensureImports(code){
  if (!/^\s*import\s+.*\bfs\b\s+from\s+['"]fs['"]\s*;?/m.test(code) && !/^\s*const\s+fs\s*=\s*require\(['"]fs['"]\)/m.test(code)){
    code = `import fs from 'fs';\n` + code;
  }
  if (!/^\s*import\s+.*\bpath\b\s+from\s+['"]path['"]\s*;?/m.test(code) && !/^\s*const\s+path\s*=\s*require\(['"]path['"]\)/m.test(code)){
    code = `import path from 'path';\n` + code;
  }
  return code;
}

function injectServeWithBinder(route, fileName){
  const marker = `/* TOPMENU_UNIFY_${route.replace(/[\/\.]/g,'_')} */`;
  if (src.includes(marker)) return;
  src += `

// ${marker}
app.get('${route}', (req,res) => {
  try{
    const p = path.join(__dirname,'public','${fileName}');
    let html = fs.readFileSync(p,'utf8');
    if (!html.includes('/js/topmenu.unify.bind.js')){
      html = html.replace('</body>', '<script src="/js/topmenu.unify.bind.js" defer></script></body>');
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(404).send('${fileName} not found'); }
});`;
}

TARGET_ROUTES.forEach(r => injectServeWithBinder(r, r.slice(1)));
src = ensureImports(src);
fs.writeFileSync(idx, src, 'utf8');
console.log('✔ Patched index.js with Top Menu binder on target routes');
