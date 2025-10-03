// /client/src/App.jsx (Module 3 patch) — adds auth UI + guards
import React from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { useHashLocation, matchRoute } from './router'
import Dashboard from './pages/Dashboard'
import ProfileEditor from './pages/ProfileEditor'
import ProfilesList from './pages/ProfilesList'
import ProfileNew from './pages/ProfileNew'
import ProfileDetail from './pages/ProfileDetail'
import InterviewNew from './pages/InterviewNew'
import PagesIndex from './pages/PagesIndex'
import ProfilePublic from './pages/ProfilePublic'
import UploadMock from './pages/UploadMock'
import ShareMock from './pages/ShareMock'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import { authStore } from './auth'
import { api } from './api'

export default function App(){
  const [path, navigate] = useHashLocation()
  const [loggedIn, setLoggedIn] = React.useState(authStore.isLoggedIn())

  async function doLogout(){
    try{ await api.auth.logout() }catch{}
    authStore.logout()
    setLoggedIn(false)
    navigate('/login')
  }

  const guard = (el)=> loggedIn ? el : <Login navigate={navigate}/>

  const renderRoute = ()=>{
    if (path === '/' || path === '') return <Dashboard/>
    if (path === '/dashboard') return <Dashboard/>
    if (path === '/login') return <Login navigate={navigate}/>
    if (path === '/profile') return <ProfileEditor/>
    if (path === '/upload') return <UploadMock/>
    if (path === '/pages') return <PagesIndex/>
    if (path === '/profiles') return guard(<ProfilesList navigate={navigate}/>)
    if (path === '/profiles/new') return guard(<ProfileNew navigate={navigate}/>)
    let m
    if (m = matchRoute('/s/:token', path)) return <ShareMock token={m.token}/>
    if (m = matchRoute('/public/profile/:id', path)) return <ProfilePublic/>
    if (m = matchRoute('/profiles/:id', path)) return guard(<ProfileDetail id={m.id} navigate={navigate}/>)
    if (m = matchRoute('/profiles/:id/interviews/new', path)) return guard(<InterviewNew profileId={m.id} navigate={navigate}/>)
    return <NotFound/>
  }

  React.useEffect(()=>{
    const onStorage = (e)=>{ if (e.key === 'oi_token') setLoggedIn(authStore.isLoggedIn()) }
    window.addEventListener('storage', onStorage)
    return ()=> window.removeEventListener('storage', onStorage)
  }, [])

  React.useEffect(()=>{
    setLoggedIn(authStore.isLoggedIn())
  }, [path])

  return (
    <ErrorBoundary>
      <div style={{display:'grid', gridTemplateColumns:'220px 1fr', minHeight:'100vh', fontFamily:'system-ui, -apple-system, Segoe UI, Roboto'}}>
        <aside style={{background:'#0f172a', color:'#cbd5e1', padding:16}}>
          <h3 style={{marginTop:0}} data-testid="heading-app">OpenInterview</h3>
          <nav style={{display:'grid', gap:8}}>
            <a href="#/" style={{color:'#93c5fd'}} data-testid="nav-dashboard">Dashboard</a>
            <a href="#/profile" style={{color:'#93c5fd'}} data-testid="nav-profile">My Profile</a>
            <a href="#/upload" style={{color:'#93c5fd'}} data-testid="nav-upload">Uploads</a>
            {!loggedIn && <a href="#/login" style={{color:'#93c5fd'}} data-testid="nav-login">Login</a>}
            {loggedIn && <a href="#/profiles" style={{color:'#93c5fd'}} data-testid="nav-profiles">Profiles</a>}
            {loggedIn && <button onClick={doLogout} style={{marginTop:8}} data-testid="button-logout">Logout</button>}
          </nav>
        </aside>
        <main style={{padding:24}}>
          {renderRoute()}
        </main>
      </div>
    </ErrorBoundary>
  )
}
