import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/availability.html');
  ok(res.status===200, 'GET /availability.html 200');
  const $ = cheerio.load(res.text);

  ok($('h3:contains("Weekly hours")').length>0, 'Weekly hours header present');
  ok($('#weeklyList [data-day]').length===7, 'Seven day rows present');
  ok($('#weeklyList .add-block').length>=1, 'Add-block buttons present');
  ok($('label:contains("Timezone:")').length>0, 'Timezone control present');

  console.log(`\nDOM Summary: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
