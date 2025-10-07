// Home page binder: integrate nav + New Interview using existing routes
(() => {
  const pick = async (paths) => {
    for (const p of paths) {
      try {
        const r = await fetch(p, { method: 'HEAD' });
        if (r.ok) return p;
      } catch {}
    }
    return paths[paths.length - 1];
  };

  function linkByText(text){
    const links = Array.from(document.querySelectorAll('nav a'));
    return links.find(a => a.textContent.trim().toLowerCase() === text.toLowerCase());
  }

  async function wire(){
    Array.from(document.querySelectorAll('button, a')).forEach(el=>{
      const t = (el.textContent||'').trim().toLowerCase();
      if (t === 'share profile' || t === 'manage profiles') el.remove();
    });

    const home = linkByText('Home');
    if (home) home.href = await pick(['/home.html', '/index.html', '/']);

    const explore = linkByText('Explore');
    if (explore) explore.href = await pick(['/profiles.html', '/profiles', '/explore.html']);

    const myProfile = linkByText('My Profile');
    if (myProfile) myProfile.href = await pick(['/profile.html', '/profile_home.html', '/me.html']);

    const newBtn = Array.from(document.querySelectorAll('button'))
      .find(b => (b.textContent||'').trim().toLowerCase() === 'new interview');
    if (newBtn) {
      const target = await pick(['/interviews/new', '/profile_edit.html?new=1', '/profile_edit.html']);
      newBtn.addEventListener('click', (e)=> {
        e.preventDefault();
        window.location.href = target;
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();