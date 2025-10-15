// apply-nav-cleanup.mjs
import fs from 'fs/promises';
import path from 'path';
const ROOT = process.cwd();
const JS_NAV = '/js/nav-patch.js';
const JS_RED = '/js/redirect-shim.js';

async function listHtml(dir){
  const acc = [];
  const ents = await fs.readdir(dir, { withFileTypes: true });
  for (const e of ents){
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      acc.push(...await listHtml(p));
    } else if (e.isFile() && /\.html?$/i.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

function inject(html){
  const tagNav = `<script type="module" src="${JS_NAV}"></script>`;
  const tagRed = `<script type="module" src="${JS_RED}"></script>`;
  let changed = false;
  if (!html.includes(tagNav)) { html = html.replace(/<\/body>\s*<\/html>\s*$/i, `${tagNav}\n</body></html>`); changed = true; }
  if (!html.includes(tagRed)) { html = html.replace(/<\/body>\s*<\/html>\s*$/i, `${tagRed}\n</body></html>`); changed = true; }
  return { html, changed };
}

async function main(){
  const files = await listHtml(ROOT);
  if (!files.length) { console.log('[apply] no html files found'); return; }
  let changedAny = 0;
  for (const f of files){
    const src = await fs.readFile(f, 'utf8');
    const { html, changed } = inject(src);
    if (changed){
      await fs.writeFile(f + '.' + Date.now() + '.bak', src, 'utf8');
      await fs.writeFile(f, html, 'utf8');
      console.log('[apply] patched:', f);
      changedAny++;
    }
  }
  if (!changedAny) console.log('[apply] all files already patched');
}
main().catch(e=>{ console.error(e); process.exit(1); });
