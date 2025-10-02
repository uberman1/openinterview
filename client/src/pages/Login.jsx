// client/src/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { setToken } from '../lib/auth';

export default function Login(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devMode, setDevMode] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('devMode') : null;
    if (saved != null) setDevMode(saved === 'true');
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('devMode', String(devMode));
  }, [devMode]);

  async function onSubmit(e){
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (devMode) {
        try {
          const res = await api('/auth/login', { method:'POST', body:{ email, password } });
          if (res?.token) {
            setToken(res.token);
            const next = email.toLowerCase()==='admin@example.com' ? '/admin' : '/dashboard';
            window.location.assign(next);
            return;
          }
        } catch {}
        const fakeToken = 'dev_' + Math.random().toString(36).slice(2);
        setToken(fakeToken);
        const next = email.toLowerCase()==='admin@example.com' ? '/admin' : '/dashboard';
        window.location.assign(next);
        return;
      }

      const tryLogin = async () =>
        await api('/auth/login', { method:'POST', body:{ email, password } });

      let res;
      try {
        res = await tryLogin();
      } catch (err) {
        const msg = String(err?.message || '');
        if (msg.includes('401')) {
          await api('/auth/signup', { method:'POST', body:{ email, password } });
          res = await tryLogin();
        } else {
          throw err;
        }
      }

      if (res?.token) {
        setToken(res.token);
        const next = email.toLowerCase()==='admin@example.com' ? '/admin' : '/dashboard';
        window.location.assign(next);
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err) {
      setError(String(err?.message || err || 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

  async function runDemo(){
    setError('');
    setDemoBusy(true);
    try {
      const API_BASE = `${location.origin}/api/v1`;
      const headers = { 'content-type':'application/json' };
      const email = 'viewer.demo@example.com';
      const password = 'x';

      async function loginOrSignup(){
        const r = await fetch(`${API_BASE}/auth/login`, { method:'POST', headers, body: JSON.stringify({ email, password }) });
        if (r.status === 401) {
          await fetch(`${API_BASE}/auth/signup`, { method:'POST', headers, body: JSON.stringify({ email, password }) });
          return loginOrSignup();
        }
        if (!r.ok) throw new Error('Login failed: ' + r.status);
        return r.json();
      }

      const { token } = await loginOrSignup();
      setToken(token);

      const authHeaders = { ...headers, authorization: 'Bearer ' + token };
      const samples = [
        { name: 'Ethan Carter', email: 'ethan.carter@example.com', headline: 'Senior Product Designer' },
        { name: 'Olivia Bennett', email: 'olivia.bennett@example.com', headline: 'Design Manager' },
        { name: 'Liam Harper', email: 'liam.harper@example.com', headline: 'UX Researcher' }
      ];
      for (const p of samples) {
        try {
          await fetch(`${API_BASE}/profiles`, { method:'POST', headers: authHeaders, body: JSON.stringify(p) });
        } catch {}
      }

      window.location.assign('/profiles');
    } catch (err) {
      setError(String(err?.message || err || 'Demo mode failed'));
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h1 style={styles.h1}>Sign in</h1>

        <div style={styles.row}>
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={devMode}
              onChange={e=>setDevMode(e.target.checked)}
            />{' '}
            Dev mode (bypass API)
          </label>
        </div>

        {devMode && (
          <div style={styles.notice}>
            Dev mode is ON. Any email/password will sign you in locally without calling the API.
          </div>
        )}

        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
          autoFocus
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          required
        />

        {error ? <div style={styles.error}>{error}</div> : null}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Signing in…' : (devMode ? 'Enter (Dev mode)' : 'Sign in')}
        </button>

        <div style={{height:8}} />

        <button
          type="button"
          onClick={runDemo}
          disabled={demoBusy}
          style={{...styles.button, background:'#10b981'}}
        >
          {demoBusy ? 'Preparing Demo…' : 'Demo Mode → View Profiles'}
        </button>

        <p style={styles.hint}>
          Tip: Use <code>admin@example.com</code> to access the Admin Console.
        </p>

        <div style={styles.demoLink}>
          <a href="/demo.html" style={styles.link} target="_blank" rel="noopener noreferrer">
            Open Demo Launcher →
          </a>
        </div>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0b1020' },
  card: { width:'100%', maxWidth:420, padding:'1.25rem', borderRadius:12, background:'#111827', color:'#e5e7eb', boxShadow:'0 10px 30px rgba(0,0,0,0.35)' },
  h1: { margin:'0 0 1rem 0', fontSize:'1.5rem' },
  row: { marginBottom:'0.75rem' },
  toggle: { fontSize:'0.95rem', color:'#e5e7eb', cursor:'pointer' },
  notice: { marginBottom:'0.75rem', padding:'0.5rem 0.75rem', background:'#1f2937', color:'#cbd5e1', borderRadius:8, border:'1px solid #374151' },
  label: { display:'block', margin:'0.75rem 0 0.25rem 0', fontSize:'0.9rem', color:'#9ca3af' },
  input: { width:'100%', padding:'0.6rem 0.75rem', borderRadius:8, border:'1px solid #374151', background:'#0b1220', color:'#e5e7eb' },
  button: { width:'100%', marginTop:'0.25rem', padding:'0.7rem', border:0, borderRadius:10, background:'#2563eb', color:'#fff', fontWeight:600, cursor:'pointer' },
  error: { marginTop:'0.75rem', padding:'0.5rem 0.75rem', background:'#7f1d1d', color:'#fecaca', borderRadius:8, border:'1px solid #991b1b' },
  hint: { marginTop:'0.75rem', fontSize:'0.85rem', color:'#9ca3af' },
  demoLink: { marginTop:'0.5rem', textAlign:'center', paddingTop:'0.5rem', borderTop:'1px solid #374151' },
  link: { color:'#60a5fa', textDecoration:'none', fontSize:'0.875rem' },
};
