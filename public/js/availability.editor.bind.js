// /js/availability.editor.bind.js
import { createDefaultAvailability, normalizeAvailability, setDayEnabled, addBlock, removeBlock, clearBlocks, copyDayToAll, setRules, DAYS } from './availability.model.js';
import { store } from '/js/data-store.js';

(function initAvailabilityEditor() {
  const root = document.querySelector('#availability-section');
  if (!root) return;

  const profileId = new URL(location.href).searchParams.get('id');
  let model = createDefaultAvailability();

  const dayRows = DAYS.map(d => ({
    day: d,
    checkbox: root.querySelector(`#${d}`)
  }));

  for (const row of dayRows) {
    const host = row.checkbox?.closest('.p-4');
    if (!host) continue;
    let list = host.querySelector('.oi-blocks');
    if (!list) {
      list = document.createElement('div');
      list.className = 'oi-blocks mt-2 flex flex-wrap gap-2';
      host.appendChild(list);
    }
  }
  
  console.log('[availability] Editor initialized for', DAYS.length, 'days');

  function render() {
    for (const row of dayRows) {
      if (!row.checkbox) continue;
      row.checkbox.checked = !!model.weekly[row.day].enabled;
      renderBlocks(row.day);
    }
    setSelect('#min-notice', model.rules.minNoticeHours + ' hours');
    setInput('#window', `${model.rules.windowDays} days into the future`);
    setSelect('#increments', `${model.rules.incrementsMinutes} minutes`);
    setNumberFromSelector(root, 'div:has(> input.w-20) input.w-20', [model.rules.bufferBeforeMinutes, model.rules.bufferAfterMinutes]);
    setInput('#daily-cap', model.rules.dailyCap === '' ? '' : String(model.rules.dailyCap));
  }

  function renderBlocks(day) {
    const host = root.querySelector(`#${day}`)?.closest('.p-4');
    if (!host) return;
    const list = host.querySelector('.oi-blocks');
    if (!list) return;
    list.innerHTML = '';
    const blocks = model.weekly[day].blocks;
    if (!blocks.length) {
      const span = document.createElement('span');
      span.className = 'text-xs text-neutral-500';
      span.textContent = 'No hours set';
      list.appendChild(span);
      return;
    }
    blocks.forEach((b, i) => {
      const pill = document.createElement('span');
      pill.className = 'px-3 py-1 rounded-full text-sm bg-[#ededed] dark:bg-neutral-700 flex items-center gap-2';
      pill.textContent = `${b.start}–${b.end}`;
      const del = document.createElement('button');
      del.innerHTML = '&times;';
      del.className = 'ml-1 text-neutral-600 hover:text-red-600';
      del.addEventListener('click', () => {
        model = removeBlock(model, day, i);
        renderBlocks(day);
      });
      pill.appendChild(del);
      list.appendChild(pill);
    });
  }

  function setSelect(sel, valueText) {
    const el = root.querySelector(sel);
    if (!el) return;
    for (const opt of el.options) {
      if (opt.textContent.trim() === valueText) {
        el.value = opt.value;
        break;
      }
    }
  }

  function setInput(sel, val) { const el = root.querySelector(sel); if (el) el.value = val; }
  function setNumberFromSelector(container, subSel, values) {
    const inputs = container.querySelectorAll(subSel);
    values.forEach((v, i) => { const el = inputs[i]; if (el) el.value = v; });
  }

  for (const row of dayRows) {
    row.checkbox?.addEventListener('change', (e) => {
      model = setDayEnabled(model, row.day, e.target.checked);
      renderBlocks(row.day);
    });
  }

  // Attach event listeners to ALL "Add Block" buttons (find dynamically)
  root.querySelectorAll('button').forEach(btn => {
    const btnText = btn.textContent?.trim();
    if (btnText?.includes('Add Block')) {
      const dayContainer = btn.closest('.p-4');
      if (!dayContainer) return;
      
      // Find which day this button belongs to
      const checkbox = dayContainer.querySelector('input[type="checkbox"]');
      const dayId = checkbox?.id;
      if (!dayId || !DAYS.includes(dayId)) return;
      
      console.log('[availability] Attached Add Block listener for', dayId);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const input = prompt('Enter time block (HH:MM-HH:MM, 24h format)\nExample: 09:00-12:00', '09:00-17:00');
        if (!input) return;
        
        const parts = input.split('-').map(s => s.trim());
        if (parts.length !== 2) {
          alert('Invalid format. Use HH:MM-HH:MM (e.g., 09:00-12:00)');
          return;
        }
        
        const [start, end] = parts;
        console.log('[availability] Adding block:', dayId, start, end);
        model = addBlock(model, dayId, { start, end });
        renderBlocks(dayId);
      });
    }
  });

  root.querySelectorAll('.p-6 .space-y-2 button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const text = e.currentTarget.textContent.trim();
      if (text.startsWith('Copy daily hours')) {
        const src = DAYS.find(d => model.weekly[d].blocks.length) || 'mon';
        model = copyDayToAll(model, src);
        DAYS.forEach(renderBlocks);
      } else if (text.startsWith('Set all to unavailable')) {
        for (const d of DAYS) model = setDayEnabled(model, d, false);
        render();
      } else if (text.startsWith('Clear all hours')) {
        for (const d of DAYS) model = clearBlocks(model, d);
        DAYS.forEach(renderBlocks);
      }
    });
  });

  root.querySelector('#min-notice')?.addEventListener('change', (e) => {
    const hours = Number(e.target.value);
    model = setRules(model, { minNoticeHours: hours });
  });
  root.querySelector('#window')?.addEventListener('change', (e) => {
    const m = String(e.target.value).match(/(\d+)/);
    const days = m ? Number(m[1]) : 60;
    model = setRules(model, { windowDays: days });
  });
  root.querySelector('#increments')?.addEventListener('change', (e) => {
    const minutes = Number(e.target.value);
    model = setRules(model, { incrementsMinutes: minutes });
  });

  const bufferInputs = root.querySelectorAll('div:has(> input.w-20) input.w-20');
  bufferInputs?.[0]?.addEventListener('change', (e) => {
    model = setRules(model, { bufferBeforeMinutes: Number(e.target.value) });
  });
  bufferInputs?.[1]?.addEventListener('change', (e) => {
    model = setRules(model, { bufferAfterMinutes: Number(e.target.value) });
  });

  root.querySelector('#daily-cap')?.addEventListener('change', (e) => {
    const v = e.target.value.trim();
    model = setRules(model, { dailyCap: v === '' ? '' : Number(v) });
  });

  (function hydrate() {
    console.log('[availability] Hydrating availability for profile:', profileId);
    const prof = store.getProfile?.({ id: profileId });
    console.log('[availability] Profile loaded:', prof ? 'found' : 'NOT FOUND');
    if (prof) {
      console.log('[availability] Profile availability:', JSON.stringify(prof.availability, null, 2));
      model = normalizeAvailability(prof.availability);
      console.log('[availability] Normalized model:', JSON.stringify(model, null, 2));
      render();
      console.log('[availability] Render complete');
    } else {
      console.warn('[availability] Profile not found, using defaults');
    }
  })();

  window.addEventListener('profile:save-request', async () => {
    console.log('[availability] Save request received, persisting availability...');
    const prof = store.getProfile?.({ id: profileId });
    if (prof) {
      store.updateProfile?.(profileId, { ...prof, availability: model });
      console.log('[availability] Availability saved');
      window.dispatchEvent(new CustomEvent('availability:saved'));
    }
  });
})();
