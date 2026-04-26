export async function api(path, { method='GET', body, token } = {}){
  const headers = { 'content-type': 'application/json' };
  const t = token || (typeof window !== 'undefined' ? window.localStorage.getItem('token') : '');
  if (t) headers['authorization'] = 'Bearer ' + t;
  const res = await fetch(`/api/v1${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) {
    try { data = await res.json(); } catch {}
  }
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) ? data.error.message : (res.status + ' ' + res.statusText);
    const err = new Error(msg);
    err.status = res.status;
    err.code = (data && data.error && data.error.code) ? data.error.code : String(res.status);
    err.body = data;
    throw err;
  }
  return data != null ? data : null;
}
