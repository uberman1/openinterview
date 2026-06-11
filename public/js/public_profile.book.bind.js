// /js/public_profile.book.bind.js
import { store } from '/js/data-store.js';
import { normalizeAvailability } from './availability.model.js';
import { generateSlots, fmtDate } from './slotgen.js';
import { getSlotState } from './booking_utils.js';

(function initPublicBooking() {
  const container = document.getElementById('booking-slots');
  const confirmBtn = document.getElementById('confirm-booking-btn');
  
  // Calendar Elements
  const calendarPrev = document.getElementById('calendar-prev');
  const calendarNext = document.getElementById('calendar-next');
  const calendarMonth = document.getElementById('calendar-month');
  const calendarGrid = document.getElementById('calendar-grid');

  if (!container) {
    console.log('[booking] No slots container found - skipping public booking setup');
    return;
  }

  // State
  let selectedSlot = null;
  let profileData = null;
  let allSlots = []; // Flattened list of all available slots
  let existingBookings = []; // Keep reference for runtime checks
  
  // Calendar State
  let viewDate = new Date(); // The month we are viewing
  let selectedDate = new Date(); // The specific day selected

  (async function hydrate() {
    // Full page loader - Enterprise Design (Spinner)
    const loaderOverlay = document.createElement('div');
    loaderOverlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm transition-opacity duration-500';
    loaderOverlay.innerHTML = `
        <div class="text-center">
            <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <h3 class="text-lg font-medium text-primary dark:text-neutral-50">Loading Profile...</h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-2">Please wait while we fetch your data</p>
        </div>
    `;
    document.body.appendChild(loaderOverlay);

    const cleanupLoader = () => {
        if (loaderOverlay) {
            loaderOverlay.style.opacity = '0';
            setTimeout(() => {
                if (loaderOverlay.parentNode) {
                    loaderOverlay.parentNode.removeChild(loaderOverlay);
                }
            }, 500); // Fade out duration
        }
    };

    const profileId = new URL(location.href).searchParams.get('id');
    let profId = profileId;
    let fetchedProfile = null;
    
    // Support handle-based URLs if no ID provided
    if (!profId) {
      const path = window.location.pathname;
      const match = path.match(/\/u\/([^\/]+)/);
      const handle = match ? match[1] : null;
      
      if (handle) {
        try {
          const res = await fetch(`/api/public/profile/${handle}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            fetchedProfile = data;
            profId = data.id || data._id;
          } else if (res.status === 401) {
            cleanupLoader();
            container.innerHTML = '<p class="text-sm text-neutral-600 dark:text-neutral-400 w-full text-center px-4">This profile requires the access link from the owner. Open the invite or share URL you received (or ask them to send a new one).</p>';
            return;
          }
        } catch (e) {
          console.error('[booking] Failed to resolve handle:', e);
        }
      }
    }

    if (!profId && !fetchedProfile) {
      console.log('[booking] Profile not found (no ID or handle)');
      cleanupLoader();
      return;
    }

    // Use fetched profile or get from store
    let prof = fetchedProfile;
    if (!prof) {
        const storeData = await store.getProfile(profId);
        prof = storeData?.profile || storeData;
    }
    
    if (!prof) {
      console.log('[booking] Profile data not found for:', profId);
      container.innerHTML = '<p class="text-sm text-red-500 w-full text-center">Profile not found.</p>';
      cleanupLoader();
      return;
    }

    profileData = prof;
    const av = normalizeAvailability(prof?.availability);
    existingBookings = prof?.bookings || [];

    console.log('[booking] Normalized Availability:', {
        timezone: av.timezone,
        weekly: av.weekly,
        rules: av.rules
    });

    // Generate slots (in profile timezone context)
    const slotsMap = generateSlots(av, existingBookings, {});
    
    // Flatten slots to use Local Time logic
    allSlots = Array.from(slotsMap.values()).flat();
    
    console.log(`[booking] Generated ${allSlots.length} slots total.`);
    
    // Init Calendar Logic
    cleanupLoader();
    initCalendar();
    
    bindEvents();
  })();

  function initCalendar() {
    if (calendarPrev && calendarNext) {
        calendarPrev.onclick = () => {
            viewDate.setMonth(viewDate.getMonth() - 1);
            renderCalendar();
        };
        calendarNext.onclick = () => {
            viewDate.setMonth(viewDate.getMonth() + 1);
            renderCalendar();
        };
    }
    
    renderCalendar();
    renderSlotsForDate(selectedDate);
  }

  function renderCalendar() {
    if (!calendarMonth || !calendarGrid) return;

    // Update Month Label
    const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    calendarMonth.textContent = monthName;

    // Clear Grid (keep headers if they are separate, but current HTML has headers inside grid div?)
    // Wait, the HTML has headers inside the same grid div.
    // I should reconstruct the whole grid content or just the days.
    // The HTML provided has: 
    // <div id="calendar-grid" ...>
    //   <span>S</span>...<span>S</span>
    //   <span>1</span>...
    // </div>
    // So I need to keep the headers.
    
    const headers = ['S','M','T','W','T','F','S'];
    let html = '';
    
    // Render Headers
    headers.forEach(d => {
        html += `<span class="font-medium text-muted-light dark:text-muted-dark py-2">${d}</span>`;
    });

    // Calculate days
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDayOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = lastDay.getDate();

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<span></span>`;
    }

    // Days
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const selTime = selectedDate.getTime();
    // Normalize selectedDate to midnight
    const selDateMidnight = new Date(selectedDate);
    selDateMidnight.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
        const currentDay = new Date(year, month, d);
        const isToday = currentDay.getTime() === today.getTime();
        const isSelected = currentDay.getTime() === selDateMidnight.getTime();
        
        // Check availability
        // We check if any slot falls on this Local Day
        // Slot startISO is UTC. We convert to Local Date string and match.
        const hasSlots = allSlots.some(s => {
            const sDate = new Date(s.startISO);
            return sDate.getDate() === d && 
                   sDate.getMonth() === month && 
                   sDate.getFullYear() === year;
        });

        let classes = "h-8 w-8 flex items-center justify-center rounded-full text-sm transition-colors mx-auto ";
        
        if (isSelected) {
            classes += "bg-primary text-white font-semibold";
        } else if (isToday) {
            classes += "bg-subtle-light dark:bg-subtle-dark font-semibold text-primary dark:text-white";
        } else if (hasSlots) {
            classes += "text-primary dark:text-white font-medium hover:bg-subtle-light dark:hover:bg-subtle-dark cursor-pointer";
        } else {
            classes += "text-muted-light dark:text-muted-dark/50 cursor-default";
        }

        // We use a button if it has slots or is selectable
        // Actually, let's make all days selectable so user can see "No slots" explicitly?
        // Or only available days? User requirement: "Dates within the window should be selectable."
        // Usually, we allow selecting any date to see emptiness.
        
        html += `<button class="${classes}" data-day="${d}">${d}</button>`;
    }

    calendarGrid.innerHTML = html;

    // Add Click Listeners
    const buttons = calendarGrid.querySelectorAll('button[data-day]');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = parseInt(e.target.dataset.day);
            selectedDate = new Date(year, month, day);
            renderCalendar(); // Update styles
            renderSlotsForDate(selectedDate);
        });
    });
  }

  function renderSlotsForDate(date) {
    if (!container) return;
    container.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    console.log(`[booking] Rendering slots for ${year}-${month+1}-${day}`);

    // Filter slots for this day
    const slots = allSlots.filter(s => {
        const sDate = new Date(s.startISO);
        const match = sDate.getDate() === day && 
               sDate.getMonth() === month && 
               sDate.getFullYear() === year;
        return match;
    });

    console.log(`[booking] Found ${slots.length} slots for this date.`);

    if (slots.length === 0) {
      container.innerHTML = '<p class="text-sm text-neutral-500 w-full text-center py-4">No available slots for this date.</p>';
      return;
    }

    // Sort slots by time
    slots.sort((a,b) => new Date(a.startISO) - new Date(b.startISO));

    const list = document.createElement('div');
    list.className = 'flex flex-wrap gap-2 justify-center w-full';
      
    slots.forEach(s => {
        const btn = document.createElement('button');
        
        // Use helper state if available (from generateSlots) OR re-calculate
        // generateSlots already adds isBooked, status, label, className, disabled
        // But for safety, we can re-check using the imported helper
        
        // Note: s already contains properties from generateSlots
        // let bookingState = getSlotState(s.startISO, s.durationMinutes, existingBookings); 
        // Actually, let's trust slotgen first, but fallback to utils if needed?
        // Since we modified slotgen to use the utils, s should have the props.
        
        const isBooked = s.isBooked;
        
        // Default style
        let baseClass = 'px-4 py-2 rounded-lg bg-[#ededed] dark:bg-neutral-800 text-sm hover:bg-subtle-light dark:hover:bg-neutral-700 transition-colors border border-transparent';
        
        if (isBooked) {
             // Use the class provided by the helper (via slotgen)
             baseClass = `px-4 py-2 rounded-lg text-sm transition-colors border ${s.className}`;
             btn.disabled = true;
             btn.title = s.label || 'Booked';
             btn.innerHTML = `
                <span class="block text-xs opacity-75">${s.label}</span>
                <span>${new Date(s.startISO).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
             `;
        } else {
             const t = new Date(s.startISO);
             btn.textContent = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        
        btn.className = baseClass;
        
        // Highlight if this specific slot was selected previously?
        if (selectedSlot && selectedSlot.startISO === s.startISO) {
             btn.className = 'px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-md transform scale-105 transition-all border border-primary';
        }

        if (!isBooked) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                selectSlot(s, btn);
            });
        }
        
        list.appendChild(btn);
    });
    
    container.appendChild(list);
  }

  function selectSlot(slot, btn) {
      selectedSlot = slot;
      
      // Update UI in container
      const allBtns = container.querySelectorAll('button');
      allBtns.forEach(b => {
          // Skip disabled (booked/reserved) buttons to preserve their specific styling
          if (b.disabled) return;
          
          b.className = 'px-4 py-2 rounded-lg bg-[#ededed] dark:bg-neutral-800 text-sm hover:bg-subtle-light dark:hover:bg-neutral-700 transition-colors border border-transparent';
      });
      
      // Highlight selected
      btn.className = 'px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold shadow-md transform scale-105 transition-all border border-primary';
  }

  function bindEvents() {
    if (!confirmBtn) return;

    confirmBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      // 0. Double-click protection (Initial check)
      if (confirmBtn.disabled) return;

      // Capture original state immediately
      let originalBtnContent = confirmBtn.innerHTML;

      // DISABLE IMMEDIATELY to prevent async race conditions
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `
        <div class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
        </div>
      `;

      // Helper to restore UI on early exit
      const resetBtn = () => {
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = originalBtnContent;
      };

      // 1. Validation
      if (!selectedSlot) {
        showError('Please select a time slot.');
        resetBtn();
        return;
      }
      
      // 1.5 Pre-flight check: Is it still free?
      const currentState = getSlotState(selectedSlot.startISO, selectedSlot.durationMinutes, existingBookings);
      if (currentState.isBooked) {
        showError(`This slot has just been ${currentState.label || 'booked'}. Please select another time.`);
        setTimeout(() => window.location.reload(), 2000); // Give user time to read
        return;
      }

      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const messageInput = document.getElementById('message');

      const name = nameInput?.value.trim();
      const email = emailInput?.value.trim();
      const message = messageInput?.value.trim();

      if (!name || !email) {
        showError('Please enter your name and email.');
        resetBtn();
        return;
      }

      // 2. Limit Check (Async)
      if (window.PublicProfilePaywall) {
        const ownerId = profileData.userId || profileData.ownerId || profileData.availability?.userId;
        if (ownerId) {
            try {
              const status = await window.PublicProfilePaywall.checkOwnerStatus(ownerId);
              if (status.limitExceeded) {
                  window.PublicProfilePaywall.showLimitModal();
                  resetBtn();
                  return;
              }
            } catch (err) {
              console.warn('[booking] Limit check failed, proceeding anyway:', err);
            }
        }
      }

      // 3. Submission
      try {
        // Button already disabled/loading, just proceed
        const payload = {
            profileId: profileData.id || profileData._id,
            startISO: selectedSlot.startISO, // Canonical UTC
            duration: selectedSlot.duration || 30,
            bookerName: name,
            bookerEmail: email,
            message: message,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        };

        const result = await postBooking(payload);
        window.trackGAEvent('booking_created', { source: 'booking_flow' });
        
        // 4. Success UI
        showSuccess(result);
        if (result?.sms?.attempted && result.sms.success === false) {
          showSmsFailureModal(`Booking request saved, but SMS could not be sent: ${result.sms.errorMessage || 'Unknown SMS error'}`);
        }

      } catch (err) {
        console.error(err);
        showError('Booking failed: ' + (err.message || 'Unknown error'));
        resetBtn();
      }
    });
  }

  function showError(msg) {
    const modal = document.getElementById('error-modal');
    const msgEl = document.getElementById('error-modal-message');
    
    if (modal && msgEl) {
        msgEl.textContent = msg;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        // Fallback if modal is missing (e.g. older cached HTML)
        alert(msg);
    }
  }

  function showSmsFailureModal(msg) {
    let modal = document.getElementById('sms-failure-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sms-failure-modal';
      modal.className = 'fixed inset-0 z-[120] hidden items-center justify-center bg-black/40 p-4';
      modal.innerHTML = `
        <div class="w-full max-w-md rounded-xl bg-white dark:bg-background-dark p-5 shadow-2xl">
          <div class="flex items-start justify-between mb-3">
            <h3 class="text-lg font-bold text-primary dark:text-white">SMS Notification Failed</h3>
            <button id="sms-failure-close" class="text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <p class="text-sm text-primary/80 dark:text-white/80 mb-4" id="sms-failure-text"></p>
          <div class="flex justify-end">
            <button id="sms-failure-ok" class="rounded bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const close = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      };
      modal.querySelector('#sms-failure-close')?.addEventListener('click', close);
      modal.querySelector('#sms-failure-ok')?.addEventListener('click', close);
    }

    const text = modal.querySelector('#sms-failure-text');
    if (text) text.textContent = msg || 'SMS could not be sent.';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  async function postBooking(payload) {
    const endpoints = [
      // { url:'/api/public/bookings', method:'POST' },
      { url:'/api/bookings', method:'POST' },
    ];
    
    let lastError = null;
    
    for (const ep of endpoints){
      try{
        const r = await fetch(ep.url, { 
            method: ep.method, 
            headers: { 'Content-Type':'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        if (r.ok) return await r.json();
        
        // Handle 409 specifically for slot conflicts
        if (r.status === 409) {
             const errJson = await r.json();
             showError(errJson.error || "This slot is already booked.");
             // Force reload to get fresh slots
             setTimeout(() => window.location.reload(), 2000);
             throw new Error('Slot conflict - page reloading');
        }

        const txt = await r.text();
        try {
            const json = JSON.parse(txt);
            lastError = new Error(json.error || json.message || 'Booking failed');
        } catch(e) {
            lastError = new Error(txt || 'Booking failed');
        }
      } catch(e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Booking failed (network error)');
  }

  function showSuccess(result) {
    const sidebar = document.querySelector('aside');
    if (!sidebar) return;
    
    // We'll replace the inner content of the sidebar's second box (the booking form)
    // The structure is: aside > sticky div > second div (booking box)
    // But let's look for the h2 "Book an Interview" parent
    const header = Array.from(sidebar.querySelectorAll('h2')).find(h => h.textContent.includes('Book an Interview'));
    const bookingFormContainer = header?.parentElement;
    
    if (bookingFormContainer) {
        bookingFormContainer.innerHTML = `
            <div class="text-center py-8 animate-fade-in">
                <div class="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-foreground-light dark:text-foreground-dark mb-2">Booking Request Sent!</h2>
                <p class="text-muted-light dark:text-muted-dark mb-6">
                    Your booking request was submitted. The profile owner will be notified.
                </p>
                ${result.icsContent || result.hasICS ? `
                <a href="data:text/calendar;charset=utf8,${encodeURIComponent(result.icsContent || '')}" download="interview.ics" class="inline-block px-6 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity mb-4">
                    Download .ics
                </a>` : ''}
                <button onclick="location.reload()" class="block w-full text-primary hover:underline text-sm">
                    Book another time
                </button>
            </div>
        `;
    } else {
        alert('Booking Confirmed! Please check your email.');
        location.reload();
    }
  }

})();
