// server/status/status.routes.ts
// Isolated debug/inspection routes for the status feature.
// None of these routes modify existing APIs or replace core app routes.
//
// Routes exposed:
//   GET /api/v1/status/snapshot          → run + return a fresh status snapshot
//   GET /api/v1/status/history?service=X&days=N → bar history for one service
//   GET /api/v1/status/events?limit=N    → recent event feed from DB

import type { Express, Request, Response } from 'express';
// @ts-ignore — JS modules, no separate type declarations needed
import { generateStatusSnapshot } from './generateStatusSnapshot.js';
// @ts-ignore
import { getDailyBars, getRecentEvents } from './statusPersistence.js';

export function mountStatusRoutes(app: Express, base: string): void {

  // ── Snapshot — run engine and return full output ───────────────────────────
  app.get(`${base}/status/snapshot`, async (_req: Request, res: Response) => {
    try {
      const snapshot = await generateStatusSnapshot();
      res.json(snapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Status snapshot generation failed', detail: message });
    }
  });

  // ── History — last N days of bar data for one service ─────────────────────
  // Query params:
  //   service  (required) → 'App' | 'Website' | 'API'
  //   days     (optional) → integer, default 45
  app.get(`${base}/status/history`, async (req: Request, res: Response) => {
    const service = (req.query.service as string | undefined)?.trim();
    const days    = Math.min(parseInt((req.query.days as string) || '45', 10) || 45, 365);

    if (!service) {
      res.status(400).json({ error: 'Query param "service" is required. Values: App, Website, API' });
      return;
    }

    try {
      const bars = await getDailyBars(service, days);
      res.json({ service, days, bars });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to fetch history', detail: message });
    }
  });

  // ── Events — recent event feed from DB ────────────────────────────────────
  // Query params:
  //   limit  (optional) → integer, default 20, max 100
  app.get(`${base}/status/events`, async (req: Request, res: Response) => {
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10) || 20, 100);

    try {
      const events = await getRecentEvents(limit);
      res.json({ count: events.length, events });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Failed to fetch events', detail: message });
    }
  });
}
