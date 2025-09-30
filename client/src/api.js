// /client/src/api.js
const BASE = '/api/v1'

async function request(path, options = {}){
  const res = await fetch(BASE + path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers||{}) }
  })
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok){
    const msg = data?.error?.message || (typeof data === 'string' ? data : 'Request failed')
    const code = data?.error?.code || res.status
    const err = new Error(msg); err.status = res.status; err.code = code; err.body = data
    throw err
  }
  return data
}

export const api = {
  health(){ return request('/health') },

  // Profiles
  createProfile(body){ return request('/profiles', { method: 'POST', body: JSON.stringify(body) }) },
  getProfile(id){ return request('/profiles/' + encodeURIComponent(id)) },
  listProfiles(q=''){ 
    const qs = q ? ('?q=' + encodeURIComponent(q)) : ''
    return request('/profiles' + qs) 
  },
  updateProfile(id, patch){ return request('/profiles/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(patch) }) },

  // Interviews
  createInterview(body){ return request('/interviews', { method: 'POST', body: JSON.stringify(body) }) },
  listInterviews(profileId){ return request('/interviews?profileId=' + encodeURIComponent(profileId)) },
}
