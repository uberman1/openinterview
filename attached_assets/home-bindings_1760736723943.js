// public/js/home-bindings.js
// View-first "Create New" flow. Attaches to existing "Create New / Add New / New Interview" links without DOM changes.
// If window.store is missing, uses a minimal fallback so tests can run in static environments.
(function(){
  const store = (function(){
    if (window.store && typeof window.store.createDraftProfile === 'function') return window.store;
    const ns = 'oi:';
    const read = (k, d) => { try { return JSON.parse(localStorage.getItem(ns+k)) ?? d; } catch { return d; } };
    const write = (k, v) => localStorage.setItem(ns+k, JSON.stringify(v));
    const idxKey = 'profiles:index';
    function id(){ return 'prof_' + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4); }
    function slugify(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
    return {
      createDraftProfile(){
        const pid = id(); const now = new Date().toISOString();
        const p = {
          id: pid, status:'draft', createdAt: now, updatedAt: now, ownerUserId:'me',
          display: { name:'', title:'', location:'', summary:'', avatarUrl:'' },
          resume: { assetId:null, pdfUrl:'/files/resume.pdf' },
          attachments: [], availability: { tz:'America/New_York', dailySlots:{}, rules:{ inc:30 } },
          share: { slug:null, publicUrl:null }
        };
        write('profiles:'+pid, p);
        const idx = read(idxKey, []); if (!idx.includes(pid)){ idx.unshift(pid); write(idxKey, idx); }
        return p;
      },
      getProfile({id}){ return read('profiles:'+id, null); },
      updateProfile(id, patch){
        const p = read('profiles:'+id, null) || {}; const m = structuredClone(p);
        (function merge(t,s){ for (const k in s){ const v=s[k]; if (v && typeof v==='object' && !Array.isArray(v)) { t[k]=t[k]||{}; merge(t[k], v); } else { t[k]=v; } } })(m, patch);
        m.updatedAt = new Date().toISOString(); write('profiles:'+id, m); return m;
      },
      publishProfile(id){
        const p = read('profiles:'+id, null); if (!p) throw new Error('profile missing');
        const slugBase = `${p.display?.name||'profile'}-${p.display?.title||''}`.trim() || 'profile';
        const slug = `${slugify(slugBase).slice(0,64)}-${id.slice(-4)}`;
        const pub = this.updateProfile(id, { status:'live', share:{ slug, publicUrl:`/p/${slug}` } });
        return pub;
      }
    };
  })();

  async function headOk(url){
    try { const r = await fetch(url, { method:'HEAD' }); return r.ok; } catch { return false; }
  }
  function candidatesForView(id){
    return [
      `/profile/${encodeURIComponent(id)}`,
      `/public_profile.html?profileId=${encodeURIComponent(id)}`,
      `/index.html?profileId=${encodeURIComponent(id)}`
    ];
  }
  async function routeToViewFirst(p){
    for (const url of candidatesForView(p.id)){
      if (await headOk(url)){ window.location.href = url; return; }
    }
    window.location.href = `/profile_edit.html?id=${encodeURIComponent(p.id)}`;
  }

  function attachCreateHandlers(){
    const triggers = Array.from(document.querySelectorAll('a,button')).filter(el => /create new|add new|new interview/i.test(el.textContent||''));
    triggers.forEach(el => {
      el.addEventListener('click', async (e) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        const draft = store.createDraftProfile();
        await routeToViewFirst(draft);
      });
    });
  }

  window.startNewProfileFlow = async function startNewProfileFlow(){
    const draft = store.createDraftProfile();
    await routeToViewFirst(draft);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachCreateHandlers);
  else attachCreateHandlers();
})();