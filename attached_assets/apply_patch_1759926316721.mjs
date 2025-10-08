#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(path.join(__dirname,'guardrails.config.json'),'utf8'));
const allowed = new Set(config.allowed_write_paths.map(p=>path.normalize(p)));

const patchRoot = path.resolve(path.join(__dirname,'..'));
const projectRoot = process.cwd();

for(const rel of allowed){
  const src = path.join(patchRoot,rel);
  const dest = path.join(projectRoot,rel);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(src,dest);
  console.log('Wrote',rel);
}
console.log('Patch applied safely.');
