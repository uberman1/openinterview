// subscription binder minimal
(() => {
  const pick = async (paths, method='HEAD') => {
    for (const p of paths) { try { const r = await fetch(p, {method}); if (r.ok) return p; } catch {} }
    return null;
  };
  const cache = {};
  const choose = async (key, paths, method='HEAD') => cache[key] ??= await pick(paths, method);

  async function wireNav(){
    const nav = Array.from(document.querySelectorAll('nav a'));
    const home = nav.find(a=>a.textContent.trim().toLowerCase()==='home');
    const interviews = nav.find(a=>a.textContent.trim().toLowerCase()==='interviews');
    const pricing = nav.find(a=>a.textContent.trim().toLowerCase()==='pricing');
    if (home) home.href = (await choose('home',['/home.html','/profile.html','/'])) || '#';
    if (interviews) interviews.href = (await choose('interviews',['/interviews.html','/interviews'])) || '#';
    if (pricing) pricing.href = (await choose('pricing',['/pricing.html','/billing/pricing','/pricing'])) || '#';
  }
  async function wirePaymentMethodUpdate(){
    const a = Array.from(document.querySelectorAll('a')).find(x=>x.textContent.trim().toLowerCase()==='update');
    if (!a) return;
    const direct = await choose('pm',['/billing/payment-method','/billing/update-payment-method','/settings/billing/payment-method','/customer/billing/payment-method']);
    if (direct){ a.href = direct; return; }
    a.addEventListener('click', async (e)=> {
      e.preventDefault();
      const ep = await choose('pmJson',['/api/billing/payment-method','/api/billing/setup-intent'],'GET');
      if (ep){ const r = await fetch(ep); if (r.ok){ const j = await r.json(); if (j?.url) return void(location.href=j.url); } }
      alert('Unable to open payment method update.');
    });
  }
  async function wirePortal(){
    const btn = Array.from(document.querySelectorAll('button')).find(b=>/manage in stripe/i.test(b.textContent||''));
    if (!btn) return;
    const direct = await choose('portal',['/billing/portal','/billing/customer-portal','/stripe/portal','/stripe/customer-portal']);
    if (direct){ btn.onclick = (e)=>{ e.preventDefault(); location.href = direct; }; return; }
    btn.onclick = async (e)=> {
      e.preventDefault();
      const ep = await choose('portalJson',['/api/billing/portal','/api/billing/stripe-portal'],'GET');
      if (!ep) return alert('Stripe portal unavailable.');
      const r = await fetch(ep); if (r.ok){ const j = await r.json(); if (j?.url) return void(location.href=j.url); }
      alert('Could not open Stripe portal.');
    };
  }
  async function hydrateHistory(){
    const list = document.querySelector('ul[role="list"]');
    if (!list) return;
    try{
      const r = await fetch('/api/billing/history'); if (!r.ok) return;
      const items = await r.json(); if (!Array.isArray(items) || !items.length) return;
      list.innerHTML = '';
      for (const it of items){
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between py-3';
        li.innerHTML = `
          <p class="text-sm text-primary/60 dark:text-white/60">${it.date||''}</p>
          <a class="text-sm font-medium text-primary dark:text-white hover:text-primary/80 dark:hover:text-white/80" href="${it.invoice_url||'#'}" target="_blank" rel="noopener">Download Invoice</a>
        `;
        list.appendChild(li);
      }
    }catch{}
  }
  function init(){ wireNav(); wirePaymentMethodUpdate(); wirePortal(); hydrateHistory(); }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();