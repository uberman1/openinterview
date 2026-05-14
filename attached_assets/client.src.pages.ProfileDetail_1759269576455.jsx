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

  if (err) return <p style={{color:'crimson'}}>Error: {err.message}</p>
  if (!p) return <p>Loading…</p>

  return (
    <div>
      <h2>Profile {p.name}</h2>
      <p><b>Email:</b> {p.email}</p>
      <p><b>Created:</b> {new Date(p.createdAt).toLocaleString()}</p>
      <div style={{display:'flex', gap:8, alignItems:'center', marginTop:12}}>
        <h3 style={{marginRight:'auto'}}>Interviews</h3>
        <button onClick={()=> navigate(`/profiles/${p.id}/interviews/new`)}>New Interview</button>
      </div>
      <ul>
        {items.map(it=> <li key={it.id}>{it.title} <small>({new Date(it.createdAt).toLocaleString()})</small></li>)}
        {items.length===0 && <li>No interviews yet.</li>}
      </ul>
    </div>
  )
}
