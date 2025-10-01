// client/src/components/UpgradeButton.jsx
import { useState } from 'react';

export default function UpgradeButton({ userId='demo-user', planId='pro' }){
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('basic');

  async function startCheckout(){
    const r = await fetch('/api/v1/payments/checkout', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ userId, planId })
    });
    const j = await r.json();
    setSession(j);
    // In a real app, you would redirect to j.url; here we simulate webhook:
    await fetch('/api/v1/payments/webhook', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify({ sessionId: j.sessionId, event: 'checkout.session.completed' })
    });
    const s = await fetch(`/api/v1/payments/session/${j.sessionId}`).then(r=>r.json());
    setStatus(s.status === 'paid' ? 'pro' : 'basic');
  }

  return (
    <div>
      <button onClick={startCheckout} data-testid="button-upgrade">Upgrade to Pro</button>
      {session && <div data-testid="text-session">Checkout session: {session.sessionId}</div>}
      <div data-testid="text-plan-status">Plan status: {status}</div>
    </div>
  );
}
