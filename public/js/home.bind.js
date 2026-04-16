// home binder: routes + actions + upcoming integration
(() => {
  const pick = async (paths) => {
    for (const p of paths) {
      try {
        const r = await fetch(p, { method: 'HEAD' });
        if (r.ok) return p;
      } catch {}
    }
    return null;
  };

  const routeCache = {};
  const pickCached = async (key, paths) => {
    if (routeCache[key] !== undefined) return routeCache[key];
    const res = await pick(paths);
    routeCache[key] = res;
    return res;
  };

  function slugify(s){ return encodeURIComponent((s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')); }

  async function wireNav(){
    const links = Array.from(document.querySelectorAll('nav a'));
    const home = links.find(a=>a.textContent.trim().toLowerCase()==='home');
    const explore = links.find(a=>a.textContent.trim().toLowerCase()==='explore');
    const myProfile = links.find(a=>a.textContent.trim().toLowerCase()==='my profile');
    if (home) home.href = (await pickCached('home',['/home.html','/index.html','/'])) || '#';
    if (explore) explore.href = (await pickCached('explore',['/profiles.html','/profiles','/explore.html'])) || '#';
    if (myProfile) myProfile.href = (await pickCached('me',['/home.html','/profile.html','/me.html'])) || '#';
    const newBtn = Array.from(document.querySelectorAll('button')).find(b=>(b.textContent||'').trim().toLowerCase()==='new interview');
    if (newBtn){
      const target = (await pickCached('new',['/interviews/new','/profile_edit.html?new=1','/profile_edit.html'])) || '#';
      newBtn.addEventListener('click',(e)=>{ e.preventDefault(); if(target!=='#') window.location.href = target; });
    }
  }

  async function wireInterviews(){
    const rows = document.querySelectorAll('#interviews-body tr');
    for (const tr of rows){
      const actions = tr.querySelector('.actions');
      if (actions && !Array.from(actions.children).some(el=>/view/i.test(el.textContent||''))){
        const vb = document.createElement('button');
        vb.className = 'text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white';
        vb.textContent = 'View';
        actions.prepend(vb);
      }
      if (actions && !Array.from(actions.children).some(el=>/share/i.test(el.textContent||''))){
        const sb = document.createElement('button');
        sb.className = 'text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white';
        sb.textContent = 'Share';
        const editBtn = Array.from(actions.children).find(el=>/edit/i.test(el.textContent||''));
        if (editBtn) actions.insertBefore(sb, editBtn);
        else actions.appendChild(sb);
      }
      const title = tr.dataset.title || tr.querySelector('td').textContent || '';
      const slug = slugify(title);
      const id = tr.dataset.id || slug;

      const btns = Array.from(tr.querySelectorAll('.actions button'));
      const viewBtn = btns.find(b=>/view/i.test(b.textContent||''));
      const shareBtn = btns.find(b=>/share/i.test(b.textContent||''));
      const editBtn = btns.find(b=>/edit/i.test(b.textContent||''));
      const delBtn  = btns.find(b=>/delete/i.test(b.textContent||''));

      if (viewBtn){
        viewBtn.addEventListener('click', async (e)=>{
          e.preventDefault();
          const profileId = tr.dataset.id || await getProfileIdFromTitle(title);
          if (profileId) {
            window.location.href = `/profile_v4_1_package/public/index.html?id=${encodeURIComponent(profileId)}`;
          } else {
            const direct = await pickCached(`interviewView:${id}`,[`/interviews/${id}`, `/interview/${id}`, `/interviews/view?title=${slug}`]);
            const fallback = await pickCached('profileShare', ['/profile_share.html','/profile_public.html']);
            window.location.href = direct || fallback || '#';
          }
        });
      }
      if (shareBtn){
        shareBtn.addEventListener('click', async (e)=>{
          e.preventDefault();
          const profileId = tr.dataset.id || await getProfileIdFromTitle(title);
          if (profileId) {
            window.location.href = `/profile_v4_1_package/public/index.html?id=${encodeURIComponent(profileId)}#share`;
          }
        });
      }
      if (editBtn){
        editBtn.addEventListener('click', async (e)=>{
          e.preventDefault();
          const profileId = tr.dataset.id || await getProfileIdFromTitle(title);
          if (profileId) {
            window.location.href = `/profile_edit_enhanced.html?id=${encodeURIComponent(profileId)}`;
          } else {
            const target = await pickCached(`interviewEdit:${id}`,[`/interviews/${id}/edit`, `/profile_edit.html?interview=${slug}`, `/profile_edit.html`]);
            if (target) window.location.href = target;
          }
        });
      }
      if (delBtn){
        delBtn.addEventListener('click', async (e)=>{
          e.preventDefault();
          if (!confirm('Delete this interview?')) return;
          const delPaths = [`/api/interviews/${id}`, `/api/interviews?title=${slug}`];
          for (const p of delPaths){
            try {
              const r = await fetch(p,{method:'DELETE'});
              if (r.ok){ tr.remove(); return; }
            } catch {}
          }
        });
      }
    }
  }

  async function getProfileIdFromTitle(title){
    try {
      const { store } = await import('/js/data-store.js');
      const profiles = store.listProfiles();
      const profile = profiles.find(p => p.profileName === title || p.display?.name === title);
      return profile?.id || null;
    } catch {
      return null;
    }
  }

  async function wireResumes(){
    const rows = document.querySelectorAll('#resumes-body tr');
    for (const tr of rows){
      const actions = tr.querySelector('.actions');
      if (actions && !Array.from(actions.children).some(el=>/view/i.test(el.textContent||''))){
        const vb = document.createElement('button');
        vb.className = 'text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white';
        vb.textContent = 'View';
        actions.prepend(vb);
      }
      const filename = tr.dataset.filename || (tr.querySelector('td')?.textContent||'').trim();
      const id = tr.dataset.id || filename;

      const btns = Array.from(tr.querySelectorAll('.actions button'));
      const viewBtn = btns.find(b=>/view/i.test(b.textContent||''));
      const editBtn = btns.find(b=>/edit/i.test(b.textContent||''));
      const delBtn  = btns.find(b=>/delete/i.test(b.textContent||''));

      if (viewBtn){
        viewBtn.addEventListener('click', async (e)=>{
          e.preventDefault();
          const target = await pickCached(`resumeView:${filename}`,[`/uploads/${encodeURIComponent(filename)}`, `/files/${encodeURIComponent(id)}`, `/api/files/${encodeURIComponent(id)}/download`]);
          if (target) window.location.href = target;
        });
      }
      if (editBtn){
        editBtn.addEventListener('click', async (e)=>{
          e.preventDefault();
          const target = await pickCached('uploadsPage',['/uploads.html','/uploads']);
          if (target) window.location.href = target + `#file=${encodeURIComponent(filename)}`;
        });
      }
      if (delBtn){
        delBtn.addEventListener('click', async (e)=>{
          e.preventDefault();
          if (!confirm('Delete this file?')) return;
          const delPaths = [`/api/files/${encodeURIComponent(id)}`, `/api/uploads?name=${encodeURIComponent(filename)}`];
          for (const p of delPaths){
            try {
              const r = await fetch(p,{method:'DELETE'});
              if (r.ok){ tr.remove(); return; }
            } catch {}
          }
        });
      }
    }
  }

  async function loadUpcoming(){
    const tbody = document.querySelector('#upcoming-body');
    if (!tbody) return;
    const endpoints = ['/api/interviews/upcoming','/api/bookings/upcoming','/api/schedule/upcoming'];
    let data = null;
    for (const ep of endpoints){
      try {
        const r = await fetch(ep);
        if (r.ok){
          data = await r.json();
          break;
        }
      } catch {}
    }
    if (!Array.isArray(data) || data.length===0) return;

    tbody.innerHTML = '';
    for (const it of data){
      const { company, role, datetime, recruiter, id } = it;
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td class="px-6 py-4 text-sm font-medium">${company||''}</td>`,
        `<td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${role||''}</td>`,
        `<td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${datetime||''}</td>`,
        `<td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${recruiter||''}</td>`,
        `<td class="px-6 py-4 text-sm font-medium text-right"><a class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="/interviews/${encodeURIComponent(id||'')}">View Details</a></td>`
      ].join('');
      tbody.appendChild(tr);
    }
  }

  function init(){ wireNav(); wireInterviews(); wireResumes(); loadUpcoming(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();