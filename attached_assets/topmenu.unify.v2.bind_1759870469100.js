// topmenu.unify.v2.bind.js
(() => {
  const TARGETS = [/home\.html$/, /uploads\.html$/, /subscription\.html$/, /password\.html$/, /profiles\.html$/, /availability\.html$/];
  if (!TARGETS.some(rx => rx.test(location.pathname))) return;

  function headerEl(){ return document.querySelector('header') || document.body; }
  function navEl(hdr){ return hdr.querySelector('nav') || hdr.querySelector('div[class*="flex"][class*="items-center"] nav') || hdr; }

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
    const navwrap = document.createElement('div');
    navwrap.className = 'flex items-center gap-8';
    const row = document.createElement('div');
    row.className = 'flex items-center gap-8';
    links.forEach(({label, href}) => {
      const a = document.createElement('a');
      a.href = href;
      const active = location.pathname === href;
      a.className = active ? 'text-sm font-bold text-primary dark:text-white'
                           : 'text-sm font-medium hover:text-primary dark:hover:text-white text-primary/70 dark:text-white/70';
      a.textContent = label;
      row.appendChild(a);
    });
    navwrap.appendChild(row);
    return navwrap;
  }

  function apply(){
    const hdr = headerEl();
    const nav = navEl(hdr);

    // Remove buttons: New Profile, New Interview
    const kill = new Set(['new profile','new interview']);
    Array.from(hdr.querySelectorAll('button, a')).forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (kill.has(t)) el.remove();
    });

    if (nav && nav.tagName.toLowerCase() === 'nav'){
      nav.innerHTML = '';
      nav.appendChild(buildMenu());
    } else {
      const newNav = document.createElement('nav');
      newNav.className = 'hidden md:flex items-center gap-8';
      newNav.appendChild(buildMenu());
      const exist = hdr.querySelector('nav');
      if (exist) exist.replaceWith(newNav); else hdr.appendChild(newNav);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();