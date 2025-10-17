// src/js/availability.js
import { store } from './data-store.js';

function getParam(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function renderSlots(state){
  const list = document.getElementById('slotsList');
  if (!list) return;
  list.innerHTML = '';
  const days = ['Mon','Tue','Wed','Thu','Fri'];
  for (const d of days){
    const li = document.createElement('li');
    const slots = state.dailySlots?.[d] || [];
    li.textContent = `${d}: ${slots.join(', ') || '—'}`;
    list.appendChild(li);
  }
}

function addSlot(state, day, time){
  state.dailySlots = state.dailySlots || {};
  state.dailySlots[day] = Array.from(new Set([...(state.dailySlots[day]||[]), time])).sort();
}

function onSave(profileId, state){
  store.updateProfile(profileId, { availability: state });
  alert('Availability saved for this profile.');
  window.location.href = `/profile/${encodeURIComponent(profileId)}`;
}

function init(){
  const profileId = getParam('id');
  const p = store.getProfile({ id: profileId });
  if (!p) { document.body.innerHTML = '<p>Profile not found</p>'; return; }
  const state = structuredClone(p.availability || { tz:'America/New_York', dailySlots:{}, exceptions:{} });

  renderSlots(state);

  document.getElementById('btnAddSlot')?.addEventListener('click', () => {
    const day = document.getElementById('day').value;
    const time = document.getElementById('time').value;
    if (!day || !time) return;
    addSlot(state, day, time);
    renderSlots(state);
  });

  document.getElementById('btnSaveAvailability')?.addEventListener('click', () => onSave(profileId, state));
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
