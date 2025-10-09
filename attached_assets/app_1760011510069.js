(() => {
  // -----------------------------
  // Attachments & Resume Downloads
  // -----------------------------
  const wireDownloadLink = (el) => {
    const url = el.getAttribute('data-file-url');
    const name = el.getAttribute('data-file-name') || 'download';
    if (!url) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };
  document.querySelectorAll('.attachment-link').forEach(wireDownloadLink);

  // -----------------------------
  // Resume PDF Pagination (PDF.js)
  // -----------------------------
  const resumeSection = document.getElementById('resumeSection');
  const resumeUrl = resumeSection?.getAttribute('data-resume-url');
  const canvas = document.getElementById('resumeCanvas');
  const ctx = canvas?.getContext('2d');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const pageIndicator = document.getElementById('pageIndicator');

  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 1;
  let rendering = false;
  const renderQueue = [];

  function queueRender(pageNum) {
    if (rendering) {
      renderQueue.push(pageNum);
    } else {
      renderPage(pageNum);
    }
  }

  async function renderPage(num) {
    rendering = true;
    try {
      const page = await pdfDoc.getPage(num);
      const container = canvas.parentElement;
      const rect = container.getBoundingClientRect();
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(rect.width / viewport.width, rect.height / viewport.height);
      const scaledViewport = page.getViewport({ scale });
      canvas.width = Math.floor(scaledViewport.width);
      canvas.height = Math.floor(scaledViewport.height);
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= totalPages;
    } catch (e) {
      console.warn('Resume render error:', e);
    } finally {
      rendering = false;
      if (renderQueue.length) {
        const next = renderQueue.shift();
        renderPage(next);
      }
    }
  }

  async function loadResume() {
    if (!resumeUrl || !window['pdfjsLib']) return;
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js';
      const loadingTask = pdfjsLib.getDocument(resumeUrl);
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages || 1;
      currentPage = 1;
      queueRender(currentPage);
    } catch (e) {
      console.warn('Resume load error:', e);
    }
  }

  prevBtn?.addEventListener('click', () => {
    if (currentPage > 1) { currentPage -= 1; queueRender(currentPage); }
  });
  nextBtn?.addEventListener('click', () => {
    if (pdfDoc && currentPage < totalPages) { currentPage += 1; queueRender(currentPage); }
  });

  let resizeTimeout;
  window.addEventListener('resize', () => {
    if (!pdfDoc) return;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => queueRender(currentPage), 150);
  });

  loadResume();

  // -----------------------------
  // Calendar Booking (ICS download)
  // -----------------------------
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const bookingCard = document.getElementById('bookingCard');
  const calTitle = document.getElementById('calTitle');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const calGrid = document.getElementById('calGrid');
  const emailInput = document.getElementById('email');
  const confirmBtn = document.getElementById('confirmBookingBtn');
  const toast = document.getElementById('toast');

  let calYear = parseInt(bookingCard?.getAttribute('data-calendar-year'), 10) || 2024;
  let calMonth = parseInt(bookingCard?.getAttribute('data-calendar-month-index'), 10) || 6; // July

  let selectedDay = 5;
  let selectedTime = document.querySelector('input[name="time"]:checked')?.value || "11:00";

  function renderMonthTitle() {
    if (calTitle) calTitle.textContent = `${monthNames[calMonth]} ${calYear}`;
  }

  function clearActiveDay() {
    if (!calGrid) return;
    calGrid.querySelectorAll('[data-day]').forEach(node => {
      if (node.tagName === 'BUTTON') {
        if (parseInt(node.getAttribute('data-day'),10) !== 5) {
          const span = document.createElement('span');
          span.textContent = node.textContent;
          span.setAttribute('data-day', node.getAttribute('data-day'));
          span.className = '';
          node.replaceWith(span);
        } else {
          node.classList.add('bg-primary','text-white','font-semibold');
        }
      } else {
        node.className = (node.className || '').replace(/\bbg-primary\b|\btext-white\b|\bfont-semibold\b|\brounded-full\b/g,'').trim();
      }
    });
  }

  function elevateDay(node) {
    if (node.tagName !== 'BUTTON') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-day', node.getAttribute('data-day'));
      btn.className = 'h-10 w-10 flex items-center justify-center rounded-full bg-primary text-white font-semibold';
      btn.textContent = node.textContent;
      node.replaceWith(btn);
      return btn;
    } else {
      node.classList.add('bg-primary','text-white','font-semibold','rounded-full');
      return node;
    }
  }

  function handleDayClick(ev) {
    const t = ev.target.closest?.('[data-day]');
    if (!t) return;
    clearActiveDay();
    const btn = elevateDay(t);
    selectedDay = parseInt(btn.getAttribute('data-day'), 10);
  }

  calGrid?.addEventListener('click', handleDayClick);

  calPrev?.addEventListener('click', () => {
    calMonth -= 1; if (calMonth < 0) { calMonth = 11; calYear -= 1; } renderMonthTitle();
  });
  calNext?.addEventListener('click', () => {
    calMonth += 1; if (calMonth > 11) { calMonth = 0; calYear += 1; } renderMonthTitle();
  });
  renderMonthTitle();

  document.getElementById('timeOptions')?.addEventListener('click', (e) => {
    const label = e.target.closest?.('label');
    if (!label) return;
    const input = label.querySelector('input[name="time"]');
    if (input) { input.checked = true; selectedTime = input.value; }
  });

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function buildICS({ start, end, title, description, location }) {
    const pad = (n) => String(n).padStart(2,'0');
    const toUTC = (d) => {
      const yyyy = d.getUTCFullYear();
      const mm = pad(d.getUTCMonth()+1);
      const dd = pad(d.getUTCDate());
      const hh = pad(d.getUTCHours());
      const mi = pad(d.getUTCMinutes());
      const ss = pad(d.getUTCSeconds());
      return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
    };
    const uid = `${Date.now()}@openinterview.me`;
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OpenInterview.me//Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toUTC(new Date())}`,
      `DTSTART:${toUTC(start)}`,
      `DTEND:${toUTC(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  function downloadICS(filename, text) {
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function showToast() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 1400);
  }

  document.getElementById('confirmBookingBtn')?.addEventListener('click', () => {
    const email = document.getElementById('email')?.value?.trim() || '';
    if (!validEmail(email)) {
      const input = document.getElementById('email');
      if (input) {
        input.focus();
        input.classList.add('ring-2','ring-red-500');
        setTimeout(() => input.classList.remove('ring-2','ring-red-500'), 800);
      }
      return;
    }
    if (!selectedDay || !selectedTime) return;
    const [hh, mm] = selectedTime.split(':').map(Number);
    const startLocal = new Date(calYear, calMonth, selectedDay, hh, mm || 0, 0);
    const endLocal = new Date(startLocal.getTime() + 30 * 60000);
    const ics = buildICS({
      start: startLocal,
      end: endLocal,
      title: 'OpenInterview — Interview Booking',
      description: `Interview with Ethan Carter\nBooked for ${["January","February","March","April","May","June","July","August","September","October","November","December"][calMonth]} ${selectedDay}, ${calYear} at ${selectedTime}.`,
      location: 'OpenInterview.me (video link will be shared)'
    });
    downloadICS('openinterview-booking.ics', ics);
    showToast();
    try {
      const receipts = JSON.parse(localStorage.getItem('oi_bookings') || '[]');
      receipts.push({ email, year: calYear, month: calMonth, day: selectedDay, time: selectedTime, ts: Date.now() });
      localStorage.setItem('oi_bookings', JSON.stringify(receipts));
    } catch {}
  });

  // Expose minimal test hooks without affecting UI
  window.__oiTestHooks = { buildICS };
})();
