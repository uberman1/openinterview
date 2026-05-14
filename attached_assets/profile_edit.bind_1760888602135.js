import { $, $$, toast } from './app.js';
import { getProfile, updateProfile } from './data-store.js';

(function initProfileEditBinder(){
  const profile = safeGetProfile();
  resolveAndImportFromSource(profile).then(()=>{ hydrate(profile); }).catch(()=>{ hydrate(profile); });
  wireBasics(profile);
  wireMedia(profile);
  wireSocial(profile);
  wireResumeAndAttachments(profile);
  wireHighlights(profile);
  wireResumeImportUI(profile);
  wireAvailability(profile);

  const saveBtn = $$('header button').find(b=> b.textContent.trim().toLowerCase()==='save profile');
  saveBtn?.addEventListener('click', async ()=>{
    try { await updateProfile(currentModel()); toast('Profile saved'); }
    catch(e){ console.error(e); toast('Failed to save', { type:'error' }); }
  });

  function safeGetProfile(){ try { return getProfile(); } catch(e){ return seed(); } }
  function seed(){ return { id: crypto.randomUUID(), name:'', title:'', location:'', bio:'', email:'', phone:'', avatarUrl:'', videoUrl:'',
    links:[{kind:'linkedin',url:''},{kind:'portfolio',url:''}], resume:{name:'',url:''}, attachments:[], highlights:'', availability: defaultAvailability() };}
  function defaultAvailability(){ return { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, incrementsMins:30, durationMins:30, bufferBeforeMins:15, bufferAfterMins:15, minNoticeHours:24, windowDays:60, dailyCap:5, durations:[15,30,60], weekly:{0:[],1:[],2:[],3:[],4:[],5:[],6:[]}, rules:[] };}

  function currentModel(){
    const model = structuredClone(profile);
    model.name = $('input[placeholder="Your Name"]').value.trim();
    model.title = $('input[placeholder="Your Title"]').value.trim();
    model.location = $('input[placeholder="City, Country"]').value.trim();
    model.phone = document.querySelector('input[placeholder="e.g. +1 234 567 890"]')?.value?.trim() || model.phone || '';
    model.email = document.querySelector('input[placeholder="your.email@example.com"]')?.value?.trim() || model.email || '';
    const bioEl = document.querySelector('textarea[placeholder^="Add a brief profile summary"]') || document.querySelector('textarea[placeholder^="Tell us"]');
    model.bio = bioEl?.value?.trim() || model.bio;
    const linkRows = $$('#attachments-container > div.flex.items-end.gap-2');
    model.links = linkRows.map(row => { const label = row.querySelector('p')?.textContent?.toLowerCase() || ''; const input = row.querySelector('input'); return { kind: label.includes('linkedin')?'linkedin':label.includes('portfolio')?'portfolio':'other', url: input?.value?.trim()||'' }; });
    model.highlights = $('section:has(h2:contains("Highlights")) textarea')?.value || model.highlights;
    model.availability = readAvailabilityFromUI(model.availability);
    return model;
  }

  function hydrate(p){
    $('input[placeholder="Your Name"]').value = p.name||'';
    $('input[placeholder="Your Title"]').value = p.title||'';
    $('input[placeholder="City, Country"]').value = p.location||'';
    const bioEl = document.querySelector('textarea[placeholder^="Add a brief profile summary"]') || document.querySelector('textarea[placeholder^="Tell us"]'); if (bioEl) bioEl.value = p.bio||'';
    const phoneEl = document.querySelector('input[placeholder="e.g. +1 234 567 890"]'); if (phoneEl) phoneEl.value = p.phone||'';
    const emailEl = document.querySelector('input[placeholder="your.email@example.com"]'); if (emailEl) emailEl.value = p.email||'';

    const avatar = $('.aspect-square.rounded-full'); if (p.avatarUrl) avatar.style.backgroundImage = `url(${CSS.escape(p.avatarUrl)})`;
    const rows = $$('#attachments-container > div.flex.items-end.gap-2'); rows.forEach((row, i)=>{ const input = row.querySelector('input'); input.value = p.links?.[i]?.url || ''; });
    renderResumeAndAttachments(p);
    const hi = $('section:has(h2:contains("Highlights")) textarea'); if (hi) hi.value = p.highlights||'';
    paintAvailability(p.availability);
  }

  function wireBasics(){}

  function wireMedia(p){
    const avatarBtn = $$('button').find(b=> b.textContent.trim()==='Upload/Change Photo');
    avatarBtn?.addEventListener('click', async ()=>{ const file = await pickFile('image/*'); if (!file) return; if (file.size > 2*1024*1024) return toast('Image too large (max 2MB)', {type:'error'}); const url = await fakeUpload(file); p.avatarUrl = url; $('.aspect-square.rounded-full').style.backgroundImage = `url(${CSS.escape(url)})`; await updateProfile(p); toast('Avatar updated'); });
    const videoBtn = $$('button').find(b=> b.textContent.trim()==='Upload Video');
    videoBtn?.addEventListener('click', async ()=>{ const file = await pickFile('video/*'); if (!file) return; const url = await fakeUpload(file); p.videoUrl = url; await updateProfile(p); toast('Video uploaded'); });
  }

  function wireSocial(){
    $$('#attachments-container button:has(.material-symbols-outlined)').forEach((btn, idx)=>{ btn.addEventListener('click', ()=>{ const rows = $$('#attachments-container > div.flex.items-end.gap-2'); rows[idx].remove(); }); });
    const addBtn = $$('section:has(h2:contains("Social Media")) button').find(b=> b.textContent.trim()==='Add More');
    addBtn?.addEventListener('click', ()=>{ const container = $('#attachments-container'); const row = document.createElement('div'); row.className = 'flex items-end gap-2'; row.innerHTML = `<label class="flex flex-col min-w-40 flex-1"><p class="text-primary dark:text-neutral-50 text-base font-medium leading-normal pb-2">Other</p><input class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-primary dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/50 border border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-12 px-4 text-base font-normal leading-normal" placeholder="https://" value=""/></label><button class="flex min-w-[40px] h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 text-sm font-medium leading-normal"><span class="material-symbols-outlined">delete</span></button>`; container.appendChild(row); });
  }

  function wireResumeAndAttachments(p){
    const uploadBtn = $$('button').find(b=> b.textContent.trim()==='Upload Files');
    uploadBtn?.addEventListener('click', async ()=>{
      const files = await pickFiles(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/*']);
      if (!files?.length) return;
      let didAnalyze = false;  /* will fix to JS boolean below */
    });
  }
})();