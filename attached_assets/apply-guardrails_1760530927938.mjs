import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findHtml(){
  const c=['home.html','public/home.html','index.html','public/index.html'];
  for (const p of c){
    try{const full=path.resolve(process.cwd(),p); const st=await fs.stat(full); if(st.isFile()) return full;}catch{}
  }
  return null;
}
async function ensureJs(){
  const destDir = path.resolve(process.cwd(), 'js');
  await fs.mkdir(destDir, {recursive:true});
  const src = path.resolve(__dirname, 'js', 'guardrails-loose.js');
  const dest= path.join(destDir, 'guardrails-loose.js');
  const code= await fs.readFile(src,'utf8');
  await fs.writeFile(dest, code, 'utf8');
  return '/js/guardrails-loose.js';
}
async function inject(htmlPath, href){
  let html = await fs.readFile(htmlPath,'utf8');
  if (html.includes('guardrails-loose.js')) { console.log('[apply] already injected'); return; }
  const tag = `\n<script defer src="${href}?v=loose1"></script>\n`;
  html = html.replace(/<\/body>\s*<\/html>\s*$/i, `${tag}</body></html>`);
  await fs.writeFile(htmlPath, html, 'utf8');
  console.log('[apply] injected guardrails tag into', htmlPath);
}
(async()=>{
  const html = await findHtml();
  if (!html) { console.error('[apply] home.html not found'); process.exit(1); }
  const href = await ensureJs();
  await inject(html, href);
  console.log('[apply] Done');
})().catch(e=>{ console.error(e); process.exit(1); });