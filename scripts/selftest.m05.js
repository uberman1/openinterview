import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const MOD = '05';
const PORT = '5050';
const base = `http://127.0.0.1:${PORT}/api/v1`;

const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logPath = path.join(logsDir, 'mod-05.log');
const jsonPath = path.join(logsDir, 'selftest.mod-05.json');

const log = (line) => fs.appendFileSync(logPath, line + '\n');
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const result = { checks: [], passed: false, ts: new Date().toISOString(), module: MOD };
  log(`[selftest m${MOD}] starting server...`);

  const distIndex = path.resolve(process.cwd(), 'dist', 'index.js');
  if (!fs.existsSync(distIndex)) {
    log('[selftest] dist/index.js not found. Running build first...');
    await new Promise((resolve) => {
      const build = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
      build.on('close', resolve);
    });
  }

  const srv = spawn('node', ['dist/index.js'], {
    env: { ...process.env, PORT, NODE_ENV: 'test' }
  });
  srv.stdout.on('data', d => log(String(d).trim()));
  srv.stderr.on('data', d => log(String(d).trim()));
  await wait(1200);

  try {
    // Test file upload
    const fd = new FormData();
    const pdfBlob = new Blob(['hello'], { type: 'application/pdf' });
    fd.append('file', pdfBlob, 'a.pdf');
    
    let r = await fetch(`${base}/uploads`, { method: 'POST', body: fd });
    const j = await r.json();
    const id = j?.upload?.id;
    result.checks.push({ name: 'upload.create', ok: r.status === 201, status: r.status });

    // Test get metadata
    r = await fetch(`${base}/uploads/${id}/meta`);
    result.checks.push({ name: 'upload.meta', ok: r.status === 200, status: r.status });

    // Test delete
    r = await fetch(`${base}/uploads/${id}`, { method: 'DELETE' });
    result.checks.push({ name: 'upload.delete', ok: r.status === 204, status: r.status });

    // Test that deleted file returns 404
    r = await fetch(`${base}/uploads/${id}/meta`);
    result.checks.push({ name: 'upload.delete_verify', ok: r.status === 404, status: r.status });

  } catch (e) {
    log(`[selftest] error: ${e.message}`);
    result.checks.push({ name: 'upload.error', ok: false, error: String(e) });
  }

  srv.kill('SIGINT');
  result.passed = result.checks.every(c => c.ok);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  console.log(result.passed ? 'ALL CHECKS PASSED' : 'CHECKS FAILED, see logs/selftest.*');
  process.exit(result.passed ? 0 : 1);
}

run();
