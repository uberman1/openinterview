// profile_edit.bind.js — wires the provided Editable Profile HTML to app functionality
// Non‑destructive binder: uses selectors from the given markup; no HTML changes required.
// Assumes existing helpers from your codebase: app.js ($, $$, toast), data-store.js (getProfile, updateProfile, publishProfile, createAsset)

import { $, $$, toast } from './app.js';
import { getProfile, updateProfile } from './data-store.js';

(function initProfileEditBinder(){
  const profile = safeGetProfile();
  hydrate(profile);
  wireBasics(profile);
  wireMedia(profile);
  wireSocial(profile);
  wireResumeAndAttachments(profile);
  wireHighlights(profile);
  wireResumeImportUI(profile);
  wireAvailability(profile);

  // Top "Save Profile" button
  const saveBtn = $$('header button').find(b=> b.textContent.trim().toLowerCase()==='save profile');
  saveBtn?.addEventListener('click', async ()=>{
    try {
      await updateProfile(currentModel());
      toast('Profile saved');
    } catch(e){ console.error(e); toast('Failed to save', { type:'error' }); }
  });

  // ---- helpers ----
  function safeGetProfile(){
    try { return getProfile(); } catch(e){ return seed(); }
  }

  function seed(){
    return {
      id: crypto.randomUUID(),
      name: '',
      title: '',
      location: '',
      bio: '',
      avatarUrl: '',
      videoUrl: '',
      links: [
        { kind:'linkedin', url:'' },
        { kind:'portfolio', url:'' }
      ],
      resume: { name:'', url:'' },
      attachments: [],
      highlights: '',
      availability: defaultAvailability()
    };
  }

  function defaultAvailability(){
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      incrementsMins: 30,
      durationMins: 30,
      bufferBeforeMins: 15,
      bufferAfterMins: 15,
      minNoticeHours: 24,
      windowDays: 60,
      dailyCap: 5,
      durations: [15,30,60],
      weekly: {0:[],1:[{start:'09:00',end:'17:00'}],2:[{start:'09:00',end:'12:00'},{start:'14:00',end:'17:00'}],3:[],4:[{start:'10:00',end:'16:00'}],5:[],6:[]},
      rules: [] // future blackout windows
    };
  }

  function currentModel(){
    // Pull current DOM values back into a single object
    const model = structuredClone(profile);

    // Basics
    model.name = $('input[placeholder="Your Name"]').value.trim();
    model.title = $('input[placeholder="Your Title"]').value.trim();
    model.location = $('input[placeholder="City, Country"]').value.trim();
    model.bio = $('textarea[placeholder^="Tell us"]').value.trim();

    // Links
    const linkRows = $$('#attachments-container > div.flex.items-end.gap-2');
    model.links = linkRows.map(row => {
      const label = row.querySelector('p')?.textContent?.toLowerCase() || '';
      const input = row.querySelector('input');
      return { kind: label.includes('linkedin')?'linkedin':label.includes('portfolio')?'portfolio':'other', url: input?.value?.trim()||'' };
    });

    // Highlights
    model.highlights = $('section:has(h2:contains("Highlights")) textarea')?.value || model.highlights;

    // Resume/attachments are managed by their wire function which updates profile directly; keep as-is

    // Availability
    model.availability = readAvailabilityFromUI(model.availability);

    return model;
  }

  function hydrate(p){
    // Basics
    $('input[placeholder="Your Name"]').value = p.name||'';
    $('input[placeholder="Your Title"]').value = p.title||'';
    $('input[placeholder="City, Country"]').value = p.location||'';
    $('textarea[placeholder^="Tell us"]').value = p.bio||'';

    // Avatar
    const avatar = $('.aspect-square.rounded-full');
    if (p.avatarUrl) avatar.style.backgroundImage = `url(${CSS.escape(p.avatarUrl)})`;

    // Video placeholder (just show text; player handled on upload)

    // Links
    const rows = $$('#attachments-container > div.flex.items-end.gap-2');
    rows.forEach((row, i)=>{
      const input = row.querySelector('input');
      input.value = p.links?.[i]?.url || '';
    });

    // Resume list
    renderResumeAndAttachments(p);

    // Highlights
    const hi = $('section:has(h2:contains("Highlights")) textarea');
    if (hi) hi.value = p.highlights||'';

    // Availability
    paintAvailability(p.availability);
  }

  function wireBasics(p){
    // Input listeners can set dirty state if needed; saving handled by top button
  }

  function wireMedia(p){
    // Avatar upload
    const avatarBtn = $$('button').find(b=> b.textContent.trim()==='Upload/Change Photo');
    avatarBtn?.addEventListener('click', async ()=>{
      const file = await pickFile('image/*');
      if (!file) return;
      if (file.size > 2*1024*1024) return toast('Image too large (max 2MB)', {type:'error'});
      const url = await fakeUpload(file); // replace with /api/upload/avatar
      p.avatarUrl = url;
      $('.aspect-square.rounded-full').style.backgroundImage = `url(${CSS.escape(url)})`;
      await updateProfile(p);
      toast('Avatar updated');
    });

    // Video upload
    const videoBtn = $$('button').find(b=> b.textContent.trim()==='Upload Video');
    videoBtn?.addEventListener('click', async ()=>{
      const file = await pickFile('video/*');
      if (!file) return;
      const url = await fakeUpload(file); // replace with /api/upload/video
      p.videoUrl = url;
      await updateProfile(p);
      toast('Video uploaded');
    });
  }

  function wireSocial(p){
    // Delete buttons per row
    $$('#attachments-container button:has(.material-symbols-outlined)').forEach((btn, idx)=>{
      btn.addEventListener('click', ()=>{
        const rows = $$('#attachments-container > div.flex.items-end.gap-2');
        rows[idx].remove();
      });
    });

    // Add More button appends a blank row (visual only; persisted on Save)
    const addBtn = $$('section:has(h2:contains("Social Media")) button').find(b=> b.textContent.trim()==='Add More');
    addBtn?.addEventListener('click', ()=>{
      const container = $('#attachments-container');
      const row = document.createElement('div');
      row.className = 'flex items-end gap-2';
      row.innerHTML = `
        <label class="flex flex-col min-w-40 flex-1">
          <p class="text-primary dark:text-neutral-50 text-base font-medium leading-normal pb-2">Other</p>
          <input class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-primary dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-12 px-4 text-base font-normal leading-normal" placeholder="https://..." value=""/>
        </label>
        <button class="flex min-w-[40px] h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 text-sm font-medium leading-normal">
          <span class="material-symbols-outlined">delete</span>
        </button>`;
      container.appendChild(row);
    });
  }

  
  function wireResumeAndAttachments(p){
    const uploadBtn = $$('button').find(b=> b.textContent.trim()==='Upload Files');
    uploadBtn?.addEventListener('click', async ()=>{
      const files = await pickFiles(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/*']);
      if (!files?.length) return;
      let didAnalyze = false;
      for (const f of files){
        const url = await fakeUpload(f); // replace with /api/upload/attachment
        const isResumeLike = f.name.toLowerCase().includes('resume') || f.type==='application/pdf' || f.type.includes('msword') || f.type.includes('officedocument');
        if (isResumeLike && !p.resume?.url){
          p.resume = { name: f.name, url };
          try {
            await analyzeResumeAndPopulate(f, url, p); // GPT-powered extraction
            didAnalyze = true;
          } catch (e){ console.warn('AI extract failed', e); }
        } else {
          p.attachments.push({ name:f.name, url });
        }
      }
      await updateProfile(p);
      renderResumeAndAttachments(p);
      toast(didAnalyze ? 'Resume uploaded and profile populated' : 'Files uploaded');
    });
  }


  function renderResumeAndAttachments(p){
    const sections = $$('section:has(h2:contains("Resume")) .space-y-4 > .flex.items-center.justify-between');
    // First two tiles are sample placeholders in the provided HTML; we will repurpose:
    const container = sections[0]?.parentElement; if (!container) return;
    container.innerHTML = '';

    if (p.resume?.name){
      container.appendChild(fileRow(p.resume.name, ()=>{
        p.resume = { name:'', url:'' }; updateProfile(p).then(()=>renderResumeAndAttachments(p));
      }));
    }

    for (const att of p.attachments){
      container.appendChild(fileRow(att.name, ()=>{
        p.attachments = p.attachments.filter(a=> a!==att);
        updateProfile(p).then(()=>renderResumeAndAttachments(p));
      }));
    }

    function fileRow(name, onDelete){
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-4 border border-[#cccccc] dark:border-neutral-700 rounded-lg';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-neutral-500">description</span>
          <span class="font-medium">${name}</span>
        </div>
        <button class="flex min-w-[40px] h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 text-sm font-medium leading-normal">
          <span class="material-symbols-outlined">delete</span>
        </button>`;
      row.querySelector('button').addEventListener('click', onDelete);
      return row;
    }
  }

  function wireHighlights(p){
    const ta = $('section:has(h2:contains("Highlights")) textarea');
    ta?.addEventListener('input', ()=>{ p.highlights = ta.value; });
  }

  // ===== Availability wiring (replaces availability.html) =====
  // ---------- resume import (top-of-page selector) ----------
  function wireResumeImportUI(p){
    // Locate the new top section controls (flexible selectors to match your exact HTML)
    const container = document.querySelector('#resumeImport')
      || document.querySelector('section:has(h2:contains("Select a Resume"))')
      || document.querySelector('section:has(h2:contains("Resume"))');

    const select = container?.querySelector('#resumeSourceSelect')
      || container?.querySelector('select[data-bind="resume-source"]')
      || container?.querySelector('select');

    const populateBtn = container?.querySelector('#btnResumePopulate')
      || container?.querySelector('[data-action="resume-populate"]')
      || Array.from(container?.querySelectorAll('button')||[]).find(b=>/populate/i.test(b.textContent||''));

    const addNewBtn = container?.querySelector('#btnResumeAddNew')
      || container?.querySelector('[data-action="resume-add"]')
      || Array.from(container?.querySelectorAll('button')||[]).find(b=>/add new/i.test(b.textContent||''));

    if (!select) return; // Section not present; nothing to do

    function resumeLike(a){
      const n = (a?.name||'').toLowerCase();
      const t = (a?.type||'');
      const url = a?.url||'';
      return n.includes('resume') || /\.pdf($|\?)/.test(url) || /docx?($|\?)/.test(url) || t.includes('pdf') || t.includes('word') || t.includes('officedocument');
    }

    function getExistingResumes(){
      const items = [];
      if (p.resume?.url) items.push({ name: p.resume.name||'Resume', url: p.resume.url, primary:true });
      for (const att of p.attachments||[]){
        if (resumeLike(att)) items.push({ name: att.name||'Attachment', url: att.url, primary:false });
      }
      return items;
    }

    function paintOptions(){
      const items = getExistingResumes();
      select.innerHTML = '';
      const mk = (v, label, extraAttrs={})=>{
        const opt = document.createElement('option'); opt.value = v; opt.textContent = label;
        Object.entries(extraAttrs).forEach(([k,val])=> opt.setAttribute(k, val));
        return opt;
      };
      if (!items.length) select.appendChild(mk('', '— No resumes yet —'));
      items.forEach(it=> select.appendChild(mk(it.url, `${it.primary?'[Primary] ':''}${it.name}`, { 'data-name': it.name })));
      select.appendChild(mk('__add_new__', 'Add new…'));
      const primary = items.find(i=> i.primary);
      if (primary) select.value = primary.url;
    }

    paintOptions();

    select.addEventListener('change', async ()=>{
      if (select.value === '__add_new__'){
        const file = await pickFile('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        if (!file) { paintOptions(); return; }
        const url = await fakeUpload(file);
        p.resume = { name: file.name, url };
        await updateProfile(p);
        renderResumeAndAttachments(p);
        paintOptions();
        select.value = url;
      }
    });

    addNewBtn?.addEventListener('click', ()=> select.dispatchEvent(new Event('change')));

    populateBtn?.addEventListener('click', async ()=>{
      let url = select.value;
      let fileName = select.options[select.selectedIndex]?.getAttribute('data-name') || 'resume.pdf';

      if (!url || url === '__add_new__'){
        const file = await pickFile('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        if (!file) return;
        url = await fakeUpload(file);
        p.resume = { name:file.name, url };
        await updateProfile(p);
        renderResumeAndAttachments(p);
        paintOptions();
        try {
          await analyzeResumeAndPopulate(file, url, p);
          toast('Profile populated from resume');
        } catch(e){ console.error(e); toast('Could not analyze resume', {type:'error'}); }
        return;
      }

      try {
        const blob = await fetchBlob(url);
        const file = new File([blob], fileName, { type: blob.type||'application/pdf' });
        await analyzeResumeAndPopulate(file, url, p);
        toast('Profile populated from resume');
      } catch(e){ console.error(e); toast('Could not load the selected resume', {type:'error'}); }
    });
  }

  async function fetchBlob(url){
    const res = await fetch(url, { mode:'cors' });
    if (!res.ok) throw new Error('Failed to fetch resume: '+res.status);
    return await res.blob();
  }

  function wireAvailability(p){
    // Buttons
    const saveBtn = $$('section:has(h2:contains("Set Your Availability")) button').find(b=> b.textContent.trim()==='Save');
    const revertBtn = $$('section:has(h2:contains("Set Your Availability")) button').find(b=> b.textContent.trim()==='Revert');

    // Quick Actions
    const quickPanel = $$('section:has(h2:contains("Set Your Availability")) .p-6.border.rounded-lg')[0];
    const qaButtons = quickPanel?.querySelectorAll('button');

    // Day checkboxes
    const dayIds = ['sun','mon','tue','wed','thu','fri','sat'];

    // Add Block buttons (per day row)
    const addBlockButtons = $$('button').filter(b=> b.textContent.trim()==='Add Block');

    // Save
    saveBtn?.addEventListener('click', async ()=>{
      p.availability = readAvailabilityFromUI(p.availability);
      await updateProfile(p);
      window.dispatchEvent(new CustomEvent('availability:updated', { detail:{profileId:p.id, model:p.availability} }));
      toast('Availability saved');
    });

    // Revert
    revertBtn?.addEventListener('click', ()=>{
      paintAvailability(p.availability);
      toast('Reverted');
    });

    // Quick actions
    qaButtons?.[0]?.addEventListener('click', ()=>{
      // Copy first checked weekday's blocks to all weekdays Mon–Fri
      const model = readAvailabilityFromUI(p.availability);
      const src = model.weekly[1]?.length? structuredClone(model.weekly[1]) : [{start:'09:00',end:'17:00'}];
      for (let d=1; d<=5; d++) model.weekly[d] = structuredClone(src);
      paintAvailability(model);
    });
    qaButtons?.[1]?.addEventListener('click', ()=>{
      const model = readAvailabilityFromUI(p.availability);
      for (let d=0; d<=6; d++) model.weekly[d] = [];
      paintAvailability(model);
    });
    qaButtons?.[2]?.addEventListener('click', ()=>{
      const model = readAvailabilityFromUI(p.availability);
      for (let d=0; d<=6; d++) model.weekly[d] = [];
      paintAvailability(model);
    });

    // Add Block handlers
    addBlockButtons.forEach((btn, idx)=>{
      btn.addEventListener('click', ()=>{
        const model = readAvailabilityFromUI(p.availability);
        const day = [1,2,4][idx] ?? 1; // based on the sample markup order (Mon, Tue, Thu rows have Add Block)
        const start = prompt('Start time (HH:MM) e.g., 09:00');
        const end = prompt('End time (HH:MM) e.g., 17:00');
        if (!isTime(start) || !isTime(end)) return toast('Invalid time');
        model.weekly[day] = model.weekly[day] || [];
        model.weekly[day].push({ start, end });
        paintAvailability(model);
      });
    });

    // Rules panel events (min notice, window, increments, buffers, cap, durations are read on save)

    // Initial paint
    paintAvailability(p.availability);
  }

  function paintAvailability(model){
    // Timezone select (use first select inside Weekly Hours block)
    const tzSel = $$('section:has(h2:contains("Set Your Availability")) select')[0];
    if (tzSel) tzSel.value = stringifyTZ(model.timezone);

    // Day availability pills: rebuild based on model.weekly
    // Find each day row by label id (sun..sat) and sibling container for pills
    const dayDefs = [
      { id:'sun', idx:0 },
      { id:'mon', idx:1 },
      { id:'tue', idx:2 },
      { id:'wed', idx:3 },
      { id:'thu', idx:4 },
      { id:'fri', idx:5 },
      { id:'sat', idx:6 },
    ];

    dayDefs.forEach(({id, idx})=>{
      const row = $(`#${id}`)?.closest('.p-4');
      if (!row) return;
      const checkbox = row.querySelector(`#${id}`);
      const pillWrap = row.querySelector('.flex-grow');
      const ranges = model.weekly[idx] || [];

      checkbox.checked = ranges.length>0;
      pillWrap.innerHTML = '';
      if (!ranges.length){
        pillWrap.textContent = 'Unavailable';
        pillWrap.className = 'flex-grow text-neutral-500 dark:text-neutral-400 text-sm';
      } else {
        pillWrap.className = 'flex-grow flex flex-wrap gap-2';
        for (const r of ranges){
          const pill = document.createElement('div');
          pill.className = 'flex items-center gap-2 bg-[#ededed] dark:bg-neutral-700 rounded-md px-2 py-1';
          pill.innerHTML = `<span class="text-sm">${r.start} - ${r.end}</span><button class="text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-neutral-50"><span class="material-symbols-outlined text-base">close</span></button>`;
          pill.querySelector('button').addEventListener('click', ()=>{
            const m = readAvailabilityFromUI(model);
            m.weekly[idx] = (m.weekly[idx]||[]).filter(x=> !(x.start===r.start && x.end===r.end));
            paintAvailability(m);
          });
          pillWrap.appendChild(pill);
        }
      }
    });

    // Rules panel paint
    $('#min-notice').value = `${model.minNoticeHours || 24} hours`;
    $('#window').value = `${model.windowDays || 60} days into the future`;
    $('#increments').value = `${model.incrementsMins || 30} minutes`;
    const rulesBox = $$('section:has(h2:contains("Set Your Availability")) .p-6.border.rounded-lg')[1];
    if (rulesBox){
      const inputs = rulesBox.querySelectorAll('input[type="number"]');
      if (inputs[0]) inputs[0].value = model.bufferBeforeMins || 15;
      if (inputs[1]) inputs[1].value = model.bufferAfterMins || 15;
      const cap = rulesBox.querySelector('#daily-cap');
      if (cap) cap.value = model.dailyCap || 5;
    }
  }

  function readAvailabilityFromUI(fallback){
    const model = structuredClone(fallback || defaultAvailability());

    // Timezone
    const tzSel = $$('section:has(h2:contains("Set Your Availability")) select')[0];
    model.timezone = parseTZ(tzSel?.value) || model.timezone;

    // Day rows
    const map = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
    for (const id in map){
      const row = $(`#${id}`)?.closest('.p-4');
      const pillWrap = row?.querySelector('.flex-grow');
      const checked = row?.querySelector(`#${id}`)?.checked;
      model.weekly[map[id]] = [];
      if (!row || !pillWrap || !checked) continue;
      pillWrap.querySelectorAll('span.text-sm').forEach(s=>{
        const [start, end] = s.textContent.split(' - ').map(t=> t.trim());
        if (isTime(start) && isTime(end)) model.weekly[map[id]].push({ start, end });
      });
    }

    // Rules
    const minNotice = $('#min-notice')?.value?.match(/(\d+)/)?.[1];
    const windowDays = $('#window')?.value?.match(/(\d+)/)?.[1];
    const increments = $('#increments')?.value?.match(/(\d+)/)?.[1];
    const numInputs = $$('section:has(h2:contains("Set Your Availability")) .p-6.border.rounded-lg')[1]?.querySelectorAll('input[type="number"]');

    model.minNoticeHours = minNotice? parseInt(minNotice,10) : model.minNoticeHours;
    model.windowDays = windowDays? parseInt(windowDays,10) : model.windowDays;
    model.incrementsMins = increments? parseInt(increments,10) : model.incrementsMins;
    if (numInputs?.[0]) model.bufferBeforeMins = parseInt(numInputs[0].value||15,10);
    if (numInputs?.[1]) model.bufferAfterMins  = parseInt(numInputs[1].value||15,10);
    const cap = $('#daily-cap');
    if (cap) model.dailyCap = parseInt(cap.value||5,10);

    // Durations chips remain static unless you wire a chooser; keep defaults

    return model;
  }

  // Booking integration — expose a hook for the booking card to request slots
  window.__refreshBookingSlots = function(provide){
    // provide(date) -> array of { startMin, endMin }
    const model = currentModel().availability;
    const refresh = (date)=> buildSlotsForDate(date, model);
    // immediate refresh request
    provide && provide(new Date());
    // expose helper
    window.__buildSlotsForDate = refresh;
  }

  function buildSlotsForDate(date, model){
    // Honor minNotice, windowDays, dailyCap, buffers around proposed times
    const now = new Date();
    const diffHours = (date - now)/(1000*60*60);
    if (diffHours < (model.minNoticeHours||0)) return [];

    const withinWindow = (date - now)/(1000*60*60*24) <= (model.windowDays||60);
    if (!withinWindow) return [];

    const dow = date.getDay();
    const ranges = model.weekly?.[dow] || [];
    const slots = [];
    const dur = model.durationMins || 30;
    const step = model.incrementsMins || 30;

    for (const r of ranges){
      const [sh, sm] = r.start.split(':').map(Number);
      const [eh, em] = r.end.split(':').map(Number);
      const startMin = sh*60+sm;
      const endMin = eh*60+em;
      for (let t=startMin; t+dur <= endMin; t += step){
        slots.push({ startMin: t, endMin: t+dur });
      }
    }

    // Daily cap
    if (slots.length > (model.dailyCap||Infinity)) return slots.slice(0, model.dailyCap);
    return slots;
  }

  // ===== utilities =====
  function isTime(s){ return /^\d{2}:\d{2}$/.test(s||''); }
  function stringifyTZ(tz){ return tz?.includes('America')? 'UTC -05:00 Eastern Time (US & Canada)' : tz; }
  function parseTZ(s){ return s?.includes('Eastern')? 'America/New_York' : s; }

  function pickFile(accept){
    return new Promise(resolve=>{
      const i = document.createElement('input'); i.type='file'; if (accept) i.accept=accept;
      i.onchange = ()=> resolve(i.files?.[0]||null);
      i.click();
    });
  }
  function pickFiles(acceptList){
    return new Promise(resolve=>{
      const i = document.createElement('input'); i.type='file'; i.multiple=true; if (acceptList) i.accept=acceptList.join(',');
      i.onchange = ()=> resolve(Array.from(i.files||[]));
      i.click();
    });
  }
  async function fakeUpload(file){
    // TODO: replace with POST /api/upload/{kind}/{profileId}
    return URL.createObjectURL(file);
  }
})();
// --- AI: analyze resume and populate profile fields ---
async function analyzeResumeAndPopulate(file, uploadedUrl, p){
  // Preferred: backend endpoint handles file → text + GPT call and returns JSON
  // POST /api/ai/extract_profile  (multipart/form-data: file, profileId)
  const form = new FormData();
  form.append('file', file);
  form.append('profileId', p.id);
  const endpoint = '/api/ai/extract_profile';

  let data;
  try {
    const res = await fetch(endpoint, { method:'POST', body: form });
    if (!res.ok) throw new Error('extract_profile HTTP '+res.status);
    data = await res.json();
  } catch (e){
    // Fallback opportunity: client-side text extraction via PDF.js, then call a text-only endpoint
    // For simplicity we surface the error; backend wiring is recommended for reliability.
    throw e;
  }

  // Expected response shape
  // {
  //   name, title, contact:{email, phone, location},
  //   socials:{ linkedin, portfolio, github, twitter, website },
  //   bio, highlights:["…","…"]
  // }

  if (data?.name)  p.name = data.name;
  if (data?.title) p.title = data.title;
  if (data?.contact){
    p.email    = data.contact.email    ?? p.email    ?? '';
    p.phone    = data.contact.phone    ?? p.phone    ?? '';
    p.location = data.contact.location ?? p.location ?? '';
  }
  if (data?.bio) p.bio = data.bio;

  // Socials → ensure rows exist then hydrate
  const socials = data?.socials || {};
  const socialMap = [
    { kind:'linkedin',  url: socials.linkedin },
    { kind:'portfolio', url: socials.portfolio || socials.website },
    { kind:'github',    url: socials.github },
    { kind:'twitter',   url: socials.twitter || socials.x }
  ].filter(x=> !!x.url);

  const container = $('#attachments-container');
  const ensureRow = (label)=>{
    let row = Array.from(container.querySelectorAll('p')).find(p=> p.textContent.trim().toLowerCase()===label)?.closest('div.flex.items-end.gap-2');
    if (!row){
      row = document.createElement('div');
      row.className = 'flex items	end gap-2';
      row.innerHTML = `
        <label class="flex flex-col min-w-40 flex-1">
          <p class="text-primary dark:text-neutral-50 text-base font-medium leading-normal pb-2">${label[0].toUpperCase()+label.slice(1)}</p>
          <input class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-primary dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-12 px-4 text-base font-normal leading-normal" placeholder="https://" value=""/>
        </label>
        <button class="flex min-w-[40px] h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 text-sm font-medium leading-normal">
          <span class="material-symbols-outlined">delete</span>
        </button>`;
      container.appendChild(row);
    }
    return row;
  };
  socialMap.forEach(({kind,url})=>{
    const row = ensureRow(kind);
    row.querySelector('input').value = url;
  });

  // Highlights
  if (Array.isArray(data?.highlights) && data.highlights.length){
    p.highlights = data.highlights.slice(0,8).map(h=> '• '+h).join('\n');
    const hi = $('section:has(h2:contains("Highlights")) textarea');
    if (hi) hi.value = p.highlights;
  }

  // Resume already attached
  p.resume = { name: file.name, url: uploadedUrl };

  // Hydrate basics and contact UI
  const nameEl = document.querySelector('input[placeholder="Your Name"]'); if (nameEl) nameEl.value = p.name || '';
  const titleEl = document.querySelector('input[placeholder="Your Title"]'); if (titleEl) titleEl.value = p.title || '';
  const locEl = document.querySelector('input[placeholder="City, Country"]'); if (locEl) locEl.value = p.location || '';
  const phoneEl = document.querySelector('input[placeholder="e.g. +1 234 567 890"]'); if (phoneEl) phoneEl.value = p.phone || '';
  const emailEl = document.querySelector('input[placeholder="your.email@example.com"]'); if (emailEl) emailEl.value = p.email || '';

  await updateProfile(p);
  renderResumeAndAttachments(p);
}
