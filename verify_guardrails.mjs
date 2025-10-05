
import fs from 'fs';
import crypto from 'crypto';

const checks = JSON.parse(fs.readFileSync('./expected.sha256.json','utf8'));
let pass=0, fail=0;
const sha256 = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

for (const [p,exp] of Object.entries(checks)) {
  const got = sha256(p);
  if (got === exp) { pass++; console.log('✔', p, 'OK'); }
  else { fail++; console.log('✘', p, 'mismatch'); console.log('  expected:', exp); console.log('  got     :', got); }
}

console.log(`\nSummary: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
