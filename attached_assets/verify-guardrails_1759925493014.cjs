#!/usr/bin/env node
/**
 * Verifies that the patch contains only allowed paths before applying.
 * Fails fast if unexpected files are present.
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'guardrails.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const allowed = new Set(config.allowed_write_paths.map(p => path.normalize(p)));

function walk(dir) {
  const acc = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) acc.push(...walk(p));
    else acc.push(p);
  }
  return acc;
}

const root = path.resolve(path.join(__dirname, '..'));
const files = walk(root)
  .map(p => path.relative(root, p))
  .filter(p => p && !p.startsWith('node_modules'));

const unexpected = files.filter(f => !allowed.has(f) && !f.startsWith('tests/') && !f.startsWith('guardrails/') && not f.endsWith('README.md'));

if (unexpected.length) {
  console.error('Guardrails FAILED. Unexpected files in patch:\n' + unexpected.map(f => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('Guardrails OK: files in patch match allowed list.');
