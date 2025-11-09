
import request from 'supertest';
import fs from 'fs';
import crypto from 'crypto';
import app from './index.js';
import assert from "node:assert/strict";

let pass=0, fail=0;
const ok=(c,m)=>{ if(c){pass++; console.log('✔',m)} else {fail++; console.log('✘',m)} };
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const spec = JSON.parse(fs.readFileSync("tests/expected-hashes.json", "utf8"));

const normalize = (s) =>
  s.replace(/\r\n/g, "\n")
   .replace(/[ \t]+$/gm, "");

for (const [path, expected] of Object.entries(spec.hashes)) {
  const canon = normalize(fs.readFileSync(path, "utf8"));
  const actual = crypto.createHash("sha256").update(canon, "utf8").digest("hex");
  assert.equal(actual, expected, `Hash mismatch for ${path}`);
}

console.log("Guardrail hash checks passed at", spec.updatedAt);

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
