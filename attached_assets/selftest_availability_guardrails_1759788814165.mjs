import fs from 'fs';
import crypto from 'crypto';

function sha256(path){
  const buf = fs.readFileSync(path);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const checks = JSON.parse(fs.readFileSync('./expected.sha256.json','utf8'));
let pass=0, fail=0;
for (const [file, expected] of Object.entries(checks)){
  const actual = sha256(file);
  if (actual === expected){ pass++; console.log('✔', file, 'checksum OK'); }
  else { fail++; console.log('✘', file, 'checksum mismatch'); }
}
console.log(`\nGuardrails: ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
