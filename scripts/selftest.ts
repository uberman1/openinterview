// Simple self-test runner for Module 0
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logPath = path.join(logsDir, 'selftest.log');
const jsonPath = path.join(logsDir, 'selftest.json');

const log = (line: string) => fs.appendFileSync(logPath, line + '\n');

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const result = { checks: [] as any[], passed: false, ts: new Date().toISOString() };

  // 1) Boot API
  log('[selftest] starting server...');
  const srv = spawn('node', ['dist/index.js'], { 
    env: { ...process.env, PORT: '5000', NODE_ENV: 'test' } 
  });
  srv.stdout.on('data', d => log(String(d).trim()));
  srv.stderr.on('data', d => log(String(d).trim()));
  await wait(2000); // give time to start

  // 2) Health check
  let healthOk = false;
  try {
    const r = await fetch('http://127.0.0.1:5000/api/v1/health');
    const j = await r.json();
    healthOk = j && j.status === 'ok' && j.flags?.useMockAdapters === true;
    result.checks.push({ name: 'api.health', ok: healthOk, detail: j });
  } catch (e) {
    result.checks.push({ name: 'api.health', ok: false, error: String(e) });
  }

  // 3) Create Profile
  let profileId = null;
  try {
    const r = await fetch('http://127.0.0.1:5000/api/v1/profiles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com' })
    });
    const j = await r.json();
    const ok = r.status === 201 && j?.profile?.email === 'test@example.com';
    if (ok) profileId = j.profile.id;
    result.checks.push({ name: 'profiles.create', ok, detail: j });
  } catch (e) {
    result.checks.push({ name: 'profiles.create', ok: false, error: String(e) });
  }

  // 4) List Profiles
  try {
    const r = await fetch('http://127.0.0.1:5000/api/v1/profiles?q=test');
    const j = await r.json();
    const ok = Array.isArray(j.items) && j.items.length >= 1;
    result.checks.push({ name: 'profiles.list', ok, count: j.items?.length });
  } catch (e) {
    result.checks.push({ name: 'profiles.list', ok: false, error: String(e) });
  }

  // 5) Create Interview
  try {
    const r = await fetch('http://127.0.0.1:5000/api/v1/interviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId, title: 'Intro Interview' })
    });
    const j = await r.json();
    const ok = r.status === 201 && j?.interview?.profileId === profileId;
    result.checks.push({ name: 'interviews.create', ok });
  } catch (e) {
    result.checks.push({ name: 'interviews.create', ok: false, error: String(e) });
  }

  // 6) Client build check
  log('[selftest] building client...');
  let buildOk = false;
  const bld = spawn('npm', ['run', 'build']);
  bld.stdout.on('data', d => log(String(d).trim()));
  bld.stderr.on('data', d => log(String(d).trim()));
  await new Promise((resolve) => bld.on('close', resolve));
  buildOk = bld.exitCode === 0;
  result.checks.push({ name: 'client.build', ok: buildOk });

  // Cleanup
  srv.kill('SIGINT');

  result.passed = result.checks.every(c => c.ok);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  log('[selftest] complete. passed=' + result.passed);
  console.log(result.passed ? 'ALL CHECKS PASSED' : 'CHECKS FAILED, see logs/selftest.*');
  process.exit(result.passed ? 0 : 1);
}

run();
