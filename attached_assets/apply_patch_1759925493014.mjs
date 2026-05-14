#!/usr/bin/env node
/**
 * Copies allowed patch files into project root safely.
 * Refuses to write outside the allowed list.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'guardrails.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const allowed = new Set(config.allowed_write_paths.map(p => path.normalize(p)));

const patchRoot = path.resolve(path.join(__dirname, '..'));
const projectRoot = process.env.TARGET_PROJECT_ROOT
  ? path.resolve(process.env.TARGET_PROJECT_ROOT)
  : process.cwd();

function copyRel(relPath) {
  if (!allowed.has(relPath)) {
    throw new Error(`Refusing to write disallowed path: ${relPath}`);
  }
  const src = path.join(patchRoot, relPath);
  const dest = path.join(projectRoot, relPath);

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Wrote ${relPath}`);
}

// Copy all allowed files
for (const rel of allowed) {
  copyRel(rel);
}

console.log('Patch applied successfully.');
