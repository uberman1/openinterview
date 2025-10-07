// profiles.bind.js
// - Replaces header nav with Home-style top menu (Home, Availability, Profiles, Uploads, Subscription, Password, Log Out)
// - Hydrates table with real profiles from API if available
// - Wires: New Profile, View, Share (copy/share link), Edit, Set Default
(() => {
  const q = (sel,root=document) => root.querySelector(sel);
  const qa = (sel,root=document) => Array.from(root.querySelectorAll(sel));

  const pick = async (paths, method='HEAD') => {
    for (const p of paths) { try { const r = await fetch(p, { method }); if (r.ok) return p; } catch {} }
    return null;
  };
  const cache = {};
  const choose = async (key, paths, method='HEAD') => cache[key] ??= await pick(paths, method);

  function toast(msg, ok=true){
    let n = document.createElement('div');
    n.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow ${ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(()=>n.remove(), 2200);
  }

  // Build Home-style menu
  function replaceHeaderNav(){
    const header = document.querySelector('header');
    if (!header) return;
    const navHTML = `
<header class="flex items-center justify-between whitespace-nowrap border-b border-primary/10 px-10 py-4">
  <div class="flex items-center gap-4">
    <div class="h-6 w-6">
      <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
      </svg>
    </div>
    <h2 class="text-lg font-bold">OpenInterview.me</h2>
  </div>
  <div class="flex flex-1 items-center justify-end gap-6">
    <nav class="flex items-center gap-6">
      <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="#" data-nav="home">Home</a>
      <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="#" data-nav="availability">Availability</a>
      <a class="text-sm font-medium text-primary dark:text-white" href="#" data-nav="profiles">Profiles</a>
      <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="#" data-nav="uploads">Uploads</a>
      <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="#" data-nav="subscription">Subscription</a>
      <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="#" data-nav="password">Password</a>
      <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="#" data-nav="logout">Log Out</a>
    </nav>
    <button class="flex h-10 items-center justify-center rounded bg-primary px-4 text-sm font-bold text-white" data-action="new-profile">New Profile</button>
    <div class="aspect-square w-10 rounded-full bg-cover bg-center bg-no-repeat" data-avatar></div>
  </div>
</header>`;
    header.outerHTML = navHTML;
  }

  async function wireHeader(){
    const map = {
      home:       ['/home.html','/profile.html','/'],
      availability:['/availability.html','/availability'],
      profiles:   ['/profiles.html','/profiles'],
      uploads:    ['/uploads.html','/uploads'],
      subscription:['/subscription.html','/billing','/subscription'],
      password:   ['/password.html','/settings/password','/password']
    };
    for (const [key, paths] of Object.entries(map)){
      const a = q(`[data-nav="${key}"]`);
      if (a) a.href = (await choose(`nav:${key}`, paths)) || '#';
    }
    // logout
    const logout = q('[data-nav="logout"]');
    if (logout){
      logout.addEventListener('click', async (e)=>{
        e.preventDefault();
        const direct = await choose('logout.direct',['/logout']);
        if (direct){ location.href = direct; return; }
        try{
          const ep = await choose('logout.api',['/api/auth/logout'],'POST');
          if (ep){
            const r = await fetch(ep,{ method:'POST'});
            // regardless of outcome, send to login
          }
        }catch{}
        location.href = (await choose('login',['/login.html','/login','/signin'])) || '/';
      });
    }
    const avatar = q('[data-avatar]');
    if (avatar){
      try{ const r = await fetch('/api/users/me'); if (r.ok){ const j = await r.json(); const url = j?.avatar_url || j?.photo_url; if (url) avatar.style.backgroundImage = `url("${url}")`; } }catch{}
      if (!avatar.style.backgroundImage) avatar.style.backgroundImage = 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDgS88QhSBYUengqyuPFZ-0rqaPoKmMT7v6UlmL9ZwjTSGh6tftgo0ETzEAZf8y-6d0AfCL_5TvJqd-MeDxWbSg03T5D1lPLSNi53oaZkCOoZ1oVRzfLbXc3_Qxe6CJpZLo2ppNz7zInTb-x9-fjO1hQyI8pySg-EPISStHYg_HPGbQDsKOfmNkGSxdfVMjAPPZVefqiPImJaGHAAwAxj-3mhyzTEwlx9PqerIK5EwF3lY74MdDJcyCTOYicZ9--VPI2pvucAXNOTE")';
    }
    const newBtn = q('[data-action="new-profile"]');
    if (newBtn){
      const create = await choose('profiles.new',['/profiles/new','/profile_edit.html','/profile/new']);
      if (create){ newBtn.addEventListener('click', (e)=>{ e.preventDefault(); location.href = create; }); }
    }
  }

  // Render helpers
  const tbodySel = 'main table tbody';

  function rowHTML(p){
    const created = p.created_at ? new Date(p.created_at).toISOString().slice(0,10) : '';
    return `
<tr class="border-b border-subtle-light dark:border-subtle-dark" data-id="${p.id}">
  <td class="py-5 px-6 font-medium text-sm">${p.name||''}</td>
  <td class="py-5 px-6 text-sm text-muted-light dark:text-muted-dark">${p.title||''}</td>
  <td class="py-5 px-6 text-sm text-muted-light dark:text-muted-dark">${created}</td>
  <td class="py-5 px-6 text-center">
    <input class="custom-checkbox" type="checkbox" ${p.is_default?'checked':''} data-role="default">
  </td>
  <td class="py-5 px-6 text-sm font-medium">
    <div class="flex items-center justify-end gap-6">
      <a class="hover:text-primary dark:hover:text-white" href="#" data-action="view">View</a>
      <a class="hover:text-primary dark:hover:text-white" href="#" data-action="share">Share</a>
      <a class="hover:text-primary dark:hover:text-white" href="#" data-action="edit">Edit</a>
    </div>
  </td>
</tr>`;
  }

  async function fetchProfiles(){
    try {
      const r = await fetch('/api/profiles');
      if (!r.ok) return null;
      const j = await r.json();
      if (Array.isArray(j)) return j;
      if (Array.isArray(j?.data)) return j.data;
      return null;
    } catch { return null; }
  }

  async function hydrateTable(){
    const body = q(tbodySel);
    if (!body) return;
    const data = await fetchProfiles();
    if (!data) return; // keep static sample if API not available
    body.innerHTML = data.map(rowHTML).join('');
    bindRowActions();
  }

  async function shareUrlFor(id){
    // Try direct public handle first
    try {
      const r = await fetch(`/api/profiles/${id}`);
      if (r.ok){
        const j = await r.json();
        const handle = j?.public_handle || j?.handle || j?.slug;
        if (handle) return `/u/${handle}`;
      }
    } catch {}
    // Try share-link endpoints
    try {
      const r = await fetch(`/api/profiles/${id}/share`);
      if (r.ok){ const j = await r.json(); if (j?.url) return j.url; }
    } catch {}
    try {
      const r = await fetch(`/api/share/profile/${id}`);
      if (r.ok){ const j = await r.json(); if (j?.url) return j.url; }
    } catch {}
    // Fallback to edit page public preview
    return `/profile_public.html?profileId=${encodeURIComponent(id)}`;
  }

  function bindRowActions(){
    qa(`${tbodySel} tr`).forEach(tr => {
      const id = tr.getAttribute('data-id');
      const view = q('[data-action="view"]', tr);
      const edit = q('[data-action="edit"]', tr);
      const share = q('[data-action="share"]', tr);
      const def = q('input[data-role="default"]', tr);

      if (view){
        view.addEventListener('click', async (e)=>{
          e.preventDefault();
          const url = await shareUrlFor(id);
          window.open(url, '_blank','noopener');
        });
      }
      if (share){
        share.addEventListener('click', async (e)=>{
          e.preventDefault();
          const url = await shareUrlFor(id);
          try{ await navigator.clipboard.writeText(url); toast('Share link copied'); }
          catch{ toast('Share link: '+url); }
        });
      }
      if (edit){
        edit.addEventListener('click', async (e)=>{
          e.preventDefault();
          const editUrl = (await choose('profiles.edit',[`/profiles/${id}/edit`,`/profile_edit.html?profileId=${encodeURIComponent(id)}`])) || '#';
          location.href = editUrl;
        });
      }
      if (def){
        def.addEventListener('change', async (e)=>{
          if (!e.target.checked) { // prevent unchecking the only default
            e.target.checked = true; return;
          }
          // uncheck others visually
          qa('input[data-role="default"]').forEach(cb => { if (cb!==e.target) cb.checked=false; });
          // call API to set default (several fallbacks)
          let ok = false;
          const endpoints = [
            { url: `/api/profiles/${id}/default`, method:'POST', body:{} },
            { url: `/api/profiles/${id}/default`, method:'PUT', body:{} },
            { url: `/api/profiles/default`, method:'POST', body:{ id } },
          ];
          for (const ep of endpoints){
            try{
              const r = await fetch(ep.url, { method: ep.method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(ep.body)});
              if (r.ok){ ok=true; break; }
            }catch{}
          }
          if (!ok) toast('Could not set default profile', false);
        });
      }
    });
  }

  function init(){
    replaceHeaderNav();
    wireHeader();
    hydrateTable();
    bindRowActions(); // for static sample rows
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();