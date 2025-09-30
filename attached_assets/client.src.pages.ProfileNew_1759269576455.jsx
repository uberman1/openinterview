// /client/src/pages/ProfileNew.jsx
import React from 'react'
import { api } from '../api'

export default function ProfileNew({ navigate }){
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [err, setErr] = React.useState(null)
  const [saving, setSaving] = React.useState(false)

  async function submit(e){
    e.preventDefault(); setErr(null); setSaving(true)
    try{
      const j = await api.createProfile({ name, email })
      navigate('/profiles/' + j.profile.id)
    }catch(e){ setErr(e) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit}>
      <h2>New Profile</h2>
      <label>Name<br/><input value={name} onChange={e=> setName(e.target.value)} required /></label><br/>
      <label>Email<br/><input value={email} onChange={e=> setEmail(e.target.value)} required type="email" /></label><br/>
      {err && <p style={{color:'crimson'}}>{err.message}</p>}
      <button disabled={saving}>Create</button>
      <button type="button" onClick={()=> navigate('/profiles')} style={{marginLeft:8}}>Cancel</button>
    </form>
  )
}
