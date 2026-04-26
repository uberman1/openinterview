// /client/src/pages/ProfilesList.jsx
import React from 'react'
import { api } from '../api'

export default function ProfilesList({ navigate }){
  const [q, setQ] = React.useState('')
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function load(){
    setLoading(true); setErr(null)
    try{
      const res = await api.listProfiles(q.trim())
      setItems(res.items || [])
    }catch(e){ setErr(e) } finally { setLoading(false) }
  }

  React.useEffect(()=>{ load() }, [])

  return (
    <div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <h2 style={{marginRight:'auto'}} data-testid="heading-profiles">Profiles</h2>
        <input data-testid="input-search" value={q} onChange={e=> setQ(e.target.value)} placeholder="Search name or email" />
        <button data-testid="button-search" onClick={load} disabled={loading}>Search</button>
        <button data-testid="button-new-profile" onClick={()=> navigate('/profiles/new')}>New Profile</button>
      </div>
      {err && <p style={{color:'crimson'}} data-testid="error-profiles">Error: {err.message}</p>}
      {loading ? <p data-testid="text-loading">Loading…</p> : (
        <table style={{width:'100%', marginTop:12}} data-testid="table-profiles">
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Created</th></tr></thead>
          <tbody>
            {items.map(p=> (
              <tr key={p.id} style={{cursor:'pointer'}} onClick={()=> navigate(`/profiles/${p.id}`)} data-testid={`row-profile-${p.id}`}>
                <td data-testid={`text-id-${p.id}`}>{p.id}</td><td data-testid={`text-name-${p.id}`}>{p.name}</td><td data-testid={`text-email-${p.id}`}>{p.email}</td><td data-testid={`text-created-${p.id}`}>{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} data-testid="text-no-profiles">No profiles found.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
