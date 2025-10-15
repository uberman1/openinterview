// apply-esm-guardrails.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

async function statIsFile(p){ try { const s = await fs.stat(p); return s.isFile(); } catch { return false; } }
async function findHtml(){
  const cand = ['home.html','public/home.html','index.html','public/index.html'];
  for (const c of cand){ const full = path.resolve(process.cwd(), c); if (await statIsFile(full)) return full; }
  return null;
}
async function findHomeUatJs(){
  const cand = ['js/home-uat.js','public/js/home-uat.js','static/js/home-uat.js','assets/js/home-uat.js'];
  for (const c of cand){ const full = path.resolve(process.cwd(), c); if (await statIsFile(full)) return full; }
  return null;
}
function stripLoose(html){
  return html.replace(/<script[^>]*src=["'][^"']*guardrails-loose\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi, '');
}
async function copyModule(){
  const destDir = path.resolve(process.cwd(), 'js');
  await fs.mkdir(destDir, { recursive: true });
  const src  = path.resolve(__dirname, 'js', 'home-guardrails-module.js');
  const dest = path.join(destDir, 'home-guardrails-module.js');
  const code = await fs.readFile(src, 'utf8');
  await fs.writeFile(dest, code, 'utf8');
  return dest;
}
async function wireImport(jsPath){
  let src = await fs.readFile(jsPath, 'utf8');
  if (/home-guardrails-module\.js/.test(src) || /initGuardrails\(\)/.test(src)) {
    console.log('[apply] home-uat.js already imports or calls guardrails');
    return;
  }
  const backup = `${jsPath}.${Date.now()}.bak`;
  await fs.writeFile(backup, src, 'utf8');
  console.log('[apply] backup created:', backup);
  src += `\n\n// --- auto-wired by apply-esm-guardrails ---\nimport { initGuardrails } from './home-guardrails-module.js';\ninitGuardrails();\n`;
  await fs.writeFile(jsPath, src, 'utf8');
  console.log('[apply] appended import+call to', jsPath);
}
(async()=>{
  const html = await findHtml();
  if (html){
    let txt = await fs.readFile(html,'utf8');
    const cleaned = stripLoose(txt);
    if (cleaned !== txt){
      const bak = `${html}.${Date.now()}.bak`; await fs.writeFile(bak, txt, 'utf8');
      await fs.writeFile(html, cleaned, 'utf8');
      console.log('[apply] removed loose guardrails script tags from', html);
    } else {
      console.log('[apply] no loose script tag found in', html);
    }
  } else {
    console.log('[apply] no home.html / index.html found to clean');
  }
  const dest = await copyModule();
  console.log('[apply] module copied to', dest);
  const jsPath = await findHomeUatJs();
  if (!jsPath){ console.error('[apply] could not find home-uat.js'); process.exit(1); }
  await wireImport(jsPath);
  console.log('[apply] done.');
})().catch(e=>{ console.error(e); process.exit(1); });