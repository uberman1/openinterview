(function(){
  const K = { resumes: 'oi.resumes', attachments: 'oi.attachments', avatarUrl: 'oi.avatarUrl' };
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const today=()=>new Date().toISOString().slice(0,10);
  const formatSize=b=>b>=1048576? (b/1048576).toFixed(1)+'MB' : Math.max(1,Math.round(b/1024))+'KB';
  const lsGet=(k,fb)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } };
  const lsSet=(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} };

  function setAvatar(url){
    const h=$('#avatar-header'), p=$('#avatar-profile');
    if (h) h.style.backgroundImage=`url("${url}")`;
    if (p) p.style.backgroundImage=`url("${url}")`;
    try{ localStorage.setItem(K.avatarUrl,url);}catch{}
  }
  function bindAvatar(){
    const input=$('#input-edit-avatar'), trig=$('#avatar-profile');
    const saved=localStorage.getItem(K.avatarUrl); if (saved) setAvatar(saved);
    if (!input || !trig) return;
    const open=()=>input.click();
    trig.addEventListener('click', open);
    trig.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault(); open();} });
    input.addEventListener('change', ()=>{
      const f=input.files&&input.files[0]; if(!f) return;
      if(!f.type || !/^image\//.test(f.type)){ alert('Please select an image'); input.value=''; return; }
      const rd=new FileReader(); rd.onload=e=>{ setAvatar(e.target.result); input.value=''; }; rd.readAsDataURL(f);
    });
  }

  function dedupeAttachments(){
    const secs=$$('h2').filter(h=>h.textContent.trim()==='Attachments').map(h=>h.closest('.flex.flex-col.gap-6')).filter(Boolean);
    if (secs.length>1){ secs.slice(1).forEach(s=>s.remove()); }
  }

  function ensureBottomUploader({sectionId, linkId, inputId, accept, tbodyId, storageKey, linkText}){
    const sec=$(`#${sectionId}`), body=$(`#${tbodyId}`); if(!sec||!body) return;
    const links=$$(`#${sectionId} #${linkId}`); if(links.length>1){ links.slice(0,-1).forEach(a=>{ const w=a.closest('div'); if(w) w.remove(); }); }
    let link=$(`#${sectionId} #${linkId}`), input=$(`#${sectionId} #${inputId}`);
    if(!link || !input){
      const wrap=document.createElement('div'); wrap.className='mt-2 flex items-center justify-end';
      wrap.innerHTML=`<a id="${linkId}" href="#" class="text-sm font-medium text-black hover:underline dark:text-white">${linkText}</a>
        <input id="${inputId}" type="file" class="hidden" multiple accept="${accept}"/>`;
      sec.appendChild(wrap);
      link=$(`#${sectionId} #${linkId}`); input=$(`#${sectionId} #${inputId}`);
    }
    link.addEventListener('click', e=>{ e.preventDefault(); input.click(); });
    input.addEventListener('change', ()=>{
      const files=Array.from(input.files||[]); if(!files.length) return;
      const list=lsGet(storageKey,[]);
      files.forEach(f=>{
        const tr=document.createElement('tr');
        tr.innerHTML=`
          <td class="px-6 py-4 text-sm font-medium">${f.name}</td>
          <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${today()}</td>
          <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${formatSize(f.size||0)}</td>
          <td class="px-6 py-4 text-sm font-medium">
            <div class="flex items-center justify-end gap-4 actions">
              <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Edit</button>
              <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Delete</button>
            </div>
          </td>`;
        body.prepend(tr);
        list.unshift({ filename:f.name, date:today(), size:formatSize(f.size||0) });
      });
      lsSet(storageKey, list);
      input.value='';
    });
  }

  function init(){
    bindAvatar();
    dedupeAttachments();
    ensureBottomUploader({
      sectionId:'resumes-section',
      linkId:'link-add-resume',
      inputId:'input-add-resume',
      accept:'.pdf,.doc,.docx,.txt',
      tbodyId:'resumes-body',
      storageKey:K.resumes,
      linkText:'Add New'
    });
    ensureBottomUploader({
      sectionId:'attachments-section',
      linkId:'link-create-attachment',
      inputId:'input-create-attachment',
      accept:'.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.ppt,.pptx,.xls,.xlsx,.csv',
      tbodyId:'attachments-body',
      storageKey:K.attachments,
      linkText:'Create New'
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();