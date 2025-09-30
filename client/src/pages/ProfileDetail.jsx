// /client/src/pages/ProfileDetail.jsx
import React from 'react'
import { api } from '../api'

export default function ProfileDetail({ id, navigate }){
  const [p, setP] = React.useState(null)
  const [items, setItems] = React.useState([])
  const [err, setErr] = React.useState(null)

  async function load(){
    setErr(null)
    try{
      const j = await api.getProfile(id)
      setP(j.profile)
      const list = await api.listInterviews(id)
      setItems(list.items || [])
    }catch(e){ setErr(e) }
  }

  React.useEffect(()=>{ load() }, [id])

  if (err) return <p style={{color:'crimson'}} data-testid="error-profile">Error: {err.message}</p>
  if (!p) return <p data-testid="text-loading">Loading…</p>

  return (
    <div>
      <h2 data-testid="heading-profile">Profile {p.name}</h2>
      <p data-testid="text-email"><b>Email:</b> {p.email}</p>
      <p data-testid="text-created"><b>Created:</b> {new Date(p.createdAt).toLocaleString()}</p>
      <div style={{display:'flex', gap:8, alignItems:'center', marginTop:12}}>
        <h3 style={{marginRight:'auto'}} data-testid="heading-interviews">Interviews</h3>
        <button data-testid="button-new-interview" onClick={()=> navigate(`/profiles/${p.id}/interviews/new`)}>New Interview</button>
      </div>
      <ul data-testid="list-interviews">
        {items.map(it=> <li key={it.id} data-testid={`interview-${it.id}`}>{it.title} <small>({new Date(it.createdAt).toLocaleString()})</small></li>)}
        {items.length===0 && <li data-testid="text-no-interviews">No interviews yet.</li>}
      </ul>
    </div>
  )
}
