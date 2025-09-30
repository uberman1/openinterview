// /client/src/pages/Login.jsx
import React from 'react'
import { api } from '../api'
import { authStore } from '../auth'

export default function Login({ navigate }){
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState(null)

  async function submit(e){
    e.preventDefault(); setErr(null); setLoading(true)
    try{
      const j = await api.auth.login()
      authStore.token = j.token
      navigate('/profiles')
    }catch(e){ setErr(e) } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} data-testid="form-login">
      <h2 data-testid="heading-login">Login</h2>
      <p data-testid="text-mock-info">Mock login: no credentials required.</p>
      {err && <p style={{color:'crimson'}} data-testid="error-login">{err.message}</p>}
      <button data-testid="button-login" disabled={loading}>Login</button>
    </form>
  )
}
