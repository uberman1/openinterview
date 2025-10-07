import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0;
const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/uploads.html');
  ok(res.status===200, 'GET /uploads.html returns 200');

  const $ = cheerio.load(res.text);
  ok($('h1:contains("Uploads")').length>0, 'Header "Uploads" visible');
  ok($('h2:contains("Resumes")').length>0, 'Section "Resumes" present');
  ok($('h2:contains("General Uploads")').length>0, 'Section "General Uploads" present');
  ok($('button:contains("Upload File")').length>0, 'Top Upload button present');
  ok($('script[src="/js/uploads.bind.js"]').length>0, 'Binder script injected');

  console.log(`\nDOM Summary: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
