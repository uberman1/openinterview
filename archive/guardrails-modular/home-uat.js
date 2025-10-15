/**
 * home-uat.js
 * UAT-ready functionality for home.html
 * Handles resumes/attachments uploads, avatar editing, and action links
 */

export const HomeUAT = (function(){
  // ---------- Utils ----------
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function lsGet(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; }
  }
  function lsSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function genId(){ return Date.now() + '-' + Math.random().toString(36).slice(2,8); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function formatSize(bytes){
    if (bytes >= 1024*1024) return (bytes/(1024*1024)).toFixed(1) + 'MB';
    const kb = Math.max(1, Math.round(bytes/1024));
    return kb + 'KB';
  }

  // ---------- Storage keys ----------
  const K = {
    interviews: 'oi.interviews',
    resumes: 'oi.resumes',
    attachments: 'oi.attachments',
    avatarUrl: 'oi.avatarUrl',
    viewItem: 'oi.view.item',
  };

  // ---------- Hydration ----------
  function ensureIdsOnExistingRows(){
    // Interviews existing rows
    const itRows = document.querySelectorAll('#interviews-body tr');
    let list = lsGet(K.interviews, []);
    const existingTitles = new Set(list.map(x=>x.title));
    itRows.forEach(tr => {
      if(!tr.dataset.id){
        tr.dataset.id = genId();
      }
      // try to sync to storage (best-effort, based on visible cells)
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 6) {
        const title = tds[0].textContent.trim();
        const date = tds[1].textContent.trim();
        const views = parseInt(tds[2].textContent.trim()||'0',10);
        const shares = parseInt(tds[3].textContent.trim()||'0',10);
        const status = tr.querySelector('span')?.textContent.trim() || 'Draft';
        if (!list.find(x => x.title === title && x.date === date)) {
          list.push({ id: tr.dataset.id, title, date, views, shares, status });
        }
      }
    });
    lsSet(K.interviews, list);

    // Resumes existing rows
    const rRows = document.querySelectorAll('#resumes-body tr');
    let rlist = lsGet(K.resumes, []);
    rRows.forEach(tr => {
      if(!tr.dataset.id) tr.dataset.id = genId();
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 4) {
        const filename = tds[0].textContent.trim();
        const date = tds[1].textContent.trim();
        const size = tds[2].textContent.trim();
        if (!rlist.find(x => x.filename === filename && x.date === date)) {
          rlist.push({ id: tr.dataset.id, filename, date, size });
        }
      }
    });
    lsSet(K.resumes, rlist);

    // Attachments table may be empty initially
    const alist = lsGet(K.attachments, []);
    lsSet(K.attachments, alist);
  }

  function prependRow(tbody, cellsHtml){
    const tr = document.createElement('tr');
    tr.dataset.id = genId();
    tr.innerHTML = cellsHtml;
    tbody.prepend(tr);
    return tr;
  }

  function renderResumeRow(rec){
    return `
      <td class="px-6 py-4 text-sm font-medium">${rec.filename}</td>
      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${rec.date}</td>
      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${rec.size}</td>
      <td class="px-6 py-4 text-sm font-medium">
        <div class="flex items-center justify-end gap-4 actions">
          <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Edit</button>
          <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Delete</button>
        </div>
      </td>`;
  }

  function renderAttachmentRow(rec){
    return `
      <td class="px-6 py-4 text-sm font-medium">${rec.filename}</td>
      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${rec.date}</td>
      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${rec.size}</td>
      <td class="px-6 py-4 text-sm font-medium">
        <div class="flex items-center justify-end gap-4 actions">
          <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Edit</button>
          <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Delete</button>
        </div>
      </td>`;
  }

  function hydrateFromStorage(){
    // Resumes
    const resumesBody = document.getElementById('resumes-body');
    if (resumesBody) {
      const resumes = lsGet(K.resumes, []);
      // avoid duplicating existing static rows: clear any injected (optional)
      // For simplicity, only add missing by filename+date
      const existingSet = new Set(Array.from(resumesBody.querySelectorAll('tr')).map(tr => {
        const tds = tr.querySelectorAll('td');
        return tds.length ? tds[0].textContent.trim() + '|' + (tds[1]?.textContent.trim()||'') : '';
      }));
      resumes.slice().reverse().forEach(rec => {
        const key = rec.filename + '|' + rec.date;
        if (!existingSet.has(key)){
          const tr = prependRow(resumesBody, renderResumeRow(rec));
          tr.dataset.id = rec.id || genId();
        }
      });
    }

    // Attachments
    const attachmentsBody = document.getElementById('attachments-body');
    if (attachmentsBody) {
      const attachments = lsGet(K.attachments, []);
      attachments.slice().reverse().forEach(rec => {
        const tr = prependRow(attachmentsBody, renderAttachmentRow(rec));
        tr.dataset.id = rec.id || genId();
      });
    }

    // Avatars
    const avatarUrl = lsGet(K.avatarUrl, null);
    if (avatarUrl){
      setAvatar(avatarUrl);
    }
  }

  // ---------- Bind uploads ----------
  function bindUpload(linkId, inputId, tbodyId, key, rowRenderer){
    const link = document.getElementById(linkId);
    const input = document.getElementById(inputId);
    const tbody = document.getElementById(tbodyId);
    if (!link || !input || !tbody) return;

    link.addEventListener('click', function(e){
      e.preventDefault();
      input.click();
    });

    input.addEventListener('change', function(){
      const files = Array.from(input.files || []);
      if (!files.length) return;
      const list = lsGet(key, []);
      files.forEach(file => {
        const rec = {
          id: genId(),
          filename: file.name,
          date: today(),
          size: formatSize(file.size || 0)
        };
        // Prepend DOM row
        const tr = prependRow(tbody, rowRenderer(rec));
        tr.dataset.id = rec.id;
        // Prepend storage
        list.unshift(rec);
      });
      lsSet(key, list);
      input.value = '';
    });
  }

  // ---------- Actions (Edit/Delete) ----------
  function bindActions(tbodyId, key, primaryCellIndex){
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.addEventListener('click', function(e){
      const btn = e.target.closest('button');
      if (!btn) return;
      const tr = e.target.closest('tr');
      if (!tr) return;
      const id = tr.dataset.id;
      let list = lsGet(key, []);
      const idx = list.findIndex(x => x.id === id);
      if (btn.textContent.trim().toLowerCase() === 'edit'){
        const tds = tr.querySelectorAll('td');
        const current = tds[primaryCellIndex].textContent.trim();
        const next = prompt('Rename', current);
        if (next && next.trim()){
          tds[primaryCellIndex].textContent = next.trim();
          if (idx >= 0){
            if (key === K.interviews) list[idx].title = next.trim();
            else list[idx].filename = next.trim();
            lsSet(key, list);
          }
        }
      } else if (btn.textContent.trim().toLowerCase() === 'delete'){
        if (confirm('Delete this item?')){
          tr.remove();
          if (idx >= 0){
            list.splice(idx,1);
            lsSet(key, list);
          }
        }
      }
    });
  }

  // ---------- Upcoming "View Details" ----------
  function bindUpcomingView(){
    const links = document.querySelectorAll('.upcoming-view');
    links.forEach(a => {
      a.addEventListener('click', function(e){
        e.preventDefault();
        const payload = {
          company: a.dataset.company || '',
          role: a.dataset.role || '',
          datetime: a.dataset.datetime || '',
          recruiter: a.dataset.recruiter || ''
        };
        lsSet(K.viewItem, { type: 'upcoming', id: genId(), payload });
        location.hash = '#/interviews/view';
      });
    });
  }

  // ---------- Avatar edit ----------
  function setAvatar(url){
    const header = $('#avatar-header');
    const profile = $('#avatar-profile');
    if (header) header.style.backgroundImage = 'url("' + url + '")';
    if (profile) profile.style.backgroundImage = 'url("' + url + '")';
  }
  function bindAvatarEdit(){
    const trigger = $('#avatar-profile');
    const input = $('#input-edit-avatar');
    if (!trigger || !input) return;
    function openPicker(){ input.click(); }
    trigger.addEventListener('click', function(){ openPicker(); });
    trigger.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } });
    input.addEventListener('change', function(){
      const file = input.files && input.files[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')){
        alert('Please select an image');
        input.value=''; return;
      }
      const reader = new FileReader();
      reader.onload = function(ev){
        const url = ev.target.result;
        setAvatar(url);
        lsSet(K.avatarUrl, url);
        input.value='';
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- Guardrails: Cleanup & Smart Positioning ----------
  function dedupeAttachments(){
    const sections = $$('h2')
      .filter(h => h.textContent.trim() === 'Attachments')
      .map(h => h.closest('.flex.flex-col.gap-6'))
      .filter(Boolean);
    
    if (sections.length > 1) {
      // Keep first, remove duplicates
      sections.slice(1).forEach(s => s.remove());
    }
  }

  function ensureBottomUploader({sectionId, linkId, inputId, accept, tbodyId, storageKey, linkText}){
    const section = $(`#${sectionId}`);
    const tbody = $(`#${tbodyId}`);
    if (!section || !tbody) return;

    // Remove duplicate links (keep only the last one)
    const existingLinks = $$(`#${sectionId} #${linkId}`);
    if (existingLinks.length > 1) {
      existingLinks.slice(0, -1).forEach(a => {
        const wrapper = a.closest('div');
        if (wrapper) wrapper.remove();
      });
    }

    // Ensure link and input exist at bottom of section
    let link = $(`#${sectionId} #${linkId}`);
    let input = $(`#${sectionId} #${inputId}`);
    
    if (!link || !input) {
      const wrapper = document.createElement('div');
      wrapper.className = 'mt-2 flex items-center justify-end';
      wrapper.innerHTML = `
        <a id="${linkId}" href="#" class="text-sm font-medium text-black hover:underline dark:text-white">${linkText}</a>
        <input id="${inputId}" type="file" class="hidden" multiple accept="${accept}"/>
      `;
      section.appendChild(wrapper);
      link = $(`#${sectionId} #${linkId}`);
      input = $(`#${sectionId} #${inputId}`);
    }

    // Bind upload handler
    link.addEventListener('click', function(e){
      e.preventDefault();
      input.click();
    });

    input.addEventListener('change', function(){
      const files = Array.from(input.files || []);
      if (!files.length) return;
      const list = lsGet(storageKey, []);
      
      files.forEach(file => {
        const rec = {
          id: genId(),
          filename: file.name,
          date: today(),
          size: formatSize(file.size || 0)
        };
        
        // Prepend DOM row
        const tr = document.createElement('tr');
        tr.dataset.id = rec.id;
        tr.innerHTML = storageKey === K.resumes 
          ? renderResumeRow(rec) 
          : renderAttachmentRow(rec);
        tbody.prepend(tr);
        
        // Prepend storage
        list.unshift(rec);
      });
      
      lsSet(storageKey, list);
      input.value = '';
    });
  }

  // ---------- Init ----------
  function init(){
    // Guardrails cleanup
    dedupeAttachments();
    
    // Ensure upload links are properly positioned (only if sections exist)
    if ($('#resumes-section')) {
      ensureBottomUploader({
        sectionId: 'resumes-section',
        linkId: 'link-add-resume',
        inputId: 'input-add-resume',
        accept: '.pdf,.doc,.docx,.txt',
        tbodyId: 'resumes-body',
        storageKey: K.resumes,
        linkText: 'Add New'
      });
    }
    
    if ($('#attachments-section')) {
      ensureBottomUploader({
        sectionId: 'attachments-section',
        linkId: 'link-create-attachment',
        inputId: 'input-create-attachment',
        accept: '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.ppt,.pptx,.xls,.xlsx,.csv',
        tbodyId: 'attachments-body',
        storageKey: K.attachments,
        linkText: 'Create New'
      });
    }

    ensureIdsOnExistingRows();
    hydrateFromStorage();
    bindActions('interviews-body', K.interviews, 0); // primary cell = title
    bindActions('resumes-body', K.resumes, 0);       // primary cell = filename
    bindActions('attachments-body', K.attachments, 0);
    bindUpcomingView();
    bindAvatarEdit();
  }

  // Public API for testing
  return {
    init,
    lsGet,
    lsSet,
    genId,
    formatSize,
    bindUpload,
    bindActions,
    bindUpcomingView,
    bindAvatarEdit,
    setAvatar,
    dedupeAttachments,
    ensureBottomUploader,
    K,
    prependRow,
    renderResumeRow,
    renderAttachmentRow
  };
})();

// Auto-initialize if running in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HomeUAT.init());
  } else {
    HomeUAT.init();
  }
}
