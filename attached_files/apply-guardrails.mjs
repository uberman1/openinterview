// apply-guardrails.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

async function findTarget(provided) {
  const candidates = provided ? [provided] : [
    'public/js/home-uat.js',
    'public/js/home.js',
    'js/home-uat.js',
    'static/js/home-uat.js',
    'assets/js/home-uat.js'
  ];
  for (const p of candidates) {
    try {
      const full = path.resolve(process.cwd(), p);
      const stat = await fs.stat(full);
      if (stat.isFile()) return full;
    } catch {}
  }
  return null;
}

async function main() {
  const arg = process.argv[2];
  const target = await findTarget(arg);
  if (!target) {
    console.error('[apply-guardrails] Could not locate home-uat.js. Pass the path explicitly, e.g.:');
    console.error('  node apply-guardrails.mjs ./public/js/home-uat.js');
    process.exit(1);
  }
  const patchPath = path.resolve(__dirname, 'guardrails-patch.js');
  const patch = await fs.readFile(patchPath, 'utf8');

  let src = await fs.readFile(target, 'utf8');
  if (src.includes('GUARDRAILS RUNTIME PATCH')) {
    console.log('[apply-guardrails] Patch already present; nothing to do.');
    return;
  }

  const backup = `${target}.${Date.now()}.bak`;
  await fs.writeFile(backup, src, 'utf8');
  console.log('[apply-guardrails] Backup written:', backup);

  src += `\n\n/* ===== BEGIN AUTO-APPENDED GUARDRAILS ===== */\n` + patch + `\n/* ===== END AUTO-APPENDED GUARDRAILS ===== */\n`;
  await fs.writeFile(target, src, 'utf8');
  console.log('[apply-guardrails] Patch appended to', target);
}

main().catch(err => {
  console.error('[apply-guardrails] Failed:', err);
  process.exit(1);
});