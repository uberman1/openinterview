// server/payments.mock.ts
import { randomUUID } from 'crypto';

type Status = 'open'|'paid'|'expired';
type Session = { id: string; status: Status; planId: string; userId: string };

const sessions = new Map<string, Session>();
const plans = new Map<string, string>(); // userId -> planId

export const paymentsMock = {
  createCheckoutSession({ planId, userId }: { planId: string, userId: string }) {
    const id = randomUUID();
    const ses: Session = { id, status: 'open', planId, userId };
    sessions.set(id, ses);
    return { sessionId: id, url: `/checkout/${id}` };
  },
  getSession(sessionId: string) {
    const ses = sessions.get(sessionId);
    if (!ses) return null;
    return { status: ses.status, planId: ses.planId, userId: ses.userId };
  },
  markPaid(sessionId: string) {
    const ses = sessions.get(sessionId);
    if (!ses) return false;
    ses.status = 'paid';
    sessions.set(sessionId, ses);
    plans.set(ses.userId, ses.planId);
    return true;
  },
  getUserPlan(userId: string){
    return plans.get(userId) || 'basic';
  }
}
