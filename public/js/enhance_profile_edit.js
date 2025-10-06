// Enhancements for profile_edit.html: inline uploads with limits
const MAX_RESUME_BYTES = (5) * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = (25) * 1024 * 1024;

function injectUploadUI() {
  const resumeBlock = document.querySelector('#resumeList')?.parentElement;
  if (resumeBlock && !document.querySelector('#uploadResumeInput')) {
    const wrap = document.createElement('div');
    wrap.style = 'margin-top:10px;display:flex;gap:8px;align-items:center';
    wrap.innerHTML = `<label class="btn out" style="cursor:pointer">Upload<input id="uploadResumeInput" type="file" accept=".pdf,.docx,.rtf,.txt,.pptx" style="display:none"></label><span class="muted">PDF preferred • ≤ 5MB</span>`;
    resumeBlock.appendChild(wrap);
  }
  const attBlock = document.querySelector('#libraryList')?.parentElement;
  if (attBlock && !document.querySelector('#uploadAttachInput')) {
    const wrap = document.createElement('div');
    wrap.style = 'margin-top:10px;display:flex;gap:8px;align-items:center';
    wrap.innerHTML = `<label class="btn out" style="cursor:pointer">Upload<input id="uploadAttachInput" type="file" accept=".pdf,.docx,.rtf,.txt,.pptx" style="display:none"></label><span class="muted">PDF/DOCX/PPTX/RTF/TXT • ≤ 25MB</span>`;
    attBlock.appendChild(wrap);
  }
}

async function uploadTo(kind, profileId, file) {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`/api/upload/${kind}/${profileId}`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function main() {
  injectUploadUI();
  const url = new URL(location.href);
  const id = url.searchParams.get('id');
  const resumeInput = document.querySelector('#uploadResumeInput');
  const attachInput = document.querySelector('#uploadAttachInput');

  resumeInput?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > MAX_RESUME_BYTES) { alert(`Resume must be ≤ 5 MB (selected ${(f.size/1048576).toFixed(1)} MB)`); e.target.value=''; return; }
    try { await uploadTo('resume', id, f); location.reload(); } catch(err){ alert(err.message); }
  });

  attachInput?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > MAX_ATTACHMENT_BYTES) { alert(`Attachment must be ≤ 25 MB (selected ${(f.size/1048576).toFixed(1)} MB)`); e.target.value=''; return; }
    try { await uploadTo('attachment', id, f); location.reload(); } catch(err){ alert(err.message); }
  });
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', main) : main();
