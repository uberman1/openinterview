import test from 'node:test';
import assert from 'node:assert/strict';
const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';

test('v1 auth guards protected endpoints', async () => {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ email:'test@example.com', password:'test' })
  });

  if (res.ok) {
    const { token } = await res.json();
    assert.ok(token, 'token expected from v1 auth');
    const p = await fetch(`${BASE}/api/v1/scheduler/bookings`, {
      headers:{ Authorization: `Bearer ${token}` }
    });
    assert.notEqual(p.status, 401, 'protected route should not be 401 with token');
  } else {
    const p = await fetch(`${BASE}/api/v1/scheduler/bookings`);
    assert.equal(p.status, 401, 'protected route should be 401 without token');
  }
});
