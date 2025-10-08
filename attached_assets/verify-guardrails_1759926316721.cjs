#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname,'guardrails.config.json'),'utf8'));
const allowed = new Set(config.allowed_write_paths.map(p=>path.normalize(p)));

const root = path.resolve(path.join(__dirname,'..'));
function walk(dir){
  let files = [];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p = path.join(dir,e.name);
    if(e.isDirectory()) files.push(...walk(p));
    else files.push(path.relative(root,p));
  }
  return files;
}
const files = walk(root);
const unexpected = files.filter(f=>!allowed.has(f) && !f.startsWith('guardrails/') && !f.startsWith('tests/') && f!=='README.md');
if(unexpected.length){
  console.error('Unexpected files:',unexpected);
  process.exit(1);
}
console.log('Guardrails OK.');
