import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++; console.log('✔',m);} else {fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/availability.html');
  ok(res.status===200, 'GET /availability.html 200');
  const $ = cheerio.load(res.text);
  ok($('.tab:contains("Exceptions")').length===0, 'Exceptions tab removed');
  ok($('.tab:contains("Troubleshoot")').length===0, 'Troubleshoot tab removed');
  const rules = $('#tab-rules');
  ok(rules.length>0, 'Rules tab exists');
  const firstHelp = $('#tab-rules h4').first().next('p.text-sm');
  ok(firstHelp.length>0, 'Help text exists under first Rules header');
  console.log(`\\nRules cleanup test: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();