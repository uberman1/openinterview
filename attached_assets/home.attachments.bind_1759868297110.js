// home.attachments.bind.js
// Adds an "Attachments" section under "My Resumes" on home.html and hydrates with non-resume uploads.
(() => {
  if (!/home\.html$/.test(location.pathname)) return;

  function insertSection(){
    // Find the header "My Resumes", then insert after its container
    const h2s = Array.from(document.querySelectorAll('h2')).filter(h => /My Resumes/i.test(h.textContent||''));
    if (!h2s.length) return null;

    const resumesCard = h2s[0].closest('div')?.nextElementSibling?.closest('div') || h2s[0].parentElement?.nextElementSibling || h2s[0].parentElement;
    // We create our own section irrespective of exact DOM nesting to be robust
    const section = document.createElement('div');
    section.className = 'flex flex-col gap-6 mt-8';
    section.innerHTML = `
<h2 class="text-2xl font-bold tracking-tight">Attachments</h2>
<div class="overflow-hidden rounded border border-primary/10 bg-white dark:border-white/10 dark:bg-primary">
  <table class="w-full text-left">
    <thead>
      <tr class="border-b border-primary/10 dark:border-white/10">
        <th class="px-6 py-3 text-sm font-medium text-primary/60 dark:text-white/60">File Name</th>
        <th class="px-6 py-3 text-sm font-medium text-primary/60 dark:text-white/60">Upload Date</th>
        <th class="px-6 py-3 text-sm font-medium text-primary/60 dark:text-white/60">Size</th>
        <th class="px-6 py-3 text-sm font-medium text-primary/60 dark:text-white/60 text-right">Actions</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-primary/10 dark:divide-white/10" id="attachments-tbody">
      <tr><td class="px-6 py-4 text-sm" colspan="4">Loading…</td></tr>
    </tbody>
  </table>
</div>`;
    const container = document.querySelector('main .mx-auto.flex.max-w\\:\\[960px\\].flex-col.gap-12') || document.querySelector('main') || document.body;
    container.appendChild(section);
    return section.querySelector('#attachments-tbody');
  }

  async function fetchAttachments(){
    const paths = [
      '/api/uploads?type=attachment',
      '/api/uploads?exclude=resumes=1',
      '/api/files?kind=attachment'
    ];
    for (const url of paths){
      try{
        const r = await fetch(url);
        if (r.ok){
          const data = await r.json();
          // normalize to array of {id,name,size,uploadedAt,url,downloadUrl}
          if (Array.isArray(data)) return data;
          if (Array.isArray(data?.items)) return data.items;
        }
      }catch{}
    }
    return [];
  }

  function fmtBytes(n){
    if (!n && n !== 0) return '';
    const k = 1024; const units=['B','KB','MB','GB','TB'];
    let i = 0; let v = n;
    while (v >= k && i < units.length-1){ v/=k; i++; }
    return `${v.toFixed(v<10 && i>0 ? 1 : 0)} ${units[i]}`;
  }

  function fmtDate(s){
    try { return new Date(s).toISOString().slice(0,10); } catch { return s || ''; }
  }

  function rowHTML(f){
    const id = f.id || f._id || encodeURIComponent(f.name||'file');
    const view = f.url || `/api/uploads/${id}`;
    const dl  = f.downloadUrl || `/api/uploads/${id}/download`;
    return `<tr data-id="${id}">
      <td class="px-6 py-4 text-sm font-medium">${f.name || 'file'}</td>
      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${fmtDate(f.uploadedAt || f.createdAt)}</td>
      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${fmtBytes(f.size)}</td>
      <td class="px-6 py-4 text-sm font-medium">
        <div class="flex items-center justify-end gap-4">
          <a class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="${view}" target="_blank" rel="noopener">View</a>
          <a class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" href="${dl}">Download</a>
          <button class="text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white" data-action="delete" data-id="${id}">Delete</button>
        </div>
      </td>
    </tr>`;
  }

  function bindRowActions(tbody){
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action="delete"]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!id) return;
      if (!confirm('Delete this file?')) return;
      const urls = [
        `/api/uploads/${id}`,
        `/api/files/${id}`
      ];
      for (const u of urls){
        try{
          const r = await fetch(u, { method:'DELETE' });
          if (r.ok){
            const tr = btn.closest('tr'); tr?.remove();
            return;
          }
        }catch{}
      }
      alert('Could not delete. Please try again later.');
    });
  }

  async function init(){
    const tbody = insertSection();
    if (!tbody) return;
    const items = await fetchAttachments();
    if (!items.length){
      tbody.innerHTML = `<tr><td class="px-6 py-4 text-sm" colspan="4">No attachments uploaded yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(rowHTML).join('');
    bindRowActions(tbody);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();