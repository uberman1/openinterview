#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const PORT = process.env.PORT || 3000;
const ROOT = process.env.ROOT || process.cwd();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8'
};

function send(res, code, body, headers={}){
  res.writeHead(code, { 'Cache-Control':'no-store', ...headers });
  res.end(body);
}

function file(res, p){
  try{
    const stat = fs.statSync(p);
    if (stat.isDirectory()) return false;
    const ext = path.extname(p).toLowerCase();
    const data = fs.readFileSync(p);
    send(res, 200, data, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return true;
  }catch{ return false; }
}

const server = http.createServer((req,res)=>{
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname);

  if (/^\/profile\/[^\/]+$/.test(pathname)) pathname = '/index.html';

  if (pathname === '/' || pathname === ''){
    if (fs.existsSync(path.join(ROOT, 'public', 'home.html'))) pathname = '/public/home.html';
    else if (fs.existsSync(path.join(ROOT, 'home.html'))) pathname = '/home.html';
    else pathname = '/index.html';
  }

  let target = path.join(ROOT, pathname);
  if (!fs.existsSync(target)) target = path.join(ROOT, pathname.replace(/^\//,''));

  if (!file(res, target)){
    send(res, 404, `Not Found: ${pathname}`);
  }
});

server.listen(PORT, ()=>{
  console.log(`Static server on http://localhost:${PORT} (root: ${ROOT})`);
});
