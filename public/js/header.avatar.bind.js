(function(){
  function ensureGlobalHelpAiStyles() {
    if (document.getElementById('oi-help-ai-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'oi-help-ai-global-styles';
    style.textContent = `
      .home-help-ai-fab {
        position: fixed; bottom: 1.25rem; right: 1.25rem; z-index: 55;
        display: inline-flex; height: 3.5rem; width: 3.5rem; align-items: center; justify-content: center;
        border-radius: 9999px; background: linear-gradient(135deg, #1f1f1f 0%, #141414 100%); color: #fafafa;
        box-shadow: 0 4px 24px -4px rgba(99,102,241,0.45), 0 8px 20px -8px rgba(0,0,0,0.35);
        transition: transform .25s ease, opacity .25s ease, box-shadow .25s ease;
      }
      .home-help-ai-fab:hover { transform: scale(1.06); box-shadow: 0 8px 32px -4px rgba(99,102,241,0.5), 0 12px 28px -8px rgba(0,0,0,0.4); }
      .home-help-ai-fab--hidden { opacity: 0; pointer-events: none; transform: scale(0.85); }
      .help-ai-modal-root { transition: opacity .28s ease, visibility .28s ease; }
      .help-ai-modal-root:not(.help-ai-modal--open) { opacity: 0; visibility: hidden; pointer-events: none; }
      .help-ai-modal-root.help-ai-modal--open { opacity: 1; visibility: visible; pointer-events: auto; }
      .help-ai-modal-root:not(.help-ai-modal--open) .help-ai-backdrop { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
      .help-ai-modal-root.help-ai-modal--fab { display: block; z-index: 60; }
      .help-ai-modal-root.help-ai-modal--fab .help-ai-fab-shell {
        pointer-events: none; position: absolute; inset: 0; z-index: 1; display: flex; align-items: flex-end; justify-content: flex-end;
        padding: .75rem; padding-bottom: 5.5rem;
      }
      @media (min-width: 640px) { .help-ai-modal-root.help-ai-modal--fab .help-ai-fab-shell { padding: 1.25rem; padding-bottom: 6rem; } }
      .help-ai-backdrop { transition: opacity .32s ease; }
      .help-ai-modal-root.help-ai-modal--fab .help-ai-dialog-panel {
        pointer-events: auto; transform-origin: bottom right;
        transition: transform .36s cubic-bezier(0.16,1,0.3,1), opacity .3s ease;
      }
      .help-ai-modal-root.help-ai-modal--fab:not(.help-ai-modal--open) .help-ai-dialog-panel { transform: translateY(1.25rem) scale(0.94); opacity: 0; }
      .help-ai-modal-root.help-ai-modal--fab.help-ai-modal--open .help-ai-dialog-panel { transform: translateY(0) scale(1); opacity: 1; }
      @keyframes help-ai-cursor-blink { 0%,45%{opacity:1} 50%,100%{opacity:.15} }
      .help-ai-cursor { display:inline-block; width:2px; height:1em; margin-left:1px; vertical-align:text-bottom; background:currentColor; animation:help-ai-cursor-blink 1s step-end infinite; }
      .help-ai-thread-area { background: radial-gradient(ellipse 85% 55% at 50% -5%, rgba(99,102,241,.07), transparent 55%), rgba(250,250,250,.65); }
      .dark .help-ai-thread-area { background: radial-gradient(ellipse 85% 55% at 50% -5%, rgba(99,102,241,.12), transparent 55%), rgba(10,10,10,.5); }
      .help-ai-md :first-child{margin-top:0}.help-ai-md :last-child{margin-bottom:0}.help-ai-md p{margin:.45em 0}
      .help-ai-md h1{font-size:1.125rem;font-weight:800;margin:.75em 0 .35em}.help-ai-md h2{font-size:1.05rem;font-weight:700;margin:.7em 0 .3em}
      .help-ai-md h3,.help-ai-md h4{font-size:1rem;font-weight:700;margin:.65em 0 .25em}
      .help-ai-md ul,.help-ai-md ol{margin:.4em 0;padding-left:1.35rem}.help-ai-md ul{list-style:disc}.help-ai-md ol{list-style:decimal}
      .help-ai-md li{margin:.2em 0}.help-ai-md strong{font-weight:600}
      .help-ai-md code{font-size:.88em;background:rgba(0,0,0,.06);padding:.12em .4em;border-radius:.25rem}
      .dark .help-ai-md code{background:rgba(255,255,255,.1)}
      .help-ai-md a{color:#2563eb;text-decoration:underline}.dark .help-ai-md a{color:#93c5fd}
    `;
    document.head.appendChild(style);
  }

  function ensureGlobalHelpAiDom() {
    if (document.getElementById('home-help-ai-fab') || document.getElementById('home-help-ai-modal')) return false;
    const host = document.createElement('div');
    host.id = 'oi-help-ai-global-root';
    host.innerHTML = `
      <button type="button" id="home-help-ai-fab" class="home-help-ai-fab" aria-label="Open help assistant" aria-expanded="false" aria-controls="home-help-ai-dialog-panel">
        <span class="material-symbols-outlined text-[28px]" aria-hidden="true">smart_toy</span>
      </button>
      <div id="home-help-ai-modal" class="help-ai-modal-root help-ai-modal--fab fixed inset-0" aria-hidden="true">
        <div id="home-help-ai-backdrop" class="help-ai-backdrop absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden="true"></div>
        <div class="help-ai-fab-shell">
          <div id="home-help-ai-dialog-panel" role="dialog" aria-labelledby="home-help-ai-title" aria-describedby="home-help-ai-subtitle" aria-modal="true" class="help-ai-dialog-panel flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/[0.08] dark:border-neutral-700 dark:bg-neutral-950 dark:ring-white/10">
            <div class="border-b border-neutral-200 bg-gradient-to-b from-neutral-50 to-neutral-50/30 px-4 py-3.5 dark:border-neutral-800 dark:from-neutral-900/80 dark:to-neutral-950/30 sm:px-5">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#141414] to-neutral-800 text-white shadow-md dark:from-neutral-100 dark:to-neutral-300 dark:text-[#141414]">
                    <span class="material-symbols-outlined text-[22px]" aria-hidden="true">smart_toy</span>
                  </div>
                  <div class="min-w-0 pt-0.5">
                    <h2 id="home-help-ai-title" class="text-base font-bold tracking-tight text-[#141414] dark:text-white">Help assistant</h2>
                    <p id="home-help-ai-subtitle" class="mt-0.5 text-xs leading-snug text-neutral-500 dark:text-neutral-400">Ask about OpenInterview using the handbook.</p>
                  </div>
                </div>
                <button type="button" id="home-help-ai-close" class="shrink-0 rounded-xl p-2 text-neutral-500 transition-colors hover:bg-neutral-200/90 dark:hover:bg-neutral-800 dark:hover:text-white" aria-label="Close">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </div>
            </div>
            <div id="home-help-ai-thread-wrap" class="help-ai-thread-area relative flex min-h-[180px] flex-1 flex-col">
              <div id="home-help-ai-empty" class="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
                <span class="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600" aria-hidden="true">chat_bubble</span>
                <p class="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">Questions about dashboards, profiles, or sharing? Type below.</p>
              </div>
              <div id="home-help-ai-thread" class="hidden max-h-[min(38vh,300px)] min-h-[120px] space-y-4 overflow-y-auto px-4 py-3 text-sm"></div>
            </div>
            <p id="home-help-ai-error" class="hidden border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"></p>
            <form id="home-help-ai-form" class="border-t border-neutral-200 bg-gradient-to-t from-neutral-50/50 to-white p-3 dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-950 sm:p-4">
              <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400" for="home-help-ai-input">Message</label>
              <textarea id="home-help-ai-input" rows="2" placeholder="Type your question…" class="mb-2 w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414]/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"></textarea>
              <div class="flex justify-end gap-2">
                <button type="button" id="home-help-ai-cancel" class="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200">Close</button>
                <button type="submit" id="home-help-ai-send" class="inline-flex min-w-[4.5rem] items-center justify-center rounded-xl bg-[#141414] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-45">
                  <span id="home-help-ai-send-label">Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(host);
    return true;
  }

  async function ensureGlobalHelpAi() {
    const path = (window.location && window.location.pathname) || '';
    const hideOnAuthPages = new Set([
      '/login.html',
      '/login-page.html',
      '/signup.html',
      '/signin',
      '/signup'
    ]);
    if (hideOnAuthPages.has(path)) return;

    // Avoid duplicate init when page already ships its own Home FAB/modal
    if (window.__oiGlobalHelpAiInitDone) return;
    const hasFab = document.getElementById('home-help-ai-fab');
    const hasModal = document.getElementById('home-help-ai-modal');
    if (hasFab || hasModal) {
      window.__oiGlobalHelpAiInitDone = true;
      return;
    }
    ensureGlobalHelpAiStyles();
    ensureGlobalHelpAiDom();
    try {
      const mod = await import('/js/help-ai-chat.js');
      const fab = document.getElementById('home-help-ai-fab');
      if (fab) {
        mod.initHelpAiChat({
          idPrefix: 'home-',
          placement: 'fab',
          fabButton: fab
        });
        window.__oiGlobalHelpAiInitDone = true;
      }
    } catch (e) {
      console.error('[help-ai] Failed to init global assistant:', e);
    }
  }

  function apply(url){
    if(!url) return;
    var nodes = document.querySelectorAll('header [data-avatar], header .header-avatar, header .rounded-full, header #avatar-header, header img.header-avatar');
    nodes.forEach(function(el){
      if(el.tagName === 'IMG') el.src = url; else el.style.backgroundImage = 'url("'+url+'")';
    });
  }

  // Check auth status and update Home Page UI
  async function checkAuthAndUpdateHome() {
    try {
      const res = await fetch('/auth/me', { credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        const authContainer = document.getElementById('auth-buttons-container');
        if (authContainer) {
             const signInBtn = authContainer.querySelector('#sign-in-btn') || authContainer.querySelector('a[href*="login"]');
             if (signInBtn) {
                 signInBtn.classList.remove('rounded'); 
                 signInBtn.classList.add('rounded-lg');
             }
        }
        return;
      }
      if (!res.ok) {
        console.warn('Transient auth status:', res.status);
        return;
      }
      const data = await res.json();
      
      if (data.user) {
        // Save avatar to local storage if available
        if (data.user && data.user.avatar) {
          localStorage.setItem('oi.avatarUrl', data.user.avatar);
          apply(data.user.avatar);
        }

        // Update Home Page "Sign In" button to "Dashboard" + Avatar
        const authContainer = document.getElementById('auth-buttons-container');
        if (authContainer) {
          const avatarUrl = data.user?.avatar || localStorage.getItem('oi.avatarUrl') || "https://lh3.googleusercontent.com/aida-public/AB6AXuDgS88QhSBYUengqyuPFZ-0rqaPoKmMT7v6UlmL9ZwjTSGh6tftgo0ETzEAZf8y-6d0AfCL_5TvJqd-MeDxWbSg03T5D1lPLSNi53oaZkCOoZ1oVRzfLbXc3_Qxe6CJpZLo2ppNz7zInTb-x9-fjO1hQyI8pySg-EPISStHYg_HPGbQDsKOfmNkGSxdfVMjAPPZVefqiPImJaGHAAwAxj-3mhyzTEwlx9PqerIK5EwF3lY74MdDJcyCTOYicZ9--VPI2pvucAXNOTE";
          
          authContainer.innerHTML = `
            <div class="flex items-center gap-4">
              <a href="/dashboard.html" class="hidden md:flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
                Dashboard
              </a>
              <a href="/user_settings.html" class="block cursor-pointer hover:opacity-80 transition-opacity" title="User Settings">
                <div class="aspect-square w-10 rounded-full bg-cover bg-center bg-no-repeat header-avatar border border-primary/10" style='background-image: url("${avatarUrl}");'></div>
              </a>
            </div>
          `;
        }
      } else {
        // Ensure Sign In button has rounded corners (fix for unrounded button issue)
        const authContainer = document.getElementById('auth-buttons-container');
        if (authContainer) {
             const signInBtn = authContainer.querySelector('#sign-in-btn') || authContainer.querySelector('a[href*="login"]');
             if (signInBtn) {
                 // Enforce rounded-lg and ensure no conflicting classes
                 signInBtn.classList.remove('rounded'); 
                 signInBtn.classList.add('rounded-lg');
             }
        }
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    try{ apply(localStorage.getItem('oi.avatarUrl')); }catch(e){}
    checkAuthAndUpdateHome();
    ensureGlobalHelpAi();
  });
  window.addEventListener('avatar:updated', function(ev){
    apply((ev.detail && ev.detail.url) || localStorage.getItem('oi.avatarUrl'));
  });
})();
