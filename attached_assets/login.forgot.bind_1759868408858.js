// login.forgot.bind.js
(() => {
  if (!/login\.html$/.test(location.pathname)) return;
  function addForgot(){
    // Place link under password input
    const pw = document.querySelector('input[type="password"]') || document.querySelector('#password');
    if (!pw) return;
    const container = pw.closest('form') || pw.parentElement;
    if (!container) return;
    if (container.querySelector('[data-forgot-link]')) return;
    const a = document.createElement('a');
    a.href = '/forgot.html';
    a.textContent = 'Forgot password?';
    a.setAttribute('data-forgot-link', '1');
    a.className = 'block mt-2 text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white';
    container.appendChild(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addForgot); else addForgot();
})();