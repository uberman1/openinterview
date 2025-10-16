// js/nav-patch.js
(function(){
  const onReady = (fn)=> document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();
  onReady(()=>{
    // Skip if already patched
    if (document.body.dataset.navPatched === 'true') return;
    document.body.dataset.navPatched = 'true';

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
    const isAvail = /availability/i.test(path);
    const isSub = /subscription/i.test(path);
    const isPass = /password/i.test(path);

    // Try to find existing header nav first
    const header = document.querySelector('header');
    let nav = header ? header.querySelector('nav') : null;
    
    // If no nav in header, try to find any top-level nav
    if (!nav) nav = document.querySelector('body > header nav, body > nav');
    
    // If still no nav, create a global header with nav
    if (!nav) {
      const avatarUrl = localStorage.getItem('oi.avatarUrl') || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgS88QhSBYUengqyuPFZ-0rqaPoKmMT7v6UlmL9ZwjTSGh6tftgo0ETzEAZf8y-6d0AfCL_5TvJqd-MeDxWbSg03T5D1lPLSNi53oaZkCOoZ1oVRzfLbXc3_Qxe6CJpZLo2ppNz7zInTb-x9-fjO1hQyI8pySg-EPISStHYg_HPGbQDsKOfmNkGSxdfVMjAPPZVefqiPImJaGHAAwAxj-3mhyzTEwlx9PqerIK5EwF3lY74MdDJcyCTOYicZ9--VPI2pvucAXNOTE';
      
      const globalHeader = document.createElement('header');
      globalHeader.className = 'border-b border-primary/10';
      globalHeader.innerHTML = `
        <div class="container mx-auto px-10 py-4 flex items-center justify-between whitespace-nowrap">
          <div class="flex items-center gap-4">
            <div class="h-6 w-6">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 class="text-lg font-bold">OpenInterview.me</h2>
          </div>
          <nav class="flex items-center gap-8" id="oi-global-nav"></nav>
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-cover bg-center bg-no-repeat" style="background-image:url('${avatarUrl}');"></div>
          </div>
        </div>`;
      
      document.body.insertBefore(globalHeader, document.body.firstChild);
      nav = globalHeader.querySelector('#oi-global-nav');
    }

    // Clear and populate nav
    while (nav.firstChild) nav.removeChild(nav.firstChild);
    nav.appendChild(mk('Home', (isHome ? '#': (location.origin ? (location.origin + '/home.html') : '/home.html')), isHome));
    nav.appendChild(mk('Availability', '/availability', isAvail));
    nav.appendChild(mk('Subscription', '/subscription', isSub));
    nav.appendChild(mk('Password', '/password', isPass));
    nav.appendChild(mk('Log Out', '/logout'));
  });
})();
