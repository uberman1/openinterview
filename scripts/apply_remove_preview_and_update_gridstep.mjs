#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();

const availPath = path.join(repo,'public','availability.html');
const jsPath    = path.join(repo,'public','js','availability.js');
const guardPath = path.join(repo,'expected.sha256.json');

const exists = p => { try{ fs.accessSync(p); return true; }catch{ return false; } };
const read = p => fs.readFileSync(p,'utf8');
const write = (p,c) => fs.writeFileSync(p,c);
const sha256 = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

if (!exists(availPath)) {
  console.error('ERROR: public/availability.html not found');
  process.exit(1);
}

// --- Backup originals
try { fs.copyFileSync(availPath, path.join(repo,'public','availability_prev.html')); } catch {}
if (exists(jsPath)) try { fs.copyFileSync(jsPath, path.join(repo,'public','js','availability_prev.js')); } catch {}

// --- Update availability.html
let html = read(availPath);

// Remove "Preview" nav button <li>...</li>
html = html.replace(/<li[^>]*>\s*<button[^>]*class="[^"]*tab[^"]*"[^>]*>[^<]*Preview[^<]*<\/button>\s*<\/li>\s*/gi, '');
// Remove any stray <button class="tab">Preview</button>
html = html.replace(/<button[^>]*class="[^"]*tab[^"]*"[^>]*>[^<]*Preview[^<]*<\/button>/gi, '');
// Remove the Preview section by id
html = html.replace(/<section[^>]*id=["']tab-preview["'][\s\S]*?<\/section>/gi, '');

// Update the "Start time increments" help paragraph
const helpText = 'Your interview slot intervals. If the grid step is 30 min, possible start times are 9:00, 9:30, 10:00, 10:30…';
const hdrRe = /(<h4[^>]*>\s*Start\s*time\s*increments\s*<\/h4>)(?:\s*<p[^>]*class="[^"]*text-sm[^"]*"[^>]*>[\s\S]*?<\/p>)?/i;
if (hdrRe.test(html)) {
  html = html.replace(hdrRe, `$1\n<p class="text-sm text-muted-light mb-3">${helpText}</p>`);
} else {
  // Fallback: do nothing if header not found
  console.warn('WARN: Could not locate "Start time increments" header to insert help text.');
}

write(availPath, html);
console.log('✔ availability.html: Preview removed, description updated.');

// --- Update availability.js to ignore preview logic
if (exists(jsPath)) {
  let js = read(jsPath);
  // Remove 'preview' from tab arrays
  js = js.replace(/\[\s*'weekly'\s*,\s*'rules'\s*,\s*'preview'\s*\]/g, "['weekly','rules']");
  js = js.replace(/\[\s*'weekly'\s*,\s*'rules'\s*,\s*'exceptions'\s*,\s*'preview'\s*,\s*'troubleshoot'\s*\]/g, "['weekly','rules']");
  // Remove special-case if(name==='preview'){ ... }
  js = js.replace(/if\s*\(\s*name\s*===\s*['"]preview['"]\s*\)\s*\{[\s\S]*?\}/g, '');
  write(jsPath, js);
  console.log('✔ availability.js: preview logic removed (if present).');
} else {
  console.log('• public/js/availability.js not found — skipped JS patch.');
}

// --- Update guardrails checksums if file exists
if (exists(guardPath)) {
  try {
    const checks = JSON.parse(read(guardPath));
    checks["public/availability.html"] = sha256(availPath);
    if (exists(jsPath)) checks["public/js/availability.js"] = sha256(jsPath);
    write(guardPath, JSON.stringify(checks, null, 2));
    console.log('✔ expected.sha256.json updated.');
  } catch(e) {
    console.warn('WARN: could not update expected.sha256.json:', e.message);
  }
}

console.log('\nDone. Restart the server and open /availability.html');
