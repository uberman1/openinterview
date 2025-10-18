// profile_edit.bind.js — Enhanced profile editor with GPT extraction and inline availability
// Adapted for existing OpenInterview data-store.js API

import { $, $$, toast as simpleToast } from './app.js';
import { store } from './data-store.js';

// Enhanced toast function
function toast(msg, opts = {}) {
  if (opts.type === 'error') {
    alert(`Error: ${msg}`);
  } else {
    simpleToast(msg);
  }
}

// DOM Helper functions (standard browser API, no jQuery)
function findSectionByHeading(text) {
  return Array.from(document.querySelectorAll('section')).find(section => {
    const h2 = section.querySelector('h2');
    return h2 && h2.textContent.includes(text);
  });
}

function findElementInSection(sectionHeading, selector) {
  const section = findSectionByHeading(sectionHeading);
  return section ? section.querySelector(selector) : null;
}

function findElementsInSection(sectionHeading, selector) {
  const section = findSectionByHeading(sectionHeading);
  return section ? Array.from(section.querySelectorAll(selector)) : [];
}

function findButtonByText(selector, text) {
  return Array.from(document.querySelectorAll(selector)).find(btn => 
    btn.textContent.trim() === text
  );
}

function hasChildWithClass(element, className) {
  return element.querySelector(`.${className}`) !== null;
}

// Adapter functions for data-store API
function getProfile() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) throw new Error('No profile ID');
  return store.getProfile({ id });
}

function updateProfile(profile) {
  return store.updateProfile(profile.id, profile);
}

// Helper functions
async function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

async function pickFiles(acceptArray) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = acceptArray.join(',');
    input.onchange = () => resolve(Array.from(input.files));
    input.click();
  });
}

async function fakeUpload(file) {
  // Create object URL for local preview
  // In production, replace with actual upload to /api/upload/*
  return URL.createObjectURL(file);
}

async function analyzeResumeAndPopulate(file, url, p) {
  // Call backend AI extraction endpoint
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('profileId', p.id);
    
    const res = await fetch('/api/ai/extract_profile', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      // Fallback: basic extraction from filename
      const name = file.name.replace(/\.(pdf|docx?|txt)$/i, '').replace(/[-_]/g, ' ');
      p.display = p.display || {};
      if (!p.display.name) p.display.name = name;
      return;
    }
    
    const data = await res.json();
    
    // Populate profile from AI extraction
    p.display = p.display || {};
    if (data.name) p.display.name = data.name;
    if (data.title) p.display.title = data.title;
    if (data.location) p.display.location = data.location;
    if (data.summary) p.display.summary = data.summary;
    if (data.highlights) p.display.highlights = data.highlights;
    
    // Social links
    if (data.linkedin || data.portfolio || data.github) {
      p.links = p.links || [];
      if (data.linkedin && !p.links.find(l => l.kind === 'linkedin')) {
        p.links.push({ kind: 'linkedin', url: data.linkedin });
      }
      if (data.portfolio && !p.links.find(l => l.kind === 'portfolio')) {
        p.links.push({ kind: 'portfolio', url: data.portfolio });
      }
      if (data.github && !p.links.find(l => l.kind === 'github')) {
        p.links.push({ kind: 'github', url: data.github });
      }
    }
    
    // Update UI
    hydrate(p);
  } catch (e) {
    console.warn('AI extraction failed:', e);
    // Silent fallback - resume uploaded but not analyzed
  }
}

function isTime(s) {
  return /^\d{1,2}:\d{2}$/.test(s);
}

