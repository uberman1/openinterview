// header.unify.v5.bind.js
// Standardize top header across all pages to match Home header
(() => {
  const PAGES = [
    /home\.html$/,
    /uploads\.html$/,
    /subscription\.html$/,
    /password\.html$/,
    /profiles\.html$/,
    /availability\.html$/
  ];
  const path = location.pathname;
  if (!PAGES.some(rx => rx.test(path))) return;

  const IS_AVAIL = /availability\.html$/.test(path);

  const MENU = [
    { label:'Home',          href:'/home.html' },
    { label:'Availability',  href:'/availability.html' },
    { label:'Profiles',      href:'/profiles.html' },
    { label:'Uploads',       href:'/uploads.html' },
    { label:'Subscription',  href:'/subscription.html' },
    { label:'Password',      href:'/password.html' },
    { label:'Log Out',       href:'/logout.html' }
  ];

  // Try to read an existing avatar url from any present avatar div
  function detectAvatarUrl(){
    const avatarLike = document.querySelector('[style*="background-image"]');
    if (!avatarLike) return null;
    const m = (avatarLike.getAttribute('style')||'').match(/url\(["']?([^"')]+)["']?\)/i);
    return m ? m[1] : null;
  }
  const FALLBACK_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgS88QhSBYUengqyuPFZ-0rqaPoKmMT7v6UlmL9ZwjTSGh6tftgo0ETzEAZf8y-6d0AfCL_5TvJqd-MeDxWbSg03T5D1lPLSNi53oaZkCOoZ1oVRzfLbXc3_Qxe6CJpZLo2ppNz7zInTb-x9-fjO1hQyI8pySg-EPISStHYg_HPGbQDsKOfmNkGSxdfVMjAPPZVefqiPImJaGHAAwAxj-3mhyzTEwlx9PqerIK5EwF3lY74MdDJcyCTOYicZ9--VPI2pvucAXNOTE';
  const avatarUrl = detectAvatarUrl() || FALLBACK_AVATAR;

  function buildTopbar(){
    const wrapper = document.createElement('header');
    wrapper.id = 'oi-topbar';
    wrapper.className = 'border-b border-primary/10';
    wrapper.innerHTML = `
      <div class="container mx-auto px-10 py-4 flex items-center justify-between whitespace-nowrap">
        <div class="flex items-center gap-4">
          <div class="h-6 w-6">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 class="text-lg font-bold">OpenInterview.me</h2>
        </div>
        <nav class="flex items-center gap-8" id="oi-nav"></nav>
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-cover bg-center bg-no-repeat" style="background-image:url('${avatarUrl}');"></div>
        </div>
      </div>`;
    const nav = wrapper.querySelector('#oi-nav');
    MENU.forEach(({label, href}) => {
      const a = document.createElement('a');
      a.href = href;
      const active = location.pathname === href;
      a.className = active
        ? 'text-sm font-bold text-primary dark:text-white'
        : 'text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white';
      a.textContent = label;
      nav.appendChild(a);
    });
    return wrapper;
  }

  function removeCTAs(scope){
    const kill = new Set(['new profile','new interview','sign in']);
    scope.querySelectorAll('button,a').forEach(el => {
      const t=(el.textContent||'').trim().toLowerCase();
      if (kill.has(t)) el.remove();
    });
  }

  function apply(){
    const canonical = buildTopbar();

    if (IS_AVAIL){
      // Availability keeps its page header; we add global topbar ABOVE it.
      const firstHeader = document.querySelector('header');
      if (firstHeader && firstHeader.id === 'oi-topbar') return; // already applied
      document.body.insertBefore(canonical, firstHeader || document.body.firstChild);
      removeCTAs(document);
      return;
    }

    // Other pages: replace the first header entirely with canonical
    const firstHeader = document.querySelector('header');
    if (firstHeader){
      firstHeader.replaceWith(canonical);
    }else{
      document.body.prepend(canonical);
    }
    removeCTAs(document);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();