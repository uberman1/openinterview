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
        <h2 style={{marginRight:'auto'}}>Profiles</h2>
        <input value={q} onChange={e=> setQ(e.target.value)} placeholder="Search name or email" />
        <button onClick={load} disabled={loading}>Search</button>
        <button onClick={()=> navigate('/profiles/new')}>New Profile</button>
      </div>
      {err && <p style={{color:'crimson'}}>Error: {err.message}</p>}
      {loading ? <p>Loading…</p> : (
        <table style={{width:'100%', marginTop:12}}>
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Created</th></tr></thead>
          <tbody>
            {items.map(p=> (
              <tr key={p.id} style={{cursor:'pointer'}} onClick={()=> navigate(`/profiles/${p.id}`)}>
                <td>{p.id}</td><td>{p.name}</td><td>{p.email}</td><td>{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4}>No profiles found.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
