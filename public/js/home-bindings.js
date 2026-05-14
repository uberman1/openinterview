// src/js/home-bindings.js
// Binds to existing links on home.html without altering DOM.
// View-first flow: routes to read-only profile pages before editor.
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
  // Route directly to enhanced editor (view-first flow)
  window.location.href = `/profile_edit_enhanced.html?id=${encodeURIComponent(p.id)}`;
}

function bindCreateNew(){
  const link = findLink({
    preferId: 'createNewInterviewLink',
    dataAction: 'create-new-interview',
    text: 'create new',
    scopeHeading: '(my\s+interviews|interviews)'
  });
  if (!link) return;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    const p = store.createDraftProfile();
    await routeToViewFirst(p);
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
  
  // Expose startNewProfileFlow for home.links.bind.js and tests
  window.startNewProfileFlow = async function() {
    const p = store.createDraftProfile();
    await routeToViewFirst(p);
  };
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
