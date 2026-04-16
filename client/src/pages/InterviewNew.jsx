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
    <form onSubmit={submit} data-testid="form-new-interview">
      <h2 data-testid="heading-new-interview">New Interview</h2>
      <label>Title<br/><input data-testid="input-title" value={title} onChange={e=> setTitle(e.target.value)} required /></label><br/>
      {err && <p style={{color:'crimson'}} data-testid="error-create-interview">{err.message}</p>}
      <button data-testid="button-create" disabled={saving}>Create</button>
      <button data-testid="button-cancel" type="button" onClick={()=> navigate(`/profiles/${profileId}`)} style={{marginLeft:8}}>Cancel</button>
    </form>
  )
}
