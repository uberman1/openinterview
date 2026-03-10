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
import Browse from './pages/Browse'
import AdminConsole from './pages/AdminConsole'
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
    const basePath = path.split('?')[0]
    if (basePath === '/' || basePath === '') return <Dashboard/>
    if (basePath === '/dashboard') return <Dashboard/>
    if (basePath === '/login') return <Login navigate={navigate}/>
    if (basePath === '/profile') return <ProfileEditor/>
    if (basePath === '/upload') return <UploadMock/>
    if (basePath === '/browse') return <Browse/>
    if (basePath === '/pages') return <PagesIndex/>
    if (basePath.startsWith('/admin')) return <AdminConsole path={basePath}/>
    if (basePath === '/profiles') return guard(<ProfilesList navigate={navigate}/>)
    if (basePath === '/profiles/new') return guard(<ProfileNew navigate={navigate}/>)
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
            <a href="#/browse" style={{color:'#93c5fd'}} data-testid="nav-browse">Browse</a>
            {!loggedIn && <a href="#/login" style={{color:'#93c5fd'}} data-testid="nav-login">Login</a>}
            {loggedIn && <a href="#/profiles" style={{color:'#93c5fd'}} data-testid="nav-profiles">Profiles</a>}
            {loggedIn && <a href="#/admin" style={{color:'#93c5fd'}} data-testid="nav-admin">Admin</a>}
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
