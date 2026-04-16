// js/home-guardrails-module.js
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const KB = 1024, MB = 1024 * 1024;
const fmtSize = b => (b >= MB ? (b/MB).toFixed(1)+'MB' : Math.max(1, Math.round((b||0)/KB))+'KB');
const today = () => new Date().toISOString().slice(0,10);

function findSectionByHeaderText(text) {
  const h = $$('h2').find(h2 => h2.textContent.trim().toLowerCase() === text.toLowerCase());
  return h ? h.closest('.flex.flex-col.gap-6') : null;
}

function dedupeAttachmentsOnce() {
  const sections = $$('h2')
    .filter(h => h.textContent.trim().toLowerCase() === 'attachments')
    .map(h => h.closest('.flex.flex-col.gap-6'))
    .filter(Boolean);
  if (sections.length > 1) {
    sections.slice(1).forEach(sec => sec.remove());
  }
  const first = sections[0] || findSectionByHeaderText('Attachments');
  if (first && !first.id) first.id = 'attachments-section';
}

function normalizeBottomUploader({ heading, sectionId, linkId, inputId, accept, tbodySelector, linkText, storageKey }) {
  const section = document.getElementById(sectionId) || findSectionByHeaderText(heading);
  if (!section) return;

  const dupLinks = section.querySelectorAll(`#${linkId}`);
  if (dupLinks.length > 1) {
    [...dupLinks].slice(0, -1).forEach(a => a.closest('div')?.remove());
  }

  let link = section.querySelector(`#${linkId}`);
  let input = section.querySelector(`#${inputId}`);
  if (!link || !input) {
    const wrap = document.createElement('div');
    wrap.className = 'mt-2 flex items-center justify-end';
    wrap.innerHTML = `
      <a id="${linkId}" href="#" class="text-sm font-medium text-black hover:underline dark:text-white">${linkText}</a>
      <input id="${inputId}" type="file" class="hidden" multiple accept="${accept}"/>`;
    section.appendChild(wrap);
    link = section.querySelector(`#${linkId}`);
    input = section.querySelector(`#${inputId}`);
  }

  if (!link.dataset.bound) {
    link.dataset.bound = 'true';
    link.addEventListener('click', (e) => { e.preventDefault(); input.click(); });
  }
  if (!input.dataset.bound) {
    input.dataset.bound = 'true';
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []); if (!files.length) return;
      let list = [];
      try { list = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}

      const tbody = document.querySelector(tbodySelector);
      files.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="px-6 py-4 text-sm font-medium">${f.name}</td>
          <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${today()}</td>
          <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${fmtSize(f.size || 0)}</td>
          <td class="px-6 py-4 text-sm font-medium">
            <div class="flex items-center justify-end gap-4 actions">
              <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Edit</button>
              <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white">Delete</button>
            </div>
          </td>`;
        tbody?.prepend(tr);
        list.unshift({ filename: f.name, date: today(), size: fmtSize(f.size || 0) });
      });

      try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch {}
      input.value = '';
    });
  }
  if (!section.id) section.id = sectionId;
}

function bindAvatar() {
  const avatarInput   = document.getElementById('input-edit-avatar');
  const avatarProfile = document.getElementById('avatar-profile');
  const avatarHeader  = document.getElementById('avatar-header');
  if (!avatarInput || !avatarProfile) return;

  try {
    const saved = localStorage.getItem('oi.avatarUrl');
    if (saved) {
      avatarProfile.style.backgroundImage = `url("${saved}")`;
      if (avatarHeader) avatarHeader.style.backgroundImage = `url("${saved}")`;
    }
  } catch {}

  if (!avatarProfile.dataset.bound) {
    avatarProfile.dataset.bound = 'true';
    avatarProfile.addEventListener('click', () => avatarInput.click());
    avatarProfile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avatarInput.click(); }
    });
  }
  if (!avatarInput.dataset.bound) {
    avatarInput.dataset.bound = 'true';
    avatarInput.addEventListener('change', () => {
      const f = avatarInput.files?.[0]; if (!f) return;
      if (!/^image\//.test(f.type || '')) { alert('Please select an image'); avatarInput.value = ''; return; }
      const rd = new FileReader();
      rd.onload = e => {
        const url = e.target.result;
        avatarProfile.style.backgroundImage = `url("${url}")`;
        if (avatarHeader) avatarHeader.style.backgroundImage = `url("${url}")`;
        try { localStorage.setItem('oi.avatarUrl', url); } catch {}
        avatarInput.value = '';
      };
      rd.readAsDataURL(f);
    });
  }
}

export function initGuardrails() {
  if (window.__oiInit) return;
  window.__oiInit = true;

  dedupeAttachmentsOnce();

  normalizeBottomUploader({
    heading: 'My Resumes',
    sectionId: 'resumes-section',
    linkId: 'link-add-resume',
    inputId: 'input-add-resume',
    accept: '.pdf,.doc,.docx,.txt',
    tbodySelector: '#resumes-body',
    linkText: 'Add New',
    storageKey: 'oi.resumes'
  });

  normalizeBottomUploader({
    heading: 'Attachments',
    sectionId: 'attachments-section',
    linkId: 'link-create-attachment',
    inputId: 'input-create-attachment',
    accept: '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.ppt,.pptx,.xls,.xlsx,.csv',
    tbodySelector: '#attachments-body',
    linkText: 'Create New',
    storageKey: 'oi.attachments'
  });

  bindAvatar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGuardrails, { once: true });
} else {
  initGuardrails();
}
