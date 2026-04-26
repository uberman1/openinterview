#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();

function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,c){ fs.writeFileSync(p,c); }
function exists(p){ try{ fs.accessSync(p); return true; }catch{ return false; } }

const availPath = path.join(repo,'public','availability.html');
if(!exists(availPath)){ console.error('public/availability.html not found'); process.exit(1); }
let html = read(availPath);

// --- Remove nav items that say Exceptions or Troubleshoot (case-insensitive) ---
html = html
  // remove <li>...</li> blocks that contain the keywords
  .replace(/<li[^>]*>[^<]*?<button[^>]*>[^<]*(Exceptions|Troubleshoot)[\s\S]*?<\/button>[^<]*<\/li>/gi, '')
  .replace(/<button[^>]*class="[^"]*tab[^"]*"[^>]*>[^<]*(Exceptions|Troubleshoot)[\s\S]*?<\/button>/gi, '');

// --- Remove the corresponding sections by id ---
html = html.replace(/<section[^>]*id=["']tab-exceptions["'][\s\S]*?<\/section>/gi, '');
html = html.replace(/<section[^>]*id=["']tab-troubleshoot["'][\s\S]*?<\/section>/gi, '');

// --- Ensure brief instructions exist under each Rules card header ---
const helpText = {
  'Minimum scheduling notice': 'How far in advance someone must book. Prevents last-minute meetings.',
  'Scheduling window': 'How far into the future people can book.',
  'Start time increments': 'The grid step for available times.',
  'Buffers': 'Automatic padding before and after each meeting.',
  'Daily meeting cap': 'Limit how many bookings you’ll accept per day.',
  'Durations offered': 'Pick the durations available to book and choose a default.'
};

for (const [title, hint] of Object.entries(helpText)){
  const re = new RegExp(`(<h4[^>]*>\\s*${title.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}\\s*<\\/h4>)(?!\\s*<p[^>]*class=[^>]*text-sm)`,`i`);
  html = html.replace(re, `$1\n<p class="text-sm text-muted-light mb-3">${hint}</p>`);
}

// backup then write
const backup = path.join(repo,'public','availability_prev.html');
try{ fs.copyFileSync(availPath, backup); }catch{}
write(availPath, html);
console.log('✔ availability.html updated (tabs removed, rules instructions ensured)');

// --- Patch availability.js showTab to ignore removed tabs if file exists ---
const jsPath = path.join(repo,'public','js','availability.js');
if (exists(jsPath)){
  let js = read(jsPath);
  // Replace any array with exceptions/troubleshoot to an array that excludes them
  js = js.replace(/\\['weekly'\\s*,\\s*'rules'\\s*,\\s*'exceptions'\\s*,\\s*'preview'\\s*,\\s*'troubleshoot'\\]/g, "['weekly','rules','preview']");
  js = js.replace(/\\['weekly'\\s*,\\s*'rules'\\s*,\\s*'exceptions'\\s*,\\s*'troubleshoot'\\]/g, "['weekly','rules']");
  js = js.replace(/\\['weekly'\\s*,\\s*'rules'\\s*,\\s*'troubleshoot'\\]/g, "['weekly','rules']");
  js = js.replace(/\\['weekly'\\s*,\\s*'rules'\\s*,\\s*'preview'\\s*,\\s*'troubleshoot'\\]/g, "['weekly','rules','preview']");
  write(jsPath, js);
  console.log('✔ availability.js showTab updated to exclude removed tabs (if present)');
}else{
  console.log('• public/js/availability.js not found — skipped JS patch');
}

console.log('\\nDone. Restart your server and open /availability.html');
