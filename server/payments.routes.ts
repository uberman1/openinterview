// server/payments.routes.ts
import type { Express } from 'express';
import { paymentsMock } from './payments.mock';

export function mountPaymentsRoutes(app: Express, base: string){
  app.post(`${base}/payments/checkout`, (req, res)=>{
    const { planId, userId } = req.body || {};
    if (!planId || !userId) return res.status(400).json({ error: 'Missing planId or userId' });
    const { sessionId, url } = paymentsMock.createCheckoutSession({ planId, userId });
    return res.json({ sessionId, url });
  });

  app.get(`${base}/payments/session/:id`, (req, res)=>{
    const s = paymentsMock.getSession(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    return res.json(s);
  });

  app.post(`${base}/payments/webhook`, (req, res)=>{
    const { sessionId, event } = req.body || {};
    if (event === 'checkout.session.completed' && sessionId){
      const ok = paymentsMock.markPaid(sessionId);
      return ok ? res.status(204).end() : res.status(404).end();
    }
    return res.status(400).json({ error: 'Bad event' });
  });
}
