// profile_edit.bind.js — Simple working binder for profile_edit_enhanced.html
// Compatible with data-store.js nested structure

import { $, $$, toast } from './app.js';
import { store } from './data-store.js';

(async function initProfileEditBinder(){
  // Sync assets from API on load
  await store.syncAssetsFromAPI();
  
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
    
    // Basic info - ALWAYS include all fields (even if empty) so users can clear them
    const name = $('input[placeholder="Your Name"]')?.value?.trim() || '';
    const title = $('input[placeholder="Your Title"]')?.value?.trim() || '';
    const location = $('input[placeholder="City, Country"]')?.value?.trim() || '';
    
    // Phone and email - ALWAYS read from Contact Information section (labeled inputs)
    // These are the authoritative fields users interact with, NOT the inline duplicates
    const phoneInputs = $$('input[placeholder="e.g. +1 234 567 890"]');
    // Contact Info phone is the LAST one. ALWAYS use it (even if empty - allows clearing)
    const phone = phoneInputs.length > 0 
      ? phoneInputs[phoneInputs.length - 1].value?.trim() || '' 
      : '';
    
    const emailInputs = $$('input[placeholder="your.email@example.com"]');
    // Contact Info email is the LAST one. ALWAYS use it (even if empty - allows clearing)
    const email = emailInputs.length > 0
      ? emailInputs[emailInputs.length - 1].value?.trim() || ''
      : '';
    
    const bio = $('textarea[data-testid="textarea-bio"]')?.value?.trim() ||
                $('textarea[placeholder^="Add a brief"]')?.value?.trim() || '';

    // Always include all fields (even empty strings) so users can clear values
    patch.display.name = name;
    patch.display.title = title;
    patch.display.location = location;
    patch.display.phone = phone;
    patch.display.email = email;
    patch.display.summary = bio;

    console.log('[COLLECT] Collected data:', JSON.stringify(patch.display, null, 2));

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
    // Populate resume dropdown with assets from database
    populateResumeDropdown();
    
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

  // ===== NEW: Availability Rules UI Enhancements =====
  function injectRulesUI(){
    // Remove Scheduling Window + Increments (if present)
    const windowInput = document.querySelector('input[placeholder*="days"]');
    if (windowInput) {
      const windowBlock = windowInput.closest('div.space-y-4, div.flex, label');
      if (windowBlock && windowBlock.textContent.toLowerCase().includes('window')) {
        windowBlock.remove();
      }
    }
    
    const incrementsInput = document.querySelector('select, input[placeholder*="minutes"]');
    if (incrementsInput) {
      const incrementsBlock = incrementsInput.closest('div.space-y-4, div.flex, label');
      if (incrementsBlock && incrementsBlock.textContent.toLowerCase().includes('increment')) {
        incrementsBlock.remove();
      }
    }

    // Minimum Notice: add Immediate + Custom
    const minSelect = document.querySelector('select');
    if (minSelect && minSelect.querySelector('option[value*="24"]') && !minSelect.querySelector('option[value="immediate"]')) {
      const opt0 = document.createElement('option');
      opt0.value = 'immediate';
      opt0.textContent = 'Immediate';
      const optC = document.createElement('option');
      optC.value = 'custom';
      optC.textContent = 'Custom…';
      minSelect.prepend(opt0);
      minSelect.appendChild(optC);
      
      const holder = document.createElement('div');
      holder.className = 'mt-2';
      holder.id = 'min-notice-custom-holder';
      holder.style.display = 'none';
      holder.innerHTML = '<input id="min-notice-custom" type="number" min="0" class="form-input w-28 rounded-lg border border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark text-sm px-3 py-2" placeholder="hours" /> <span class="text-xs text-neutral-500 dark:text-neutral-400 ml-2">Enter hours for custom notice</span>';
      minSelect.parentElement?.appendChild(holder);
      
      // Show/hide custom input based on selection
      minSelect.addEventListener('change', (e) => {
        const customHolder = document.getElementById('min-notice-custom-holder');
        if (customHolder) {
          customHolder.style.display = e.target.value === 'custom' ? 'block' : 'none';
        }
      });
    }

    // Buffers explainer
    const allLabels = Array.from(document.querySelectorAll('label, div'));
    const buffersLabel = allLabels.find(el => {
      const text = el.textContent || '';
      return /buffer/i.test(text) && !el.querySelector('[data-buffers-expl]');
    });
    if (buffersLabel && !buffersLabel.querySelector('[data-buffers-expl]')) {
      const exp = document.createElement('p');
      exp.setAttribute('data-buffers-expl', '');
      exp.className = 'text-xs text-neutral-500 dark:text-neutral-400 mt-2';
      exp.textContent = 'Sets the amount of time you will have between interviews (avoids back-to-back interviews).';
      buffersLabel.appendChild(exp);
    }

    // Daily cap explainer
    const dailyCapInput = document.querySelector('input[type="number"]');
    if (dailyCapInput) {
      const capBlock = dailyCapInput.closest('label, div.space-y-4');
      if (capBlock && /daily|cap|limit/i.test(capBlock.textContent || '') && !capBlock.querySelector('[data-cap-expl]')) {
        const exp = document.createElement('p');
        exp.setAttribute('data-cap-expl', '');
        exp.className = 'text-xs text-neutral-500 dark:text-neutral-400 mt-2';
        exp.textContent = 'Set the total number of interviews you will accept in a day, leave blank for unlimited interviews.';
        capBlock.appendChild(exp);
      }
    }

    // Durations: add 45 & 120 min chips (if not already present)
    const allSections = Array.from(document.querySelectorAll('section, div'));
    const durBlock = allSections.find(el => /duration/i.test(el.textContent || ''));
    if (durBlock && !durBlock.querySelector('[data-dur-45]')) {
      const chipsContainer = durBlock.querySelector('.flex.items-center.gap-2, .mt-1.flex');
      if (chipsContainer) {
        const addChip = (label, attr) => {
          const span = document.createElement('span');
          span.className = 'bg-[#ededed] dark:bg-neutral-700 rounded-full px-3 py-1 text-sm text-primary dark:text-neutral-50 cursor-pointer';
          if (attr) span.setAttribute(attr, '');
          span.textContent = label;
          const addBtn = chipsContainer.querySelector('button');
          chipsContainer.insertBefore(span, addBtn || null);
        };
        addChip('45 min', 'data-dur-45');
        addChip('120 min', 'data-dur-120');
      }
    }
  }

  function readRulesInto(model) {
    // Minimum notice
    const minSelect = document.querySelector('select');
    if (minSelect) {
      const sel = minSelect.value;
      if (sel === 'immediate') {
        model.minNoticeHours = 0;
      } else if (sel === 'custom') {
        const customInput = document.getElementById('min-notice-custom');
        const v = parseInt(customInput?.value || '0', 10);
        model.minNoticeHours = isNaN(v) ? 0 : v;
      } else {
        const match = sel.match(/(\d+)/);
        if (match) model.minNoticeHours = parseInt(match[1], 10);
      }
    }

    // Daily cap: blank = unlimited (Infinity)
    const dailyCapInput = document.querySelector('input[type="number"]');
    if (dailyCapInput) {
      const capRaw = (dailyCapInput.value || '').trim();
      model.dailyCap = capRaw === '' ? Infinity : parseInt(capRaw, 10);
    }

    // Durations: ensure 45 & 120 exist
    if (model.durations) {
      const set = new Set(model.durations);
      set.add(45);
      set.add(120);
      model.durations = Array.from(set).sort((a, b) => a - b);
    }
  }

  // Call injectRulesUI on page load
  setTimeout(() => injectRulesUI(), 100);

  // Wire Save button within Availability section to apply rules
  const availSection = document.querySelector('section:has(h2)');
  if (availSection && /availability/i.test(availSection.textContent || '')) {
    const saveBtn = availSection.querySelector('button.bg-primary, button:has(span:contains("Save"))');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (!profile.availability) profile.availability = {};
        readRulesInto(profile.availability);
        const updated = store.updateProfile(profile.id, { availability: profile.availability });
        if (updated) profile = updated;
        window.dispatchEvent(new CustomEvent('availability:updated', {
          detail: { profileId: profile.id, model: profile.availability }
        }));
        toast('Availability saved');
      });
    }
  }

  // Populate resume dropdown with assets from database
  function populateResumeDropdown(){
    const dropdown = $('select.form-select');
    if (!dropdown) return;
    
    // Get resumes from store
    const resumes = store.listAssets({type: 'resume'});
    
    // Clear existing options except first (placeholder) and last (add new)
    dropdown.innerHTML = '';
    
    // Add placeholder
    const placeholder = document.createElement('option');
    placeholder.textContent = 'Select a resume';
    placeholder.selected = true;
    dropdown.appendChild(placeholder);
    
    // Add resume options
    resumes.forEach(asset => {
      const option = document.createElement('option');
      option.value = asset.id;
      option.textContent = asset.name || `Resume ${asset.id.slice(-6)}`;
      dropdown.appendChild(option);
    });
    
    // Add separator and "Add new" option
    if (resumes.length > 0) {
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '---';
      dropdown.appendChild(separator);
    }
    
    const addNew = document.createElement('option');
    addNew.value = '__add_new__';
    addNew.textContent = '-- Add new resume --';
    dropdown.appendChild(addNew);
    
    // Wire up dropdown selection
    dropdown.addEventListener('change', async (e) => {
      const selected = e.target.value;
      if (selected === '__add_new__') {
        // Trigger file upload
        const browseBtn = $$('button').find(b => 
          b.textContent.includes('browse') || 
          b.textContent.includes('Browse')
        );
        if (browseBtn) browseBtn.click();
      } else if (selected && selected !== 'Select a resume') {
        // Load selected resume
        const asset = resumes.find(a => a.id === selected);
        if (asset) {
          toast(`Loaded resume: ${asset.name}`);
          // TODO: Extract data from resume and populate profile
        }
      }
    });
  }

  // ===== NEW: Profile Name Field Wiring =====
  const profileNameInput = document.getElementById('profileNameInput');
  if (profileNameInput) {
    // Hydrate with existing profileName
    profileNameInput.value = profile.profileName || '';
    
    // Save on change
    profileNameInput.addEventListener('change', () => {
      const updated = store.updateProfile(profile.id, { 
        profileName: profileNameInput.value.trim() 
      });
      if (updated) profile = updated;
      console.log('[PROFILE NAME] Updated to:', profile.profileName);
    });
  }

  // ===== NEW: Edit/Publish Banner Wiring =====
  // Edit button - stay on editor with current profile ID
  const btnTopEdit = document.getElementById('btnTopEdit');
  if (btnTopEdit) {
    btnTopEdit.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('id', profile.id);
      window.location.href = url.toString();
    });
  }

  // Publish button - save and publish profile
  const btnTopPublish = document.getElementById('btnTopPublish');
  if (btnTopPublish) {
    btnTopPublish.addEventListener('click', async () => {
      try {
        // Save current form data first
        const patch = collectFormData();
        const updated = store.updateProfile(profile.id, patch);
        if (updated) profile = updated;
        
        // Publish the profile
        const published = store.publishProfile(profile.id);
        
        if (published?.share?.publicUrl) {
          const fullUrl = window.location.origin + published.share.publicUrl;
          alert(`Published! Shareable link:\n\n${fullUrl}\n\nProfile URL: ${published.share.publicUrl}`);
          
          // Update banner to show published state
          const banner = document.getElementById('ep-topbar');
          if (banner) {
            const heading = banner.querySelector('h2');
            const description = banner.querySelector('p');
            if (heading) heading.textContent = 'This profile is published';
            if (description) description.textContent = `Share your profile: ${published.share.publicUrl}`;
          }
        } else {
          alert('Profile published successfully!');
        }
        
        toast('Profile published');
      } catch (error) {
        console.error('[PUBLISH ERROR]:', error);
        toast('Failed to publish profile', {type: 'error'});
      }
    });
  }
})();
