import React, { useState } from 'react';
import { api } from '../lib/api';
import { setToken } from '../lib/auth';

export default function Login(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e){
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/auth/login', { method:'POST', body:{ email, password } });
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

  return (
    <div style={styles.wrap}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h1 style={styles.h1}>Sign in</h1>
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={styles.hint}>
          Tip: Use <code>admin@example.com</code> to access the Admin Console.
        </p>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0b1020' },
  card: { width:'100%', maxWidth:420, padding:'1.25rem', borderRadius:12, background:'#111827', color:'#e5e7eb', boxShadow:'0 10px 30px rgba(0,0,0,0.35)' },
  h1: { margin:'0 0 1rem 0', fontSize:'1.5rem' },
  label: { display:'block', margin:'0.75rem 0 0.25rem 0', fontSize:'0.9rem', color:'#9ca3af' },
  input: { width:'100%', padding:'0.6rem 0.75rem', borderRadius:8, border:'1px solid #374151', background:'#0b1220', color:'#e5e7eb' },
  button: { width:'100%', marginTop:'1rem', padding:'0.7rem', border:0, borderRadius:10, background:'#2563eb', color:'#fff', fontWeight:600, cursor:'pointer' },
  error: { marginTop:'0.75rem', padding:'0.5rem 0.75rem', background:'#7f1d1d', color:'#fecaca', borderRadius:8, border:'1px solid #991b1b' },
  hint: { marginTop:'0.75rem', fontSize:'0.85rem', color:'#9ca3af' },
};
