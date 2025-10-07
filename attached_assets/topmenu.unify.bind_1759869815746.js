// topmenu.unify.bind.js
// Unifies the top nav to match Profiles page and removes "New Profile" button across target pages.
(() => {
  const TARGETS = [/home\.html$/, /uploads\.html$/, /subscription\.html$/, /password\.html$/, /profiles\.html$/];
  if (!TARGETS.some(rx => rx.test(location.pathname))) return;

  function findHeader(){
    return document.querySelector('header') || document.body;
  }
  function findNav(header){
    // common selectors used in this app
    return header.querySelector('nav') || header.querySelector('div[class*="flex"][class*="items-center"] nav') || header;
  }

  const links = [
    { label:'Home',          href:'/home.html' },
    { label:'Availability',  href:'/availability.html' },
    { label:'Profiles',      href:'/profiles.html' },
    { label:'Uploads',       href:'/uploads.html' },
    { label:'Subscription',  href:'/subscription.html' },
    { label:'Password',      href:'/password.html' },
    { label:'Log Out',       href:'/logout.html' }
  ];

  function buildMenu(){
    const wrap = document.createElement('div');
    wrap.className = 'flex items-center gap-8';
    const navbox = document.createElement('div');
    navbox.className = 'flex items-center gap-8';
    links.forEach(({label, href}) => {
      const a = document.createElement('a');
      a.href = href;
      const isActive = location.pathname === href;
      a.className = isActive
        ? 'text-sm font-bold text-primary dark:text-white'
        : 'text-sm font-medium hover:text-primary dark:hover:text-white text-primary/70 dark:text-white/70';
      a.textContent = label;
      navbox.appendChild(a);
    });
    wrap.appendChild(navbox);
    return wrap;
  }

  function apply(){
    const header = findHeader();
    const nav = findNav(header);

    // Remove any "New Profile" button in header (button or link)
    Array.from(header.querySelectorAll('button, a')).forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t === 'new profile') el.remove();
    });

    // Replace existing nav content (preserve brand/logo nodes to the left if any)
    if (nav){
      // Try to leave the first brand cluster intact if it's not <nav>
      if (nav.tagName.toLowerCase() === 'nav') {
        nav.innerHTML = '';
        nav.appendChild(buildMenu());
      } else {
        // Create/insert a nav after brand cluster
        let brandHost = header.querySelector('.flex.items-center.gap-4') || header.firstElementChild || header;
        const newNav = document.createElement('nav');
        newNav.className = 'hidden md:flex items-center gap-8';
        newNav.appendChild(buildMenu());
        // If there is an existing <nav>, replace it; else append
        const exist = header.querySelector('nav');
        if (exist) exist.replaceWith(newNav); else header.appendChild(newNav);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();