import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/home.html');
  ok(res.status===200, 'GET /home.html 200');
  const $ = cheerio.load(res.text);
  ok($('h1:contains("My Profile")').length===1, 'Heading present');
  ok($('h2:contains("Upcoming Interviews")').length===1, 'Upcoming section present');
  ok($('script[src="/js/home.bind.js"]').length===1, 'Binder injected');
  const res2 = await request(app).get('/profile.html').redirects(1);
  ok(res2.status===200, 'GET /profile.html resolves');
  console.log(`\\nHome-as-profile test: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();