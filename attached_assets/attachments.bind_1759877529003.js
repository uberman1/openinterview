(function(){
  function fmtBytes(n){ if(!n&&n!==0) return ''; const u=['B','KB','MB','GB']; let i=0,x=n; while(x>=1024&&i<u.length-1){x/=1024;i++;} return (Math.round(x*10)/10)+' '+u[i]; }
  function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; }
  async function fetchList(){
    const kinds=['attachment','attachments','other','general'];
    for(const k of kinds){
      try{ const r=await fetch('/api/uploads?kind='+encodeURIComponent(k)); if(r.ok) return r.json(); }catch(e){}
    }
    return [];
  }
  function row(item){
    const date=item.uploadedAt||item.date||'';
    const size=item.size||0;
    const name=item.name||item.filename||'file';
    const id=item.id||item._id||name;
    const url=item.url||'#';
    return el(`<tr data-id="${id}">
      <td class="px-6 py-4 text-sm font-medium">${name}</td>
      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${date}</td>
      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${typeof size==='string'?size:fmtBytes(size)}</td>
      <td class="px-6 py-4 text-sm font-medium">
        <div class="flex items-center justify-end gap-4">
          <a class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="${url}" target="_blank" rel="noopener">View</a>
          <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" data-action="delete">Delete</button>
        </div>
      </td>
    </tr>`);
  }
  async function load(){
    const tbody=document.getElementById('attachmentsBody'); if(!tbody) return;
    const items=await fetchList(); tbody.innerHTML=''; (items||[]).forEach(it=>tbody.appendChild(row(it)));
    tbody.addEventListener('click', async (e)=>{
      const btn=e.target.closest('button[data-action="delete"]'); if(!btn) return;
      const tr=btn.closest('tr'); const id=tr&&tr.getAttribute('data-id'); if(!id) return;
      try{ const r=await fetch('/api/uploads/'+encodeURIComponent(id),{method:'DELETE'}); if(r.ok) tr.remove(); }catch(err){ console.error(err); }
    });
  }
  document.addEventListener('DOMContentLoaded', load);
})();