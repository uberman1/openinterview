#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();

const ensureDir = p => fs.mkdirSync(p,{recursive:true});
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

ensureDir(path.join(repo,'public'));
ensureDir(path.join(repo,'public','js'));

// backup old versions
const avail = path.join(repo,'public','availability.html');
if (fs.existsSync(avail)) fs.copyFileSync(avail, path.join(repo,'public','availability_prev.html'));
const js = path.join(repo,'public','js','availability.js');
if (fs.existsSync(js)) fs.copyFileSync(js, path.join(repo,'public','js','availability_prev.js'));

// copy new
fs.copyFileSync(path.join(__dirname,'..','public','availability.html'), avail);
fs.copyFileSync(path.join(__dirname,'..','public','js','availability.js'), js);
console.log('✔ Installed vertical Weekly layout for Availability');

// update guardrails (if file exists)
const guard = path.join(repo,'expected.sha256.json');
try{
  const checks = JSON.parse(fs.readFileSync(guard,'utf8'));
  checks["public/availability.html"] = sha256(avail);
  checks["public/js/availability.js"] = sha256(js);
  fs.writeFileSync(guard, JSON.stringify(checks, null, 2));
  console.log('✔ Updated expected.sha256.json');
}catch{
  // no guardrails file — create a minimal one
  const checks = {
    "public/availability.html": sha256(avail),
    "public/js/availability.js": sha256(js)
  };
  fs.writeFileSync(guard, JSON.stringify(checks, null, 2));
  console.log('• Created expected.sha256.json');
}

console.log('\\nRestart server and open /availability.html');
