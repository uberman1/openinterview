#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();
const ensureDir = p => fs.mkdirSync(p,{recursive:true});

ensureDir(path.join(repo,'public','js'));

// Copy files
fs.copyFileSync(path.join(__dirname,'..','public','js','menu.unify.bind.js'), path.join(repo,'public','js','menu.unify.bind.js'));
fs.copyFileSync(path.join(__dirname,'..','public','js','home.attachments.bind.js'), path.join(repo,'public','js','home.attachments.bind.js'));
fs.copyFileSync(path.join(__dirname,'..','public','js','avatar_edit.bind.js'), path.join(repo,'public','js','avatar_edit.bind.js'));
console.log('✔ Installed binders (menu.unify, home.attachments, avatar_edit)');

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

function injectServeWith(scriptName, route, fileName){
  const marker = `/* INJECT_${scriptName.toUpperCase()}_${route.replace(/[\/\.]/g,'_')} */`;
  if (src.includes(marker)) return;
  const block = `

// ---- Serve ${fileName} with ${scriptName}
${marker}
app.get('${route}', (req,res) => {
  const p = path.join(__dirname, 'public', '${fileName}');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/${scriptName}" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(404).send('${fileName} not found'); }
});
`;
  src += block;
}

// Inject menu unifier into multiple pages
['/home.html','/profiles.html','/uploads.html','/availability.html','/subscription.html','/password.html','/profile_edit.html']
  .forEach(route => injectServeWith('menu.unify.bind.js', route, route.slice(1)));

// Inject home attachments + avatar edit on home
injectServeWith('home.attachments.bind.js','/home.html','home.html');
injectServeWith('avatar_edit.bind.js','/home.html','home.html');
// Also enable avatar editing on profile edit
injectServeWith('avatar_edit.bind.js','/profile_edit.html','profile_edit.html');

src = ensureImports(src);
fs.writeFileSync(idx, src, 'utf8');
console.log('✔ Patched index.js to inject binders');
