// password.bind.js
// - Replaces header with Home page header (visually identical) without changing HTML bytes at rest
// - Wires nav links and profile avatar
// - Binds password form submit to existing endpoints with progressive fallbacks
(() => {
  const q = (sel,root=document) => root.querySelector(sel);
  const qa = (sel,root=document) => Array.from(root.querySelectorAll(sel));

  const pick = async (paths, method='HEAD') => {
    for (const p of paths) {
      try { const r = await fetch(p, { method }); if (r.ok) return p; } catch {}
    }
    return null;
  };
  const memo = {};
  const choose = async (key, paths, method='HEAD') => memo[key] ??= await pick(paths, method);

  // Header from home.html
  function injectHomeHeader(){
    const header = q('header');
    if (!header) return;
    // Build the exact header content used in home.html
    const headerContent = `
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
      <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="#" data-nav="explore">Explore</a>
      <a class="text-sm font-medium text-primary dark:text-white" href="#" data-nav="profile">My Profile</a>
    </nav>
    <button class="flex h-10 items-center justify-center rounded bg-primary px-4 text-sm font-bold text-white" data-action="new-interview">New Interview</button>
    <div class="aspect-square w-10 rounded-full bg-cover bg-center bg-no-repeat" data-avatar></div>
  </div>
</header>`;
    header.outerHTML = headerContent;
  }

  async function wireHeader(){
    const home = q('[data-nav="home"]');
    const explore = q('[data-nav="explore"]');
    const profile = q('[data-nav="profile"]');
    if (home) home.href = (await choose('home',['/home.html','/profile.html','/'])) || '#';
    if (explore) explore.href = (await choose('explore',['/explore.html','/explore'])) || '#';
    if (profile) profile.href = (await choose('profile',['/home.html','/profile.html','/'])) || '#';

    const newBtn = q('[data-action="new-interview"]');
    if (newBtn){
      const create = await choose('newInterview',[
        '/interviews/new','/interview/new','/interviews/create','/profile_edit.html'
      ]);
      if (create){ newBtn.addEventListener('click', e => { e.preventDefault(); location.href = create; }); }
    }

    const avatar = q('[data-avatar]');
    if (avatar){
      try{
        const r = await fetch('/api/users/me');
        if (r.ok){
          const j = await r.json();
          const url = j?.avatar_url || j?.photo_url;
          if (url){ avatar.style.backgroundImage = `url("${url}")`; }
          else { avatar.style.backgroundImage = 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDgS88QhSBYUengqyuPFZ-0rqaPoKmMT7v6UlmL9ZwjTSGh6tftgo0ETzEAZf8y-6d0AfCL_5TvJqd-MeDxWbSg03T5D1lPLSNi53oaZkCOoZ1oVRzfLbXc3_Qxe6CJpZLo2ppNz7zInTb-x9-fjO1hQyI8pySg-EPISStHYg_HPGbQDsKOfmNkGSxdfVMjAPPZVefqiPImJaGHAAwAxj-3mhyzTEwlx9PqerIK5EwF3lY74MdDJcyCTOYicZ9--VPI2pvucAXNOTE")'; }
        }
      }catch{}
    }
  }

  function toast(msg, ok=true){
    let n = document.createElement('div');
    n.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow ${ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(()=>n.remove(), 2400);
  }

  async function bindForm(){
    const form = q('form');
    if (!form) return;
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const current = q('#current-password')?.value || '';
      const newp = q('#new-password')?.value || '';
      const confirm = q('#confirm-new-password')?.value || '';
      if (!current || !newp || !confirm){ toast('Please fill in all fields.', false); return; }
      if (newp !== confirm){ toast('New password and confirmation do not match.', false); return; }
      if (newp.length < 8){ toast('Use at least 8 characters.', false); return; }

      const btn = q('button[type="submit"]'); const old = btn?.textContent;
      if (btn){ btn.disabled = true; btn.textContent = 'Updating...'; }

      // progressive endpoints
      const endpoints = [
        { url: '/api/auth/password', method: 'POST', body: { current_password: current, new_password: newp } },
        { url: '/api/users/me/password', method: 'PUT', body: { current_password: current, new_password: newp } },
        { url: '/api/password/update', method: 'POST', body: { current_password: current, new_password: newp } }
      ];
      let ok = false, lastStatus = 0;
      for (const ep of endpoints){
        try{
          const r = await fetch(ep.url, { method: ep.method, headers: { 'Content-Type':'application/json' }, body: JSON.stringify(ep.body) });
          lastStatus = r.status;
          if (r.ok){ ok = true; break; }
        }catch{}
      }

      if (btn){ btn.disabled = false; btn.textContent = old || 'Update Password'; }

      if (ok){
        toast('Password updated successfully.');
        q('#current-password').value = '';
        q('#new-password').value = '';
        q('#confirm-new-password').value = '';
      } else if (lastStatus === 401){
        toast('Please sign in again.', false);
        const login = await choose('login',['/login.html','/login','/signin']); if (login) location.href = login;
      } else {
        toast('Could not update password. Try again.', false);
      }
    });
  }

  function init(){
    // Skip header replacement if nav-patch.js has already handled it
    if (document.body.dataset.navPatched !== 'true') {
      injectHomeHeader();
      wireHeader();
    }
    bindForm();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();