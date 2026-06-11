import type { Express } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';
export function serveStaticWithCache(app: Express, publicDir: string){
  const p = path.resolve(publicDir);
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) return;
  app.use((req, res, next) => { if (req.url.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=3600'); next(); });
  app.use(express.static(p));
  app.get('*', (_req, res) => {
    const indexPath = path.join(p, 'index.html');
    if (fs.existsSync(indexPath)) { res.setHeader('Cache-Control', 'no-store'); res.sendFile(indexPath); }
    else res.status(404).end();
  });
}
