/* guardrails-loose.js */
(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const KB = 1024, MB = 1024*1024;
  const size = b => (b>=MB? (b/MB).toFixed(1)+'MB' : Math.max(1, Math.round((b||0)/KB))+'KB');
  const today = () => new Date().toISOString().slice(0,10);

  // Metrics refresh helper - updates dashboard summary cards
  function refreshMetrics() {
    // Trigger metrics update if available (maintains dashboard accuracy)
    if (typeof window.updateMetrics === 'function') {
      window.updateMetrics();
    }
    // Dispatch custom event for other metric listeners
    window.dispatchEvent(new CustomEvent('metrics:refresh'));
  }

  function headerSection(text){
    return $$('h2').find(h=>h.textContent.trim().toLowerCase()===text.toLowerCase())
      ?.closest('.flex.flex-col.gap-6');
  }
  function ensureSectionId(text,id){
    const sec = headerSection(text);
    if (sec && !sec.id) sec.id = id;
    return sec;
  }
  function dedupeByHeader(text){
    const secs = $$('h2')
      .filter(h=>h.textContent.trim().toLowerCase()===text.toLowerCase())
      .map(h=>h.closest('.flex.flex-col.gap-6')).filter(Boolean);
    if (secs.length>1){ secs.slice(1).forEach(s=>s.remove()); }
  }

  function bindAvatarLoose(){
    const run = ()=>{
      let input = $('#input-edit-avatar');
      let trig  = $('#avatar-profile');
      if (!input || !trig) return;
      try {
        const saved = localStorage.getItem('oi.avatarUrl');
        if (saved){ setBg(saved); }
      } catch {}
      const nInput = input.cloneNode(true);
      input.replaceWith(nInput); input = nInput;
      const nTrig  = trig.cloneNode(true);
      // Preserve ARIA attributes for accessibility
      if (!nTrig.hasAttribute('aria-label')) {
        nTrig.setAttribute('aria-label', 'Upload profile avatar');
      }
      if (!nTrig.hasAttribute('role')) {
        nTrig.setAttribute('role', 'button');
      }
      if (!nTrig.hasAttribute('tabindex')) {
        nTrig.setAttribute('tabindex', '0');
      }
      trig.parentNode.replaceChild(nTrig, trig); trig = nTrig;
      const open = ()=>input.click();
      trig.addEventListener('click', open);
      trig.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); }});
      input.addEventListener('change', ()=>{
        const f = input.files?.[0]; if (!f) return;
        if (!/^image\//.test(f.type||'')){ alert('Please select an image'); input.value=''; return; }
        const rd = new FileReader();
        rd.onload = e=>{
          const url = e.target.result;
          setBg(url);
          try { localStorage.setItem('oi.avatarUrl', url); } catch {}
          input.value='';
          refreshMetrics(); // Update dashboard metrics after avatar change
        };
        rd.readAsDataURL(f);
      });
      function setBg(url){
        const header = $('#avatar-header');
        const profile= $('#avatar-profile');
        if (header) header.style.backgroundImage = `url("${url}")`;
        if (profile) profile.style.backgroundImage = `url("${url}")`;
      }
    };
    setTimeout(()=>requestAnimationFrame(run),0);
  }

  function ensureBottomUploaderLoose({heading, sectionId, linkId, inputId, accept, tbodySel, storageKey, linkText}){
    const sec = ensureSectionId(heading, sectionId); if (!sec) return;
    const dup = sec.querySelectorAll(`#${linkId}`);
    if (dup.length>1){ [...dup].slice(0,-1).forEach(a=>a.closest('div')?.remove()); }
    let link = sec.querySelector(`#${linkId}`);
    let input= sec.querySelector(`#${inputId}`);
    if (!link || !input){
      const wrap = document.createElement('div');
      wrap.className = 'mt-2 flex items-center justify-end';
      wrap.innerHTML = `<a id="${linkId}" href="#" class="text-sm font-medium text-black hover:underline dark:text-white">${linkText}</a>
        <input id="${inputId}" type="file" class="hidden" multiple accept="${accept}"/>`;
      sec.appendChild(wrap);
      link = sec.querySelector(`#${linkId}`);
      input= sec.querySelector(`#${inputId}`);
    }
    const nInput = input.cloneNode(true);
    input.replaceWith(nInput); input = nInput;
    const nLink  = link.cloneNode(true);
    link.parentNode.replaceChild(nLink, link); link = nLink;
    // Support multiple tbody selector patterns (e.g., #resumes-body or #resumes-table tbody)
    let tbody = document.querySelector(tbodySel);
    if (!tbody && tbodySel.includes('-body')) {
      const tableId = tbodySel.replace('-body', '-table');
      tbody = document.querySelector(`${tableId} tbody`);
    }
    link.addEventListener('click', e=>{ e.preventDefault(); input.click(); });
    input.addEventListener('change', ()=>{
      const files = Array.from(input.files||[]); if (!files.length) return;
      let list=[]; try{ list = JSON.parse(localStorage.getItem(storageKey)||'[]'); }catch{}
      files.forEach(f=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="px-6 py-4 text-sm font-medium">${f.name}</td>
          <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${today()}</td>
          <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${(f.size>=1048576)?(f.size/1048576).toFixed(1)+'MB': Math.max(1, Math.round((f.size||0)/1024))+'KB'}</td>
          <td class="px-6 py-4 text-sm font-medium">
            <div class="flex items-center justify-end gap-4 actions">
              <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Edit</button>
              <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Delete</button>
            </div>
          </td>`;
        tbody?.prepend(tr);
        list.unshift({ filename:f.name, date:today(), size: (f.size>=1048576)?(f.size/1048576).toFixed(1)+'MB': Math.max(1, Math.round((f.size||0)/1024))+'KB' });
      });
      try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch {}
      input.value='';
      refreshMetrics(); // Update dashboard metrics after upload
    });
  }

  function boot(){
    dedupeByHeader('Attachments');
    ensureBottomUploaderLoose({
      heading:'My Resumes',
      sectionId:'resumes-section',
      linkId:'link-add-resume',
      inputId:'input-add-resume',
      accept:'.pdf,.doc,.docx,.txt',
      tbodySel:'#resumes-body',
      storageKey:'oi.resumes',
      linkText:'Add New'
    });
    ensureBottomUploaderLoose({
      heading:'Attachments',
      sectionId:'attachments-section',
      linkId:'link-create-attachment',
      inputId:'input-create-attachment',
      accept:'.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.ppt,.pptx,.xls,.xlsx,.csv',
      tbodySel:'#attachments-body',
      storageKey:'oi.attachments',
      linkText:'Create New'
    });
    bindAvatarLoose();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();