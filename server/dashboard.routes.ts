import type { Express } from 'express';
import { requireAuth } from './middleware/requireAuth';
import { load } from './data/fsStore';

let paymentsMock: any = null;
try { paymentsMock = require('./payments.mock'); } catch {}

export function mountDashboardRoutes(app: Express, base: string) {
  app.get(`${base}/dashboard`, requireAuth as any, async (req, res) => {
    const anyReq = req as any;
    const user = anyReq.user || null;
    const plan = paymentsMock && paymentsMock.paymentsMock && user?.id ? paymentsMock.paymentsMock.getUserPlan(user.id) : 'basic';
    const profiles = await load('profiles.json', [] as any[]);
    const interviews = await load('interviews.json', [] as any[]);
    return res.json({ user: user ? { id: user.id, email: user.email } : null, plan, profiles, interviews });
  });
}
