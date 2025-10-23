// cal-embed.bind.js
// Mount Cal.com inline on profile v4.1 and reveal ICS only if Cal fails.
// Assumes a booking card with:
//  - id="bookingCard"
//  - child #calEmbedContainer
//  - child #bookingFallback (hidden by default)

(function () {
  const elCard = document.getElementById('bookingCard');
  if (!elCard) return;

  const elContainer = document.getElementById('calEmbedContainer');
  const elFallback = document.getElementById('bookingFallback');

  // Compose calLink: explicit data-cal-link > derived from handle > demo
  let calLink = (elCard.getAttribute('data-cal-link') || '').trim();
  const handle = (elCard.getAttribute('data-profile-handle') || '').trim();
  if (!calLink) calLink = handle ? `openinterview/${handle}` : 'openinterview/demo';

  const showFallback = () => {
    if (elFallback) elFallback.classList.remove('hidden');
  };

  const hideFallback = () => {
    if (elFallback) elFallback.classList.add('hidden');
  };

  // Only proceed with embed if we have a mount and a link
  if (!elContainer || !calLink) {
    showFallback();
    return;
  }

  // Load embed assets once
  const ensureAssets = () => new Promise((resolve) => {
    if (window.Cal && typeof window.Cal === 'function') return resolve();
    if (document.getElementById('cal-embed-script')) {
      const check = setInterval(() => {
        if (window.Cal) { clearInterval(check); resolve(); }
      }, 50);
      return;
    }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cal.com/embed.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.id = 'cal-embed-script';
    js.src = 'https://cal.com/embed.js';
    js.async = true;
    js.onload = () => resolve();
    js.onerror = () => resolve(); // fail open
    document.head.appendChild(js);
  });

  const mount = async () => {
    await ensureAssets();
    if (!window.Cal) {
      // Embed unavailable -> fallback ICS path
      showFallback();
      return;
    }

    // Mount inline embed
    elContainer.innerHTML = '';
    const inline = document.createElement('cal-inline');
    inline.setAttribute('cal-link', calLink);
    inline.style.width = '100%';
    inline.style.height = '740px';
    elContainer.appendChild(inline);

    hideFallback();

    // Listen for booking events (defensive: hide/disable ICS pieces if present)
    window.addEventListener('message', (evt) => {
      const data = evt?.data;
      if (!data || typeof data !== 'object') return;
      const t = String(data.type || '').toLowerCase();
      if (!t.includes('cal')) return;

      // Persist a lightweight receipt for parity with existing local history
      try {
        const arr = JSON.parse(localStorage.getItem('oi_bookings') || '[]');
        arr.push({ ts: Date.now(), type: data.type || 'cal:event', payload: data });
        localStorage.setItem('oi_bookings', JSON.stringify(arr));
      } catch (_) {}

      // On booking creation, ensure ICS cannot fire
      if (t.includes('booking') || t.includes('booked') || t.includes('created')) {
        const btn = document.getElementById('fallbackConfirm');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Booked via Cal';
        }
        hideFallback();
      }
    }, false);
  };

  mount();

  // --- ICS fallback wiring (only used if fallback is visible) ---
  const btn = document.getElementById('fallbackConfirm');
  if (btn) {
    btn.addEventListener('click', () => {
      // Only allow if fallback is visible (Cal failed)
      if (!elFallback || elFallback.classList.contains('hidden')) return;

      const date = document.getElementById('fallbackDate')?.value || '';
      const time = document.getElementById('fallbackTime')?.value || '09:00';
      const email = document.getElementById('fallbackEmail')?.value || '';
      if (!date || !email) {
        alert('Please choose a date and enter your email.');
        return;
      }
      
      // Calculate proper start and end times (30 min duration)
      const [hours, minutes] = time.split(':').map(Number);
      const endHours = hours + (minutes >= 30 ? 1 : 0);
      const endMinutes = (minutes + 30) % 60;
      
      // Format for iCalendar (basic UTC, can be enhanced with timezone)
      const formatTime = (h, m) => `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
      const startDt = `${date.replaceAll('-', '')}T${formatTime(hours, minutes)}Z`;
      const endDt = `${date.replaceAll('-', '')}T${formatTime(endHours, endMinutes)}Z`;
      const nowDt = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//OpenInterview//CalFallback//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:oi-${Date.now()}@openinterview`,
        `DTSTAMP:${nowDt}`,
        `DTSTART:${startDt}`,
        `DTEND:${endDt}`,
        'SUMMARY:Interview Booking',
        `DESCRIPTION:Booked via fallback (.ics) for ${email}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'interview.ics';
      a.click();
      URL.revokeObjectURL(url);
      
      // Store booking receipt
      try {
        const receipts = JSON.parse(localStorage.getItem('oi_bookings') || '[]');
        receipts.push({ 
          email, 
          date, 
          time, 
          ts: Date.now(),
          source: 'ics_fallback'
        });
        localStorage.setItem('oi_bookings', JSON.stringify(receipts));
      } catch (_) {}
    });
  }
})();
