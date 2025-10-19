// public/js/public_profile.owner.bind.js
// Injects "Edit Profile" button and a "Draft" badge on read-only profile pages for owned drafts.
(function(){
  const nsId = '__oi_edit_btn';
  const nsBadge = '__oi_draft_badge';

  function getId(){
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'profile' && parts[1]) return parts[1];
    const u = new URL(location.href);
    return u.searchParams.get('profileId') || u.searchParams.get('id');
  }

  function isOwner(p){ return p && p.ownerUserId === 'me'; }

  function loadProfile(id){
    try{ return JSON.parse(localStorage.getItem('oi:profiles:'+id)); }catch{ return null; }
  }

  function injectEdit(id){
    if (document.getElementById(nsId)) return;
    const a = document.createElement('a');
    a.id = nsId;
    // Redirect to template preview with dummy data first
    const templateId = 'default';
    a.href = `/profile/${encodeURIComponent(id)}/template?templateId=${encodeURIComponent(templateId)}`;
    a.textContent = 'Edit Profile';
    a.className = 'fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow hover:bg-opacity-90';
    a.setAttribute('data-testid', 'button-edit-profile');
    document.body.appendChild(a);
  }

  function injectDraft(){
    if (document.getElementById(nsBadge)) return;
    const b = document.createElement('div');
    b.id = nsBadge;
    b.textContent = 'Draft — not shared';
    b.className = 'fixed top-4 right-4 px-3 py-1 text-xs bg-black/70 text-white rounded';
    b.setAttribute('data-testid', 'badge-draft');
    document.body.appendChild(b);
  }

  function init(){
    const id = getId(); if (!id) return;
    const p = loadProfile(id); if (!p) return;
    if (isOwner(p)) injectEdit(id);
    if (p.status !== 'live') injectDraft();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
