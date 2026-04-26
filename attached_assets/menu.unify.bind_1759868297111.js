// menu.unify.bind.js
// Standardizes the top nav across user pages and removes "New Profile" button.
(() => {
  const TARGET_PAGES = [/home\.html$/, /profiles\.html$/, /uploads\.html$/, /availability\.html$/, /subscription\.html$/, /password\.html$/, /profile_edit\.html$/];
  const path = location.pathname;
  if (!TARGET_PAGES.some(rx => rx.test(path))) return;

  const navTargets = [
    'header nav',               // common pattern
    'header .hidden.md\\:flex', // sometimes nav uses this class
    'nav[role="navigation"]'
  ];

  function findNav(){
    for (const sel of navTargets){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // as a fallback, create a nav inside header
    const header = document.querySelector('header') || document.body;
    const nav = document.createElement('nav');
    header.appendChild(nav);
    return nav;
  }

  const nav = findNav();
  const links = [
    { label:'Home',          href:'/home.html' },
    { label:'Availability',  href:'/availability.html' },
    { label:'Profiles',      href:'/profiles.html' },
    { label:'Uploads',       href:'/uploads.html' },
    { label:'Subscription',  href:'/subscription.html' },
    { label:'Password',      href:'/password.html' },
    { label:'Log Out',       href:'/logout.html' }
  ];

  // Build new menu
  const wrap = document.createElement('div');
  wrap.className = 'flex items-center gap-6';
  const ul = document.createElement('div');
  ul.className = 'flex items-center gap-6';
  for (const {label, href} of links){
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.className = 'text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white';
    if (location.pathname.endsWith(href)) {
      a.className = 'text-sm font-bold text-primary dark:text-white';
    }
    ul.appendChild(a);
  }
  wrap.appendChild(ul);

  // Replace existing nav contents
  nav.innerHTML = '';
  nav.appendChild(wrap);

  // Remove any "New Profile" button in header
  const header = document.querySelector('header') || document;
  Array.from(header.querySelectorAll('button, a')).forEach(el => {
    const t = (el.textContent||'').trim().toLowerCase();
    if (t === 'new profile') el.remove();
  });
})();