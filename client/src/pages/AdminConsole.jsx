import React, { useEffect, useState } from 'react';

export default function AdminConsole() {
  const [stats, setStats] = useState(null);
  const [flags, setFlags] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const headers = (() => {
    const t = window.localStorage?.getItem('token') || '';
    return t ? { Authorization: 'Bearer ' + t, 'content-type': 'application/json' } : { 'content-type': 'application/json' };
  })();

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/admin/stats', { headers }).then(r => (r.status === 200 ? r.json() : Promise.reject(r.status))),
      fetch('/api/v1/admin/flags', { headers }).then(r => (r.status === 200 ? r.json() : Promise.reject(r.status))),
      fetch('/api/v1/admin/users', { headers }).then(r => (r.status === 200 ? r.json() : Promise.reject(r.status))),
    ]).then(([s, f, u]) => {
      setStats(s);
      setFlags(f.flags);
      setUsers(u.users || []);
    }).catch(e => setError('Unauthorized or error: ' + e));
  }, []);

  function toggleFlag(key) {
    const next = { ...flags, [key]: !flags[key] };
    fetch('/api/v1/admin/flags', { method: 'PATCH', headers, body: JSON.stringify({ [key]: next[key] }) })
      .then(r => r.json())
      .then(d => setFlags(d.flags));
  }

  if (error) return <div style={{ padding: '1rem' }}><h1>Admin Console</h1><p>{error}</p></div>;
  if (!stats || !flags) return <div style={{ padding: '1rem' }}>Loading admin console…</div>;

  const totals = stats.totals || {};
  const ibs = stats.interviewsByStatus || {};

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Admin Console</h1>
      <section>
        <h2>Overview</h2>
        <div>Profiles: {totals.profiles ?? '-'}</div>
        <div>Interviews: {totals.interviews ?? '-'}</div>
        <div>Recent Profiles (7d): {stats.recentProfiles ?? '-'}</div>
        <div>Recent Interviews (7d): {stats.recentInterviews ?? '-'}</div>
      </section>
      <section>
        <h2>Interviews by Status</h2>
        <ul>
          <li>Draft: {ibs.draft ?? 0}</li>
          <li>Scheduled: {ibs.scheduled ?? 0}</li>
          <li>Completed: {ibs.completed ?? 0}</li>
          <li>Canceled: {ibs.canceled ?? 0}</li>
        </ul>
      </section>
      <section>
        <h2>Feature Flags</h2>
        {Object.keys(flags).map(k => (
          <label key={k} style={{ display: 'block', marginBottom: '0.5rem' }}>
            <input type="checkbox" checked={!!flags[k]} onChange={() => toggleFlag(k)} /> {k}
          </label>
        ))}
      </section>
      <section>
        <h2>Users</h2>
        <pre style={{ maxHeight: '240px', overflow: 'auto' }}>{JSON.stringify(users.slice(0, 20), null, 2)}</pre>
      </section>
    </div>
  );
}
