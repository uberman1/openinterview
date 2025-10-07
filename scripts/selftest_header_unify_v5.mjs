import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

(async function(){
  let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++; console.log('✔',m);} else {fail++; console.log('✘',m);} };

  const pages = ['/home.html','/uploads.html','/subscription.html','/password.html','/profiles.html','/availability.html'];
  for (const p of pages){
    const r = await request(app).get(p);
    ok([200,404].includes(r.status), `GET ${p} returns 200/404`);
    if (r.status===200){
      const $ = cheerio.load(r.text);
      ok($('script[src="/js/header.unify.v5.bind.js"]').length===1, `${p} includes header binder v5`);
    }
  }
  console.log(`\nHeader Unifier v5 tests: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
