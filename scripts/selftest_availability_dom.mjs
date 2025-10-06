import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0;
const ok=(cond,msg)=>{ if(cond){ pass++; console.log('✔',msg);} else { fail++; console.log('✘',msg);} };

(async function run(){
  const res = await request(app).get('/availability.html');
  ok(res.status===200, 'GET /availability.html returns 200');

  const $ = cheerio.load(res.text);
  ok($('button.tab:contains("Weekly Hours")').length>0, 'Weekly Hours tab present');
  ok($('button.tab:contains("Rules")').length>0, 'Rules tab present');
  ok($('button.tab:contains("Troubleshoot")').length>0, 'Troubleshoot tab present');
  ok($('script[src="/js/availability.js"]').length>0, 'availability.js is referenced');

  console.log(`\nDOM Summary: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
