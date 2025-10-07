import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/password.html');
  ok(res.status===200, 'GET /password.html returns 200');
  const $ = cheerio.load(res.text);
  ok($('h1:contains("Reset Password")').length===1, 'Heading present');
  ok($('#current-password').length===1 && $('#new-password').length===1 && $('#confirm-new-password').length===1, 'All inputs present');
  ok($('script[src="/js/password.bind.js"]').length===1, 'Binder injected');
  console.log(`\\nPassword UI test: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();