function stringifyTZ(tz) {
  return tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function parseTZ(v) {
  return v || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

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
      status: 'draft',
      ownerUserId: 'me',
      display: {
        name: '',
        title: '',
        location: '',
        summary: '',
        avatarUrl: '',
        video: { posterUrl: '', sourceUrl: '' },
        highlights: []
      },
      resume: { name:'', url:'', assetId: null, pdfUrl: '', pageCount: 0 },
      attachments: [],
      links: [
        { kind:'linkedin', url:'' },
        { kind:'portfolio', url:'' }
      ],
      availability: defaultAvailability(),
      share: { publicUrl: null, slug: null }
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
      rules: []
    };
  }

  function currentModel(){
    const model = structuredClone(profile);

    // Basics
    model.display = model.display || {};
    model.display.name = $('input[placeholder="Your Name"]')?.value?.trim() || '';
    model.display.title = $('input[placeholder="Your Title"]')?.value?.trim() || '';
    model.display.location = $('input[placeholder="City, Country"]')?.value?.trim() || '';
    model.display.summary = $('textarea[placeholder^="Tell us"]')?.value?.trim() || '';

    // Links (social media)
    const linkRows = $$('#attachments-container > div.flex.items-end.gap-2');
    model.links = linkRows.map(row => {
      const label = row.querySelector('p')?.textContent?.toLowerCase() || '';
      const input = row.querySelector('input');
      return { kind: label.includes('linkedin')?'linkedin':label.includes('portfolio')?'portfolio':'other', url: input?.value?.trim()||'' };
    });

    // Highlights
    const hlTextarea = findElementInSection('Highlights', 'textarea');
    if (hlTextarea) {
      const text = hlTextarea.value.trim();
      model.display.highlights = text ? text.split('\n').filter(l => l.trim()) : [];
    }

    // Availability
    model.availability = readAvailabilityFromUI(model.availability);

    return model;
  }

  function hydrate(p){
    // Basics
    if ($('input[placeholder="Your Name"]')) $('input[placeholder="Your Name"]').value = p.display?.name||'';
    if ($('input[placeholder="Your Title"]')) $('input[placeholder="Your Title"]').value = p.display?.title||'';
    if ($('input[placeholder="City, Country"]')) $('input[placeholder="City, Country"]').value = p.display?.location||'';
    if ($('textarea[placeholder^="Tell us"]')) $('textarea[placeholder^="Tell us"]').value = p.display?.summary||'';

    // Avatar
    const avatar = $('.aspect-square.rounded-full');
    if (avatar && p.display?.avatarUrl) avatar.style.backgroundImage = `url(${CSS.escape(p.display.avatarUrl)})`;

    // Links
    const rows = $$('#attachments-container > div.flex.items-end.gap-2');
    rows.forEach((row, i)=>{
      const input = row.querySelector('input');
      if (input) input.value = p.links?.[i]?.url || '';
    });

    // Resume list
    renderResumeAndAttachments(p);

    // Highlights
    const hi = findElementInSection('Highlights', 'textarea');
    if (hi) {
      const highlights = Array.isArray(p.display?.highlights) ? p.display.highlights : [];
      hi.value = highlights.join('\n');
    }

    // Availability
    if (p.availability) paintAvailability(p.availability);
  }

  function wireBasics(p){
    // Input listeners for real-time updates
  }

  function wireMedia(p){
    // Avatar upload
    const avatarBtn = $$('button').find(b=> b.textContent.trim()==='Upload/Change Photo');
    avatarBtn?.addEventListener('click', async ()=>{
      const file = await pickFile('image/*');
      if (!file) return;
      if (file.size > 2*1024*1024) return toast('Image too large (max 2MB)', {type:'error'});
      const url = await fakeUpload(file);
      p.display = p.display || {};
      p.display.avatarUrl = url;
      $('.aspect-square.rounded-full').style.backgroundImage = `url(${CSS.escape(url)})`;
      await updateProfile(p);
      toast('Avatar updated');
    });

    // Video upload
    const videoBtn = $$('button').find(b=> b.textContent.trim()==='Upload Video');
    videoBtn?.addEventListener('click', async ()=>{
      const file = await pickFile('video/*');
      if (!file) return;
      const url = await fakeUpload(file);
      p.display = p.display || {};
      p.display.video = p.display.video || {};
      p.display.video.sourceUrl = url;
      await updateProfile(p);
      toast('Video uploaded');
    });
  }

  function wireSocial(p){
    // Delete buttons per row
    const deleteButtons = Array.from($$('#attachments-container button')).filter(btn => 
      hasChildWithClass(btn, 'material-symbols-outlined')
    );
    deleteButtons.forEach((btn, idx)=>{
      btn.addEventListener('click', ()=>{
        const rows = $$('#attachments-container > div.flex.items-end.gap-2');
        rows[idx].remove();
      });
    });

    // Add More button
    const socialSection = findSectionByHeading('Social Media');
    const addBtn = socialSection ? findButtonByText('button', 'Add More') : null;
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
        const url = await fakeUpload(f);
        const isResumeLike = f.name.toLowerCase().includes('resume') || f.type==='application/pdf' || f.type.includes('msword') || f.type.includes('officedocument');
        if (isResumeLike && !p.resume?.url){
          p.resume = { name: f.name, url };
          try {
            await analyzeResumeAndPopulate(f, url, p);
            didAnalyze = true;
          } catch (e){ console.warn('AI extract failed', e); }
        } else {
          p.attachments = p.attachments || [];
          p.attachments.push({ name:f.name, url });
        }
      }
      await updateProfile(p);
      renderResumeAndAttachments(p);
      toast(didAnalyze ? 'Resume uploaded and profile populated' : 'Files uploaded');
    });
  }


  function renderResumeAndAttachments(p){
    const section = findSectionByHeading('Resume');
    const containers = section ? Array.from(section.querySelectorAll('.space-y-4 > .flex.items-center.justify-between')) : [];
    const container = containers[0]?.parentElement; if (!container) return;
    container.innerHTML = '';

    if (p.resume?.name){
      container.appendChild(fileRow(p.resume.name, ()=>{
        p.resume = { name:'', url:'' }; updateProfile(p).then(()=>renderResumeAndAttachments(p));
      }));
    }

    for (const att of p.attachments||[]){
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
    const ta = findElementInSection('Highlights', 'textarea');
    ta?.addEventListener('input', ()=>{ 
      p.display = p.display || {};
      p.display.highlights = ta.value.split('\n').filter(l => l.trim());
    });
  }

  // ===== Resume import (top selector) =====
  function wireResumeImportUI(p){
    const container = document.querySelector('#resumeImport')
      || findSectionByHeading('Select a Resume')
      || findSectionByHeading('Auto-populate');

    const select = container?.querySelector('#resumeSourceSelect')
      || container?.querySelector('select[data-bind="resume-source"]')
      || container?.querySelector('select');

    const populateBtn = container?.querySelector('#btnResumePopulate')
      || container?.querySelector('[data-action="resume-populate"]')
      || Array.from(container?.querySelectorAll('button')||[]).find(b=>/populate/i.test(b.textContent||''));

    const addNewBtn = container?.querySelector('#btnResumeAddNew')
      || container?.querySelector('[data-action="resume-add"]')
      || Array.from(container?.querySelectorAll('button')||[]).find(b=>/add new/i.test(b.textContent||''));

    if (!select) return;

    function resumeLike(a){
      const n = (a?.name||'').toLowerCase();
      const url = a?.url||'';
      return n.includes('resume') || /\.pdf($|\?)/.test(url) || /docx?($|\?)/.test(url);
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

    addNewBtn?.addEventListener('click', ()=> {
      select.value = '__add_new__';
      select.dispatchEvent(new Event('change'));
    });

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
    const availSection = findSectionByHeading('Set Your Availability');
    const saveBtn = findButtonByText('button', 'Save');
    const revertBtn = findButtonByText('button', 'Revert');

    const quickPanels = availSection ? Array.from(availSection.querySelectorAll('.p-6.border.rounded-lg')) : [];
    const quickPanel = quickPanels[0];
    const qaButtons = quickPanel?.querySelectorAll('button');

    const addBlockButtons = $$('button').filter(b=> b.textContent.trim()==='Add Block');

    saveBtn?.addEventListener('click', async ()=>{
      p.availability = readAvailabilityFromUI(p.availability);
      await updateProfile(p);
      window.dispatchEvent(new CustomEvent('availability:updated', { detail:{profileId:p.id, model:p.availability} }));
      toast('Availability saved');
    });

    revertBtn?.addEventListener('click', ()=>{
      paintAvailability(p.availability);
      toast('Reverted');
    });

    // Quick actions
    qaButtons?.[0]?.addEventListener('click', ()=>{
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
        const day = [1,2,4][idx] ?? 1;
        const start = prompt('Start time (HH:MM) e.g., 09:00');
        const end = prompt('End time (HH:MM) e.g., 17:00');
        if (!isTime(start) || !isTime(end)) return toast('Invalid time');
        model.weekly[day] = model.weekly[day] || [];
        model.weekly[day].push({ start, end });
        paintAvailability(model);
      });
    });

    paintAvailability(p.availability);
  }

  function paintAvailability(model){
    if (!model) return;
    
    const tzSel = findElementInSection('Set Your Availability', 'select');
    if (tzSel) tzSel.value = stringifyTZ(model.timezone);

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

      if (checkbox) checkbox.checked = ranges.length>0;
      if (!pillWrap) return;
      
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

    // Rules panel
    const minNotice = $('#min-notice');
    if (minNotice) minNotice.value = `${model.minNoticeHours || 24} hours`;
    
    const window = $('#window');
    if (window) window.value = `${model.windowDays || 60} days into the future`;
    
    const increments = $('#increments');
    if (increments) increments.value = `${model.incrementsMins || 30} minutes`;
    
    const availSection = findSectionByHeading('Set Your Availability');
    const rulesBoxes = availSection ? Array.from(availSection.querySelectorAll('.p-6.border.rounded-lg')) : [];
    const rulesBox = rulesBoxes[1];
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

    const tzSel = findElementInSection('Set Your Availability', 'select');
    model.timezone = parseTZ(tzSel?.value) || model.timezone;

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

    const minNotice = $('#min-notice')?.value?.match(/(\d+)/)?.[1];
    const windowDays = $('#window')?.value?.match(/(\d+)/)?.[1];
    const increments = $('#increments')?.value?.match(/(\d+)/)?.[1];
    const availSection2 = findSectionByHeading('Set Your Availability');
    const rulesBoxes2 = availSection2 ? Array.from(availSection2.querySelectorAll('.p-6.border.rounded-lg')) : [];
    const numInputs = rulesBoxes2[1]?.querySelectorAll('input[type="number"]');

    model.minNoticeHours = minNotice? parseInt(minNotice,10) : model.minNoticeHours;
    model.windowDays = windowDays? parseInt(windowDays,10) : model.windowDays;
    model.incrementsMins = increments? parseInt(increments,10) : model.incrementsMins;
    if (numInputs?.[0]) model.bufferBeforeMins = parseInt(numInputs[0].value||15,10);
    if (numInputs?.[1]) model.bufferAfterMins  = parseInt(numInputs[1].value||15,10);
    const cap = $('#daily-cap');
    if (cap) model.dailyCap = parseInt(cap.value||5,10);

    return model;
  }
})();
