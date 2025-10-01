import type { Express } from 'express';
export function mountOps(app: Express, base: string){
  app.get(`${base}/ready`, (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));
  app.get(`${base}/live`,  (_req, res) => res.json({ live: true, ts: new Date().toISOString() }));
}
