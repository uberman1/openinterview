
import request from 'supertest';
import fs from 'fs';
import crypto from 'crypto';
import app from './index.js';

let pass=0, fail=0;
const ok=(c,m)=>{ if(c){pass++; console.log('✔',m)} else {fail++; console.log('✘',m)} };
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const checks = {"public/css/theme.css": "6e255506154d0a208e1c0e660bac49706c6199ded30348809510bed8de701675", "public/profile.html": "dd65df31fe6f8600ecc82645d79d3edf2fd87365bceda02ab19581e990959f18", "public/availability.html": "b184370a2d29ea26dd5f95576b47d5f8856e33c75d0018b6302867942f48a9bc", "public/profiles.html": "43e23f5456ca166fb4bf2b84e690b813f4f52ef1e3ee232ea86d724cb3eeb3ed", "public/profile_edit.html": "e2879d35c88257a21a78524f32f4ee2ba1b22598ce30fb336cad307a974a9853", "public/uploads.html": "40461d6f3d14c58e8561d09fab4e436c05cb3c94bf699fc9b57faf001c5e1bab", "public/subscription.html": "c7194fc1c3a3f74b3fe02c5179f1939fca91860357152be8789ae2ce36a04e93", "public/password.html": "e05b169d19456f2049f1ec4711b88b8da5788473ea0ee6e2e8cf8cc84e87f2d0", "public/public_profile.html": "a3953943b11bd5ed60227efa3aaa99a1e2481e200573b5d085becfc05a603fc6", "public/js/enhance_profile_edit.js": "831ef2de0b80a229baf90d6068489806245636d4a4bf700cf158c3e88bf2a5db"};
for (const [p,h] of Object.entries(checks)) ok(sha256('./'+p)===h, 'Guardrail '+p);

const me={id:'u1'};
let res = await request(app).get('/api/profiles').query({userId:me.id});
ok(res.status===200 && res.body.length>=2, 'profiles list');

const other = res.body.find(p=>!p.isDefault) || res.body[0];
let flip = await request(app).patch('/api/profiles/'+other.id+'/default');
ok(flip.status===200 && flip.body.isDefault===true, 'set default');
let def = await request(app).get('/api/profiles/default').query({userId:me.id});
ok(def.status===200 && def.body.id===other.id, 'get default');

let files = await request(app).get('/api/files').query({userId:me.id});
ok(files.status===200 && files.body.length>0, 'files list');
let some = files.body[0];
let pr = await request(app).patch('/api/profiles/'+other.id+'/resume').send({fileId: some.id});
ok(pr.status===200 && pr.body.resumeFileId===some.id, 'set resume');
let att = await request(app).post('/api/profiles/'+other.id+'/attachments').send({fileId: some.id});
ok(att.status===200 && att.body.attachmentFileIds.includes(some.id), 'assign attachment');
let att2 = await request(app).delete('/api/profiles/'+other.id+'/attachments/'+some.id);
ok(att2.status===200 && !att2.body.attachmentFileIds.includes(some.id), 'unassign attachment');

let pub = await request(app).get('/api/public/profile/'+other.handle);
ok(pub.status===200 && pub.body.handle===other.handle, 'public profile by handle');

let save = await request(app).post('/api/availability').send({userId:me.id, weekly:{Mon:['09:00']}, overrides:[]});
ok(save.status===200 && save.body.ok===true, 'save availability');
let av2 = await request(app).get('/api/availability').query({userId:me.id});
ok(av2.status===200 && av2.body.weekly.Mon.includes('09:00'), 'get availability');

console.log(`\nSummary: ${pass} passed, ${fail} failed\n`);
process.exit(fail?1:0);
