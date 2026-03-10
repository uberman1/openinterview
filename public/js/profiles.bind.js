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
    // Disabled header replacement to respect server-rendered/static header
    /*
    const header = document.querySelector('header');
    if (!header) return;
    const navHTML = `...`;
    header.outerHTML = navHTML;
    */
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
        try { localStorage.removeItem('oi.avatarUrl'); } catch {}
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
    // Fix date mapping - use created_at instead of createdAt
    const created = p.created_at ? new Date(p.created_at).toISOString().slice(0,10) : 
                   p.createdAt ? new Date(p.createdAt).toISOString().slice(0,10) : '';
    
    // Robust check for is_default (handle snake_case, camelCase, boolean, number, string)
    const isDefault = p.is_default === true || p.is_default === 1 || p.is_default === 'true' ||
                      p.isDefault === true || p.isDefault === 1 || p.isDefault === 'true';

    return `
<tr class="border-b border-subtle-light dark:border-subtle-dark" data-id="${p.id}">
  <td class="py-5 px-6 font-medium text-sm">${p.profileName||''}</td>
  <td class="py-5 px-6 text-sm text-muted-light dark:text-muted-dark">${p.title||''}</td>
  <td class="py-5 px-6 text-sm text-muted-light dark:text-muted-dark">${created}</td>
  <td class="py-5 px-6 text-center">
    <div class="default-checkbox-container">
      <input class="custom-checkbox" type="checkbox" ${isDefault?'checked':''} data-role="default">
    </div>
  </td>
  <td class="py-5 px-6 text-sm font-medium">
    <div class="flex items-center justify-end gap-6">
      <a class="hover:text-primary dark:hover:text-white transition-colors hidden" href="#" data-action="view">View</a>
      <a class="hover:text-primary dark:hover:text-white transition-colors hidden" href="#" data-action="share">Share</a>
      <a class="hover:text-primary dark:hover:text-white transition-colors" href="#" data-action="edit">Edit</a>
    </div>
  </td>
</tr>`;
  }

  async function fetchProfiles(){
    try {
      let r = await fetch('/api/profiles', { credentials: 'include' });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && j.length) return j;
        if (Array.isArray(j?.data) && j.data.length) return j.data;
      }
      const user = (()=>{ try{ return JSON.parse(localStorage.getItem('user')||'null'); }catch{return null;} })();
      if (user?.id) {
        r = await fetch(`/api/profiles?userId=${encodeURIComponent(user.id)}`, { credentials: 'include' });
        if (r.ok) { const j = await r.json(); if (Array.isArray(j)) return j; }
      }
      r = await fetch('/api/profiles/mine', { credentials: 'include' });
      if (r.ok) { const p = await r.json(); if (p?.id) return [p]; }
      return null;
    } catch { return null; }
  }

  async function hydrateTable(){
    const body = q(tbodySel);
    if (!body) {
      console.log('[profiles] No tbody found');
      return;
    }
    
    console.log('[profiles] Fetching profiles...');
    const data = await fetchProfiles();
    console.log('[profiles] Fetched data:', data);
    
    if (!data || data.length === 0) {
      console.log('[profiles] No data found, showing empty state');
      // Show empty state
      body.innerHTML = `
        <tr>
          <td colspan="5" class="py-12 px-6 text-center text-muted-light dark:text-muted-dark">
            <div class="flex flex-col items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-subtle-light dark:bg-subtle-dark flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <div>
                <p class="font-medium">No profiles yet</p>
                <p class="text-sm">Create your first profile to get started</p>
              </div>
            </div>
          </td>
        </tr>
      `;
    } else {
      console.log('[profiles] Rendering', data.length, 'profiles');
      const html = data.map(rowHTML).join('');
      console.log('[profiles] Generated HTML length:', html.length);
      body.innerHTML = html;
      bindRowActions();
    }
    
    body.classList.add('loaded');
  }

  async function shareUrlFor(id){
    // Try direct public handle first
    try {
      const r = await fetch(`/api/profiles/${id}`);
      if (r.ok){
        const j = await r.json();
        const handle = j?.public_handle || j?.publicHandle || j?.handle || j?.slug;
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
    // Fallback: use profile ID as handle (route /u/:handle accepts both handles and IDs)
    return `/u/${encodeURIComponent(id)}`;
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
          // Add loading state
          view.classList.add('btn-loading');
          try {
            const url = await shareUrlFor(id);
            window.open(url, '_blank','noopener');
          } finally {
            view.classList.remove('btn-loading');
          }
        });
      }
      if (share){
        share.addEventListener('click', async (e)=>{
          e.preventDefault();
          // Add loading state
          share.classList.add('btn-loading');
          try {
            const url = await shareUrlFor(id);
            await navigator.clipboard.writeText(url);
            toast('Share link copied');
          } catch {
            const url = await shareUrlFor(id);
            toast('Share link: '+url);
          } finally {
            share.classList.remove('btn-loading');
          }
        });
      }
      if (edit){
        edit.addEventListener('click', async (e)=>{
          e.preventDefault();
          // Add loading state
          edit.classList.add('btn-loading');
          try {
            const editUrl = (await choose('profiles.edit',[`/profile_edit.html?id=${encodeURIComponent(id)}`, `/profiles/${id}/edit`])) || `/profile_edit.html?id=${encodeURIComponent(id)}`;
            location.href = editUrl;
          } finally {
            edit.classList.remove('btn-loading');
          }
        });
      }
      if (def){
        def.addEventListener('change', async (e)=>{
          if (!e.target.checked) { // prevent unchecking the only default
            e.target.checked = true; return;
          }
          
          // Prevent the checkbox from changing visually until API confirms
          e.preventDefault();
          const originalChecked = e.target.checked;
          e.target.checked = !originalChecked; // Revert to original state
          
          // Add loading state to checkbox and row
          const checkboxContainer = e.target.closest('.default-checkbox-container');
          const row = e.target.closest('tr');
          const originalCheckbox = e.target;
          
          // Add loading state to row
          row.classList.add('row-loading');
          
          // Create loading spinner
          const loadingSpinner = document.createElement('div');
          loadingSpinner.className = 'flex items-center justify-center';
          loadingSpinner.innerHTML = `
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 dark:border-gray-600 border-t-primary"></div>
          `;
          
          // Hide checkbox and show spinner
          originalCheckbox.style.display = 'none';
          checkboxContainer.appendChild(loadingSpinner);
          
          // Disable all checkboxes during the operation
          qa('input[data-role="default"]').forEach(cb => cb.disabled = true);
          
          try {
            const r = await fetch(`/api/profiles/${id}/default`, { 
              method: 'PATCH', 
              headers: {'Content-Type': 'application/json'},
              credentials: 'include'
            });
            
            if (r.ok) {
              // Success: Update all checkboxes to reflect new state
              qa('input[data-role="default"]').forEach(cb => {
                const row = cb.closest('tr');
                const rowId = row ? row.getAttribute('data-id') : null;
                cb.checked = (rowId === id);
              });

              // Update Navbar and Local Storage immediately
              const newProfileUrl = `/owner_preview.html?id=${id}`;
              localStorage.setItem('oi.defaultProfileUrl', newProfileUrl);
              const navbar = document.querySelector('app-navbar');
              if (navbar && typeof navbar.updateProfileLink === 'function') {
                navbar.updateProfileLink(newProfileUrl);
              }

              toast('Default profile updated');
            } else {
              const errorData = await r.json().catch(() => ({}));
              throw new Error(errorData.error || `HTTP ${r.status}: ${r.statusText}`);
            }
          } catch (error) {
            console.error('[profiles] Failed to set default profile:', error);
            toast('Could not set default profile', false);
            // On error, keep original state (no changes to checkboxes)
          } finally {
            // Remove loading states
            row.classList.remove('row-loading');
            loadingSpinner.remove();
            originalCheckbox.style.display = '';
            
            // Re-enable all checkboxes
            qa('input[data-role="default"]').forEach(cb => cb.disabled = false);
          }
        });
      }
    });
  }

  function init(){
    // Skip header replacement if nav-patch.js has already handled it
    if (document.body.dataset.navPatched !== 'true') {
      replaceHeaderNav();
    }
    wireHeader();
    hydrateTable();
    bindRowActions(); // for static sample rows
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
