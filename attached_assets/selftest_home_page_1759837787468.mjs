import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/home.html');
  ok(res.status===200, 'GET /home.html 200');
  const $ = cheerio.load(res.text);
  ok($('h1:contains("My Profile")').length===1, 'My Profile heading visible');
  ok($('button:contains("New Interview")').length===1, 'New Interview button present');
  ok($('script[src="/js/home.bind.js"]').length===1, 'Binder injected');
  ok($(':contains("Share Profile")').length===0, 'Share Profile button absent');
  ok($(':contains("Manage Profiles")').length===0, 'Manage Profiles button absent');
  console.log(`\\nHome page test: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();