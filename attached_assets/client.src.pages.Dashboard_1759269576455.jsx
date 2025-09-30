// /client/src/pages/Dashboard.jsx
import React from 'react'
import { api } from '../api'

export default function Dashboard(){
  const [health, setHealth] = React.useState(null)
  const [err, setErr] = React.useState(null)

  React.useEffect(()=>{
    api.health().then(setHealth).catch(setErr)
  }, [])

  return (
    <div>
      <h1>OpenInterview — Dashboard</h1>
      <p>Welcome. Use the sidebar to manage Profiles & Interviews.</p>
      {err && <p style={{color:'crimson'}}>Health error: {err.message}</p>}
      {health && <pre style={{background:'#111', color:'#0f0', padding:12, borderRadius:8}}>{JSON.stringify(health, null, 2)}</pre>}
    </div>
  )
}
