// client/src/pages/ProfilePublic.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
export default function ProfilePublic(){
  const id = useMemo(() => window.location.pathname.split('/').pop(), []);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [slot, setSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  useEffect(() => { (async () => {
    try { const res = await api(`/profiles?q=${encodeURIComponent(id)}`);
      const p = (res.items || []).find(x => x.id === id); if (!p) throw new Error('Profile not found'); setProfile(p);
    } catch (e) { setError(String(e?.message || e)); }
  })(); }, [id]);
  async function book(){ setError(''); setOk(''); setBusy(true);
    try { if (!slot) throw new Error('Pick a time slot');
      const body = { profileId:id, title:`Intro with ${profile?.name}`, scheduledAt:new Date(slot).toISOString(), status:'scheduled' };
      await api('/interviews', { method:'POST', body }); setOk('Interview booked!');
    } catch(e){ setError(String(e?.message || e)); } finally { setBusy(false); } }
  if (error) return <Wrap><Msg kind="error">{error}</Msg></Wrap>;
  if (!profile) return <Wrap>Loading…</Wrap>;
  const slots = buildSlots();
  return (<div style={u.page}>
    <div style={u.grid}>
      <div>
        <Hero name={profile.name} headline={profile.headline} />
        <Section title="Attachments"><Attachment name="Resume" /></Section>
        <Section title="Highlights"><ul style={{margin:'6px 0 0 18px'}}>
          <li>5+ years experience in role</li><li>Strong portfolio demonstrating user-centered work</li><li>Excellent collaboration and communication</li></ul>
        </Section>
      </div>
      <div>
        <Card>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Avatar /><div><div style={{fontWeight:600}}>{profile.name}</div>
            <div style={{color:'#9ca3af',fontSize:'0.9rem'}}>{profile.headline || 'Candidate'}</div></div></div>
          <div style={{marginTop:14,fontWeight:600}}>Book an Interview</div>
          <div style={{marginTop:8}}><select value={slot} onChange={e=>setSlot(e.target.value)} style={u.input}>
            <option value=''>Select a time</option>
            {slots.map(s => <option key={s.iso} value={s.iso}>{s.label}</option>)}
          </select></div>
          {error ? <Msg kind='error'>{error}</Msg> : null}
          {ok ? <Msg kind='ok'>{ok}</Msg> : null}
          <button onClick={book} disabled={busy || !slot} style={u.button}>{busy ? 'Booking…' : 'Confirm Booking'}</button>
        </Card>
      </div>
    </div></div>); }
function buildSlots(){ const out = []; const now = new Date(); now.setMinutes(0,0,0);
  for(let h=9; h<=17; h++){ const d=new Date(now); d.setHours(h);
    out.push({ iso:d.toISOString(), label:d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }); }
  return out; }
function Wrap({children}){ return <div style={{padding:16,color:'#e5e7eb'}}>{children}</div>; }
function Section({title,children}){ return (<div style={{marginTop:16}}><div style={{fontWeight:600,marginBottom:8}}>{title}</div>{children}</div>); }
function Card({children}){ return <div style={{background:'#111827',border:'1px solid #1f2937',borderRadius:12,padding:12}}>{children}</div>; }
function Msg({kind,children}){ const base={marginTop:10,padding:'8px 10px',borderRadius:8,border:'1px solid'};
  const styles=kind==='error'?{...base,background:'#7f1d1d',color:'#fecaca',borderColor:'#991b1b'}:{...base,background:'#0f5132',color:'#d1fae5',borderColor:'#14532d'};
  return <div style={styles}>{children}</div>; }
function Avatar(){ return <div style={{width:44,height:44,borderRadius:'50%',background:'#374151'}} />; }
function Hero({name,headline}){ return (<div style={{marginBottom:12}}><div style={{height:220,background:'#0b1020',borderRadius:12,marginBottom:10}} />
  <div style={{fontSize:'1.25rem',fontWeight:700}}>{name}</div><div style={{color:'#9ca3af'}}>{headline || '—'}</div></div>); }
function Attachment({name}){ return (<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#111827',
  border:'1px solid #1f2937',borderRadius:10,padding:'10px 12px',maxWidth:360}}><div>{name}</div>
  <a style={{color:'#93c5fd',textDecoration:'none'}} href="#">Download</a></div>); }
const u={ page:{padding:16,color:'#e5e7eb'}, grid:{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16},
  input:{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #374151',background:'#0b1220',color:'#e5e7eb'},
  button:{width:'100%',marginTop:12,padding:'10px',border:0,borderRadius:10,background:'#2563eb',color:'#fff',fontWeight:600,cursor:'pointer'} };