import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/availability.html');
  ok(res.status===200, 'GET /availability.html 200');

  const $ = cheerio.load(res.text);
  ok($('.tab:contains("Preview")').length===0, 'Preview tab removed');
  ok($('#tab-preview').length===0, 'Preview section removed');

  const hdr = $('h4:contains("Start time increments")').first();
  ok(hdr.length===1, 'Start time increments header exists');
  const p = hdr.next('p.text-sm').text().trim();
  ok(p.startsWith('Your interview slot intervals.'), 'New description present');

  console.log(`\nPatch test: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();