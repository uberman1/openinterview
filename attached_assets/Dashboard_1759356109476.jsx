import React, { useEffect, useState } from 'react';
export default function Dashboard(){
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const token = window.localStorage?.getItem('token') || '';
    const headers = token ? { Authorization: 'Bearer ' + token } : {};
    fetch('/api/v1/dashboard', { headers })
      .then(r => { if (r.status === 401) throw new Error('Unauthorized'); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);
  if (error) return <div>Dashboard error: {error}</div>;
  if (!data) return <div>Loading dashboard…</div>;
  return (
    <div style={{padding:'1rem'}}>
      <h1>Dashboard</h1>
      <section><h2>User</h2><pre>{JSON.stringify(data.user, null, 2)}</pre></section>
      <section><h2>Plan</h2><p>{data.plan}</p></section>
      <section><h2>Profiles</h2><pre>{JSON.stringify(data.profiles?.slice(0,5), null, 2)}</pre></section>
      <section><h2>Interviews</h2><pre>{JSON.stringify(data.interviews?.slice(0,5), null, 2)}</pre></section>
    </div>
  );
}
