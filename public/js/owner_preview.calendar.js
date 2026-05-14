
import { normalizeAvailability } from './availability.model.js';
import { generateSlots } from './slotgen.js';
import { getSlotState } from './booking_utils.js';

export async function initCalendarPreview(profile) {
  const container = document.getElementById('booking-slots');
  
  // Calendar Elements
  const calendarPrev = document.getElementById('calendar-prev');
  const calendarNext = document.getElementById('calendar-next');
  const calendarMonth = document.getElementById('calendar-month');
  const calendarGrid = document.getElementById('calendar-grid');

  if (!container) {
    console.log('[owner-preview-calendar] No slots container found');
    return;
  }

  // State
  let allSlots = []; 
  let existingBookings = profile?.bookings || [];
  
  // Fetch bookings if missing and we have user ID
  // This ensures we show booked/reserved slots correctly
  if (existingBookings.length === 0 && (profile.userId || profile.owner_id || profile.user_id)) {
      try {
        const uid = profile.userId || profile.owner_id || profile.user_id;
        console.log('[owner-preview-calendar] Fetching bookings for owner:', uid);
        const res = await fetch(`/api/interviews?userId=${uid}`);
        
        if (res.ok) {
            const bookings = await res.json();
            // Map to generateSlots format
            existingBookings = bookings
              .filter(b => {
                 const status = (b.status || '').toLowerCase();
                 return status === 'pending' || status === 'confirmed';
              })
              .map(b => ({
                startISO: b.startTime || b.start_time || b.when,
                duration: b.duration || 30,
                status: (b.status || '').toLowerCase()
            }));
            console.log(`[owner-preview-calendar] Fetched ${existingBookings.length} bookings`);
        }
      } catch (e) {
          console.error('[owner-preview-calendar] Failed to fetch bookings:', e);
      }
  }
  
  // Calendar State
  let viewDate = new Date(); 
  let selectedDate = new Date();

  // Initialize
  const av = normalizeAvailability(profile?.availability);
  const profileTz = av?.timezone || 'UTC';

  console.log('[owner-preview-calendar] Initializing with availability:', av);
  console.log('[owner-preview-calendar] Using Profile Timezone:', profileTz);

  // Generate slots
  const slotsMap = generateSlots(av, existingBookings, {});
  allSlots = Array.from(slotsMap.values()).flat();
  
  console.log(`[owner-preview-calendar] Generated ${allSlots.length} slots.`);
  
  // Init Calendar Logic
  initCalendar();

  function initCalendar() {
    if (calendarPrev && calendarNext) {
        // Clone to remove existing listeners if any (though this runs once)
        const newPrev = calendarPrev.cloneNode(true);
        const newNext = calendarNext.cloneNode(true);
        calendarPrev.parentNode.replaceChild(newPrev, calendarPrev);
        calendarNext.parentNode.replaceChild(newNext, calendarNext);

        newPrev.onclick = () => {
            viewDate.setMonth(viewDate.getMonth() - 1);
            renderCalendar();
        };
        newNext.onclick = () => {
            viewDate.setMonth(viewDate.getMonth() + 1);
            renderCalendar();
        };
    }
    
    renderCalendar();
    renderSlotsForDate(selectedDate);
  }

  function getPartsInTz(date, tz) {
      const dtf = new Intl.DateTimeFormat('en-US', { 
          timeZone: tz, 
          year: 'numeric', month: 'numeric', day: 'numeric', 
          hour: 'numeric', minute: 'numeric' 
      });
      const parts = dtf.formatToParts(date);
      const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
      return {
          year: get('year'),
          month: get('month') - 1, // 0-based
          day: get('day')
      };
  }

  function renderCalendar() {
    if (!calendarMonth || !calendarGrid) return;

    // Update Month Label
    const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    calendarMonth.textContent = monthName;

    // Add Timezone Indicator if not present
    let tzIndicator = document.getElementById('preview-timezone-indicator');
    if (!tzIndicator) {
        tzIndicator = document.createElement('p');
        tzIndicator.id = 'preview-timezone-indicator';
        tzIndicator.className = 'text-xs text-center text-muted-light dark:text-muted-dark mt-1';
        
        // Fix: Ensure we have a valid parent before inserting
        // calendarMonth is the <p> element. Its parent is the div.flex.items-center.justify-between
        // We want to insert the indicator AFTER this header div, but BEFORE the calendar grid.
        
        const headerDiv = calendarMonth.closest('div.flex.items-center.justify-between');
        const gridDiv = calendarGrid;
        
        if (headerDiv && headerDiv.parentNode) {
            headerDiv.parentNode.insertBefore(tzIndicator, gridDiv);
        } else {
             // Fallback: append to the main container if structure is unexpected
             calendarGrid.parentNode.insertBefore(tzIndicator, calendarGrid);
        }
    }
    tzIndicator.textContent = `Time Zone: ${profileTz}`;

    // Render Headers
    const headers = ['S','M','T','W','T','F','S'];
    let html = '';
    
    headers.forEach(d => {
        html += `<span class="font-medium text-muted-light dark:text-muted-dark py-2">${d}</span>`;
    });

    // Calculate days
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDayOfWeek = firstDay.getDay(); 
    const daysInMonth = lastDay.getDate();

    // Empty cells
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<span></span>`;
    }

    // Days
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // We compare dates based on simple equality of year/month/day
    // But "selectedDate" is a JS Date object (local browser time).
    // For the purpose of the calendar GRID, we treat the grid as representing days in the Profile TZ.
    // So if I click "5", I mean "5th of the month in Profile TZ".
    
    const selYear = selectedDate.getFullYear();
    const selMonth = selectedDate.getMonth();
    const selDay = selectedDate.getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        // Construct a "Day" object relative to the grid view
        const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d);
        const isSelected = (selYear === year && selMonth === month && selDay === d);
        
        // Check availability using Profile TZ
        const hasSlots = allSlots.some(s => {
            const sDate = new Date(s.startISO);
            const p = getPartsInTz(sDate, profileTz);
            return p.day === d && p.month === month && p.year === year;
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
        
        html += `<button class="${classes}" data-day="${d}">${d}</button>`;
    }

    calendarGrid.innerHTML = html;

    // Add Click Listeners
    const buttons = calendarGrid.querySelectorAll('button[data-day]');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = parseInt(e.target.dataset.day);
            // Update selectedDate to reflect the clicked cell
            selectedDate = new Date(year, month, day);
            renderCalendar(); 
            renderSlotsForDate(selectedDate);
        });
    });
  }

  function renderSlotsForDate(date) {
    if (!container) return;
    container.innerHTML = '';
    
    // The "date" passed here is a JS Date object constructed from the calendar grid year/month/day.
    // We treat this as "Target Date in Profile TZ".
    const targetYear = date.getFullYear();
    const targetMonth = date.getMonth();
    const targetDay = date.getDate();

    const slots = allSlots.filter(s => {
        const sDate = new Date(s.startISO);
        // Convert slot time to Profile TZ parts
        const p = getPartsInTz(sDate, profileTz);
        return p.day === targetDay && p.month === targetMonth && p.year === targetYear;
    });

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
        const isBooked = s.isBooked;
        
        let baseClass = 'px-4 py-2 rounded-lg bg-[#ededed] dark:bg-neutral-800 text-sm cursor-not-allowed opacity-80 border border-transparent';
        
        const t = new Date(s.startISO);
        const timeStr = t.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            timeZone: profileTz,
            hour12: true
        });

        if (isBooked) {
             // Fallback if className is missing from slotgen
             let className = s.className;
             if (!className) {
                 const state = getSlotState(s.startISO, s.durationMinutes || 30, existingBookings);
                 className = state.className;
             }
             
             // Ensure we have a valid class name
             if (!className || className.trim() === '') {
                 const status = (s.status || 'confirmed').toLowerCase();
                 className = status === 'pending' 
                    ? 'bg-orange-50 border-orange-200 text-orange-600 cursor-not-allowed opacity-90' 
                    : 'bg-red-50 border-red-200 text-red-600 cursor-not-allowed opacity-80';
             }
             
             baseClass = `px-4 py-2 rounded-lg text-sm transition-colors border ${className}`;
             btn.disabled = true;
             btn.title = s.label || 'Booked';
             btn.innerHTML = `
                <span class="block text-xs opacity-75">${s.label || (s.status === 'pending' ? 'Reserved' : 'Booked')}</span>
                <span>${timeStr}</span>
             `;
        } else {
             btn.textContent = timeStr;
             btn.title = `Preview Mode: Booking Disabled (${profileTz})`;
        }
        
        btn.className = baseClass;
        
        // No click listener needed for preview mode as it's disabled/read-only visually
        // But if we want a toast, we can add it.
        btn.addEventListener('click', (e) => {
            e.preventDefault();
        });
        
        list.appendChild(btn);
    });
    
    container.appendChild(list);
  }
}
