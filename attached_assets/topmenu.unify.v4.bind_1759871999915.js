// topmenu.unify.v4.bind.js
// Fix duplicate navs and place menu above header on availability.html only.
(() => {
  const PAGES = [/home\.html$/, /uploads\.html$/, /subscription\.html$/, /password\.html$/, /profiles\.html$/, /availability\.html$/];
  if (!PAGES.some(rx => rx.test(location.pathname))) return;
  const IS_AVAIL = /availability\.html$/.test(location.pathname);

  const MENU = [
    { label:'Home',          href:'/home.html' },
    { label:'Availability',  href:'/availability.html' },
    { label:'Profiles',      href:'/profiles.html' },
    { label:'Uploads',       href:'/uploads.html' },
    { label:'Subscription',  href:'/subscription.html' },
    { label:'Password',      href:'/password.html' },
    { label:'Log Out',       href:'/logout.html' }
  ];

  const header = document.querySelector('header') || document.body;

  function buildNav(){
    const nav = document.createElement('nav');
    nav.className = 'hidden md:flex items-center gap-8';
    MENU.forEach(({label, href}) => {
      const a = document.createElement('a');
      a.href = href;
      const active = location.pathname === href;
      a.className = active
        ? 'text-sm font-bold text-primary dark:text-white'
        : 'text-sm font-medium hover:text-primary dark:hover:text-white text-primary/70 dark:text-white/70';
      a.textContent = label;
      nav.appendChild(a);
    });
    return nav;
  }

  function removeCTAs(){
    const kill = new Set(['new profile','new interview']);
    header.querySelectorAll('button, a').forEach(el => {
      const t=(el.textContent||'').trim().toLowerCase();
      if (kill.has(t)) el.remove();
    });
  }

  function apply(){
    removeCTAs();

    const oldNavs = Array.from(header.querySelectorAll('nav'));
    const firstNav = oldNavs[0] || null;

    if (IS_AVAIL){
      // Kill all existing navs to avoid duplication
      oldNavs.forEach(n => n.remove());
      // Prepend our menu in its own top row
      const row = document.createElement('div');
      row.className = 'container mx-auto px-10 py-3 flex items-center justify-start border-b border-primary/10 dark:border-white/10';
      row.appendChild(buildNav());
      header.prepend(row);
      return;
    }

    // Non-availability pages:
    if (firstNav){
      // Replace the first existing nav in-place
      firstNav.replaceWith(buildNav());
      // Remove any additional navs that may remain (duplicates)
      oldNavs.slice(1).forEach(n => n.remove());
    } else {
      // No nav existed: append one near the top (keeps page structure intact)
      const container = header.querySelector('.container, .mx-auto') || header;
      const row = document.createElement('div');
      row.className = 'hidden md:flex items-center gap-8 px-10 py-3';
      row.appendChild(buildNav());
      container.appendChild(row);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();