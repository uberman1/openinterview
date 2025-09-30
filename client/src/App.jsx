// /client/src/App.jsx
import React from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { useHashLocation, matchRoute } from './router'
import Dashboard from './pages/Dashboard'
import ProfilesList from './pages/ProfilesList'
import ProfileNew from './pages/ProfileNew'
import ProfileDetail from './pages/ProfileDetail'
import InterviewNew from './pages/InterviewNew'
import NotFound from './pages/NotFound'

export default function App(){
  const [path, navigate] = useHashLocation()

  const renderRoute = ()=>{
    if (path === '/' || path === '') return <Dashboard/>
    if (path === '/profiles') return <ProfilesList navigate={navigate}/>
    if (path === '/profiles/new') return <ProfileNew navigate={navigate}/>
    let m
    if (m = matchRoute('/profiles/:id', path)) return <ProfileDetail id={m.id} navigate={navigate}/>
    if (m = matchRoute('/profiles/:id/interviews/new', path)) return <InterviewNew profileId={m.id} navigate={navigate}/>
    return <NotFound/>
  }

  return (
    <ErrorBoundary>
      <div style={{display:'grid', gridTemplateColumns:'220px 1fr', minHeight:'100vh', fontFamily:'system-ui, -apple-system, Segoe UI, Roboto'}}>
        <aside style={{background:'#0f172a', color:'#cbd5e1', padding:16}}>
          <h3 style={{marginTop:0}} data-testid="heading-app">OpenInterview</h3>
          <nav style={{display:'grid', gap:8}}>
            <a href="#/" style={{color:'#93c5fd'}} data-testid="nav-dashboard">Dashboard</a>
            <a href="#/profiles" style={{color:'#93c5fd'}} data-testid="nav-profiles">Profiles</a>
          </nav>
        </aside>
        <main style={{padding:24}}>
          {renderRoute()}
        </main>
      </div>
    </ErrorBoundary>
  )
}
