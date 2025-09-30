import React from 'react'
import { createRoot } from 'react-dom/client'

function App(){
  const [health, setHealth] = React.useState(null)
  const [error, setError] = React.useState(null)

  async function check(){
    setError(null)
    try{
      const res = await fetch('/api/v1/health')
      const data = await res.json()
      setHealth(data)
    }catch(e){
      setError(String(e))
    }
  }

  React.useEffect(()=>{ check() }, [])

  return (
    <div style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto', padding: 24, maxWidth: 720}}>
      <h1>OpenInterview — Module 0</h1>
      <p>This is the client shell. It pings the API health on load.</p>
      <button onClick={check}>Re-check Health</button>
      {error && <pre style={{color:'crimson'}}>{error}</pre>}
      {health && <pre style={{background:'#f6f8fa', padding:12, borderRadius:8}}>{JSON.stringify(health, null, 2)}</pre>}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App/>)
