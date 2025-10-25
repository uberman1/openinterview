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
    checkbox: root.querySelector(`#${d}`),
    addBtn: root.querySelector(`#${d}`)?.closest('.p-4')?.querySelector('button')
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
    row.addBtn?.addEventListener('click', () => {
      const start = prompt('Start time (HH:MM, 24h)', '09:00');
      const end = prompt('End time (HH:MM, 24h)', '17:00');
      model = addBlock(model, row.day, { start, end });
      renderBlocks(row.day);
    });
  }

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

  (async function hydrate() {
    const prof = store.getProfile?.({ id: profileId });
    model = normalizeAvailability(prof?.availability);
    render();
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
