#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url)); const ROOT = path.resolve(__dirname, '..');
const readJSON = p => JSON.parse(fs.readFileSync(p,'utf8'));
const ensure = p => { if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); };
const args = process.argv.slice(2);
const opts = { js:'public/js', pages:'public/pages', guards:'public/guards', tests:'public/tests', dry:false };
for (let i=0;i<args.length;i++){ const a=args[i]; if (a==='--js') opts.js=args[++i]; else if (a==='--pages') opts.pages=args[++i]; else if (a==='--guards') opts.guards=args[++i]; else if (a==='--tests') opts.tests=args[++i]; else if (a==='--dry-run') opts.dry=true; }
const cfg = readJSON(path.join(ROOT,'src','guards','guardrails.config.json')); const allowed = new Set(cfg.allowedTargets.map(p=>path.resolve(p)));
const targets = [path.resolve(opts.js), path.resolve(opts.pages), path.resolve(opts.guards), path.resolve(opts.tests)];
for (const t of targets){ if (![...allowed].some(a=>t.startsWith(a))){ console.error('ERROR: target not allowed', t); process.exit(2); } }
const protectedSet = new Set(cfg.protectedFiles.map(p=>path.resolve(p)));
const plan = [
  { src: path.join(ROOT,'src','js'), dest: path.resolve(opts.js) },
  { src: path.join(ROOT,'src','pages'), dest: path.resolve(opts.pages) },
  { src: path.join(ROOT,'src','guards'), dest: path.resolve(opts.guards) },
  { src: path.join(ROOT,'src','tests'), dest: path.resolve(opts.tests) },
];
for (const step of plan){
  ensure(step.dest);
  for (const file of fs.readdirSync(step.src)){
    const s = path.join(step.src,file), d = path.join(step.dest,file);
    if (fs.existsSync(d)){ console.error('ERROR: Destination exists (no overwrite):', d); process.exit(3); }
    if ([...protectedSet].some(p=>p===d)){ console.error('ERROR: Attempt to overwrite protected file:', d); process.exit(4); }
    if (opts.dry) console.log('[dry-run] copy', s, '->', d); else { fs.copyFileSync(s,d); console.log('copied', s, '->', d); }
  }
}
console.log('✅ Deploy completed.');
