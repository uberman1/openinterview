
import request from 'supertest';
import fs from 'fs';
import crypto from 'crypto';
import app from './index.js';

const log = (...a)=>console.log(...a);
let pass=0, fail=0;
function ok(cond, msg){ if(cond){pass++; log('✔', msg)} else { fail++; log('✘', msg)} }

function sha256(p){ return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
ok(sha256('./public/login.html') === '4823cd761998d12adf931159295b147f42a94aa4485b1d77cfa2941fffe6b083', 'Guardrail: login.html checksum matches');
ok(sha256('./public/css/theme.css') === '1aab471becba1c60e78072414ff5ffc8b468caa24118697baec00ad23eb2ad0b', 'Guardrail: theme.css checksum matches');
ok(sha256('./public/index.html') === 'f95e08c2b2156c7364acfe30b3b5df0a68ac9904877517cbdfe2ed134b942112', 'Guardrail: index.html checksum matches');

const res1 = await request(app).get('/login.html');
ok(res1.status === 200 && /Sign in/.test(res1.text), 'serves /login.html');

const res2 = await request(app).post('/api/auth/login').send({email:'user@example.com'});
ok(res2.status === 200 && res2.body?.user?.role === 'user', 'auth returns user role');

const res3 = await request(app).post('/api/auth/login').send({email:'admin@example.com'});
ok(res3.status === 200 && res3.body?.user?.role === 'admin', 'auth returns admin role');

const res4 = await request(app).get('/api/public/profile/ethan');
ok(res4.status === 200 && res4.body?.name, 'public profile returns');

const res5 = await request(app).get('/api/admin/users');
ok(res5.status === 200 && Array.isArray(res5.body), 'admin users returns');

const r0 = await request(app).get('/');
ok([301,302].includes(r0.status) && (r0.headers.location||'').endsWith('/login.html'), 'root redirects to /login.html');

const r1 = await request(app).get('/index.html');
ok(r1.status === 200 && r1.text.includes("location.replace('/login.html')"), 'index.html contains legacy hash redirect');
ok(r1.text.includes('http-equiv="refresh"'), 'index.html includes meta refresh fallback');

console.log(`\nSummary: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
