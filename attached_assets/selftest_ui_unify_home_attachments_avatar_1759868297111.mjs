import request from 'supertest';
import app from '../index.js';
import * as cheerio from 'cheerio';

let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

(async function run(){
  const pages = ['/home.html','/profiles.html','/uploads.html','/availability.html','/subscription.html','/password.html','/profile_edit.html'];
  for (const p of pages){
    const r = await request(app).get(p);
    ok([200,404].includes(r.status), `GET ${p} returns 200/404`);
    if (r.status===200){
      const $ = cheerio.load(r.text);
      ok($('script[src="/js/menu.unify.bind.js"]').length===1, `${p} has menu.unify.bind.js`);
      if (p==='/home.html'){
        ok($('script[src="/js/home.attachments.bind.js"]').length===1, 'home.html has home.attachments.bind.js');
        ok($('script[src="/js/avatar_edit.bind.js"]').length===1, 'home.html has avatar_edit.bind.js');
      }
      if (p==='/profile_edit.html'){
        ok($('script[src="/js/avatar_edit.bind.js"]').length===1, 'profile_edit.html has avatar_edit.bind.js');
      }
    } else {
      console.log(`• ${p} not present in /public (skipped content checks)`);
    }
  }
  console.log(`\nUI unify + attachments + avatar tests: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();