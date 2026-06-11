// profile_edit.bind.js — binder for profile_edit_enhanced.html
// Keeps nested `display` model and `store.*` API.

import { $, $$, toast } from '/js/app.js';
import { store } from '/js/data-store.js';

(async function initProfileEditBinder(){
  await store.syncAssetsFromAPI?.().catch(()=>{});

  const id = new URL(location.href).searchParams.get('id') || (store._idx?.()||[])[0];
  let profile = id ? store.getProfile({ id }) : store.createDraftProfile();

  // Wire Save button in header
  $$('header button,[data-test="save-top"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      store.updateProfile(profile.id, profile);
      toast?.('Profile saved');
    });
  });

  // ===== Rules Section Enhancements (DOM patch only) =====
  function injectRulesUI(){
    // Remove Scheduling Window + Increments (if present)
    document.querySelector('#window')?.closest('div')?.remove();
    document.querySelector('#increments')?.closest('div')?.remove();

    // Minimum Notice: add Immediate + Custom
    const minSel = document.querySelector('#min-notice');
    if (minSel && !minSel.querySelector('option[value="immediate"]')) {
      const opt0=document.createElement('option'); opt0.value='immediate'; opt0.textContent='Immediate';
      const optC=document.createElement('option'); optC.value='custom';    optC.textContent='Custom…';
      minSel.prepend(opt0);
      minSel.appendChild(optC);
      const holder=document.createElement('div');
      holder.className='mt-2';
      holder.innerHTML = '<input id="min-notice-custom" type="number" min="0" class="form-input w-28 rounded-lg border border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark text-sm" placeholder="hours" /> <span class="text-xs text-neutral-500 dark:text-neutral-400 ml-2">Enter hours for custom notice</span>';
      minSel.parentElement?.appendChild(holder);
    }

    // Buffers explainer
    const rulesBoxes = $$('.p-6.border.rounded-lg');
    const rulesBox = rulesBoxes?.[1];
    if (rulesBox) {
      const buffersLabel = Array.from(rulesBox.querySelectorAll('div')).find(d=>/buffers/i.test(d.textContent||''));
      if (buffersLabel && !buffersLabel.querySelector('[data-buffers-expl]')){
        const exp = document.createElement('p');
        exp.setAttribute('data-buffers-expl','');
        exp.className = 'text-xs text-neutral-500 dark:text-neutral-400 mt-2';
        exp.textContent = 'Sets the amount of time you will have between interviews (avoids back-to-back interviews).';
        buffersLabel.appendChild(exp);
      }
    }

    // Daily cap explainer
    const capInput = document.querySelector('#daily-cap');
    if (capInput) {
      const capBlock = capInput.closest('div');
      if (capBlock && !capBlock.querySelector('[data-cap-expl]')){
        const exp = document.createElement('p');
        exp.setAttribute('data-cap-expl','');
        exp.className = 'text-xs text-neutral-500 dark:text-neutral-400 mt-2';
        exp.textContent = 'Set the total number of interviews you will accept in a day, leave blank for unlimited interviews.';
        capBlock.appendChild(exp);
      }
    }

    // Durations add 45 & 120 chips
    const durBlock = Array.from(document.querySelectorAll('.p-6.border.rounded-lg')).find(b=>/Durations/i.test(b.textContent||''));
    if (durBlock && !durBlock.querySelector('[data-dur-45]')){
      const row = durBlock.querySelector('.mt-1.flex, .flex.items-center.gap-2') || durBlock;
      const addChip = (label, attr)=>{
        const span=document.createElement('span');
        span.className='bg-[#ededed] dark:bg-neutral-700 rounded-full px-3 py-1 text-sm';
        if (attr) span.setAttribute(attr,'');
        span.textContent=label;
        const addBtn = row.querySelector('button');
        row.insertBefore(span, addBtn||null);
      };
      addChip('45 min','data-dur-45');
      addChip('120 min','data-dur-120');
    }
  }

  function readRulesInto(model){
    // Minimum notice
    const sel = document.querySelector('#min-notice')?.value;
    if (sel === 'immediate') {
      model.minNoticeHours = 0;
    } else if (sel === 'custom') {
      const v = parseInt(document.querySelector('#min-notice-custom')?.value||'0',10);
      model.minNoticeHours = isNaN(v) ? 0 : v;
    } else {
      const n = document.querySelector('#min-notice')?.value?.match(/(\d+)/)?.[1];
      if (n) model.minNoticeHours = parseInt(n,10);
    }

    // Daily cap: blank = unlimited
    const capRaw = (document.querySelector('#daily-cap')?.value||'').trim();
    model.dailyCap = capRaw === '' ? Infinity : parseInt(capRaw,10);

    // Durations: ensure 45 & 120 exist
    const set = new Set(model.durations || [15,30,60]);
    set.add(45); set.add(120);
    model.durations = Array.from(set).sort((a,b)=>a-b);
  }

  // Save within Availability box
  const availSaveBtns = $$('section:has(h2:contains("Set Your Availability")) button').filter(b=>/save/i.test(b.textContent||''));
  availSaveBtns.forEach(b=> b.addEventListener('click', ()=>{
    injectRulesUI();
    profile.availability = profile.availability || {};
    readRulesInto(profile.availability);
    store.updateProfile(profile.id, profile);
    window.dispatchEvent(new CustomEvent('availability:updated',{detail:{profileId:profile.id, model:profile.availability}}));
    toast?.('Availability saved');
  }));

  injectRulesUI();
})();
