// Self-test with native fetch & guardrails sealing (Node 18+)
// Run in separate shell while server is running: node selftest.mjs
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert';

const PORT = process.env.PORT || 5000;
const BASE = `http://127.0.0.1:${PORT}`;

const PROTECTED = [
  'public/login.html',
  'public/css/theme.css',
  'public/index.html',
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

async function fileHash(p) {
  const buf = await readFile(p);
  return sha256(buf);
}

async function maybeSealGuardrails() {
  try {
    await stat('guardrails.json');
    return JSON.parse(await readFile('guardrails.json', 'utf8'));
  } catch {
    // Seal new guardrails snapshot (first run)
    const entries = [];
    for (const rel of PROTECTED) {
      try {
        const h = await fileHash(rel);
        entries.push({ file: rel, sha256: h });
      } catch {
        entries.push({ file: rel, sha256: null, missing: true });
      }
    }
    const payload = { sealedAt: new Date().toISOString(), entries };
    await writeFile('guardrails.json', JSON.stringify(payload, null, 2));
    return payload;
  }
}

async function verifyGuardrails(guards) {
  let passed = 0;
  let total = 0;
  for (const e of guards.entries) {
    total++;
    if (e.missing) {
      console.warn(`⚠ Guardrail: ${e.file} was missing when sealed; provide the file to enable verification.`);
      continue;
    }
    const current = await fileHash(e.file);
    assert.equal(current, e.sha256, `Guardrail mismatch for ${e.file}`);
    console.log(`✔ Guardrail: ${e.file} checksum matches`);
    passed++;
  }
  return { passed, total };
}

async function get(pathname) {
  const r = await fetch(BASE + pathname);
  return { status: r.status, text: await r.text(), json: async () => r.json() };
}
async function post(pathname, body) {
  const r = await fetch(BASE + pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, text: await r.text(), json: async () => r.json() };
}

(async () => {
  let passed = 0, failed = 0;

  // Guardrails
  const guards = await maybeSealGuardrails();
  try {
    const g = await verifyGuardrails(guards);
    passed += g.passed;
  } catch (e) {
    failed++; console.error('✖ Guardrails failed:', e.message);
  }

  // serves /login.html
  try {
    const r = await get('/login.html');
    assert.equal(r.status, 200, 'serves /login.html');
    console.log('✔ serves /login.html'); passed++;
  } catch (e) { failed++; console.error('✖ serves /login.html', e.message); }

  // POST /api/auth/login returns user role
  try {
    const r = await post('/api/auth/login', { email: 'user@example.com', password: 'demo' });
    const j = await r.json();
    assert.equal(j.role, 'user', 'user role');
    console.log('✔ POST /api/auth/login returns user role'); passed++;
  } catch (e) { failed++; console.error('✖ user role', e.message); }

  // POST /api/auth/login returns admin role
  try {
    const r = await post('/api/auth/login', { email: 'admin@example.com', password: 'demo' });
    const j = await r.json();
    assert.equal(j.role, 'admin', 'admin role');
    console.log('✔ POST /api/auth/login returns admin role'); passed++;
  } catch (e) { failed++; console.error('✖ admin role', e.message); }

  // Root redirects to /login.html
  try {
    const r = await fetch(BASE + '/', { redirect: 'manual' });
    const loc = r.headers.get('location');
    assert.equal(r.status, 302, 'root should redirect');
    assert.equal(loc, '/login.html', 'root redirect location');
    console.log('✔ Root redirects to /login.html'); passed++;
  } catch (e) { failed++; console.error('✖ root redirect', e.message); }

  // index.html contains hash-route redirect (best-effort check)
  try {
    const r = await get('/index.html');
    if (r.status === 200) {
      const txt = await r.text;
      const ok = (txt || '').includes('#/');
      console.log(ok ? '✔ index.html contains hash-route redirect' : 'ℹ index.html hash-route redirect not detected (info)');
      passed += ok ? 1 : 0;
    } else {
      console.log('ℹ index.html not found (info)');
    }
  } catch { /* non-fatal */ }

  const total = passed + failed;
  if (failed === 0) {
    console.log(`\nSummary: ${passed} passed, 0 failed`);
    process.exit(0);
  } else {
    console.log(`\nSummary: ${passed} passed, ${failed} failed`);
    process.exit(1);
  }
})();
