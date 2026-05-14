// client/src/pages/PagesIndex.jsx
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
export default function PagesIndex() {
  const [status, setStatus] = useState('checking…');
  const [profiles, setProfiles] = useState([]);
  const [token, setToken] = useState('');
  useEffect(() => { (async () => {
    try { const h = await fetch('/api/v1/health').then(r => r.json());
      const p = await api('/profiles?limit=10').catch(() => ({ items: [] }));
      setProfiles(p.items || []); setStatus(`ok (${h?.env || 'dev'})`);
    } catch { setStatus('api unreachable'); }
    setToken(typeof window !== 'undefined' ? window.localStorage.getItem('token') || '' : '');
  })(); }, []);
  const firstId = profiles[0]?.id;
  return (<div style={s.page}>
    <h1 style={s.h1}>Pages</h1>
    <div style={s.note}>API: {status} {token ? '• authed' : '• anonymous'}</div>
    <div style={s.grid}>
      <Section title="Core App">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/profiles">Profiles List</Link>
        <Link href="/login">Login</Link>
        {firstId && <Link href={`/profiles/${firstId}`}>Profile Detail (first)</Link>}
      </Section>
      <Section title="Admin & Analytics">
        <Link href="/admin">Admin Console</Link>
      </Section>
      <Section title="Public / Candidate UX">
        {firstId ? <Link href={`/public/profile/${firstId}`}>Public Profile (data-driven)</Link>
                 : <div style={s.dim}>Create a profile to enable this link</div>}
      </Section>
      <Section title="System / Demo">
        <Link href="/pages">This Pages index</Link>
      </Section>
    </div>
    <div style={{marginTop:16}}>
      <div style={s.caption}>First 10 profiles:</div>
      <ul style={{marginTop:6}}>{(profiles || []).map(p => (
        <li key={p.id}><a style={s.a} href={`/profiles/${p.id}`}>{p.name}</a> — {p.email}</li>
      ))}</ul>
    </div>
  </div>);
}
function Section({ title, children }){ return (<div style={s.card}>
  <div style={s.title}>{title}</div><div style={{display:'grid', gap:6, marginTop:8}}>{children}</div></div>); }
function Link({ href, children }){ return <a href={href} style={s.link}>{children}</a>; }
const s = { page:{padding:16,color:'#e5e7eb'}, h1:{margin:'0 0 10px 0',fontSize:'1.4rem'},
  note:{color:'#9ca3af',marginBottom:10}, grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12},
  card:{background:'#111827',border:'1px solid #1f2937',borderRadius:12,padding:12}, title:{fontWeight:600},
  link:{color:'#60a5fa',textDecoration:'none'}, a:{color:'#93c5fd',textDecoration:'none'}, caption:{color:'#9ca3af'},
  dim:{color:'#6b7280',fontStyle:'italic'} };