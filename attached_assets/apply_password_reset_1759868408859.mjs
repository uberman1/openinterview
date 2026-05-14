#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();

const ensure = p => fs.mkdirSync(p,{recursive:true});
ensure(path.join(repo,'public'));
ensure(path.join(repo,'public','js'));

function cp(relSrc, relDst){
  fs.copyFileSync(path.join(__dirname,'..',relSrc), path.join(repo, relDst));
}

cp('public/forgot.html','public/forgot.html');
cp('public/reset.html','public/reset.html');
cp('public/js/login.forgot.bind.js','public/js/login.forgot.bind.js');
console.log('✔ Copied forgot.html, reset.html, login binder');

const idx = path.join(repo,'index.js');
if (!fs.existsSync(idx)){ console.error('index.js not found'); process.exit(1); }
let src = fs.readFileSync(idx,'utf8');

function ensureImports(code){
  const hasFS = /\bfs\b/.test(code);
  const hasPath = /\bpath\b/.test(code);
  if (!/^\s*import\s+.*\bfs\b\s+from\s+['"]fs['"]\s*;?/m.test(code) && !/^\s*const\s+fs\s*=\s*require\(['"]fs['"]\)/m.test(code)){
    code = `import fs from 'fs';\n` + code;
  }
  if (!/^\s*import\s+.*\bpath\b\s+from\s+['"]path['"]\s*;?/m.test(code) && !/^\s*const\s+path\s*=\s*require\(['"]path['"]\)/m.test(code)){
    code = `import path from 'path';\n` + code;
  }
  return code;
}

function injectOnce(marker, block){
  if (src.includes(marker)) return false;
  src += `\n\n${block}\n`;
  return true;
}

// Serve login.html with binder injection (non-destructive)
injectOnce('/* FORGOT_BIND_LOGIN */', `/* FORGOT_BIND_LOGIN */
app.get('/login.html', (req,res) => {
  try{
    const p = path.join(__dirname,'public','login.html');
    let html = fs.readFileSync(p,'utf8');
    html = html.replace('</body>', '<script src="/js/login.forgot.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){
    res.status(404).send('login.html not found');
  }
});`);

// Serve forgot/reset pages (no binders needed)
injectOnce('/* SERVE_FORGOT_RESET */', `/* SERVE_FORGOT_RESET */
app.get('/forgot.html', (req,res) => {
  try{
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(fs.readFileSync(path.join(__dirname,'public','forgot.html'),'utf8'));
  }catch(e){ res.status(404).send('forgot.html not found'); }
});
app.get('/reset.html', (req,res) => {
  try{
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(fs.readFileSync(path.join(__dirname,'public','reset.html'),'utf8'));
  }catch(e){ res.status(404).send('reset.html not found'); }
});`);

// Simple in-memory + file-backed stores
injectOnce('/* AUTH_RESET_STORE */', `/* AUTH_RESET_STORE */
const RESET_DB_FILE = path.join(__dirname, '.data', 'reset_tokens.json');
const PASS_DB_FILE  = path.join(__dirname, '.data', 'reset_passwords.json');
function loadJSON(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch{ return {}; } }
function saveJSON(p, obj){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }
let resetDB = loadJSON(RESET_DB_FILE);   // { token: { email, expiresAt, used:false, createdAt } }
let passDB  = loadJSON(PASS_DB_FILE);    // { email: { passwordHash:'plain-for-dev', updatedAt } }  // NOTE: dev-only plain

function makeToken(){ return [...crypto.randomUUID().replace(/-/g,'')].sort(()=>Math.random()-0.5).join('').slice(0,48); }
function now(){ return Date.now(); }
function ttlMs(){ return 30*60*1000; } // 30min

// Dev-only "email outbox"
let lastResetByEmail = {}; // { email: url }
`);

// Rate limit helper (simple)
injectOnce('/* AUTH_RESET_RATE_LIMIT */', `/* AUTH_RESET_RATE_LIMIT */
const rl = new Map(); // key -> {count, resetAt}
function rateLimit(key, limit=5, windowMs=60*60*1000){
  const nowTs = now();
  const entry = rl.get(key) || { count: 0, resetAt: nowTs + windowMs };
  if (nowTs > entry.resetAt){ entry.count = 0; entry.resetAt = nowTs + windowMs; }
  entry.count += 1;
  rl.set(key, entry);
  return entry.count <= limit;
}`);

// Endpoints: forgot, validate, reset + dev helper
injectOnce('/* AUTH_RESET_ROUTES */', `/* AUTH_RESET_ROUTES */
app.post('/api/auth/forgot', express.json(), async (req,res) => {
  try{
    const email = String(req.body?.email||'').trim().toLowerCase();
    // Always 200 (no account enumeration)
    if (!rateLimit('forgot:'+req.ip) || !rateLimit('forgot:'+email)){ return res.json({ ok:true }); }
    const token = makeToken();
    resetDB[token] = { email, createdAt: now(), expiresAt: now() + ttlMs(), used: false };
    saveJSON(RESET_DB_FILE, resetDB);
    const url = \`\${req.protocol}://\${req.get('host')}/reset.html?token=\${encodeURIComponent(token)}\`;
    lastResetByEmail[email] = url;
    console.log('[dev-email] Password reset link for', email, '→', url);
    return res.json({ ok:true });
  }catch(e){ return res.json({ ok:true }); }
});

app.get('/api/auth/reset/validate', (req,res) => {
  const token = String(req.query.token||'');
  const rec = resetDB[token];
  if (!rec){ return res.status(400).json({ ok:false, reason:'invalid' }); }
  if (rec.used){ return res.status(410).json({ ok:false, reason:'used' }); }
  if (now() > rec.expiresAt){ return res.status(410).json({ ok:false, reason:'expired' }); }
  return res.json({ ok:true, email: rec.email });
});

app.post('/api/auth/reset', express.json(), async (req,res) => {
  const token = String(req.body?.token||'');
  const password = String(req.body?.password||'');
  const rec = resetDB[token];
  if (!rec){ return res.status(400).json({ ok:false, reason:'invalid' }); }
  if (rec.used || now()>rec.expiresAt){ return res.status(410).json({ ok:false, reason:'expired_or_used' }); }
  // DEV: store "hash" as plain; your real app should hash (bcrypt/argon2)
  passDB[rec.email] = { passwordHash: password, updatedAt: now() };
  saveJSON(PASS_DB_FILE, passDB);
  rec.used = true; saveJSON(RESET_DB_FILE, resetDB);
  // TODO: revoke sessions for rec.email in your real app
  return res.json({ ok:true });
});

// Dev helper to fetch last reset URL
app.get('/dev/last-reset', (req,res) => {
  const email = String(req.query.email||'').trim().toLowerCase();
  const url = lastResetByEmail[email];
  if (!url) return res.status(404).json({ ok:false });
  res.json({ ok:true, url });
});`);

// Try to inject login binder on /login.html (matching our established pattern)
injectOnce('/* LOGIN_BINDER_INJECT */', `/* LOGIN_BINDER_INJECT */
app.get('/login.html', (req,res) => {
  try{
    const p = path.join(__dirname,'public','login.html');
    let html = fs.readFileSync(p,'utf8');
    if (!html.includes('/js/login.forgot.bind.js')){
      html = html.replace('</body>', '<script src="/js/login.forgot.bind.js" defer></script></body>');
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(404).send('login.html not found'); }
});`);

src = ensureImports(src);
fs.writeFileSync(idx, src, 'utf8');
console.log('✔ Patched index.js with password reset routes and login binder');

