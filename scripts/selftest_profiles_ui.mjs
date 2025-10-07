import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/profiles.html');
  ok(res.status===200, 'GET /profiles.html returns 200');
  const $ = cheerio.load(res.text);
  ok($('h2:contains("Profiles")').length===1, 'Profiles heading present');
  ok($('script[src="/js/profiles.bind.js"]').length===1, 'Binder injected');
  // basic action texts exist in template (for initial static rows)
  ok($('a:contains("View")').length>0 && $('a:contains("Share")').length>0 && $('a:contains("Edit")').length>0, 'Row actions present');
  console.log(`\\nProfiles UI test: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();