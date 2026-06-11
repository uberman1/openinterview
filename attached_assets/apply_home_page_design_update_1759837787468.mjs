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

const homePath = path.join(repo,'public','home.html');
if (exists(homePath)) fs.copyFileSync(homePath, path.join(repo,'public','home_prev.html'));

fs.copyFileSync(path.join(__dirname,'..','public','home.html'), homePath);
fs.copyFileSync(path.join(__dirname,'..','public','js','home.bind.js'), path.join(repo,'public','js','home.bind.js'));
console.log('✔ Installed home.html and home.bind.js');

const idxPath = path.join(repo,'index.js');
if (!exists(idxPath)) { console.error('index.js not found'); process.exit(1); }
let idx = fs.readFileSync(idxPath,'utf8');
if (!idx.includes('/* HOME_BIND_INJECT */')){
  idx += `

// ---- Inject binder for /home.html (preserve exact HTML)
/* HOME_BIND_INJECT */
import fs from 'fs';
import path from 'path';
app.get('/home.html', (req,res) => {
  const p = path.join(__dirname, 'public', 'home.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/home.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load home.html'); }
});
`;
  fs.writeFileSync(idxPath, idx);
  console.log('✔ Patched index.js to inject /js/home.bind.js');
} else {
  console.log('• index.js already has HOME_BIND_INJECT');
}

const guard = path.join(repo,'expected.sha256.json');
if (exists(guard)) {
  const checks = JSON.parse(fs.readFileSync(guard,'utf8'));
  checks["public/home.html"] = sha256(homePath);
  fs.writeFileSync(guard, JSON.stringify(checks, null, 2));
  console.log('✔ Updated expected.sha256.json');
} else {
  console.log('• No expected.sha256.json found (skipped guardrail update)');
}

console.log('\\nRestart server and open /home.html');
