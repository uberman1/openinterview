import fs from 'fs';
import fetch from 'node-fetch';

async function run() {
  const base = 'http://localhost:5050/api/v1';
  const results = [];

  const push = (name, ok, extra={}) => results.push({ name, ok, ...extra });

  try {
    // upload
    const fd = new FormData();
    fd.append('file', new Blob(["hello"], { type: 'application/pdf' }), 'a.pdf');
    let r = await fetch(`${base}/uploads`, { method: 'POST', body: fd });
    const j = await r.json();
    const id = j?.upload?.id;
    push('upload.create', r.status===201, { status: r.status });

    r = await fetch(`${base}/uploads/${id}/meta`);
    push('upload.meta', r.status===200, { status: r.status });

    r = await fetch(`${base}/uploads/${id}`, { method: 'DELETE' });
    push('upload.delete', r.status===204, { status: r.status });
  } catch(e) {
    console.error(e);
  }

  fs.mkdirSync('logs', { recursive: true });
  fs.writeFileSync('logs/selftest.mod-05.json', JSON.stringify({ passed: results.every(r=>r.ok), checks: results, ts: new Date().toISOString() }, null, 2));
  fs.writeFileSync('logs/mod-05.log', results.map(r=>`${r.name}: ${r.ok}`).join("\n"));
}

run();
