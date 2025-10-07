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

// Install UI files
const subPath = path.join(repo,'public','subscription.html');
if (exists(subPath)) fs.copyFileSync(subPath, path.join(repo,'public','subscription_prev.html'));
fs.copyFileSync(path.join(__dirname,'..','public','subscription.html'), subPath);
fs.copyFileSync(path.join(__dirname,'..','public','js','subscription.bind.js'), path.join(repo,'public','js','subscription.bind.js'));
console.log('✔ Installed subscription.html and subscription.bind.js');

// Patch server to serve with binder and add aliases
const idxPath = path.join(repo,'index.js');
if (!exists(idxPath)) { console.error('index.js not found'); process.exit(1); }
let idx = fs.readFileSync(idxPath,'utf8');
if (!idx.includes('/* SUBSCRIPTION_BIND_INJECT */')){
  idx += `

// ---- Serve /subscription(.html) with binder
/* SUBSCRIPTION_BIND_INJECT */
import fs from 'fs';
import path from 'path';
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
  fs.writeFileSync(idxPath, idx);
  console.log('✔ Patched index.js with SUBSCRIPTION_BIND_INJECT');
} else {
  console.log('• index.js already has SUBSCRIPTION_BIND_INJECT');
}

// Optional: update guardrails if present
const guard = path.join(repo,'expected.sha256.json');
if (exists(guard)) {
  const checks = JSON.parse(fs.readFileSync(guard,'utf8'));
  checks["public/subscription.html"] = sha256(subPath);
  fs.writeFileSync(guard, JSON.stringify(checks, null, 2));
  console.log('✔ Updated expected.sha256.json');
} else {
  console.log('• No expected.sha256.json found (skipped guardrail update)');
}

console.log('\\nRestart the server and open /subscription.html');
