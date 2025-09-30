// /server/db.js
// minimal in-memory store for Module 1
const state = {
  profiles: new Map(), // id -> {id, name, email, createdAt, updatedAt}
  interviews: new Map(), // id -> {id, profileId, title, createdAt}
}

let seq = 0
function id(){ seq += 1; return String(seq).padStart(6, '0') }

export const db = {
  createProfile(data){
    const now = new Date().toISOString()
    const record = { id: id(), name: data.name, email: data.email.toLowerCase(), createdAt: now, updatedAt: now }
    state.profiles.set(record.id, record)
    return record
  },
  getProfile(id){ return state.profiles.get(id) || null },
  updateProfile(id, patch){
    const cur = state.profiles.get(id)
    if (!cur) return null
    const next = { ...cur, ...patch, updatedAt: new Date().toISOString() }
    state.profiles.set(id, next)
    return next
  },
  listProfiles({ q='', limit=20, cursor=null }){
    // order by id asc for simplicity
    const arr = Array.from(state.profiles.values())
      .filter(p => q ? (p.name.toLowerCase().includes(q) || p.email.includes(q)) : true)
      .sort((a,b)=> a.id.localeCompare(b.id))
    let start = 0
    if (cursor){
      const i = arr.findIndex(p=> p.id === cursor)
      start = i >= 0 ? i+1 : 0
    }
    const slice = arr.slice(start, start+limit)
    const nextCursor = slice.length && (start+limit) < arr.length ? slice[slice.length-1].id : null
    return { items: slice, nextCursor }
  },
  createInterview(data){
    const now = new Date().toISOString()
    const record = { id: id(), profileId: data.profileId, title: data.title, createdAt: now }
    state.interviews.set(record.id, record)
    return record
  },
  listInterviewsByProfile(profileId){
    return Array.from(state.interviews.values()).filter(r=> r.profileId === profileId).sort((a,b)=> a.id.localeCompare(b.id))
  }
}
