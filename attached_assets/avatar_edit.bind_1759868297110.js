// avatar_edit.bind.js
// Makes the main page avatar editable (not the header avatar). Hover reveals "Edit", click opens file picker, uploads and swaps the image.
(() => {
  const TARGET_PAGES = [/home\.html$/, /profile\.html$/, /profile_edit\.html$/];
  if (!TARGET_PAGES.some(rx => rx.test(location.pathname))) return;

  // Find the main content avatar (avoid header/right top avatar)
  function findMainAvatar(){
    // Heuristic: inside main, look for a square rounded image div ~w-20
    const mains = document.querySelectorAll('main');
    for (const m of mains){
      const cands = m.querySelectorAll('div[style*="background-image"][class*="rounded-full"]');
      // choose the largest (likely the main avatar)
      let best=null; let bestArea=0;
      cands.forEach(el => {
        const w = el.clientWidth || (el.className.includes('w-20') ? 80 : 0);
        const h = el.clientHeight || w;
        const area = w*h;
        if (area > bestArea){ bestArea=area; best=el; }
      });
      if (best) return best;
    }
    return null;
  }

  const avatar = findMainAvatar();
  if (!avatar) return;

  // Build overlay + file input
  const wrapper = document.createElement('div');
  wrapper.className = 'relative inline-block group cursor-pointer';
  avatar.parentNode.insertBefore(wrapper, avatar);
  wrapper.appendChild(avatar);

  const overlay = document.createElement('div');
  overlay.className = 'absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity';
  overlay.textContent = 'Edit';
  wrapper.appendChild(overlay);

  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.className = 'hidden';
  wrapper.appendChild(input);

  function toast(msg, ok=true){
    let n = document.createElement('div');
    n.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow ${ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(()=>n.remove(), 2200);
  }

  wrapper.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    // 5MB avatar limit for responsiveness
    if (file.size > 5 * 1024 * 1024){ toast('Please choose an image under 5MB.', false); input.value = ''; return; }
    const fd = new FormData(); fd.append('avatar', file);
    const endpoints = [
      { url:'/api/profile/avatar', method:'POST' },
      { url:'/api/users/me/avatar', method:'POST' },
      { url:'/api/me/avatar', method:'POST' }
    ];
    let ok=false, newUrl=null;
    for (const ep of endpoints){
      try{
        const r = await fetch(ep.url, { method: ep.method, body: fd });
        if (r.ok){
          const j = await r.json().catch(()=>({}));
          newUrl = j.url || j.avatarUrl || j.avatar || URL.createObjectURL(file);
          ok=true; break;
        }
      }catch{}
    }
    if (!ok){ toast('Upload failed. Try again.', false); return; }
    // Update preview
    avatar.style.backgroundImage = `url("${newUrl}")`;
    toast('Avatar updated');
    input.value = '';
  });
})();