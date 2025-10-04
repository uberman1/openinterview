
import request from "supertest";
import app from "./index.js";

const log = (...a)=>console.log(...a);
let pass=0, fail=0;
function ok(cond, msg){ if(cond){pass++; log("✔", msg)} else { fail++; log("✘", msg)} }

(async function run(){
    // 0) Guardrail: checksum verification
    import fs from 'fs';
    import crypto from 'crypto';
    function sha256(p){ return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
    ok(sha256('./public/login.html') === 'b930f8d8e24ca5d4444e6187830d651261912a635ebdd3f07305edcf571dd42b', 'Guardrail: login.html checksum matches');
    ok(sha256('./public/css/theme.css') === 'a87605d2d1ebf9461f0458b1eee3a681a367dd84ad868c160e770c2ccedb46dc', 'Guardrail: theme.css checksum matches');

  log("\nOpenInterview • Module 1 (Login) • Self-test\n-------------------------------------------");

  // 1) Static login page
  const res1 = await request(app).get("/login.html");
  ok(res1.status === 200 && /Sign in/.test(res1.text), "serves /login.html");

  // 2) Auth happy path (user)
  const res2 = await request(app).post("/api/auth/login").send({email:"user@example.com"});
  ok(res2.status === 200 && res2.body?.user?.role === "user", "POST /api/auth/login returns user role");

  // 3) Auth happy path (admin)
  const res3 = await request(app).post("/api/auth/login").send({email:"admin@example.com"});
  ok(res3.status === 200 && res3.body?.user?.role === "admin", "POST /api/auth/login returns admin role");

  // 4) Public profile stub
  const res4 = await request(app).get("/api/public/profile/ethan");
  ok(res4.status === 200 && res4.body?.name, "GET public profile by handle");

  // 5) Admin users stub
  const res5 = await request(app).get("/api/admin/users");
  ok(res5.status === 200 && Array.isArray(res5.body), "GET admin users");

  log(`\n
    // Guardrail: index.html checksum
    ok(sha256('./public/index.html') === 'c6c62c874b8329b376ff9922023b427fee2ff7ca6436891bd9429cab59594b0c', 'Guardrail: index.html checksum matches');

    // 0b) Root route should redirect to /login.html
    const r0 = await request(app).get('/');
    ok([301,302].includes(r0.status) && (r0.headers.location||'').endsWith('/login.html'), 'Root redirects to /login.html');

    // 0c) index.html contains redirect script for legacy hash routes
    const r1 = await request(app).get('/index.html');
    ok(r1.status === 200 && r1.text.includes("location.replace('/login.html')"), 'index.html contains hash-route redirect');
    
    Summary: ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
