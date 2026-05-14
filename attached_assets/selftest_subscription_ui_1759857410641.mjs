import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const res = await request(app).get('/subscription.html');
  ok(res.status===200, 'GET /subscription.html 200');
  const $ = cheerio.load(res.text);
  ok($('h2:contains("Subscription")').length===1, 'Subscription heading present');
  ok($('script[src="/js/subscription.bind.js"]').length===1, 'Binder injected');
  ok($('button:contains("Manage in Stripe")').length===1, 'Manage in Stripe button visible');
  ok($('a:contains("Update")').length===1, 'Payment method Update link visible');
  console.log(`\\nSubscription UI test: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();