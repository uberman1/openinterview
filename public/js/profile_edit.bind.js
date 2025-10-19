// profile_edit.bind.js — Simple working binder for profile_edit_enhanced.html
// Compatible with data-store.js nested structure

import { $, $$, toast } from './app.js';
import { store } from './data-store.js';

(function initProfileEditBinder(){
  let profile = safeGetProfile();  // Changed to `let` so we can update it
  hydrate(profile);
  wireAll(profile);

  // Top "Save Profile" button
  const saveBtn = $$('header button').find(b=> b.dataset.testid === 'button-save-profile' || b.textContent.trim().toLowerCase()==='save profile');
  saveBtn?.addEventListener('click', async ()=>{
    try {
      const patch = collectFormData();
      console.log('[SAVE] Patch to save:', JSON.stringify(patch, null, 2));
      const updated = store.updateProfile(profile.id, patch);  // Get returned profile
      console.log('[SAVE] Updated profile phone:', updated?.display?.phone);
      if (updated) profile = updated;  // Update local variable
      toast('Profile saved');
    } catch(e){
      console.error('[SAVE] Error:', e);
      toast('Failed to save', {type:'error'});
    }
  });

  // Helper: Get profile from localStorage or create new
  function safeGetProfile(){
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return createNewProfile();
    const existing = store.getProfile({id});
    return existing || createNewProfile();
  }

  function createNewProfile(){
    const profile = store.createDraftProfile();
    // Update URL with new ID
    const url = new URL(window.location.href);
    url.searchParams.set('id', profile.id);
    history.replaceState({}, '', url.toString());
    return profile;
  }

  // Helper: Collect form data into patch object
  function collectFormData(){
    const patch = { display: {} };
    
    // Basic info
    const name = $('input[placeholder="Your Name"]')?.value?.trim();
    const title = $('input[placeholder="Your Title"]')?.value?.trim();
    const location = $('input[placeholder="City, Country"]')?.value?.trim();
    
    // Phone and email - check BOTH inline and Contact Information inputs
    const phoneInputs = $$('input[placeholder="e.g. +1 234 567 890"]');
    let phone = '';
    for (const input of phoneInputs) {
      const val = input.value?.trim();
      if (val) { phone = val; break; }  // Use first non-empty value
    }
    
    const emailInputs = $$('input[placeholder="your.email@example.com"]');
    let email = '';
    for (const input of emailInputs) {
      const val = input.value?.trim();
      if (val) { email = val; break; }  // Use first non-empty value
    }
    
    const bio = $('textarea[data-testid="textarea-bio"]')?.value?.trim() ||
                $('textarea[placeholder^="Add a brief"]')?.value?.trim();

    if (name) patch.display.name = name;
    if (title) patch.display.title = title;
    if (location) patch.display.location = location;
    if (phone) patch.display.phone = phone;
    if (email) patch.display.email = email;
    if (bio) patch.display.summary = bio;

    console.log('[COLLECT] Found phone:', phone, 'from', phoneInputs.length, 'inputs');
    console.log('[COLLECT] Found email:', email, 'from', emailInputs.length, 'inputs');

    return patch;
  }

  // Helper: Load profile data into form fields
  function hydrate(p){
    if (!p || !p.display) {
      console.log('[HYDRATE] No profile or display object');
      return;
    }

    console.log('[HYDRATE] Profile phone:', p.display.phone);
    console.log('[HYDRATE] Profile email:', p.display.email);

    const nameEl = $('input[placeholder="Your Name"]');
    if (nameEl) nameEl.value = p.display.name || '';

    const titleEl = $('input[placeholder="Your Title"]');
    if (titleEl) titleEl.value = p.display.title || '';

    const locEl = $('input[placeholder="City, Country"]');
    if (locEl) locEl.value = p.display.location || '';

    const bioTa = $('textarea[data-testid="textarea-bio"]') || $('textarea[placeholder^="Add a brief"]');
    if (bioTa) bioTa.value = p.display.summary || '';

    // Phone and email - populate ALL matching inputs (both inline and Contact Info)
    const phone = p.display.phone || '';
    const email = p.display.email || '';

    const phoneInputs = $$('input[placeholder="e.g. +1 234 567 890"]');
    phoneInputs.forEach(input => {
      input.value = phone;
    });
    console.log('[HYDRATE] Set', phoneInputs.length, 'phone inputs to:', phone);

    const emailInputs = $$('input[placeholder="your.email@example.com"]');
    emailInputs.forEach(input => {
      input.value = email;
    });
    console.log('[HYDRATE] Set', emailInputs.length, 'email inputs to:', email);

    // Avatar
    const avatar = $('.aspect-square.rounded-full');
    if (p.display.avatarUrl && avatar) {
      avatar.style.backgroundImage = `url(${CSS.escape(p.display.avatarUrl)})`;
    }
  }

  // Wire up interactive elements
  function wireAll(p){
    // Avatar upload
    const avatarBtn = $$('button').find(b=> b.dataset.testid==='button-upload-photo' || b.textContent.trim().includes('Upload') && b.textContent.trim().includes('Photo'));
    if (avatarBtn){
      avatarBtn.addEventListener('click', async ()=>{
        const file = await pickFile('image/*');
        if (!file) return;
        if (file.size > 2*1024*1024) {
          toast('Image too large (max 2MB)', {type:'error'});
          return;
        }
        const url = await fakeUpload(file);
        const avatar = $('.aspect-square.rounded-full');
        if (avatar) avatar.style.backgroundImage = `url(${CSS.escape(url)})`;
        store.updateProfile(p.id, { display: { avatarUrl: url } });
        toast('Avatar updated');
      });
    }

    // Video upload
    const videoBtn = $$('button').find(b=> b.dataset.testid==='button-upload-video' || b.textContent.trim()==='Upload Video');
    if (videoBtn){
      videoBtn.addEventListener('click', async ()=>{
        const file = await pickFile('video/*');
        if (!file) return;
        const url = await fakeUpload(file);
        store.updateProfile(p.id, { display: { video: { sourceUrl: url } } });
        toast('Video uploaded');
      });
    }
  }

  // File picker helper
  async function pickFile(accept){
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => resolve(input.files[0]);
      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  // Fake upload (creates data URL for demo)
  async function fakeUpload(file){
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
})();
