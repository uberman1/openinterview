// OpenInterview • Uploads binder (no HTML changes)
(() => {
  function getUser(){ try{ return JSON.parse(localStorage.getItem('user')||'null'); }catch{return null;} }
  function getProfile(){ try{ return JSON.parse(localStorage.getItem('profile')||'null'); }catch{return null;} }
  
  const API = {
    list: () => {
      const u=getUser(); return u?`/api/files?userId=${u.id}`:null;
    },
    upload: (kind) => {
      const p=getProfile(); return p?`/api/upload/${kind}/${p.id}`:null;
    },
    remove: (id) => `/api/files/${id}`,
    maxResumeMB: 5,
    maxGeneralMB: 25
  };
  const $all=(s,r=document)=>Array.from(r.querySelectorAll(s));

  function locateSections(){
    const h2s=$all('h2'); let resumesTbody=null, generalTbody=null;
    h2s.forEach(h=>{
      const label=(h.textContent||'').trim().toLowerCase();
      const tbody=h.parentElement?.querySelector('table')?.querySelector('tbody');
      if(label==='resumes') resumesTbody=tbody;
      if(label==='general uploads') generalTbody=tbody;
    });
    return {resumesTbody,generalTbody};
  }

  async function fetchJSON(url){
    const r=await fetch(url,{headers:{'Accept':'application/json'}});
    if(!r.ok) throw new Error(await r.text()); return r.json();
  }

  function fmtBytes(b){ if(!Number.isFinite(b)) return ''; const u=['B','KB','MB','GB']; let i=0,n=b; while(n>=1024&&i<u.length-1){n/=1024;i++;} return `${n.toFixed(n>=10||i===0?0:1)} ${u[i]}`; }

  function rowHTML(it){
    const date=it.uploadedAt?new Date(it.uploadedAt).toLocaleDateString():'';
    const size=fmtBytes(it.size||0);
    const name=it.name||'Unnamed';
    const viewUrl=it.url&&it.url!=='#'?it.url:'#';
    return `<tr data-id="${it.id}">
      <td class="p-4 text-sm font-medium text-gray-900 dark:text-white">${name}</td>
      <td class="p-4 text-sm text-gray-500 dark:text-gray-300">${date}</td>
      <td class="p-4 text-sm text-gray-500 dark:text-gray-300">${size}</td>
      <td class="p-4 text-right">
        <div class="flex items-center justify-end gap-2">
          ${viewUrl!=='#'?`<a href="${viewUrl}" target="_blank" class="btn btn-secondary">View</a>`:`<button class="btn btn-secondary" disabled>View</button>`}
          <button class="btn btn-secondary action-delete text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50">Delete</button>
        </div>
      </td>
    </tr>`;
  }

  async function loadTables(){
    const {resumesTbody,generalTbody}=locateSections();
    if(!resumesTbody||!generalTbody) return;
    const url=API.list();
    if(!url){ console.warn('No user/profile'); return; }
    try{
      const files=await fetchJSON(url);
      const p=getProfile();
      const resumes=files.filter(f=>p&&p.resumeFileId===f.id);
      const general=files.filter(f=>p&&(p.attachmentFileIds||[]).includes(f.id));
      resumesTbody.innerHTML=(resumes||[]).map(rowHTML).join('')||'<tr><td colspan="4" class="p-4 text-sm text-gray-500">No resumes</td></tr>';
      generalTbody.innerHTML=(general||[]).map(rowHTML).join('')||'<tr><td colspan="4" class="p-4 text-sm text-gray-500">No files</td></tr>';
    }catch(e){ console.warn('Uploads load failed:', e.message); }
  }

  function triggerUpload(){
    const input=document.createElement('input'); input.type='file';
    input.accept='.pdf,.doc,.docx,.ppt,.pptx,.key,.pages';
    input.style.display='none'; document.body.appendChild(input);
    input.addEventListener('change', async ()=>{
      const file=input.files&&input.files[0]; input.remove(); if(!file) return;
      let type=(prompt('Upload to which section? Type "resume" or "attachment"', 'resume')||'').trim().toLowerCase();
      if(type!=='resume'&&type!=='attachment') type='attachment';
      const maxMB=(type==='resume')?API.maxResumeMB:API.maxGeneralMB;
      if(file.size>maxMB*1024*1024){ alert(`File too large. Max ${maxMB} MB for ${type}.`); return; }
      const url=API.upload(type);
      if(!url){ alert('No profile selected'); return; }
      const fd=new FormData(); fd.append('file',file);
      try{
        const r=await fetch(url,{method:'POST',body:fd});
        if(!r.ok) throw new Error(await r.text());
        const result=await r.json();
        if(result.profile){ localStorage.setItem('profile', JSON.stringify(result.profile)); }
        await loadTables();
      }catch(e){ alert('Upload failed: '+e.message); }
    });
    input.click();
  }

  function bindActions(){
    document.addEventListener('click',(ev)=>{
      const btn=ev.target.closest('button'); if(!btn) return;

      if(btn.matches('.btn.btn-primary') && btn.textContent.includes('Upload File')){
        ev.preventDefault(); triggerUpload(); return;
      }
      const tr=ev.target.closest('tr[data-id]'); if(!tr) return; const id=tr.getAttribute('data-id');
      if(btn.classList.contains('action-delete')){
        if(confirm('Delete this file?')){
          fetch(API.remove(id),{method:'DELETE'})
            .then(async r=>{
              if(r.ok){
                const p=getProfile();
                if(p){
                  if(p.resumeFileId===id) p.resumeFileId=null;
                  p.attachmentFileIds=(p.attachmentFileIds||[]).filter(fid=>fid!==id);
                  localStorage.setItem('profile', JSON.stringify(p));
                }
                await loadTables();
              }else{
                const t=await r.text(); throw new Error(t);
              }
            })
            .catch(err=>alert('Delete failed: '+err.message));
        }
        return;
      }
    });
  }

  function init(){ loadTables(); bindActions(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
