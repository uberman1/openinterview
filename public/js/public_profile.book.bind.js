// public_profile.book.bind.js
(() => {
  const q = (sel,root=document) => root.querySelector(sel);
  const qa = (sel,root=document) => Array.from(root.querySelectorAll(sel));
  function toast(msg, ok=true){
    const n = document.createElement('div');
    n.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow ${ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(()=>n.remove(), 2200);
  }
  const fmt = (d) => { try { return new Intl.DateTimeFormat(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' }).format(d); } catch { return d.toISOString().slice(0,10);} };
  const fmtTime = (d) => { try { return new Intl.DateTimeFormat(undefined, { hour:'numeric', minute:'2-digit' }).format(d);} catch { return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`; } };
  function findCandidateName(){
    const hero = q('.absolute.bottom-0.left-0 h1'); if (hero && hero.textContent.trim()) return hero.textContent.trim();
    const side = q('aside h3'); if (side && side.textContent.trim()) return side.textContent.trim();
    return 'Candidate';
  }
  function selectedDate(){
    const sel = qa('main .grid.grid-cols-7 button').find(b => b.className.includes('bg-primary') && b.textContent.trim());
    if (!sel) return null;
    const hdr = q('main h2.text-lg.font-semibold'); let ym = new Date();
    if (hdr){ try { ym = new Date(`${hdr.textContent.trim()}-01`); } catch {} }
    const day = parseInt(sel.textContent.trim(),10);
    return new Date(ym.getFullYear(), ym.getMonth(), day);
  }
  function selectedTime(){
    const times = qa('aside label span, main .grid.grid-cols-3 button');
    let pick = times.find(el => el.className.includes('bg-primary') || el.className.includes('dark:bg-white/20'));
    if (!pick) pick = times.find(el => el.tagName==='SPAN');
    return pick ? pick.textContent.trim() : null;
  }
  function parseTimeToDate(baseDate, timeStr){
    const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    let [_, hh, mm, ap] = m;
    hh = parseInt(hh,10); mm = parseInt(mm,10);
    if (ap.toUpperCase()==='PM' && hh<12) hh += 12;
    if (ap.toUpperCase()==='AM' && hh===12) hh = 0;
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hh, mm, 0, 0);
  }
  function cryptoRand(){ try{ return crypto.randomUUID(); }catch{ return 'oid-'+Math.random().toString(36).slice(2); } }
  function escapeICS(s){ return (s||'').replace(/\n/g,'\\n').replace(/,|;|\\/g, m=> '\\\\'+m); }
  function icsDT(d){ const pad=n=>String(n).padStart(2,'0'); return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; }
  function buildICS({title, start, end, description, location}){
    const lines = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OpenInterview.me//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${cryptoRand()}`,
      `DTSTAMP:${icsDT(new Date())}`,
      `DTSTART:${icsDT(start)}`,
      `DTEND:${icsDT(end)}`,
      `SUMMARY:${escapeICS(title)}`,
      description ? `DESCRIPTION:${escapeICS(description)}` : null,
      location ? `LOCATION:${escapeICS(location)}` : null,
      'END:VEVENT','END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines);
  }
  async function postBooking(payload){
    const endpoints = [
      { url:'/api/public/bookings', method:'POST' },
      { url:'/api/bookings', method:'POST' },
    ];
    for (const ep of endpoints){
      try{
        const r = await fetch(ep.url, { method: ep.method, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
        if (r.ok) return await r.json();
      }catch{}
    }
    throw new Error('Booking failed');
  }
  function renderSuccess({candidate, dateObj, startObj, durationMin, manageUrl, icsUrl}){
    const container = q('aside .border, aside .rounded-lg.p-6')?.parentElement || q('aside');
    if (!container) return;
    const endObj = new Date(startObj.getTime() + (durationMin||30)*60000);
    const ics = icsUrl || buildICS({ title:`Interview with ${candidate}`, start:startObj, end:endObj, description:`Booked via OpenInterview.me for ${candidate}` });
    const html = `
<div class="border border-subtle-light dark:border-white/10 rounded-lg p-6 space-y-4 fade-in">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center">✓</div>
    <div>
      <h2 class="text-xl font-bold">You're booked with ${candidate}</h2>
      <p class="text-sm text-primary/70 dark:text-white/70">${fmt(dateObj)} • ${fmtTime(startObj)} (${durationMin||30} min)</p>
    </div>
  </div>
  <div class="flex gap-3">
    <a href="${ics}" download="interview.ics" class="flex-1 bg-primary text-white py-3 rounded-lg text-center font-semibold hover:bg-primary/90">Add to Calendar</a>
    ${manageUrl ? `<a href="${manageUrl}" class="flex-1 bg-transparent border border-primary/20 dark:border-white/20 rounded-lg py-3 text-center font-semibold hover:bg-primary/5 dark:hover:bg-white/5">Manage Booking</a>` : ''}
  </div>
  <p class="text-xs text-primary/60 dark:text-white/60">A confirmation was sent to your email.</p>
</div>`;
    const bookCard = q('aside .border, aside .rounded-lg.p-6');
    if (bookCard) bookCard.outerHTML = html; else container.insertAdjacentHTML('afterbegin', html);
  }
  function bind(){
    const btns = Array.from(document.querySelectorAll('aside button'));
    const btn = btns.reverse().find(b => /confirm/i.test(b.textContent||'')) || btns[0];
    const email = document.querySelector('aside input[type="email"]');
    if (!btn || !email) return;
    btn.addEventListener('click', async (e)=>{
      e.preventDefault();
      const dt = selectedDate();
      const t = selectedTime();
      const em = email.value.trim();
      if (!dt || !t || !em){ toast('Pick a date, a time, and enter email.', false); return; }
      const start = parseTimeToDate(dt, t);
      if (!start){ toast('Invalid time.', false); return; }
      const duration = 30;
      const candidate = findCandidateName();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const m = location.pathname.match(/\/u\/([^\/?#]+)/);
      const handle = m ? decodeURIComponent(m[1]) : null;
      try{
        const res = await postBooking({ handle, date: dt.toISOString().slice(0,10), start: start.toISOString(), duration, recruiter:{ email: em }, timezone: tz, source:'profile-share' });
        const manage = res?.manageUrl || res?.manage_url || (res?.bookingId ? `/booking_manage.html?bookingId=${encodeURIComponent(res.bookingId)}${res?.token ? '&token=' + encodeURIComponent(res.token) : ''}` : null);
        const ics = res?.icsUrl || res?.ics_url;
        renderSuccess({ candidate, dateObj: dt, startObj: start, durationMin: duration, manageUrl: manage, icsUrl: ics });
      }catch(err){ toast('Could not book this slot. Try another time.', false); }
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();