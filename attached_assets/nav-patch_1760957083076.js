// public/js/nav-patch.js
// Centralized navigation builder. Change: Availability removed from menu (2025-10-20).
// Safe rollback: uncomment the marked line below.
// This file is intended to REPLACE your existing public/js/nav-patch.js.

(function(){
  if (window.navPatched) return;
  window.navPatched = true;

  const path = (location.pathname || '').toLowerCase();

  // Active flags (kept for potential rollback and page detection)
  const isHome = /home\.html$/.test(path) || path.endsWith('/home');
  // const isAvail = /availability/i.test(path);  // Availability no longer shown in nav
  const isSub  = /subscription/i.test(path);
  const isPass = /password/i.test(path);

  function mk(text, href, active){
    const a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    a.className = [
      'px-3 py-2 rounded-md text-sm font-medium',
      active ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-black/80 dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10'
    ].join(' ');
    return a;
  }

  function ensureNavContainer(){
    let header = document.querySelector('header');
    if (!header){
      header = document.createElement('header');
      document.body.prepend(header);
    }
    let nav = header.querySelector('nav[data-nav-root]');
    if (!nav){
      nav = document.createElement('nav');
      nav.setAttribute('data-nav-root', 'true');
      nav.className = 'flex items-center gap-6';
      header.appendChild(nav);
    }
    return nav;
  }

  const nav = ensureNavContainer();

  const homeHref = (isHome ? '#' : (location.origin ? (location.origin + '/home.html') : '/home.html'));

  // Build menu (Availability intentionally hidden; keep exact order otherwise)
  nav.innerHTML = '';
  nav.appendChild(mk('Home', homeHref, isHome));
  // nav.appendChild(mk('Availability', '/availability', isAvail)); // ← intentionally hidden (2025-10-20)
  nav.appendChild(mk('Subscription', '/subscription', isSub));
  nav.appendChild(mk('Password', '/password', isPass));
  nav.appendChild(mk('Log Out', '/logout', false));
})();
