// /js/profile_edit.autopop.bind.js
// WP1: Real Resume Auto-populate with DeepSeek AI
// Calls /api/profiles/:id/ingest to parse resume and auto-fill fields

(function initAutoPopulate() {
  const section = document.querySelector('#resume-import-section');
  if (!section) return;

  const profileId = new URL(location.href).searchParams.get('id');
  
  const selectEl = section.querySelector('select.form-select');
  const fileInput = section.querySelector('input[type="file"]') || document.querySelector('#resume-file-input');
  const browseBtn = section.querySelector('#btn-browse-resume');
  
  
  // Set up browse button handler (works even without profile ID)
  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
    console.log('[auto-populate] Browse button handler attached');
  }
  
  // Set up dropdown handler (works even without profile ID)
  if (selectEl && fileInput) {
    selectEl.addEventListener('change', async (e) => {
      const value = e.target.value;
      if (value === 'add_new') {
        fileInput.click();
      } else if (value && profileId) {
        // Parse the selected resume file (for data extraction only)
        // This does NOT change the profile's actual resume file
        console.log('[auto-populate] Selected resume file ID for parsing:', value);
        await callIngestAPI(value);
      }
    });
    console.log('[auto-populate] Dropdown handler attached');
  }
  
  // If no profile ID, we're in "new profile" mode - still allow resume upload
  if (!profileId) {
    console.warn('[auto-populate] No ?id= profile id found in URL - new profile mode');
    // Don't return - allow resume upload to work
    // The resume upload will create a new profile
    return; // But we can return here since we don't need the rest of the logic
  }
  
  // Load user's resume files and populate dropdown
  async function loadResumeList() {
    try {
      // Get userId from the profile
      const profileRes = await fetch(`/api/profiles/${profileId}`, { credentials: 'include' });
      if (!profileRes.ok) return;
      
      const profile = await profileRes.json();
      const userId = profile.userId;
      
      if (!userId) return;
      
      // Fetch profile files (restricted by profileId)
      const filesRes = await fetch(`/api/files?profileId=${profileId}`, { credentials: 'include' });
      if (!filesRes.ok) return;
      
      const files = await filesRes.json();
      
      // Filter for resume files - use 'kind' field if available, otherwise filter by mime/name
      const resumes = files.filter(f => {
        // If file has 'kind' field, use it (preferred method)
        if (f.kind) {
          return f.kind === 'resume';
        }
        
        // Otherwise, filter by MIME type or file extension
        const isPDF = f.mime?.includes('pdf') || f.name?.toLowerCase().endsWith('.pdf');
        const isDoc = f.mime?.includes('word') || 
                     f.mime?.includes('document') ||
                     f.name?.toLowerCase().endsWith('.doc') ||
                     f.name?.toLowerCase().endsWith('.docx') ||
                     f.name?.toLowerCase().endsWith('.txt') ||
                     f.name?.toLowerCase().endsWith('.rtf');
        
        return isPDF || isDoc;
      });
      
      // Populate dropdown
      if (resumes.length > 0) {
        // Clear existing options except the first two
        while (selectEl.options.length > 2) {
          selectEl.remove(2);
        }
        
        // Add resume options
        resumes.forEach(resume => {
          const option = document.createElement('option');
          option.value = resume.id;
          option.textContent = resume.name;
          // DO NOT auto-select - dropdown must always start with "Select a resume"
          selectEl.insertBefore(option, selectEl.options[1]); // Insert before "Upload new"
        });
        
        console.log(`[auto-populate] Loaded ${resumes.length} resume(s)`);
      }
    } catch (error) {
      console.error('[auto-populate] Error loading resume list:', error);
    }
  }
  
  // Load resume list on page load
  loadResumeList();
  
  // Create auto-populate button if not exists
  let autoPopBtn = section.querySelector('#btn-auto-populate');
  if (!autoPopBtn) {
    autoPopBtn = document.createElement('button');
    autoPopBtn.id = 'btn-auto-populate';
    autoPopBtn.type = 'button';
    autoPopBtn.className = 'flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-neutral-50 text-sm font-bold leading-normal tracking-wide mt-4';
    autoPopBtn.innerHTML = '<span class="truncate">Auto-populate from Resume</span>';
    section.appendChild(autoPopBtn);
  }

  // Clear all AI-managed fields before applying new resume data
  // This ensures clean replacement when user uploads a new resume
  function clearAIManagedFields() {
    console.log('[auto-populate] Clearing AI-managed fields before applying new data');
    
    // Clear text inputs that are AI-populated
    const aiFields = [
      '#input-name',
      '#input-title',
      '#input-profile-name',
      '#input-location',
      '#input-phone',
      '#input-email',
      '#input-bio'
    ];
    
    aiFields.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.value = '';
    });
    
    // Clear social links
    const socialLinksContainer = document.querySelector('#social-links-container');
    if (socialLinksContainer) socialLinksContainer.innerHTML = '';
    
    // Clear skills
    const skillsContainer = document.querySelector('#skills-container');
    if (skillsContainer) skillsContainer.innerHTML = '';
    
    // Clear highlights
    const highlightsContainer = document.querySelector('#highlights-container');
    if (highlightsContainer) highlightsContainer.innerHTML = '';
    
    // Clear experience
    const experienceContainer = document.querySelector('#experience-container');
    if (experienceContainer) experienceContainer.innerHTML = '';
    
    // Clear education
    const educationContainer = document.querySelector('#education-container');
    if (educationContainer) educationContainer.innerHTML = '';
  }

  // Toast notification (matches client-approved UI style)
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300';
    
    if (type === 'success') {
      toast.classList.add('bg-green-600', 'text-white');
      toast.innerHTML = `<span class="text-xl">✓</span><span>${message}</span>`;
    } else if (type === 'error') {
      toast.classList.add('bg-red-600', 'text-white');
      toast.innerHTML = `<span class="text-xl">✕</span><span>${message}</span>`;
    } else {
      toast.classList.add('bg-primary', 'text-white');
      toast.innerHTML = `<span class="text-xl">ℹ</span><span>${message}</span>`;
    }

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Loading state with progress bar
  function setLoading(loading) {
    if (loading) {
      // Add to global upload state (integrates with video/avatar upload system)
      if (typeof window.addActiveUpload === 'function') {
        window.addActiveUpload('resume');
      }
      
      // Disable auto-populate button
      autoPopBtn.disabled = true;
      autoPopBtn.classList.add('opacity-50', 'cursor-not-allowed');
      autoPopBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Analyzing Resume...</span>
      `;
      
      // Disable dropdown and browse button
      if (selectEl) {
        selectEl.disabled = true;
        selectEl.classList.add('opacity-50', 'cursor-not-allowed');
      }
      if (browseBtn) {
        browseBtn.disabled = true;
        browseBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      if (fileInput) {
        fileInput.disabled = true;
      }
      
      // Add progress bar to section
      showProgressBar();
      
      // Add pulsing animation to card
      section.classList.add('animate-pulse');
    } else {
      // Remove from global upload state
      if (typeof window.removeActiveUpload === 'function') {
        window.removeActiveUpload('resume');
      }
      
      // Re-enable auto-populate button
      autoPopBtn.disabled = false;
      autoPopBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      autoPopBtn.innerHTML = '<span class="truncate">Auto-populate from Resume</span>';
      
      // Re-enable dropdown and browse button
      if (selectEl) {
        selectEl.disabled = false;
        selectEl.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      if (browseBtn) {
        browseBtn.disabled = false;
        browseBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
      if (fileInput) {
        fileInput.disabled = false;
      }
      
      // Remove progress bar
      hideProgressBar();
      
      // Remove pulsing animation
      section.classList.remove('animate-pulse');
    }
  }
  
  // Show progress bar
  function showProgressBar() {
    // Remove existing progress bar if any
    hideProgressBar();
    
    const progressContainer = document.createElement('div');
    progressContainer.id = 'resume-parse-progress';
    progressContainer.className = 'mt-4 space-y-2';
    progressContainer.innerHTML = `
      <div class="flex items-center justify-between text-sm">
        <span class="text-primary dark:text-neutral-50 font-medium">Parsing resume...</span>
        <span id="progress-percentage" class="text-primary dark:text-neutral-50">0%</span>
      </div>
      <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
        <div id="progress-bar-fill" class="bg-primary h-2 rounded-full transition-all duration-300 ease-out" style="width: 0%"></div>
      </div>
      <p class="text-xs text-neutral-500 dark:text-neutral-400">Please wait while we analyze your resume...</p>
    `;
    
    section.appendChild(progressContainer);
    
    // Animate progress bar
    animateProgressBar();
  }
  
  // Hide progress bar
  function hideProgressBar() {
    const progressContainer = document.getElementById('resume-parse-progress');
    if (progressContainer) {
      progressContainer.remove();
    }
    
    // Clear animation interval
    if (window.progressInterval) {
      clearInterval(window.progressInterval);
      window.progressInterval = null;
    }
  }
  
  // Animate progress bar (simulated progress)
  function animateProgressBar() {
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    
    if (!progressBarFill || !progressPercentage) return;
    
    let progress = 0;
    const maxProgress = 90; // Don't go to 100% until actually complete
    
    // Clear any existing interval
    if (window.progressInterval) {
      clearInterval(window.progressInterval);
    }
    
    window.progressInterval = setInterval(() => {
      if (progress < maxProgress) {
        // Slow down as we approach max
        const increment = progress < 30 ? 5 : progress < 60 ? 3 : 1;
        progress = Math.min(progress + increment, maxProgress);
        
        progressBarFill.style.width = `${progress}%`;
        progressPercentage.textContent = `${progress}%`;
      }
    }, 200);
  }
  
  // Complete progress bar (jump to 100%)
  function completeProgressBar() {
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    
    if (progressBarFill && progressPercentage) {
      progressBarFill.style.width = '100%';
      progressPercentage.textContent = '100%';
      
      // Update text
      const progressContainer = document.getElementById('resume-parse-progress');
      if (progressContainer) {
        const statusText = progressContainer.querySelector('.text-primary.font-medium');
        if (statusText) {
          statusText.textContent = 'Resume parsed successfully!';
          statusText.classList.add('text-green-600', 'dark:text-green-400');
        }
      }
    }
    
    // Clear interval
    if (window.progressInterval) {
      clearInterval(window.progressInterval);
      window.progressInterval = null;
    }
    
    // Hide after a short delay
    setTimeout(() => {
      hideProgressBar();
    }, 1000);
  }

  // Apply parsed data to form fields
  function applyParsedData(profile) {
    console.log('[auto-populate] Applying parsed data:', profile);

    // CRITICAL: Clear all AI-managed fields BEFORE applying new data
    // This prevents mixed data from multiple resume uploads
    clearAIManagedFields();

    // Helper to set value and trigger events
    function setFieldValue(selector, value) {
      const el = document.querySelector(selector);
      if (el && value) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }

    // Name field
    setFieldValue('#input-name', profile.person?.name);

    // Title field
    setFieldValue('#input-title', profile.title);
    
    // Top-level Profile Name field - generate descriptive name
    // Format: "Name - Title" or just "Name" if no title
    let profileName = '';
    if (profile.person?.name && profile.title) {
      profileName = `${profile.person.name} - ${profile.title}`;
    } else if (profile.person?.name) {
      profileName = profile.person.name;
    } else if (profile.title) {
      profileName = profile.title;
    }
    setFieldValue('#input-profile-name', profileName);

    // Location field
    setFieldValue('#input-location', profile.location);

    // Phone field
    setFieldValue('#input-phone', profile.contact?.phone);

    // Email field
    setFieldValue('#input-email', profile.contact?.email);

    // Bio/Summary field
    setFieldValue('#input-bio', profile.about);

    // Social Links - use the new dynamic system
    if (profile.social) {
      if (Array.isArray(profile.social)) {
        profile.social.forEach(link => {
          window.dispatchEvent(new CustomEvent('add-social-link', { detail: { data: link } }));
        });
      } else {
        // Handle object format from parser
        const socialMap = {
          linkedin: 'linkedin',
          github: 'github',
          website: 'website',
          portfolio: 'website',
          twitter: 'twitter',
          instagram: 'instagram',
          youtube: 'youtube',
          facebook: 'facebook',
          tiktok: 'tiktok'
        };

        Object.entries(profile.social).forEach(([key, value]) => {
          if (value && socialMap[key.toLowerCase()]) {
             window.dispatchEvent(new CustomEvent('add-social-link', { 
               detail: { 
                 data: { icon: socialMap[key.toLowerCase()], url: value } 
               } 
             }));
          } else if (value) {
            // Fallback for unknown keys to "Other"
            window.dispatchEvent(new CustomEvent('add-social-link', { 
               detail: { 
                 data: { icon: 'other', url: value } 
               } 
             }));
          }
        });
      }
    }

    // Highlights - use the new dynamic system
    if (profile.highlights && profile.highlights.length > 0) {
      const highlightTexts = profile.highlights.map(h => typeof h === 'string' ? h : h.text).filter(Boolean);
      highlightTexts.forEach(text => {
        // Trigger the add highlight function from profile_edit.bind.js
        const event = new CustomEvent('add-highlight', { detail: { text } });
        window.dispatchEvent(event);
      });
    }
    
    // Skills - use the new dynamic system
    if (profile.skills && profile.skills.length > 0) {
      profile.skills.forEach(skill => {
        const event = new CustomEvent('add-skill', { detail: { skill } });
        window.dispatchEvent(event);
      });
    }
    
    // Experience - use the new dynamic system
    if (profile.experience && profile.experience.length > 0) {
      profile.experience.forEach(exp => {
        const event = new CustomEvent('add-experience', { detail: { data: exp } });
        window.dispatchEvent(event);
      });
    }
    
    // Education - use the new dynamic system
    if (profile.education && profile.education.length > 0) {
      profile.education.forEach(edu => {
        const event = new CustomEvent('add-education', { detail: { data: edu } });
        window.dispatchEvent(event);
      });
    }

    // Emit event for other scripts
    window.dispatchEvent(new CustomEvent('resume:auto-populate:applied', {
      detail: { profileId, profile }
    }));
  }

  // Call the real ingest API
  // resumeFileId is optional - if provided, parse that specific resume
  // if not provided, use the profile's default resumeFileId
  async function callIngestAPI(resumeFileId = null) {
    setLoading(true);
    
    try {
      const body = resumeFileId ? { resumeFileId } : {};
      
      const response = await fetch(`/api/profiles/${profileId}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'We could not parse your resume. Please fill your profile manually.');
      }

      if (data.populated && data.profile) {
        // Complete progress bar before applying data
        completeProgressBar();
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        applyParsedData(data.profile);
        
        // Show success message with parsed fields count
        const fieldsCount = Object.values(data.parsedFields || {}).filter(v => v === true || v > 0).length;
        showToast(`Resume parsed! ${fieldsCount} fields auto-filled.`, 'success');
      } else {
        // Parsing succeeded but returned no data - show error and keep fields empty
        window.showErrorModal('We could not parse your resume. Please fill your profile manually.');
      }
    } catch (error) {
      console.error('[auto-populate] Error:', error);
      // Show the inline error message - fields remain empty
      window.showErrorModal('We could not parse your resume. Please fill your profile manually.');
    } finally {
      setLoading(false);
    }
  }

  // Handle file upload - upload first, then parse
  async function handleFileUpload(file) {
    if (!file) return;
    
    // Check file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      window.showErrorModal('Please upload a PDF file');
      return;
    }

    setLoading(true);
    showToast('Uploading resume...', 'info');

    try {
      // Upload the file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`/api/upload/resume/${profileId}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      showToast('Resume uploaded! Analyzing...', 'info');

      // Reload resume list to show the newly uploaded resume
      await loadResumeList();

      // Now call ingest API with the NEW file ID
      // This ensures we parse the file we just uploaded, even if it wasn't set as the profile's main resume
      if (uploadData.file && uploadData.file.id) {
        console.log('[auto-populate] Parsing newly uploaded file:', uploadData.file.id);
        await callIngestAPI(uploadData.file.id);
      } else {
        await callIngestAPI();
      }

    } catch (error) {
      console.error('[auto-populate] Upload error:', error);
      window.showErrorModal(error.message || 'Upload failed');
      setLoading(false);
    }
  }

  // Event handlers — parse selected resume when one is chosen; otherwise same as Browse
  autoPopBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const v = selectEl?.value;
    if (v && v !== 'add_new') {
      await callIngestAPI(v);
    } else if (fileInput) {
      fileInput.click();
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleFileUpload(file);
        e.target.value = ''; // Reset input
      }
    });
  }

  // Dropdown and browse button handlers already set up at the top of the file

  // Removed duplicate loadExistingResumes() function
  // The correct loadResumeList() function is already called above
  
  console.log('[auto-populate] Initialized for profile:', profileId);
})();
