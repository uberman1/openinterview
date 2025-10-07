#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();

const exists = p => { try{ fs.accessSync(p); return true; }catch{ return false; } };
const ensureDir = p => fs.mkdirSync(p,{recursive:true});

// Install exact uploads.html and binder
ensureDir(path.join(repo,'public'));
if (exists(path.join(repo,'public','uploads.html'))) {
  fs.copyFileSync(path.join(repo,'public','uploads.html'), path.join(repo,'public','uploads_legacy.html'));
}
fs.copyFileSync(path.join(__dirname,'..','public','uploads.html'), path.join(repo,'public','uploads.html'));
ensureDir(path.join(repo,'public','js'));
fs.copyFileSync(path.join(__dirname,'..','public','js','uploads.bind.js'), path.join(repo,'public','js','uploads.bind.js'));
console.log('✔ Installed uploads.html (exact) and uploads.bind.js');

// Patch index.js to inject binder at response time
const idxPath = path.join(repo,'index.js');
if (!exists(idxPath)) { console.error('index.js not found'); process.exit(1); }
let idx = fs.readFileSync(idxPath,'utf8');

if (!idx.includes('/* UPLOADS_BIND_INJECT */')){
  idx += `

// ---- Inject client binder for uploads.html (no file changes) ----
/* UPLOADS_BIND_INJECT */
import fs from 'fs';
import path from 'path';
app.get('/uploads.html', (req,res) => {
  const p = path.join(__dirname, 'public', 'uploads.html');
  try{
    const html = fs.readFileSync(p, 'utf8');
    const injected = html.replace('</body>', '<script src="/js/uploads.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(injected);
  }catch(e){
    res.status(500).send('Failed to load uploads.html');
  }
});
`;
  fs.writeFileSync(idxPath, idx);
  console.log('✔ Patched index.js to inject binder for /uploads.html');
} else {
  console.log('• index.js already contains uploads binder injection');
}

console.log('\\nDone. Restart your server and open /uploads.html');
