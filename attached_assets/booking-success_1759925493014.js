// Inline success state for Shareable Profile page
// Usage: include this script and call showBookingSuccess(booking) after a booking is created.
// booking = { id, token, candidateName, startUtc, endUtc, title, description, location }

(function(){
  function toGCalDate(d){ return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
  function fmtRange(startIso, endIso){
    const start = new Date(startIso), end = new Date(endIso);
    const fmtDate = new Intl.DateTimeFormat(undefined, { weekday:'short', month:'short', day:'numeric', year:'numeric' });
    const fmtTime = new Intl.DateTimeFormat(undefined, { hour:'numeric', minute:'2-digit' });
    return `${fmtDate.format(start)} · ${fmtTime.format(start)}–${fmtTime.format(end)}`;
  }

  function ensureEl(){
    let el = document.getElementById('booking-success');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'booking-success';
    el.className = 'bg-white dark:bg-primary/5 border border-primary/10 dark:border-white/10 rounded-lg p-5 mt-6';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold">Meeting scheduled 🎉</h3>
          <p class="mt-1 text-sm text-primary/70 dark:text-white/70">
            <span id="booking-candidate"></span> — <span id="booking-datetime"></span>
          </p>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <a id="booking-gcal" class="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors" target="_blank" rel="noopener">Add to Calendar</a>
        <button id="booking-ics" class="inline-flex items-center px-4 py-2 rounded-lg border border-primary/20 dark:border-white/20 hover:bg-primary/5 dark:hover:bg-white/5 transition-colors">Download .ics</button>
        <a id="booking-manage" class="inline-flex items-center px-4 py-2 rounded-lg border border-primary/20 dark:border-white/20 hover:bg-primary/5 dark:hover:bg-white/5 transition-colors">Manage Booking</a>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  function makeIcs(booking){
    const now = new Date().toISOString();
    const dt = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const summary = (booking.title || `Interview with ${booking.candidateName}`).replace(/\n/g,' ');
    const desc = (booking.description || '').replace(/\n/g, '\\n');
    const loc = booking.location ? `LOCATION:${booking.location.replace(/\n/g,' ')}` : '';
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//OpenInterview.me//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${booking.id}@openinterview.me
DTSTAMP:${dt(now)}
DTSTART:${dt(booking.startUtc)}
DTEND:${dt(booking.endUtc)}
SUMMARY:${summary}
DESCRIPTION:${desc}
${loc}
END:VEVENT
END:VCALENDAR`;
  }

  function download(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  window.showBookingSuccess = function(booking){
    const el = ensureEl();
    el.querySelector('#booking-candidate').textContent = booking.candidateName;
    el.querySelector('#booking-datetime').textContent = fmtRange(booking.startUtc, booking.endUtc);

    const gcal = new URL('https://calendar.google.com/calendar/render');
    gcal.searchParams.set('action','TEMPLATE');
    gcal.searchParams.set('text', booking.title || `Interview with ${booking.candidateName}`);
    gcal.searchParams.set('dates', `${toGCalDate(booking.startUtc)}/${toGCalDate(booking.endUtc)}`);
    if (booking.description) gcal.searchParams.set('details', booking.description);
    if (booking.location) gcal.searchParams.set('location', booking.location);
    el.querySelector('#booking-gcal').href = gcal.toString();

    el.querySelector('#booking-ics').onclick = () => {
      const ics = makeIcs(booking);
      download(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), `openinterview_${booking.id}.ics`);
    };

    el.querySelector('#booking-manage').href = `/manage-booking.html?bookingId=${encodeURIComponent(booking.id)}&token=${encodeURIComponent(booking.token)}`;
  };
})();