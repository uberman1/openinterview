// cdn-watchdog.js
// Detects blocked Tailwind/Fonts CDNs and applies a local fallback stylesheet.
(function(){
  const DEBUG = false;
  function log(...args){ if(DEBUG) console.log('[CDN-WATCH]', ...args); }

  // If Tailwind CDN <script> fails, there will be no 'tailwind' global and no <style>[data-tailwind]</style> nodes.
  function tailwindPresent(){
    const hasTwGlobal = typeof window.tailwind !== 'undefined';
    const hasTwStyle = !!document.querySelector('style[data-cdn="tailwind"]') || !!document.querySelector('style[data-tailwind]');
    const hasTwClasses = getComputedStyle(document.documentElement).getPropertyValue('--tw-ring-offset-shadow') !== '';
    return hasTwGlobal || hasTwStyle || hasTwClasses;
  }

  async function tryFetch(url, timeoutMs=2500){
    try {
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), timeoutMs);
      const res = await fetch(url, { method:'HEAD', mode:'no-cors', signal: ctrl.signal });
      clearTimeout(t);
      // no-cors may be opaque; treat as success if no exception
      return true;
    } catch(e) {
      return false;
    }
  }

  async function ensureStyles(){
    // If any <script src*="cdn.tailwindcss.com"> exists, try to verify network
    const twScript = Array.from(document.scripts).find(s => /cdn\.tailwindcss\.com/.test(s.src));
    let twOk = tailwindPresent();
    if (!twOk && twScript) {
      twOk = await tryFetch(twScript.src);
    }

    // If Tailwind seems missing or blocked, inject fallback.css
    if(!twOk){
      log('Tailwind blocked/missing. Injecting fallback.css');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/fallback.css';
      link.onload = () => log('fallback.css loaded');
      document.head.appendChild(link);

      // Also force body visible in case any cloaking styles exist
      document.documentElement.style.visibility = 'visible';
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
    }
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureStyles);
  } else {
    ensureStyles();
  }
})();