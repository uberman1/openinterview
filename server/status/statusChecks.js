// server/status/statusChecks.js
// Isolated HTTP and DB probes used by the status generation engine.
// No coupling to core app business logic, auth, or interview flows.

export const THRESHOLDS = {
  WARN_MS: 700,    // response time warning boundary
  CRIT_MS: 2000,   // response time critical boundary
  TIMEOUT_MS: 5000, // max wait per check before giving up
};

function baseUrl() {
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

// ─── Generic HTTP probe ───────────────────────────────────────────────────────

async function httpProbe(name, url, validateFn = null) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(THRESHOLDS.TIMEOUT_MS),
      headers: { 'User-Agent': 'OpenInterview-StatusChecker/1.0' },
    });
    const ms = Date.now() - start;
    const ok = validateFn ? await validateFn(res) : res.ok;
    return {
      name,
      url,
      success: ok,
      statusCode: res.status,
      ms,
    };
  } catch (err) {
    const ms = Date.now() - start;
    return {
      name,
      url,
      success: false,
      statusCode: null,
      ms,
      error: err?.message ?? 'Request timed out or connection refused',
    };
  }
}

// ─── Individual check functions ───────────────────────────────────────────────

/**
 * App Availability Check
 * Verifies the main application surface responds with an HTTP success.
 */
export async function checkApp() {
  return httpProbe('app_availability', `${baseUrl()}/`);
}

/**
 * Website Load Check
 * Verifies the public-facing web surface responds. Shares the same origin
 * in this environment; distinct logical service for rollup purposes.
 */
export async function checkWebsite() {
  return httpProbe('website_load', `${baseUrl()}/`);
}

/**
 * API Health Check
 * Verifies the application API responds with a valid success payload.
 * Targets the lightweight readiness endpoint to avoid side effects.
 */
export async function checkApi() {
  return httpProbe('api_health', `${baseUrl()}/api/v1/ready`, async (res) => {
    if (!res.ok) return false;
    try {
      const body = await res.json();
      return body?.ready === true;
    } catch {
      return false;
    }
  });
}

/**
 * Database Connectivity Check
 * Runs the minimum viable query against the existing shared pool.
 * Imports pool lazily to avoid initialization-order issues.
 * Does not modify schema or touch application tables.
 */
export async function checkDatabase() {
  const start = Date.now();
  try {
    // Lazy import — pool is initialized by the time routes are called
    const { pool } = await import('../db/pg-client.js');
    if (!pool) {
      return { name: 'db_connectivity', success: false, ms: 0, error: 'Database pool not yet initialized' };
    }
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      const ms = Date.now() - start;
      return { name: 'db_connectivity', success: true, ms };
    } finally {
      client.release();
    }
  } catch (err) {
    const ms = Date.now() - start;
    return {
      name: 'db_connectivity',
      success: false,
      ms,
      error: err?.message ?? 'Database connectivity check failed',
    };
  }
}
