// Minimal no-deps HTTP server for Module-1 cutover (audio-only engine stub compatible)
// - Serves ./public (unchanged UI)
// - Redirects / -> /login.html
// - Implements POST /api/auth/login
// No external deps: Node 18+

import http from 'node:http';
import { readFile, stat, access } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.webm': 'video/webm',
};

function send(res, status, body, headers={}) {
  const base = { 'content-type': 'text/plain; charset=utf-8' };
  res.writeHead(status, { ...base, ...headers });
  res.end(body);
}

async function serveFile(res, fsPath) {
  try {
    const ext = path.extname(fsPath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const s = await stat(fsPath);
    if (s.isDirectory()) return false;
    res.writeHead(200, { 'content-type': mime });
    createReadStream(fsPath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

async function staticHandler(req, res, urlPath) {
  const fsPath = path.join(PUBLIC_DIR, urlPath);
  if (!fsPath.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  const ok = await serveFile(res, fsPath);
  if (!ok) send(res, 404, 'Not found');
}

async function parseJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

const server = http.createServer(async (req, res) => {
  try {
    cors(res);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const method = req.method || 'GET';

    // Preflight
    if (method === 'OPTIONS') return send(res, 204, '');

    // Root redirect
    if (url.pathname === '/') {
      const loginPath = '/login.html';
      const loginFs = path.join(PUBLIC_DIR, 'login.html');
      if (existsSync(loginFs)) {
        res.writeHead(302, { Location: loginPath });
        return res.end();
      }
      return send(res, 200, 'Upload your UI to ./public (login.html missing)');
    }

    // API: auth/login
    if (url.pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJson(req);
      const email = (body.email || '').toLowerCase().trim();
      let role = 'guest';
      if (email === 'user@example.com') role = 'user';
      if (email === 'admin@example.com') role = 'admin';
      const payload = { role };
      return send(res, 200, JSON.stringify(payload), { 'content-type': 'application/json; charset=utf-8' });
    }

    // Static files from /public
    if (url.pathname.startsWith('/')) {
      // normalize to public root
      const rel = url.pathname.replace(/^\/+/, '');
      const fsPath = path.join(PUBLIC_DIR, rel);
      if (await serveFile(res, fsPath)) return;
      // try index.html if requesting directory path
      if (!path.extname(rel)) {
        const idx = path.join(fsPath, 'index.html');
        if (await serveFile(res, idx)) return;
      }
      return send(res, 404, 'Not found');
    }

    send(res, 404, 'Not found');
  } catch (err) {
    console.error(err);
    send(res, 500, 'Server error');
  }
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Module-1 engine wrapper listening on ${port}`);
});
