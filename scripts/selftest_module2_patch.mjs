import request from 'supertest';
import app from '../index.js';

let pass=0, fail=0;
const ok=(c,m)=>{ c ? (pass++, console.log('✔',m)) : (fail++, console.log('✘',m)); };

(async function run(){
  let r1 = await request(app).get('/u/ethan');
  ok(r1.status===200 && /text\/html/.test(r1.headers['content-type']), 'GET /u/ethan serves HTML');

  const list = await request(app).get('/api/profiles').query({userId:'u1'});
  ok(list.status===200 && list.body.length>0, 'profiles list available');
  const pid = list.body[0].id;

  let ru = await request(app)
    .post(`/api/upload/resume/${pid}`)
    .attach('file', Buffer.from('hello resume'), { filename:'resume.txt', contentType:'text/plain' });
  ok(ru.status===200 && ru.body?.profile?.resumeFileId, 'resume upload sets resumeFileId');

  let au = await request(app)
    .post(`/api/upload/attachment/${pid}`)
    .attach('file', Buffer.from('hello attachment'), { filename:'attach.txt', contentType:'text/plain' });
  ok(au.status===200 && (au.body?.profile?.attachmentFileIds||[]).includes(au.body.file.id), 'attachment upload assigns to profile');

  const big6 = Buffer.alloc(6*1024*1024, 0x61);
  let rTooBig = await request(app).post(`/api/upload/resume/${pid}`).attach('file', big6, { filename:'big.pdf', contentType:'application/pdf' });
  ok(rTooBig.status===413, 'resume >5MB rejected');

  const big26 = Buffer.alloc(26*1024*1024, 0x61);
  let aTooBig = await request(app).post(`/api/upload/attachment/${pid}`).attach('file', big26, { filename:'bigdeck.pdf', contentType:'application/pdf' });
  ok(aTooBig.status===413, 'attachment >25MB rejected');

  console.log(`\nSummary: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
