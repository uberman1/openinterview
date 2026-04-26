// src/js/profile-editor.js
import { store } from './data-store.js';
import { searchAssets, pickAndCreateAsset } from './asset-library.js';

function getIdFromUrl(){
  const u = new URL(window.location.href);
  return u.searchParams.get('id');
}

function qs(sel){ return document.querySelector(sel); }

function safeBind(el, path, profile, event = 'input'){
  if (!el) return;
  el.addEventListener(event, () => {
    const value = el.value;
    const patch = { ...profile };
    const keys = path.split('.');
    let current = patch;
    for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    profile = store.updateProfile(profile.id, patch);
  });
}

function bindInline(profile){
  // Profile Name
  safeBind(qs('[data-field="profileName"]'), 'profileName', profile);

  // Personal Info
  safeBind(qs('[data-field="person.name"]'), 'person.name', profile);
  safeBind(qs('[data-field="title"]'), 'title', profile);
  safeBind(qs('[data-field="location"]'), 'location', profile);
  safeBind(qs('[data-field="about"]'), 'about', profile);

  // Contact Info
  safeBind(qs('[data-field="contact.phone"]'), 'contact.phone', profile);
  safeBind(qs('[data-field="contact.email"]'), 'contact.email', profile);

  // Social Media
  safeBind(qs('[data-field="social.linkedin"]'), 'social.linkedin', profile);
  safeBind(qs('[data-field="social.portfolio"]'), 'social.portfolio', profile);

  // Avatar
  const avatar = qs('img[alt*="Avatar"], [data-field="person.avatarUrl"]');
  if (avatar){
    avatar.style.cursor = 'pointer';
    avatar.addEventListener('click', async () => {
      const a = await pickAndCreateAsset({type:'attachment'});
      if (!a) return;
      avatar.src = a.url;
      profile = store.updateProfile(profile.id, { person: { avatarUrl: a.url } });
    });
  }

  // Highlights
    const highlightsTextarea = qs('[data-field="highlights"]');
    if (highlightsTextarea) {
        highlightsTextarea.addEventListener('input', () => {
            const highlights = highlightsTextarea.value.split('\n').map(text => ({ id: `hi_${Math.random().toString(36).slice(2)}`, text, pin: false, order: 0 }));
            profile = store.updateProfile(profile.id, { highlights });
        });
    }

  // Resume picker
  const resumeSelect = qs('[data-action="select-resume"]');
  if (resumeSelect){
      resumeSelect.addEventListener('change', async (e) => {
          if(e.target.value === 'add_new') {
              const asset = await pickAndCreateAsset({type:'resume'});
              if (!asset) return;
              profile = store.updateProfile(profile.id, { resume: { assetId: asset.id, pdfUrl: asset.url, isPublic: true }});
              window.dispatchEvent(new CustomEvent('resume:changed', { detail: { url: asset.url } }));
          }
      });
  }

  // Save & Share
  const saveBtn = qs('[data-action="save-profile"]');
  if (saveBtn){
    saveBtn.addEventListener('click', () => {
      const name = profile.person?.name?.trim();
      const title = profile.title?.trim();
      if (!name || !title){
        alert('Please add at least Name and Title.');
        return;
      }
      profile = store.publishProfile(profile.id);
      alert('Profile is live.');
      window.location.href = `/index.html?profileId=${profile.id}&ownerPreview=1`;
    });
  }
}

function init(){
  let id = getIdFromUrl();
  let profile = id ? store.getProfile({id}) : null;
  if (!profile){
    profile = store.createDraftProfile();
    const u = new URL(window.location.href);
    u.searchParams.set('id', profile.id);
    history.replaceState({}, '', u.toString());
  }
  bindInline(profile);
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
