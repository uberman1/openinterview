export async function api(path, { method='GET', body, token } = {}){
  const headers = { 'content-type': 'application/json' };
  const t = token || (typeof window !== 'undefined' ? window.localStorage.getItem('token') : '');
  if (t) headers['authorization'] = 'Bearer ' + t;
  const res = await fetch(`/api/v1${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    let msg = res.status + ' ' + res.statusText;
    try { const j = await res.json(); if (j?.error?.message) msg = j.error.message; } catch {}
    throw new Error(msg);
  }
  try { return await res.json(); } catch { return null; }
}