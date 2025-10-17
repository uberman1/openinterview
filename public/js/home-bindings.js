// src/js/home-bindings.js
// Binds to existing links on home.html without altering DOM.
import { store } from './data-store.js';
import { pickAndCreateAsset } from './asset-library.js';

function findLink({preferId, dataAction, text, scopeHeading}){
  // 1) by ID
  if (preferId) {
    const el = document.getElementById(preferId);
    if (el) return el;
  }
  // 2) by data-action
  if (dataAction){
    const el = document.querySelector(`[data-action="${dataAction}"]`);
    if (el) return el;
  }
  // 3) by text within a section heading/container
  if (text){
    const sections = Array.from(document.querySelectorAll('section, .section, .card, .panel, .container'));
    for (const s of sections){
      const heading = s.querySelector('h2,h3,h4');
      if (!heading) continue;
      if (scopeHeading && !new RegExp(scopeHeading,'i').test(heading.textContent)) continue;
      const link = Array.from(s.querySelectorAll('a,button')).find(a => a.textContent.trim().toLowerCase() === text.toLowerCase());
      if (link) return link;
    }
  }
  return null;
}

function bindCreateNew(){
  const link = findLink({
    preferId: 'createNewInterviewLink',
    dataAction: 'create-new-interview',
    text: 'create new',
    scopeHeading: '(my\s+interviews|interviews)'
  });
  if (!link) return;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    // Initialize a draft profile and route to editor
    const p = store.createDraftProfile();
    const url = `/profile/new?id=${encodeURIComponent(p.id)}`;
    window.location.href = url;
  }, { once: false });
}

function bindAddNewResume(){
  const link = findLink({
    preferId: 'addNewResumeLink',
    dataAction: 'add-new-resume',
    text: 'add new',
    scopeHeading: '(my\s+resumes|resumes)'
  });
  if (!link) return;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    const asset = await pickAndCreateAsset({type:'resume'});
    if (!asset) return;
    // trigger a lightweight event so the page can refresh its table
    window.dispatchEvent(new CustomEvent('assets:changed', { detail: { type: 'resume', id: asset.id } }));
    alert('Resume added to your library.');
  });
}

function bindAddNewAttachment(){
  const link = findLink({
    preferId: 'addNewAttachmentLink',
    dataAction: 'add-new-attachment',
    text: 'add new',
    scopeHeading: '(attachments)'
  });
  if (!link) return;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    const asset = await pickAndCreateAsset({type:'attachment'});
    if (!asset) return;
    window.dispatchEvent(new CustomEvent('assets:changed', { detail: { type: 'attachment', id: asset.id } }));
    alert('Attachment added to your library.');
  });
}

function init(){
  bindCreateNew();
  bindAddNewResume();
  bindAddNewAttachment();
  
  // Expose startNewProfileFlow for home.links.bind.js
  window.startNewProfileFlow = function() {
    const p = store.createDraftProfile();
    const url = `/profile/new?id=${encodeURIComponent(p.id)}`;
    window.location.href = url;
  };
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
