// profile_edit.bind.js — Enhanced editor binder with drag&drop resume and availability wiring
// Dependencies: app.js -> { $, $$, toast }, data-store.js -> { store }
import { $, $$, toast } from './app.js';
import { store } from './data-store.js';

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
  wireDragDropResume(profile); // new DnD wiring

  // Top save
  const saveBtn = $$('header button').find(b=> b.dataset.testid === 'button-save-profile' || b.textContent.trim().toLowerCase()==='save profile');
  saveBtn?.addEventListener('click', async ()=>{
    try { await store.updateProfile(profile.id, currentModel()); toast('Profile saved'); }
    catch(e){ console.error(e); toast('Failed to save', {type:'error'}); }
  });

  // Helpers
  function safeGetProfile(){
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return seed();
    try { return store.getProfile({id}) || seed(); } catch(e){ return seed(); }
  }
  function seed(){
    return {
      id: crypto.randomUUID(),
      name:'', title:'', location:'', bio:'', phone:'', email:'',
      avatarUrl:'', videoUrl:'',
      links:[{kind:'linkedin',url:''},{kind:'portfolio',url:''}],
      resume:{name:'',url:''}, attachments:[],
      highlights:'',
      availability: defaultAvailability()
    };
  }
  function defaultAvailability(){
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      incrementsMins: 30, durationMins: 30,
      bufferBeforeMins: 15, bufferAfterMins: 15,
      minNoticeHours: 24, windowDays: 60, dailyCap: 5,
      durations:[15,30,60],
      weekly:{0:[],1:[{start:'09:00',end:'17:00'}],2:[{start:'09:00',end:'12:00'},{start:'14:00',end:'17:00'}],3:[],4:[{start:'10:00',end:'16:00'}],5:[],6:[]},
      rules:[]
    };
  }
  function currentModel(){
    const m = structuredClone(profile);
    m.name = $('input[placeholder="Your Name"]')?.value?.trim()||'';
    m.title = $('input[placeholder="Your Title"]')?.value?.trim()||'';
    m.location = $('input[placeholder="City, Country"]')?.value?.trim()||'';
    const bioTa = $('textarea[data-testid="textarea-bio"]') || $('textarea[placeholder^="Tell us"]') || $('textarea[placeholder^="Add a brief"]');
    m.bio = bioTa?.value?.trim()||m.bio;
    m.phone = $('input[data-testid="input-phone-inline"]')?.value?.trim() || m.phone;
    m.email = $('input[data-testid="input-email-inline"]')?.value?.trim() || m.email;

    // Links
    const linkRows = $$('#attachments-container > div.flex.items-end.gap-2');
    m.links = linkRows.map(row => {
      const label = row.querySelector('p')?.textContent?.trim().toLowerCase() || '';
      const input = row.querySelector('input');
      const kind = label.includes('linkedin')?'linkedin':label.includes('portfolio')?'portfolio':'other';
      return { kind, url: input?.value?.trim()||'' };
    });

    // Highlights
    const hi = $('section:has(h2:contains("Highlights")) textarea');
    if (hi) m.highlights = hi.value;

    // Availability
    m.availability = readAvailabilityFromUI(m.availability);
    return m;
  }

  function hydrate(p){
    const nameEl = $('input[placeholder="Your Name"]'); if (nameEl) nameEl.value = p.name||'';
    const titleEl = $('input[placeholder="Your Title"]'); if (titleEl) titleEl.value = p.title||'';
    const locEl = $('input[placeholder="City, Country"]'); if (locEl) locEl.value = p.location||'';
    const bioTa = $('textarea[data-testid="textarea-bio"]') || $('textarea[placeholder^="Tell us"]') || $('textarea[placeholder^="Add a brief"]');
    if (bioTa) bioTa.value = p.bio||'';
    const phoneInline = $('input[data-testid="input-phone-inline"]'); if (phoneInline) phoneInline.value = p.phone||'';
    const emailInline = $('input[data-testid="input-email-inline"]'); if (emailInline) emailInline.value = p.email||'';

    // Avatar
    const avatar = $('.aspect-square.rounded-full');
    if (p.avatarUrl && avatar) avatar.style.backgroundImage = `url(${CSS.escape(p.avatarUrl)})`;

    // Links into existing rows
    const rows = $$('#attachments-container > div.flex.items-end.gap-2');
    rows.forEach((row, i)=>{
      const input = row.querySelector('input');
      input.value = p.links?.[i]?.url || '';
    });

    renderResumeAndAttachments(p);
    const hi = $('section:has(h2:contains("Highlights")) textarea'); if (hi) hi.value = p.highlights||'';
    paintAvailability(p.availability);
  }

  function wireBasics(){}
  function wireMedia(p){
    // Avatar
    const avatarBtn = $$('button').find(b=> b.dataset.testid==='button-upload-photo' || b.textContent.trim()==='Upload/Change Photo');
    avatarBtn?.addEventListener('click', async ()=>{
      const file = await pickFile('image/*'); if (!file) return;
      if (file.size > 2*1024*1024) return toast('Image too large (max 2MB)', {type:'error'});
      const url = await fakeUpload(file); p.avatarUrl = url;
      const avatar = $('.aspect-square.rounded-full'); if (avatar) avatar.style.backgroundImage = `url(${CSS.escape(url)})`;
      await store.updateProfile(profile.id, p); toast('Avatar updated');
    });
    // Video
    const videoBtn = $$('button').find(b=> b.dataset.testid==='button-upload-video' || b.textContent.trim()==='Upload Video');
    videoBtn?.addEventListener('click', async ()=>{
      const file = await pickFile('video/*'); if (!file) return;
      const url = await fakeUpload(file); p.videoUrl = url;
      await store.updateProfile(profile.id, p); toast('Video uploaded');
    });
  }

  function wireSocial(){
    // Delete buttons per row
    $$('#attachments-container button:has(.material-symbols-outlined)').forEach((btn, idx)=>{
      btn.addEventListener('click', ()=>{
        const rows = $$('#attachments-container > div.flex.items-end.gap-2');
        rows[idx]?.remove();
      });
    });
    // Add more
    const addBtn = $$('section:has(h2:contains("Social Media")) button').find(b=> b.dataset.testid==='button-add-more-links' || b.textContent.trim()==='Add More');
    addBtn?.addEventListener('click', ()=>{
      const container = $('#attachments-container');
      const row = document.createElement('div');
      row.className = 'flex items-end gap-2';
      row.innerHTML = `
        <label class="flex flex-col min-w-40 flex-1">
          <p class="text-primary dark:text-neutral-50 text-base font-medium leading-normal pb-2">Other</p>
          <input class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-primary dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-12 px-4 text-base font-normal leading-normal" placeholder="https://" value=""/>
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
        const isResumeLike = f.name.toLowerCase().includes('resume') || /pdf$/.test(f.type) || /msword|officedocument/.test(f.type);
        if (isResumeLike && !p.resume?.url){
          p.resume = { name: f.name, url };
          try { await analyzeResumeAndPopulate(f, url, p); didAnalyze = true; } catch (e){ console.warn('AI extract failed', e); }
        } else {
          p.attachments.push({ name:f.name, url });
        }
      }
      await store.updateProfile(profile.id, p);
      renderResumeAndAttachments(p);
      toast(didAnalyze ? 'Resume uploaded and profile populated' : 'Files uploaded');
    });
  }

  function renderResumeAndAttachments(p){
    const container = $$('section:has(h2:contains("Resume")) .space-y-4')[0];
    if (!container) return;
    container.innerHTML = '';
    if (p.resume?.name){
      container.appendChild(fileRow(p.resume.name, ()=>{
        p.resume = { name:'', url:'' };
        updateProfile(p).then(()=>renderResumeAndAttachments(p));
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

  // Top resume selector (legacy button compatibility kept hidden in HTML)
  function wireResumeImportUI(p){
    const container = document.querySelector('#resumeImport');
    const select = container?.querySelector('#resumeSourceSelect');
    const populateBtn = container?.querySelector('#btnResumePopulate');
    const addNewBtn = container?.querySelector('#btnResumeAddNew');
    console.log('[ResumeUI] Container found:', !!container);
    console.log('[ResumeUI] Select found:', !!select);
    console.log('[ResumeUI] Populate button found:', !!populateBtn);
    console.log('[ResumeUI] Add New button found:', !!addNewBtn);
    if (!select) return;

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
      const mk = (v, label, extra={})=>{
        const opt = document.createElement('option'); opt.value=v; opt.textContent=label;
        Object.entries(extra).forEach(([k,val])=> opt.setAttribute(k,val)); return opt;
      };
      if (!items.length) select.appendChild(mk('', '— No resumes yet —'));
      items.forEach(it=> select.appendChild(mk(it.url, `${it.primary?'[Primary] ':''}${it.name}`, { 'data-name': it.name })));
      select.appendChild(mk('__add_new__', 'Add new…'));
      const primary = items.find(i=> i.primary); if (primary) select.value = primary.url;
    }
    paintOptions();

    select.addEventListener('change', async ()=>{
      if (select.value === '__add_new__'){
        const file = await pickFile('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        if (!file) { paintOptions(); return; }
        const url = await fakeUpload(file);
        p.resume = { name: file.name, url };
        await store.updateProfile(profile.id, p);
        renderResumeAndAttachments(p);
        paintOptions();
        select.value = url;
      }
    });

    addNewBtn?.addEventListener('click', ()=> select.dispatchEvent(new Event('change')));

    populateBtn?.addEventListener('click', async ()=>{
      console.log('[ResumeUI] Populate button clicked!');
      let url = select.value;
      let fileName = select.options[select.selectedIndex]?.getAttribute('data-name') || 'resume.pdf';
      console.log('[ResumeUI] Selected resume URL:', url);

      if (!url || url === '__add_new__'){
        const file = await pickFile('application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        if (!file) return;
        url = await fakeUpload(file);
        p.resume = { name:file.name, url };
        await store.updateProfile(profile.id, p);
        renderResumeAndAttachments(p);
        paintOptions();
        try { await analyzeResumeAndPopulate(file, url, p); toast('Profile populated from resume'); }
        catch(e){ console.error(e); toast('Could not analyze resume', {type:'error'}); }
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

  // Drag & drop wiring for new UI
  function wireDragDropResume(p){
    const drop = document.getElementById('resumeDropArea');
    const browse = document.getElementById('resumeBrowseBtn');
    const input = document.getElementById('resumeFileInput');
    console.log('[DragDrop] Drop area found:', !!drop);
    console.log('[DragDrop] Browse button found:', !!browse);
    console.log('[DragDrop] File input found:', !!input);
    if (!drop || !browse || !input) { 
      console.warn('[DragDrop] Missing elements, drag & drop not wired');
      return;
    }
    console.log('[DragDrop] Wiring drag & drop events...');
    const stop = e => { e.preventDefault(); e.stopPropagation(); };

    ['dragenter','dragover','dragleave','drop'].forEach(evt => drop.addEventListener(evt, stop));
    drop.addEventListener('dragover', ()=> drop.classList.add('ring-2','ring-primary/50'));
    drop.addEventListener('dragleave', ()=> drop.classList.remove('ring-2','ring-primary/50'));
    drop.addEventListener('drop', async (e)=>{
      drop.classList.remove('ring-2','ring-primary/50');
      const file = e.dataTransfer?.files?.[0]; if (!file) return;
      await handleResumeFile(file, p);
    });
    browse.addEventListener('click', ()=> input.click());
    input.addEventListener('change', async ()=>{
      const file = input.files?.[0]; if (!file) return;
      await handleResumeFile(file, p);
      input.value = '';
    });

    async function handleResumeFile(file, p){
      const ok = /pdf|msword|officedocument/.test(file.type) || /\.(pdf|docx?)$/i.test(file.name);
      if (!ok){ toast('Please upload a PDF or Word resume', {type:'error'}); return; }
      const url = await fakeUpload(file);
      p.resume = { name:file.name, url };
      await store.updateProfile(profile.id, p);
      renderResumeAndAttachments(p);
      try { await analyzeResumeAndPopulate(file, url, p); toast('Profile populated from resume'); }
      catch(e){ console.error(e); toast('Uploaded, but AI parsing failed', {type:'error'}); }
      // refresh select options
      const select = document.getElementById('resumeSourceSelect'); if (select) select.dispatchEvent(new Event('change'));
    }
  }

  async function fetchBlob(url){
    const res = await fetch(url, { mode:'cors' });
    if (!res.ok) throw new Error('Failed to fetch resume: '+res.status);
    return await res.blob();
  }

  function wireAvailability(p){
    const saveBtn = $$('section:has(h2:contains("Set Your Availability")) button').find(b=> b.textContent.trim()==='Save');
    const revertBtn = $$('section:has(h2:contains("Set Your Availability")) button').find(b=> b.textContent.trim()==='Revert');
    const qaPanels = $$('section:has(h2:contains("Set Your Availability")) .p-6.border.rounded-lg');
    const quickPanel = qaPanels?.[0];
    const rulesPanel = qaPanels?.[1];

    // Save
    saveBtn?.addEventListener('click', async ()=>{
      p.availability = readAvailabilityFromUI(p.availability);
      await store.updateProfile(profile.id, p);
      window.dispatchEvent(new CustomEvent('availability:updated', { detail:{profileId:p.id, model:p.availability} }));
      toast('Availability saved');
    });
    // Revert
    revertBtn?.addEventListener('click', ()=>{ paintAvailability(p.availability); toast('Reverted'); });

    // Quick actions
    const qaButtons = quickPanel?.querySelectorAll('button');
    qaButtons?.[0]?.addEventListener('click', ()=>{ // copy Mon to Mon–Fri
      const m = readAvailabilityFromUI(p.availability);
      const src = m.weekly[1]?.length? structuredClone(m.weekly[1]) : [{start:'09:00',end:'17:00'}];
      for (let d=1; d<=5; d++) m.weekly[d] = structuredClone(src);
      paintAvailability(m);
    });
    qaButtons?.[1]?.addEventListener('click', ()=>{ const m = readAvailabilityFromUI(p.availability); for (let d=0; d<=6; d++) m.weekly[d]=[]; paintAvailability(m); });
    qaButtons?.[2]?.addEventListener('click', ()=>{ const m = readAvailabilityFromUI(p.availability); for (let d=0; d<=6; d++) m.weekly[d]=[]; paintAvailability(m); });

    // Add Block
    $$('button').filter(b=> b.textContent.trim()==='Add Block').forEach((btn)=>{
      btn.addEventListener('click', ()=>{
        const label = btn.closest('.p-4')?.querySelector('label')?.textContent?.trim().slice(0,3).toLowerCase();
        const map = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
        const day = map[label] ?? 1;
        const start = prompt('Start time (HH:MM) e.g., 09:00');
        const end = prompt('End time (HH:MM) e.g., 17:00');
        if (!/^\d{2}:\d{2}$/.test(start||'') || !/^\d{2}:\d{2}$/.test(end||'')) return toast('Invalid time');
        const m = readAvailabilityFromUI(p.availability);
        m.weekly[day] = m.weekly[day] || [];
        m.weekly[day].push({ start, end });
        paintAvailability(m);
      });
    });

    paintAvailability(p.availability);
  }

  function paintAvailability(model){
    const tzSel = $$('section:has(h2:contains("Set Your Availability")) select')[0];
    if (tzSel) tzSel.value = model.timezone?.includes('America') ? 'UTC -05:00 Eastern Time (US & Canada)' : tzSel.value;

    const dayDefs = ['sun','mon','tue','wed','thu','fri','sat'].map((id,idx)=>({id,idx}));
    dayDefs.forEach(({id, idx})=>{
      const row = document.getElementById(id)?.closest('.p-4'); if (!row) return;
      const checkbox = row.querySelector('#'+id);
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
    const minSel = document.getElementById('min-notice'); if (minSel) minSel.value = `${model.minNoticeHours||24} hours`;
    const win = document.getElementById('window'); if (win) win.value = `${model.windowDays||60} days into the future`;
    const inc = document.getElementById('increments'); if (inc) inc.value = `${model.incrementsMins||30} minutes`;
    const rulesBoxes = $$('section:has(h2:contains("Set Your Availability")) .p-6.border.rounded-lg');
    const rulesBox = rulesBoxes?.[1];
    if (rulesBox){
      const inputs = rulesBox.querySelectorAll('input[type="number"]');
      if (inputs[0]) inputs[0].value = model.bufferBeforeMins || 15;
      if (inputs[1]) inputs[1].value = model.bufferAfterMins || 15;
      const cap = rulesBox.querySelector('#daily-cap'); if (cap) cap.value = model.dailyCap || 5;
    }
  }

  function readAvailabilityFromUI(fallback){
    const model = structuredClone(fallback || defaultAvailability());
    const tzSel = $$('section:has(h2:contains("Set Your Availability")) select')[0];
    model.timezone = (tzSel?.value?.includes('Eastern')) ? 'America/New_York' : (model.timezone||'UTC');

    const map = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
    for (const id in map){
      const row = document.getElementById(id)?.closest('.p-4');
      const pillWrap = row?.querySelector('.flex-grow');
      const checked = row?.querySelector('#'+id)?.checked;
      model.weekly[map[id]] = [];
      if (!row || !pillWrap || !checked) continue;
      pillWrap.querySelectorAll('span.text-sm').forEach(s=>{
        const [start, end] = s.textContent.split(' - ').map(t=> t.trim());
        if (/^\d{2}:\d{2}$/.test(start||'') && /^\d{2}:\d{2}$/.test(end||'')) model.weekly[map[id]].push({ start, end });
      });
    }

    const minNotice = document.getElementById('min-notice')?.value?.match(/(\d+)/)?.[1];
    const windowDays = document.getElementById('window')?.value?.match(/(\d+)/)?.[1];
    const increments = document.getElementById('increments')?.value?.match(/(\d+)/)?.[1];
    const rulesBoxes = $$('section:has(h2:contains("Set Your Availability")) .p-6.border.rounded-lg');
    const inputs = rulesBoxes?.[1]?.querySelectorAll('input[type="number"]') || [];

    model.minNoticeHours = minNotice? parseInt(minNotice,10) : model.minNoticeHours;
    model.windowDays = windowDays? parseInt(windowDays,10) : model.windowDays;
    model.incrementsMins = increments? parseInt(increments,10) : model.incrementsMins;
    if (inputs[0]) model.bufferBeforeMins = parseInt(inputs[0].value||15,10);
    if (inputs[1]) model.bufferAfterMins  = parseInt(inputs[1].value||15,10);
    const cap = document.getElementById('daily-cap'); if (cap) model.dailyCap = parseInt(cap.value||5,10);

    return model;
  }

  // utils
  function pickFile(accept){
    return new Promise(resolve=>{ const i=document.createElement('input'); i.type='file'; if (accept) i.accept=accept; i.onchange=()=> resolve(i.files?.[0]||null); i.click(); });
  }
  function pickFiles(acceptList){
    return new Promise(resolve=>{ const i=document.createElement('input'); i.type='file'; i.multiple=true; if (acceptList) i.accept=acceptList.join(','); i.onchange=()=> resolve(Array.from(i.files||[])); i.click(); });
  }
  async function fakeUpload(file){ return URL.createObjectURL(file); }
})(); // end IIFE

// --- AI: analyze resume and populate profile fields ---
export async function analyzeResumeAndPopulate(file, uploadedUrl, p){
  const form = new FormData();
  form.append('file', file);
  form.append('profileId', p.id);
  const endpoint = '/api/ai/extract_profile';

  let data;
  const res = await fetch(endpoint, { method:'POST', body: form });
  if (!res.ok) throw new Error('extract_profile HTTP '+res.status);
  data = await res.json();

  if (data?.name)  p.name = data.name;
  if (data?.title) p.title = data.title;
  if (data?.contact){
    p.email    = data.contact.email    ?? p.email    ?? '';
    p.phone    = data.contact.phone    ?? p.phone    ?? '';
    p.location = data.contact.location ?? p.location ?? '';
  }
  if (data?.bio) p.bio = data.bio;

  // socials
  const socials = data?.socials || {};
  const socialMap = [
    { kind:'linkedin',  url: socials.linkedin },
    { kind:'portfolio', url: socials.portfolio || socials.website },
    { kind:'github',    url: socials.github },
    { kind:'twitter',   url: socials.twitter || socials.x }
  ].filter(x=> !!x.url);

  const container = document.getElementById('attachments-container');
  const ensureRow = (label)=>{
    const labelLower = label.toLowerCase();
    let row = Array.from(container.querySelectorAll('p')).find(p=> p.textContent.trim().toLowerCase()===labelLower)?.closest('div.flex.items-end.gap-2');
    if (!row){
      row = document.createElement('div');
      row.className = 'flex items-end gap-2';
      row.innerHTML = `
        <label class="flex flex-col min-w-40 flex-1">
          <p class="text-primary dark:text-neutral-50 text-base font-medium leading-normal pb-2">${label}</p>
          <input class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-primary dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-12 px-4 text-base font-normal leading-normal" placeholder="https://" value=""/>
        </label>
        <button class="flex min-w-[40px] h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 text-sm font-medium leading-normal">
          <span class="material-symbols-outlined">delete</span>
        </button>`;
      container.appendChild(row);
    }
    return row;
  };
  socialMap.forEach(({kind,url})=>{ const row = ensureRow(kind.charAt(0).toUpperCase()+kind.slice(1)); row.querySelector('input').value = url; });

  // Highlights
  if (Array.isArray(data?.highlights) && data.highlights.length){
    p.highlights = data.highlights.slice(0,8).map(h=> `• ${h}`).join('\n');
    const hi = document.querySelector('section:has(h2:contains("Highlights")) textarea');
    if (hi) hi.value = p.highlights;
  }

  // set resume
  p.resume = { name: file.name, url: uploadedUrl };

  // hydrate basics
  const nameEl = document.querySelector('input[placeholder="Your Name"]'); if (nameEl) nameEl.value = p.name || '';
  const titleEl = document.querySelector('input[placeholder="Your Title"]'); if (titleEl) titleEl.value = p.title || '';
  const locEl = document.querySelector('input[placeholder="City, Country"]'); if (locEl) locEl.value = p.location || '';
  const phoneEl = document.querySelector('input[placeholder="e.g. +1 234 567 890"]'); if (phoneEl) phoneEl.value = p.phone || '';
  const emailEl = document.querySelector('input[placeholder="your.email@example.com"]'); if (emailEl) emailEl.value = p.email || '';

  await store.updateProfile(profile.id, p);
  // Re-render resume list if a helper exists
  const reRender = (window.renderResumeAndAttachments || null);
}
