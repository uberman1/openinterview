#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();
const ensureDir = p => fs.mkdirSync(p,{recursive:true});
const exists = p => { try{ fs.accessSync(p); return true; }catch{ return false; } };

ensureDir(path.join(repo,'public'));
ensureDir(path.join(repo,'public','js'));

fs.copyFileSync(path.join(__dirname,'..','public','booking_manage.html'), path.join(repo,'public','booking_manage.html'));
fs.copyFileSync(path.join(__dirname,'..','public','js','booking_manage.bind.js'), path.join(repo,'public','js','booking_manage.bind.js'));
fs.copyFileSync(path.join(__dirname,'..','public','js','public_profile.book.bind.js'), path.join(repo,'public','js','public_profile.book.bind.js'));
console.log('✔ Installed booking_manage.html and binders');

const idxPath = path.join(repo,'index.js');
if (!exists(idxPath)) { console.error('index.js not found'); process.exit(1); }
let src = fs.readFileSync(idxPath,'utf8');
const isESM = /\bexport\s+default\b/.test(src) || /\bimport\s+.*from\s+['"].+['"]/.test(src);
const hasPublicInject = src.includes('/* PUBLIC_PROFILE_BOOK_BIND */');
const hasManageInject = src.includes('/* BOOKING_MANAGE_BIND */');

function ensureImports(code){
  if (isESM){
    if (!/^\s*import\s+.*\bfs\b\s+from\s+['"]fs['"]\s*;?/m.test(code)) code = `import fs from 'fs';\n` + code;
    if (!/^\s*import\s+.*\bpath\b\s+from\s+['"]path['"]\s*;?/m.test(code)) code = `import path from 'path';\n` + code;
    return code;
  } else {
    if (!/^\s*const\s+fs\s*=\s*require\(['"]fs['"]\)\s*;?/m.test(code)) code = `const fs = require('fs');\n` + code;
    if (!/^\s*const\s+path\s*=\s*require\(['"]path['"]\)\s*;?/m.test(code)) code = `const path = require('path');\n` + code;
    return code;
  }
}

let changed = false;
if (!hasPublicInject){
  const block = `

// ---- Inject binder for public profile share page
/* PUBLIC_PROFILE_BOOK_BIND */
function servePublicProfile(req,res){
  const p = path.join(__dirname, 'public', 'profile_public.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/public_profile.book.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(404).send('profile_public.html not found'); }
}
app.get('/u/:handle', servePublicProfile);
app.get('/profile_public.html', servePublicProfile);
`;
  src += block; changed = true;
}

if (!hasManageInject){
  const block2 = `

// ---- Serve booking manage page with binder
/* BOOKING_MANAGE_BIND */
function serveBookingManage(req,res){
  const p = path.join(__dirname, 'public', 'booking_manage.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/booking_manage.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load booking_manage.html'); }
}
app.get('/booking_manage.html', serveBookingManage);
app.get('/booking/manage/:token', serveBookingManage);
`;
  src += block2; changed = true;
}

if (changed){
  src = ensureImports(src);
  fs.writeFileSync(idxPath, src, 'utf8');
  console.log('✔ Patched index.js with PUBLIC_PROFILE_BOOK_BIND and/or BOOKING_MANAGE_BIND');
} else {
  console.log('• index.js already has required injections');
}

