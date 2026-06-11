import type { Express } from 'express';
import express from 'express';
import path from 'path';
import fs from 'fs';

export function serveStaticWithCache(app: Express, publicDir: string){
  const p = path.resolve(publicDir);
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) return;
  
  // Set cache headers before serving
  app.use((req, res, next) => {
    if (req.url.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else {
      // For HTML files (including index.html served at /), no caching
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
  
  app.use(express.static(p));
  
  // Catch-all for SPA routing (but not for API routes)
  app.use((req, res, next) => {
    // Only handle GET requests for non-API routes
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }
    const indexPath = path.join(p, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next(); // Let other handlers deal with it
    }
  });
}
