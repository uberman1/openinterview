// src/js/profile-editor.js
import { store } from './data-store.js';
import { searchAssets, pickAndCreateAsset } from './asset-library.js';

function getIdFromUrl(){
  const u = new URL(window.location.href);
  return u.searchParams.get('id');
}

function qs(sel){ return document.querySelector(sel); }

function safeBindContenteditable(el, path, profile){
  if (!el) return;
  el.setAttribute('contenteditable', 'true');
  el.addEventListener('input', () => {
    const value = el.textContent.trim();
    const patch = { display: { ...profile.display } };
    const keys = path.split('.'); // e.g. display.name
    if (keys.length !== 2) return;
    patch.display[keys[1]] = value;
    profile = store.updateProfile(profile.id, patch);
  });
}

function bindInline(profile){
  // Heuristic element grabs to avoid changing HTML:
  safeBindContenteditable(qs('h1, .profile-name, [data-field="display.name"]'), 'display.name', profile);
  safeBindContenteditable(qs('p.text-lg, .profile-title, [data-field="display.title"]'), 'display.title', profile);
  safeBindContenteditable(qs('aside .text-sm, .profile-location, [data-field="display.location"]'), 'display.location', profile);
  safeBindContenteditable(qs('aside p:not(.text-sm), main p.lead, [data-field="display.summary"]'), 'display.summary', profile);

  // Avatar
  const avatar = qs('img[alt*="Ethan"], img[alt*="Avatar"], img[alt*="Profile"], #avatarImg, [data-field="avatarUrl"]');
  if (avatar){
    avatar.style.cursor = 'pointer';
    avatar.addEventListener('click', async () => {
      const a = await pickAndCreateAsset({type:'attachment'});
      if (!a) return;
      avatar.src = a.url;
      profile = store.updateProfile(profile.id, { display: { avatarUrl: a.url } });
    });
  }

  // Highlights add/remove (simple version: append)
  const addBtn = document.getElementById('addHighlight');
  const list = document.getElementById('highlightsList') || document.querySelector('section ul.space-y-4');
  if (addBtn && list){
    addBtn.addEventListener('click', () => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 mr-4 shrink-0"></span><p class="text-muted-light dark:text-muted-dark" contenteditable="true">New highlight…</p>';
      list.appendChild(li);
      const textEl = li.querySelector('p');
      textEl.focus();
      textEl.addEventListener('input', () => {
        const items = Array.from(list.querySelectorAll('p')).map(p => p.textContent.trim()).filter(Boolean);
        profile = store.updateProfile(profile.id, { display: { highlights: items } });
      });
    });
  }

  // Resume picker
  const resumeBtn = document.getElementById('btnSelectResume');
  if (resumeBtn){
    resumeBtn.addEventListener('click', async () => {
      // First try existing resumes
      const found = searchAssets({type:'resume'});
      let chosen = found[0];
      if (!chosen) {
        chosen = await pickAndCreateAsset({type:'resume'});
      }
      if (!chosen) return;
      profile = store.updateProfile(profile.id, { resume: { assetId: chosen.id, pdfUrl: chosen.url }});
      // If your PDF viewer reads from data-resume-url, update it:
      const section = document.querySelector('#resumeSection');
      if (section) section.setAttribute('data-resume-url', chosen.url);
      // A basic emit so your existing PDF.js loader can react:
      window.dispatchEvent(new CustomEvent('resume:changed', { detail: { url: chosen.url } }));
    });
  }

  // Attachments add
  const addAtt = document.getElementById('btnAddAttachment');
  if (addAtt){
    addAtt.addEventListener('click', async () => {
      const a = await pickAndCreateAsset({type:'attachment'});
      if (!a) return;
      const next = (profile.attachments || []).concat([{ assetId: a.id, label: a.name, url: a.url }]);
      profile = store.updateProfile(profile.id, { attachments: next });
      window.dispatchEvent(new CustomEvent('attachments:changed', { detail: { id: a.id } }));
    });
  }

  // Edit availability link
  const editAvail = document.getElementById('editAvailabilityBtn');
  if (editAvail){
    editAvail.addEventListener('click', () => {
      window.location.href = `/availability/${encodeURIComponent(profile.id)}?id=${encodeURIComponent(profile.id)}`;
    });
  }

  // Save & Share
  const saveBtn = document.getElementById('btnSaveProfile');
  if (saveBtn){
    saveBtn.addEventListener('click', () => {
      const name = profile.display?.name?.trim();
      const title = profile.display?.title?.trim();
      if (!name || !title){
        alert('Please add at least Name and Title.');
        return;
      }
      profile = store.publishProfile(profile.id);
      alert('Profile is live.');
      // optionally route back home
      // window.location.href = '/home.html';
    });
  }

  const shareBtn = document.getElementById('btnShareProfile');
  if (shareBtn){
    shareBtn.addEventListener('click', () => {
      const link = profile.share?.publicUrl || '#';
      navigator.clipboard?.writeText(window.location.origin + link).catch(()=>{});
      alert(`Share link copied: ${link}`);
    });
  }
}

function init(){
  let id = getIdFromUrl();
  let profile = id ? store.getProfile({id}) : null;
  if (!profile){
    // If /profile/new without id, create one on the fly
    profile = store.createDraftProfile();
    const u = new URL(window.location.href);
    u.searchParams.set('id', profile.id);
    history.replaceState({}, '', u.toString());
  }
  bindInline(profile);
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
