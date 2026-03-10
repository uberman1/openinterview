#!/usr/bin/env node
// Apply Profiles UI Update without changing backend logic.
import fs from 'fs';
import path from 'path';
import url from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();
const ensureDir = p => fs.mkdirSync(p,{recursive:true});
const exists = p => { try{ fs.accessSync(p); return true; }catch{ return false; } };
const sha256 = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

ensureDir(path.join(repo,'public'));
ensureDir(path.join(repo,'public','js'));

// Install files (backup if present)
const dstHtml = path.join(repo,'public','profiles.html');
if (exists(dstHtml)) fs.copyFileSync(dstHtml, path.join(repo,'public','profiles_prev.html'));
fs.copyFileSync(path.join(__dirname,'..','public','profiles.html'), dstHtml);
fs.copyFileSync(path.join(__dirname,'..','public','js','profiles.bind.js'), path.join(repo,'public','js','profiles.bind.js'));
console.log('✔ Installed profiles.html and profiles.bind.js');

// Patch server index.js to inject binder and add aliases.
const idxPath = path.join(repo,'index.js');
if (!exists(idxPath)) { console.error('index.js not found'); process.exit(1); }
let src = fs.readFileSync(idxPath,'utf8');
const isESM = /\bexport\s+default\b/.test(src) || /\bimport\s+.*from\s+['"].+['"]/.test(src);
const hasInject = src.includes('/* PROFILES_BIND_INJECT */');

if (!hasInject){
  const injectBlock = `

// ---- Serve /profiles(.html) with binder
/* PROFILES_BIND_INJECT */
function serveProfiles(req,res){
  const p = path.join(__dirname, 'public', 'profiles.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/profiles.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load profiles.html'); }
}
app.get('/profiles.html', serveProfiles);
app.get('/profiles', serveProfiles);
`;

  if (isESM){
    const needFs = !/^\s*import\s+.*\bfs\b\s+from\s+['"]fs['"]\s*;?/m.test(src);
    const needPath = !/^\s*import\s+.*\bpath\b\s+from\s+['"]path['"]\s*;?/m.test(src);
    if (needFs || needPath){
      const add = `${needFs ? "import fs from 'fs';\n" : ""}${needPath ? "import path from 'path';\n" : ""}`;
      let lastIdx = -1, m; const re = /^import.*$/mg;
      while ((m = re.exec(src)) !== null){ lastIdx = m.index + m[0].length; }
      src = (lastIdx>=0) ? (src.slice(0,lastIdx) + "\n" + add + src.slice(lastIdx)) : (add + src);
    }
    src += injectBlock;
  } else {
    const needFs = !/^\s*const\s+fs\s*=\s*require\(['"]fs['"]\)\s*;?/m.test(src);
    const needPath = !/^\s*const\s+path\s*=\s*require\(['"]path['"]\)\s*;?/m.test(src);
    if (needFs || needPath){
      const add = `${needFs ? "const fs = require('fs');\n" : ""}${needPath ? "const path = require('path');\n" : ""}`;
      let lastIdx = -1, m; const re = /^(?:const\s+\w+\s*=\s*require\([^\)]*\)|import\s.*)$/mg;
      while ((m = re.exec(src)) !== null){ lastIdx = m.index + m[0].length; }
      src = (lastIdx>=0) ? (src.slice(0,lastIdx) + "\n" + add + src.slice(lastIdx)) : (add + src);
    }
    src += injectBlock;
  }
  fs.writeFileSync(idxPath, src, 'utf8');
  console.log('✔ Patched index.js cleanly (PROFILES_BIND_INJECT)');
} else {
  console.log('• index.js already has PROFILES_BIND_INJECT');
}

// Guardrail checksum file (optional)
const guard = path.join(repo,'expected.sha256.json');
if (exists(guard)) {
  const checks = JSON.parse(fs.readFileSync(guard,'utf8'));
  checks["public/profiles.html"] = sha256(dstHtml);
  fs.writeFileSync(guard, JSON.stringify(checks, null, 2));
  console.log('✔ Updated expected.sha256.json');
} else {
  console.log('• No expected.sha256.json found (skipped)');
}

console.log('\\nRestart server and open /profiles.html');
