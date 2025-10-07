// booking_manage.bind.js
(() => {
  const q = (sel,root=document) => root.querySelector(sel);
  const qa = (sel,root=document) => Array.from(root.querySelectorAll(sel));
  function toast(msg, ok=true){
    let n = document.createElement('div');
    n.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow ${ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(()=>n.remove(), 2200);
  }
  const params = new URLSearchParams(location.search);
  let bookingId = params.get('bookingId');
  let token = params.get('token');
  
  function tryDecodeToken(encoded) {
    function padBase64(str) {
      // Add padding to make length multiple of 4
      const pad = str.length % 4;
      if (pad === 2) return str + '==';
      if (pad === 3) return str + '=';
      return str;
    }
    
    function tryDecodeBase64(str) {
      try {
        const base64 = padBase64(str.replace(/-/g, '+').replace(/_/g, '/'));
        return atob(base64);
      } catch {
        return null;
      }
    }
    
    // 1. Try JWT decode (header.payload.signature)
    if (encoded.match(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
      const payload = encoded.split('.')[1];
      const decoded = tryDecodeBase64(payload);
      if (decoded) {
        try {
          const parsed = JSON.parse(decoded);
          const bid = parsed.bookingId || parsed.id;
          const tok = parsed.token;
          // ONLY return if BOTH values are present
          if (bid && tok) return { bookingId: bid, token: tok };
        } catch {}
      }
    }
    
    // 2. Try base64 decode (single encoded JSON)
    const decoded = tryDecodeBase64(encoded);
    if (decoded) {
      try {
        const parsed = JSON.parse(decoded);
        const bid = parsed.bookingId || parsed.id;
        const tok = parsed.token;
        // ONLY return if BOTH values are present
        if (bid && tok) return { bookingId: bid, token: tok };
      } catch {}
    }
    
    // 3. Try colon delimiter (bookingId:token)
    if (encoded.includes(':')) {
      const [id, tok] = encoded.split(':', 2);
      if (id && tok) return { bookingId: id, token: tok };
    }
    
    // 4. Try hyphen delimiter (but not UUIDs)
    if (encoded.includes('-') && !encoded.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const [id, tok] = encoded.split('-', 2);
      if (id && tok) return { bookingId: id, token: tok };
    }
    
    // 5. Try underscore delimiter
    if (encoded.includes('_')) {
      const [id, tok] = encoded.split('_', 2);
      if (id && tok) return { bookingId: id, token: tok };
    }
    
    // FALLBACK: Return null if we couldn't decode both values
    return null;
  }
  
  // If accessing via /booking/manage/:encodedData, extract from path
  if ((!bookingId || !token) && location.pathname.startsWith('/booking/manage/')) {
    const parts = location.pathname.split('/');
    const encoded = parts[3];
    if (!encoded) {
      toast('Invalid booking link format.', false);
      return;
    }
    const decoded = tryDecodeToken(encoded);
    if (!decoded || !decoded.bookingId || !decoded.token) {
      toast('Invalid booking link. Please use the link from your confirmation email.', false);
      return;
    }
    if (!bookingId) bookingId = decoded.bookingId;
    if (!token) token = decoded.token;
  }
  async function fetchBooking(){
    const paths = [
      `/api/public/bookings/${bookingId || ''}?token=${encodeURIComponent(token||'')}`,
      `/api/bookings/${bookingId || ''}`
    ];
    for (const p of paths){
      try{ const r = await fetch(p); if (r.ok) return await r.json(); }catch{}
    }
    return null;
  }
  function updateSummary(b){
    const who = b?.candidate?.name || 'Candidate';
    const p = q('main p.text-center'); if (p) p.textContent = `Interview with ${who}`;
    const start = b?.start ? new Date(b.start) : null;
    const end = b?.end ? new Date(b.end) : (start ? new Date(start.getTime() + (b?.duration_min||30)*60000) : null);
    const fmt = d => new Intl.DateTimeFormat(undefined,{weekday:'long', year:'numeric', month:'long', day:'numeric'}).format(d);
    const fmtT = d => new Intl.DateTimeFormat(undefined,{hour:'numeric', minute:'2-digit'}).format(d);
    if (start){
      const box = qa('main .bg-white.dark\\:bg-primary\\/5.rounded-lg.p-6')[1] || q('main .bg-white.dark\\:bg-primary\\/5.rounded-lg.p-6');
      const ps = qa('p', box);
      if (ps[0]) ps[0].textContent = fmt(start);
      if (ps[1] && end) ps[1].textContent = `${fmtT(start)} - ${fmtT(end)}`;
    }
  }
  async function doReschedule(){
    const monthLabel = q('h2.text-lg.font-semibold')?.textContent.trim();
    const selDayBtn = qa('main .grid.grid-cols-7 button').find(b => b.className.includes('bg-primary'));
    if (!selDayBtn){ toast('Choose a new date/time first.', false); return; }
    const day = parseInt(selDayBtn.textContent.trim(),10);
    let base = new Date(); try{ base = new Date(`${monthLabel}-01`); }catch{}
    const date = new Date(base.getFullYear(), base.getMonth(), day);
    const timeBtn = qa('main .grid.grid-cols-3 button').find(b => b.className.includes('bg-primary') || b.className.includes('dark:bg-white/20'));
    if (!timeBtn){ toast('Choose a time.', false); return; }
    const m = timeBtn.textContent.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m){ toast('Invalid time.', false); return; }
    let [_, hh, mm, ap] = m; hh = parseInt(hh,10); mm = parseInt(mm,10);
    if (ap.toUpperCase()==='PM' && hh<12) hh += 12;
    if (ap.toUpperCase()==='AM' && hh===12) hh = 0;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm, 0, 0);
    const endpoints = [
      { url: `/api/public/bookings/${bookingId}/reschedule?token=${encodeURIComponent(token||'')}`, method:'POST', body:{ start: start.toISOString() } },
      { url: `/api/bookings/${bookingId}/reschedule`, method:'POST', body:{ start: start.toISOString() } },
    ];
    for (const ep of endpoints){
      try{
        const r = await fetch(ep.url, { method: ep.method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(ep.body) });
        if (r.ok){ toast('Rescheduled.'); return true; }
      }catch{}
    }
    toast('Could not reschedule.', false); return false;
  }
  async function doCancel(){
    const endpoints = [
      { url: `/api/public/bookings/${bookingId}/cancel?token=${encodeURIComponent(token||'')}`, method:'POST', body:{} },
      { url: `/api/bookings/${bookingId}/cancel`, method:'POST', body:{} },
    ];
    for (const ep of endpoints){
      try{
        const r = await fetch(ep.url, { method: ep.method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(ep.body) });
        if (r.ok){ toast('Appointment canceled.'); return true; }
      }catch{}
    }
    toast('Could not cancel.', false); return false;
  }
  function bind(){
    q('#confirm-reschedule')?.addEventListener('click', async (e)=>{ e.preventDefault(); await doReschedule(); });
    q('#cancel-appointment')?.addEventListener('click', async (e)=>{ e.preventDefault(); await doCancel(); });
  }
  async function init(){ const b = await fetchBooking(); if (b) updateSummary(b); bind(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();