/* =========================
   GUARDRAILS RUNTIME PATCH
   - dedupe Attachments sections
   - enforce bottom-only upload links for Resumes & Attachments
   - replace legacy avatar listeners; bind FileReader preview + persistence
   - idempotent, safe to append multiple times (no duplicate binding due to node replacement)
   ========================= */

(function(){
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const KB = 1024, MB = 1024*1024;
  const today = () => new Date().toISOString().slice(0,10);
  const formatSize = b => (b >= MB ? (b/MB).toFixed(1)+'MB' : Math.max(1, Math.round((b||0)/KB))+'KB');

  function guardrailsBindAvatar() {
    let input   = $('#input-edit-avatar');
    let trigger = $('#avatar-profile');

    try {
      const saved = localStorage.getItem('oi.avatarUrl');
      if (saved) setAvatarBackground(saved);
    } catch {}

    if (!input || !trigger) return;

    const freshInput = input.cloneNode(true);
    input.replaceWith(freshInput);
    input = freshInput;

    const freshTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(freshTrigger, trigger);
    trigger = freshTrigger;

    const openPicker = () => input.click();
    trigger.addEventListener('click', openPicker);
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
    });

    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) return;
      if (!f.type || !/^image\//.test(f.type)) {
        alert('Please select an image');
        input.value = '';
        return;
      }
      const rd = new FileReader();
      rd.onload = ev => {
        const url = ev.target.result;
        setAvatarBackground(url);
        try { localStorage.setItem('oi.avatarUrl', url); } catch {}
        input.value = '';
      };
      rd.readAsDataURL(f);
    });

    function setAvatarBackground(url) {
      const header  = $('#avatar-header');
      const profile = $('#avatar-profile');
      if (header)  header.style.backgroundImage  = `url("${url}")`;
      if (profile) profile.style.backgroundImage = `url("${url}")`;
    }
  }

  function guardrailsDedupeAttachmentsSections() {
    const sections = $$('h2')
      .filter(h => h.textContent.trim() === 'Attachments')
      .map(h => h.closest('.flex.flex-col.gap-6'))
      .filter(Boolean);

    if (sections.length > 1) {
      sections.slice(1).forEach(sec => sec.remove());
      console.info('[guardrails] Removed duplicate Attachments sections:', sections.length - 1);
    }
  }

  function ensureBottomUploader({ sectionId, linkId, inputId, accept, tbodyId, storageKey, linkText }) {
    const section = document.getElementById(sectionId);
    const tbody   = document.getElementById(tbodyId);
    if (!section || !tbody) return;

    const dupLinks = $$( `#${sectionId} #${linkId}` );
    if (dupLinks.length > 1) {
      dupLinks.slice(0, -1).forEach(a => a.closest('div')?.remove());
      console.info(`[guardrails] Removed ${dupLinks.length - 1} duplicate link(s) for #${linkId}`);
    }

    let link  = section.querySelector(`#${linkId}`);
    let input = section.querySelector(`#${inputId}`);
    if (!link || !input) {
      const wrap = document.createElement('div');
      wrap.className = 'mt-2 flex items-center justify-end';
      wrap.innerHTML = `
        <a id="${linkId}" href="#" class="text-sm font-medium text-black hover:underline dark:text-white">${linkText}</a>
        <input id="${inputId}" type="file" class="hidden" multiple accept="${accept}" />
      `;
      section.appendChild(wrap);
      link  = section.querySelector(`#${linkId}`);
      input = section.querySelector(`#${inputId}`);
    }

    const freshInput = input.cloneNode(true);
    input.replaceWith(freshInput);
    input = freshInput;

    const freshLink = link.cloneNode(true);
    link.parentNode.replaceChild(freshLink, link);
    link = freshLink;

    link.addEventListener('click', e => { e.preventDefault(); input.click(); });
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      let list;
      try { list = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { list = []; }

      files.forEach(file => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="px-6 py-4 text-sm font-medium">${file.name}</td>
          <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${new Date().toISOString().slice(0,10)}</td>
          <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${(file.size >= 1048576)?(file.size/1048576).toFixed(1)+'MB': Math.max(1, Math.round((file.size||0)/1024))+'KB'}</td>
          <td class="px-6 py-4 text-sm font-medium">
            <div class="flex items-center justify-end gap-4 actions">
              <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Edit</button>
              <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Delete</button>
            </div>
          </td>`;
        tbody.prepend(tr);
        list.unshift({ filename: file.name, date: new Date().toISOString().slice(0,10), size: (file.size >= 1048576)?(file.size/1048576).toFixed(1)+'MB': Math.max(1, Math.round((file.size||0)/1024))+'KB' });
      });

      try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch {}
      input.value = '';
    });
  }

  function guardrailsNormalizeUploadControls() {
    ensureBottomUploader({
      sectionId: 'resumes-section',
      linkId: 'link-add-resume',
      inputId: 'input-add-resume',
      accept: '.pdf,.doc,.docx,.txt',
      tbodyId: 'resumes-body',
      storageKey: 'oi.resumes',
      linkText: 'Add New'
    });

    ensureBottomUploader({
      sectionId: 'attachments-section',
      linkId: 'link-create-attachment',
      inputId: 'input-create-attachment',
      accept: '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.ppt,.pptx,.xls,.xlsx,.csv',
      tbodyId: 'attachments-body',
      storageKey: 'oi.attachments',
      linkText: 'Create New'
    });
  }

  function bootGuardrails() {
    try { guardrailsDedupeAttachmentsSections(); } catch (e) { console.error('[guardrails] dedupe failed', e); }
    try { guardrailsNormalizeUploadControls(); } catch (e) { console.error('[guardrails] normalize uploads failed', e); }
    try { guardrailsBindAvatar(); } catch (e) { console.error('[guardrails] avatar bind failed', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGuardrails, { once: true });
  } else {
    bootGuardrails();
  }
})();