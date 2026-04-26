// topmenu.unify.v3.bind.js
// Unifies the header menu across pages, removes 'New Profile'/'New Interview'.
// Special case for availability.html: menu is inserted ABOVE the page header/title/buttons.
(() => {
  const TARGETS = [
    /home\.html$/,
    /uploads\.html$/,
    /subscription\.html$/,
    /password\.html$/,
    /profiles\.html$/,
    /availability\.html$/
  ];
  if (!TARGETS.some(rx => rx.test(location.pathname))) return;

  const isAvailability = /availability\.html$/.test(location.pathname);

  function headerEl(){ return document.querySelector('header') || document.body; }

  const links = [
    { label:'Home',          href:'/home.html' },
    { label:'Availability',  href:'/availability.html' },
    { label:'Profiles',      href:'/profiles.html' },
    { label:'Uploads',       href:'/uploads.html' },
    { label:'Subscription',  href:'/subscription.html' },
    { label:'Password',      href:'/password.html' },
    { label:'Log Out',       href:'/logout.html' }
  ];

  function buildNav(){
    const nav = document.createElement('nav');
    nav.className = 'hidden md:flex items-center gap-8';
    links.forEach(({label, href}) => {
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

  function removeButtons(hdr){
    const kill = new Set(['new profile','new interview']);
    Array.from(hdr.querySelectorAll('button, a')).forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (kill.has(t)) el.remove();
    });
  }

  function apply(){
    const hdr = headerEl();
    if (!hdr) return;
    removeButtons(hdr);

    // Remove any previously injected navs to avoid duplicates
    Array.from(hdr.querySelectorAll('nav')).forEach(n => {
      if (n.querySelector('a[href="/profiles.html"]')) n.remove();
    });

    const nav = buildNav();

    if (isAvailability){
      // Insert the nav as the very first row inside the header so it sits ABOVE the page title and Save/Revert buttons.
      const row = document.createElement('div');
      row.className = 'container mx-auto px-10 py-3 flex items-center justify-start border-b border-primary/10 dark:border-white/10';
      row.appendChild(nav);
      hdr.prepend(row);
    } else {
      // Default behavior: place nav inside header near the top; if header has container, use it.
      const container = hdr.querySelector('.container, .mx-auto') || hdr;
      const row = document.createElement('div');
      row.className = 'hidden md:flex items-center gap-8 px-10 py-3';
      row.appendChild(nav);
      container.appendChild(row);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();