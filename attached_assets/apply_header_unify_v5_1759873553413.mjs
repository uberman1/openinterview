#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();

const ROUTES = ['/home.html','/uploads.html','/subscription.html','/password.html','/profiles.html','/availability.html'];

function cp(relSrc, relDst){
  const src = path.join(__dirname,'..',relSrc);
  const dst = path.join(repo, relDst);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log('✔ Copied', relDst);
}

cp('public/js/header.unify.v5.bind.js','public/js/header.unify.v5.bind.js');

const idx = path.join(repo,'index.js');
if (!fs.existsSync(idx)) { console.error('index.js not found'); process.exit(1); }
let code = fs.readFileSync(idx,'utf8');

function ensureImports(s){
  if (!/^\s*import\s+.*\bfs\b\s+from\s+['"]fs['"]\s*;?/m.test(s) && !/^\s*const\s+fs\s*=\s*require\(['"]fs['"]\)/m.test(s)){
    s = `import fs from 'fs';\n` + s;
  }
  if (!/^\s*import\s+.*\bpath\b\s+from\s+['"]path['"]\s*;?/m.test(s) && !/^\s*const\s+path\s*=\s*require\(['"]path['"]\)/m.test(s)){
    s = `import path from 'path';\n` + s;
  }
  return s;
}

function inject(route, fileName){
  const marker = `/* HEADER_UNIFY_V5_${route.replace(/[\/\.]/g,'_')} */`;
  if (code.includes(marker)) return;
  code += `

// ${marker}
app.get('${route}', (req,res) => {
  try{
    const p = path.join(__dirname,'public','${fileName}');
    let html = fs.readFileSync(p,'utf8');
    if (!html.includes('/js/header.unify.v5.bind.js')){
      html = html.replace('</body>', '<script src="/js/header.unify.v5.bind.js" defer></script></body>');
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(404).send('${fileName} not found'); }
});`;
}

ROUTES.forEach(r => inject(r, r.slice(1)));
code = ensureImports(code);
fs.writeFileSync(idx, code, 'utf8');
console.log('✔ Patched index.js with Header Unifier v5');
