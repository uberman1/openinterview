// js/nav-patch.js
(function(){
  const onReady = (fn)=> document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();
  onReady(()=>{
    const header = document.querySelector('header');
    if (!header) return;
    const nav = header.querySelector('nav');
    if (!nav) return;
    if (nav.dataset.navPatched === 'true') return;
    nav.dataset.navPatched = 'true';

    const mk = (text, href, active=false)=>{
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      a.className = [
        'text-sm','font-medium',
        active ? 'text-primary dark:text-white' : 'text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white'
      ].join(' ');
      return a;
    };

    const path = (location.pathname || '').toLowerCase();
    const isHome = /home(\.html)?$/.test(path) || path === '/';

    while (nav.firstChild) nav.removeChild(nav.firstChild);
    nav.appendChild(mk('Home', (isHome ? '#': (location.origin ? (location.origin + '/home.html') : '/home.html')), isHome));
    nav.appendChild(mk('Subscription', '/subscription'));
    nav.appendChild(mk('Password', '/password'));
    nav.appendChild(mk('Log Out', '/logout'));
  });
})();
