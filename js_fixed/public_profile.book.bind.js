// /js/public_profile.book.bind.js
import { store } from '/js/data-store.js';
import { normalizeAvailability } from './availability.model.js';
import { generateSlots } from './slotgen.js';

(function initPublicBooking() {
  const container = document.querySelector('[data-booking-slots], #booking-slots');
  if (!container) {
    console.log('[booking] No slots container found - skipping public booking setup');
    return;
  }

  const profileId = new URL(location.href).searchParams.get('id');
  if (!profileId) {
    console.log('[booking] No profile ID in URL - skipping public booking setup');
    return;
  }

  (async function hydrate() {
    const prof = store.getProfile?.({ id: profileId });
    if (!prof) {
      console.log('[booking] Profile not found:', profileId);
      return;
    }
    const av = normalizeAvailability(prof?.availability);
    const slotsMap = generateSlots(av, prof?.bookings || [], {});
    renderSlots(container, slotsMap);
  })();

  function renderSlots(host, slotsMap) {
    host.innerHTML = '';
    if (!slotsMap.size) {
      host.innerHTML = '<p class="text-sm text-neutral-500">No available slots.</p>';
      return;
    }
    for (const [day, slots] of slotsMap) {
      const section = document.createElement('section');
      section.className = 'mb-6';
      const h = document.createElement('h4');
      h.className = 'font-semibold mb-2';
      h.textContent = day;
      section.appendChild(h);

      const list = document.createElement('div');
      list.className = 'flex flex-wrap gap-2';
      slots.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1 rounded-full bg-[#ededed] dark:bg-neutral-700 text-sm';
        const t = new Date(s.startISO);
        btn.textContent = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        list.appendChild(btn);
      });
      section.appendChild(list);
      host.appendChild(section);
    }
  }
})();
