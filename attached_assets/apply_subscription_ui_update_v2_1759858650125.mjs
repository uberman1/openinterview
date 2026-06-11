#!/usr/bin/env node
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

const srcHtml = path.join(__dirname,'..','public','subscription.html');
const dstHtml = path.join(repo,'public','subscription.html');
if (exists(dstHtml)) fs.copyFileSync(dstHtml, path.join(repo,'public','subscription_prev.html'));
fs.copyFileSync(srcHtml, dstHtml);
fs.copyFileSync(path.join(__dirname,'..','public','js','subscription.bind.js'), path.join(repo,'public','js','subscription.bind.js'));
console.log('✔ Installed subscription.html and subscription.bind.js');

const idxPath = path.join(repo,'index.js');
if (!exists(idxPath)) { console.error('index.js not found'); process.exit(1); }
let src = fs.readFileSync(idxPath,'utf8');
const isESM = /\bexport\s+default\b/.test(src) || /\bimport\s+.*from\s+['"].+['"]/.test(src);
const hasInject = src.includes('/* SUBSCRIPTION_BIND_INJECT */');

if (!hasInject){
  const injectBlock = `

// ---- Serve /subscription(.html) with binder
/* SUBSCRIPTION_BIND_INJECT */
function serveSubscription(req,res){
  const p = path.join(__dirname, 'public', 'subscription.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/subscription.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load subscription.html'); }
}
app.get('/subscription.html', serveSubscription);
app.get('/subscription', serveSubscription);
app.get('/billing', (req,res)=> res.redirect(302, '/subscription.html'));
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
  console.log('✔ Patched index.js cleanly (no duplicate imports)');
} else {
  console.log('• index.js already has SUBSCRIPTION_BIND_INJECT');
}

const guard = path.join(repo,'expected.sha256.json');
if (exists(guard)) {
  const checks = JSON.parse(fs.readFileSync(guard,'utf8'));
  checks["public/subscription.html"] = sha256(dstHtml);
  fs.writeFileSync(guard, JSON.stringify(checks, null, 2));
  console.log('✔ Updated expected.sha256.json');
} else {
  console.log('• No expected.sha256.json found (skipped)');
}

console.log('\\nRestart server and open /subscription.html or /billing');
