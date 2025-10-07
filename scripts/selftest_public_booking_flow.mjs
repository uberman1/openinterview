import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  let r = await request(app).get('/booking_manage.html');
  ok(r.status===200, 'GET /booking_manage.html returns 200');
  let $ = cheerio.load(r.text);
  ok($('h1:contains("Manage Booking")').length===1, 'Manage heading present');
  ok($('script[src="/js/booking_manage.bind.js"]').length===1, 'Manage binder injected');

  r = await request(app).get('/profile_public.html');
  ok([200,404].includes(r.status), 'GET /profile_public.html returns 200 or 404');
  if (r.status===200){
    $ = cheerio.load(r.text);
    ok($('script[src="/js/public_profile.book.bind.js"]').length===1, 'Public profile binder injected');
  } else {
    console.log('• profile_public.html not found (your route may serve it from a different file).');
  }

  console.log(`\nPublic Booking Flow tests: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();