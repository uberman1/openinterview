import test from 'node:test';
import assert from 'node:assert/strict';
const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';

test('booking endpoint enforces rate limit (6th => 429)', async () => {
  // Reset rate limiter for a clean slate (dev-only endpoint)
  await fetch(`${BASE}/api/v1/test/reset-rate-limit`, { method:'POST' }).catch(()=>{});

  const t0 = Date.now();
  let lastStatus = 0;
  for (let i = 1; i <= 6; i++) {
    const payload = {
      userId: 'demo-user',
      name: `RL-${t0}-${i}`,
      email: `rl-${t0}-${i}@example.com`,
      startTimeUtc: new Date(t0 + i * 60_000 + 3_600_000).toISOString(),
      endTimeUtc:   new Date(t0 + i * 60_000 + 3_600_000 + 1_800_000).toISOString()
    };
    const r = await fetch(`${BASE}/api/v1/scheduler/book`, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify(payload)
    });
    lastStatus = r.status;
    if (i <= 5) {
      assert.notEqual(r.status, 429, `requests 1-5 should not be 429 (got ${r.status})`);
    }
  }
  assert.equal(lastStatus, 429, '6th request should be rate-limited with 429');
});
