// src/js/profile-view-bindings.js
import { store } from './data-store.js';

function isOwnerView(){
  if (typeof window.OPENINTERVIEW_IS_OWNER === 'boolean') return window.OPENINTERVIEW_IS_OWNER;
  if (location.pathname.startsWith('/p/')) return false;
  if (location.pathname.startsWith('/profile/')) return true;
  return false;
}

function hydrateProfileView(p){
  const hdr = document.querySelector('.relative.aspect-video') || document;
  const nameEl = hdr.querySelector('h1') || document.querySelector('h1');
  const titleEl = hdr.querySelector('.text-lg') || document.querySelector('p');
  if (nameEl && p.display?.name) nameEl.textContent = p.display.name;
  if (titleEl && p.display?.title) titleEl.textContent = p.display.title;

  const avatar = document.querySelector('aside img');
  if (avatar && p.display?.avatarUrl) avatar.src = p.display.avatarUrl;

  const asideLoc = document.querySelector('aside .text-sm');
  if (asideLoc && p.display?.location) asideLoc.textContent = p.display.location;

  const asideSummary = Array.from(document.querySelectorAll('aside p'))
    .find(el => !el.classList.contains('text-sm'));
  if (asideSummary && p.display?.summary) asideSummary.textContent = p.display.summary;

  if (p.resume?.pdfUrl){
    const rs = document.getElementById('resumeSection');
    if (rs) rs.setAttribute('data-resume-url', p.resume.pdfUrl);
    window.dispatchEvent(new CustomEvent('resume:changed', { detail: { url: p.resume.pdfUrl } }));
  }

  const attachRegion = Array.from(document.querySelectorAll('section'))
    .find(s => /attachments/i.test(s.querySelector('h2')?.textContent || ''));
  if (attachRegion && Array.isArray(p.attachments)){
    const list = attachRegion.querySelector('.space-y-4') || attachRegion;
    list.querySelectorAll('.__hydrated').forEach(n => n.remove());
    p.attachments.forEach(att => {
      const a = document.createElement('a');
      a.href = att.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = '__hydrated flex items-center justify-between p-4 rounded-lg border hover:bg-black/5';
      a.textContent = att.label || 'Attachment';
      list.appendChild(a);
    });
  }

  if (p.status !== 'live'){
    const badge = document.createElement('div');
    badge.textContent = 'Draft – not yet shared';
    badge.className = 'fixed top-4 right-4 px-3 py-1 text-xs bg-black/70 text-white rounded';
    document.body.appendChild(badge);
  }
}

function addEditButton(id){
  if (!isOwnerView()) return;
  const btn = document.createElement('a');
  btn.href = `/pages/profile-edit.html?id=${encodeURIComponent(id)}`;
  btn.textContent = 'Edit Profile';
  btn.className = 'fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow hover:bg-opacity-90';
  document.body.appendChild(btn);
}

function init(){
  const parts = location.pathname.split('/');
  const id = parts[1] === 'profile' ? parts[2] : null;
  if (!id) return;
  const p = store.getProfile({ id });
  if (!p) return;
  hydrateProfileView(p);
  addEditButton(id);
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
