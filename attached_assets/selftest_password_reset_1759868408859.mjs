import request from 'supertest';
import app from '../index.js';

(async function run(){
  let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('✔',m);} else { fail++; console.log('✘',m);} };

  // 1) Forgot
  const email = 'user@example.com';
  let r = await request(app).post('/api/auth/forgot').send({ email });
  ok(r.status===200, 'POST /api/auth/forgot returns 200');

  // 2) Dev fetch last link
  r = await request(app).get('/dev/last-reset').query({ email });
  ok(r.status===200 && r.body?.url, 'Dev endpoint returns reset URL');
  const token = new URL(r.body.url).searchParams.get('token');

  // 3) Validate
  r = await request(app).get('/api/auth/reset/validate').query({ token });
  ok(r.status===200, 'Token validates');

  // 4) Reset
  r = await request(app).post('/api/auth/reset').send({ token, password:'new-secret-123' });
  ok(r.status===200, 'Password reset succeeds');

  // 5) Reuse should fail
  r = await request(app).post('/api/auth/reset').send({ token, password:'again' });
  ok(r.status===410, 'Reusing token is rejected');

  console.log(`\nPassword reset flow tests: ${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();