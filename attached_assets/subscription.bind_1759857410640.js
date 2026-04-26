// subscription binder: nav + actions + optional dynamic population (uses existing endpoints if present)
(() => {
  const pick = async (paths, method='HEAD') => {
    for (const p of paths) {
      try {
        const r = await fetch(p, { method });
        if (r.ok) return p;
      } catch {}
    }
    return null;
  };
  const cache = {};
  const choose = async (key, paths, method='HEAD') => {
    if (cache[key] !== undefined) return cache[key];
    const res = await pick(paths, method);
    cache[key] = res;
    return res;
  };

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
    const updateLink = Array.from(document.querySelectorAll('a')).find(a=>a.textContent.trim().toLowerCase()==='update');
    if (!updateLink) return;
    // Try portal-like endpoints first
    const direct = await choose('pmUpdate',[
      '/billing/payment-method',
      '/billing/update-payment-method',
      '/settings/billing/payment-method',
      '/customer/billing/payment-method'
    ]);
    if (direct){
      updateLink.href = direct;
      return;
    }
    // Try API that returns { url } to redirect
    updateLink.addEventListener('click', async (e)=>{
      e.preventDefault();
      const jsonEp = await choose('pmUpdateJson',['/api/billing/payment-method', '/api/billing/setup-intent'], 'GET');
      if (jsonEp){
        try {
          const r = await fetch(jsonEp);
          if (r.ok){
            const j = await r.json();
            if (j && j.url){ window.location.href = j.url; return; }
          }
        } catch {}
      }
      alert('Unable to open payment method update at this time.');
    });
  }

  async function wireManageInStripe(){
    const btn = Array.from(document.querySelectorAll('button')).find(b=>/manage in stripe/i.test(b.textContent||''));
    if (!btn) return;
    const direct = await choose('portal',[
      '/billing/portal','/billing/customer-portal','/stripe/portal','/stripe/customer-portal'
    ]);
    if (direct){
      btn.addEventListener('click', (e)=>{ e.preventDefault(); window.location.href = direct; });
      return;
    }
    btn.addEventListener('click', async (e)=>{
      e.preventDefault();
      const ep = await choose('portalJson',['/api/billing/portal','/api/billing/stripe-portal'], 'GET');
      if (!ep){ alert('Stripe portal is not available.'); return; }
      try{
        const r = await fetch(ep);
        if (r.ok){
          const j = await r.json();
          if (j && j.url){ window.location.href = j.url; return; }
        }
      }catch{}
      alert('Could not open Stripe portal at this time.');
    });
  }

  async function hydrateCurrentPlan(){
    const planEl = Array.from(document.querySelectorAll('p')).find(p=>p.textContent.trim()==='Pro Plan');
    const priceEl = Array.from(document.querySelectorAll('p')).find(p=>/\$/.test(p.textContent||''));
    const nextPayEl = Array.from(document.querySelectorAll('p')).find(p=>/Next payment/.test(p.textContent||''));
    try{
      const r = await fetch('/api/billing/plan');
      if (r.ok){
        const j = await r.json(); // { name, price, next_payment_date, payment_method }
        if (j?.name && planEl) planEl.textContent = j.name;
        if (j?.price && priceEl) priceEl.textContent = j.price;
        if (j?.next_payment_date && nextPayEl) nextPayEl.textContent = `Next payment on ${j.next_payment_date}`;
        const pmText = document.querySelector('div:has(h3:contains("Payment Method")) + div, div:has(> h3)');
      }
    }catch{}
  }

  async function hydrateBillingHistory(){
    const list = document.querySelector('h3 + ul, ul[role="list"]');
    if (!list) return;
    try{
      const r = await fetch('/api/billing/history');
      if (!r.ok) return;
      const items = await r.json(); // [{id, date, invoice_url}]
      if (!Array.isArray(items) || !items.length) return;
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

  function init(){
    wireNav();
    wirePaymentMethodUpdate();
    wireManageInStripe();
    hydrateCurrentPlan();
    hydrateBillingHistory();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();