// /client/src/pages/InterviewNew.jsx
import React from 'react'
import { api } from '../api'

export default function InterviewNew({ profileId, navigate }){
  const [title, setTitle] = React.useState('')
  const [err, setErr] = React.useState(null)
  const [saving, setSaving] = React.useState(false)

  async function submit(e){
    e.preventDefault(); setErr(null); setSaving(true)
    try{
      await api.createInterview({ profileId, title })
      navigate(`/profiles/${profileId}`)
    }catch(e){ setErr(e) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit}>
      <h2>New Interview</h2>
      <label>Title<br/><input value={title} onChange={e=> setTitle(e.target.value)} required /></label><br/>
      {err && <p style={{color:'crimson'}}>{err.message}</p>}
      <button disabled={saving}>Create</button>
      <button type="button" onClick={()=> navigate(`/profiles/${profileId}`)} style={{marginLeft:8}}>Cancel</button>
    </form>
  )
}
