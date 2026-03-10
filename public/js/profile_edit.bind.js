// public/js/profile_edit.bind.js
// Handles ALL UI interactions for profile_edit.html
// - Save/Share buttons
// - Skills add/remove
// - Experience/Education add/remove
// - Avatar/Video upload
// - Highlights add/remove
// - Availability interactions

(function initProfileEdit() {
  let currentProfileId = null;
  let currentUserId = null;
  let currentAvailability = createDefaultAvailability();
  let activePlanLimits = null;
  
  // Get profile ID from URL
  const params = new URLSearchParams(window.location.search);
  currentProfileId = params.get('id');
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.profile-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'profile-toast fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300';
    
    const colors = {
      success: 'bg-green-600 text-white',
      error: 'bg-red-600 text-white',
      info: 'bg-blue-600 text-white'
    };
    toast.classList.add(...(colors[type] || colors.info).split(' '));
    
    const icons = {
      success: 'check_circle',
      error: 'error',
      info: 'info'
    };
    toast.innerHTML = `<span class="material-symbols-outlined">${icons[type] || icons.info}</span><span>${message}</span>`;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Error Modal Logic handled by ui-utils.js

  function createDefaultAvailability() {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const weekly = {};
    days.forEach(d => {
      weekly[d] = { enabled: false, blocks: [] };
    });
    return {
      timezone: 'UTC -05:00 Eastern Time (US & Canada)',
      weekly,
      rules: {
        minNoticeHours: 24,
        windowDays: 60,
        durationMinutes: 30, // Was incrementsMinutes
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        dailyCap: 5
      }
    };
  }

  // ============================================================================
  // UPLOAD STATE MANAGEMENT
  // ============================================================================
  
  let activeUploads = new Set(); // Track active uploads
  
  function addActiveUpload(uploadType) {
    activeUploads.add(uploadType);
    updateSaveButtonState();
  }
  
  function removeActiveUpload(uploadType) {
    activeUploads.delete(uploadType);
    updateSaveButtonState();
  }
  
  function updateSaveButtonState() {
    const saveButtons = [
      document.getElementById('btn-save-profile'),
      document.getElementById('btn-save-bottom'),
      document.getElementById('btnSaveReturn') // Enhanced profile edit page
    ];
    
    const hasActiveUploads = activeUploads.size > 0;
    
    saveButtons.forEach(btn => {
      if (btn) {
        if (hasActiveUploads) {
          btn.disabled = true;
          btn.classList.add('opacity-50', 'cursor-not-allowed');
          btn.classList.remove('cursor-pointer');
          
          // Store original content if not already stored
          if (!btn.dataset.originalContent) {
            btn.dataset.originalContent = btn.innerHTML;
          }
          
          // Show upload status
          const uploadTypes = Array.from(activeUploads);
          const uploadText = uploadTypes.length === 1 
            ? `Uploading ${uploadTypes[0]}...` 
            : `Uploading ${uploadTypes.length} files...`;
          
          btn.innerHTML = `
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span class="truncate">${uploadText}</span>
            </div>
          `;
        } else {
          btn.disabled = false;
          btn.classList.remove('opacity-50', 'cursor-not-allowed');
          btn.classList.add('cursor-pointer');
          
          // Restore original content
          if (btn.dataset.originalContent) {
            btn.innerHTML = btn.dataset.originalContent;
            delete btn.dataset.originalContent;
          }
        }
      }
    });
  }
  
  // Legacy functions for backward compatibility
  function disableSaveButtons() {
    addActiveUpload('files');
  }
  
  function enableSaveButtons() {
    removeActiveUpload('files');
  }

  // ============================================================================
  // LOADING STATE MANAGEMENT
  // ============================================================================
  
  function showPageLoading() {
    // Use existing enterprise loader from HTML if available
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.classList.remove('hidden');
      return;
    }

    // Fallback: Create page loading overlay if initial-loader is missing
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'page-loading-overlay';
    loadingOverlay.className = 'fixed inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm z-50 flex items-center justify-center';
    loadingOverlay.innerHTML = `
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-lg font-medium text-foreground-light dark:text-foreground-dark">Loading Profile...</p>
        <p class="text-sm text-muted-light dark:text-muted-dark mt-2">Please wait while we fetch your data</p>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
  }
  
  function hidePageLoading() {
    // Handle initial enterprise loader
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) {
      initialLoader.style.opacity = '0';
      setTimeout(() => {
        if (initialLoader.parentNode) initialLoader.parentNode.removeChild(initialLoader);
      }, 500);
    }

    // Handle JS-created overlay
    const loadingOverlay = document.getElementById('page-loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => loadingOverlay.remove(), 300);
    }
  }
  
  function showSaveLoading() {
    const saveButtons = [
      document.getElementById('btn-save-profile'),
      document.getElementById('btn-save-bottom')
    ];
    
    saveButtons.forEach(btn => {
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-75');
        
        // Store original content
        if (!btn.dataset.originalContent) {
          btn.dataset.originalContent = btn.innerHTML;
        }
        
        // Update button content to show saving state
        btn.innerHTML = `
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span class="truncate">Saving Profile...</span>
          </div>
        `;
      }
    });
  }
  
  function hideSaveLoading() {
    const saveButtons = [
      document.getElementById('btn-save-profile'),
      document.getElementById('btn-save-bottom')
    ];
    
    saveButtons.forEach(btn => {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-75');
        
        // Restore original content
        if (btn.dataset.originalContent) {
          btn.innerHTML = btn.dataset.originalContent;
          delete btn.dataset.originalContent;
        }
      }
    });
  }

  // ============================================================================
  // PROFILE LOADING & REHYDRATION
  // ============================================================================
  
  async function loadProfile() {
    if (!currentProfileId) {
      console.warn('[profile-edit] No profile ID to load');
      hidePageLoading();
      return;
    }
    
    try {
      console.log('[profile-edit] Loading profile:', currentProfileId);
      const res = await fetch(`/api/profiles/${currentProfileId}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const profile = await res.json();
        console.log('[profile-edit] Profile loaded successfully');
        
        if (profile.userId) {
          currentUserId = profile.userId;
        }

        populateProfile(profile);
        
        // Load resume and attachments AFTER profile is loaded
        await loadUserFiles();

        // Load storage limits
        if (profile.userId) {
          await loadStorageLimits(profile.userId);
        }
        
        // Hide loading state after everything is loaded
        hidePageLoading();
      } else if (res.status === 404) {
        console.warn('[profile-edit] Profile not found');
        hidePageLoading();
      } else {
        console.error('[profile-edit] Failed to load profile:', res.status);
        hidePageLoading();
        showErrorModal('Failed to load profile data');
      }
    } catch (error) {
      console.error('[profile-edit] Error loading profile:', error);
      hidePageLoading();
      showErrorModal('Error loading profile');
    }
  }
  
  async function loadStorageLimits(userId) {
    try {
      const res = await fetch(`/api/profiles/status/${userId}`, { credentials: 'include' });
      if (res.ok) {
        const status = await res.json();
        if (status.storage) {
          activePlanLimits = status.storage;
          updateStorageUI();
        }
      }
    } catch (e) {
      console.error('[profile-edit] Failed to load storage limits:', e);
    }
  }

  function updateStorageUI() {
    if (!activePlanLimits) return;

    // Helper to format bytes
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Update Video Storage UI
    const videoUsed = activePlanLimits.videoStorageUsedBytes || 0;
    const videoLimit = activePlanLimits.videoStorageLimitBytes;
    const videoText = document.getElementById('video-storage-text');
    const videoBar = document.getElementById('video-storage-bar');
    
    if (videoLimit !== null && videoText && videoBar) {
      const percent = Math.min(100, (videoUsed / videoLimit) * 100);
      videoText.textContent = `${formatBytes(videoUsed)} / ${formatBytes(videoLimit)}`;
      videoBar.style.width = `${percent}%`;
      
      // Color coding
      videoBar.classList.remove('bg-primary', 'bg-red-500', 'bg-yellow-500');
      if (percent > 90) {
        videoBar.classList.add('bg-red-500');
      } else if (percent > 75) {
        videoBar.classList.add('bg-yellow-500');
      } else {
        videoBar.classList.add('bg-primary');
      }
    }

    // Update Document Storage UI
    const docUsed = activePlanLimits.docStorageUsedBytes || 0;
    const docLimit = activePlanLimits.docStorageLimitBytes;
    const docText = document.getElementById('doc-storage-text');
    const docBar = document.getElementById('doc-storage-bar');

    if (docLimit !== null && docText && docBar) {
      const percent = Math.min(100, (docUsed / docLimit) * 100);
      docText.textContent = `${formatBytes(docUsed)} / ${formatBytes(docLimit)}`;
      docBar.style.width = `${percent}%`;
      
      // Color coding
      docBar.classList.remove('bg-primary', 'bg-red-500', 'bg-yellow-500');
      if (percent > 90) {
        docBar.classList.add('bg-red-500');
      } else if (percent > 75) {
        docBar.classList.add('bg-yellow-500');
      } else {
        docBar.classList.add('bg-primary');
      }
    }
    
    // Clean up old dynamic elements if they exist
    const oldVideoInfo = document.getElementById('video-storage-info');
    if (oldVideoInfo) oldVideoInfo.remove();
    const oldDocInfo = document.getElementById('doc-storage-info');
    if (oldDocInfo) oldDocInfo.remove();
  }

  // ============================================================================
  // SOCIAL LINKS MANAGEMENT
  // ============================================================================

  function getSocialIcon(type) {
    const symbolMap = {
      linkedin: 'work',
      github: 'code',
      website: 'public',
      twitter: 'chat_bubble',
      instagram: 'photo_camera',
      youtube: 'smart_display',
      facebook: 'groups',
      tiktok: 'music_note',
      other: 'public'
    };
    return symbolMap[type] || 'link';
  }

  function addSocialLinkRow(data = null) {
    const container = document.getElementById('social-links-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 group animate-fadeIn';
    
    const platformOptions = [
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'github', label: 'GitHub' },
      { value: 'website', label: 'Website/Portfolio' },
      { value: 'twitter', label: 'Twitter/X' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'other', label: 'Other' }
    ];

    const selectedPlatform = data?.icon || 'website';
    const urlValue = data?.url || '';

    row.innerHTML = `
      <div class="flex-shrink-0">
        <div class="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
           <span class="material-symbols-outlined social-icon-preview">${getSocialIcon(selectedPlatform)}</span>
        </div>
      </div>
      <div class="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="sm:col-span-1">
          <select class="social-platform-select w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all">
            ${platformOptions.map(opt => `
              <option value="${opt.value}" ${opt.value === selectedPlatform ? 'selected' : ''}>${opt.label}</option>
            `).join('')}
          </select>
        </div>
        <div class="sm:col-span-2">
          <input type="text" 
            class="social-url-input w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            placeholder="https://..."
            value="${urlValue}"
          >
        </div>
      </div>
      <button type="button" class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all btn-remove-social">
        <span class="material-symbols-outlined text-xl">delete</span>
      </button>
    `;

    // Add event listeners
    const select = row.querySelector('.social-platform-select');
    const iconPreview = row.querySelector('.social-icon-preview');
    
    select.addEventListener('change', (e) => {
      iconPreview.textContent = getSocialIcon(e.target.value);
    });

    const removeBtn = row.querySelector('.btn-remove-social');
    removeBtn.addEventListener('click', () => {
      row.remove();
    });

    container.appendChild(row);
  }

  function renderSocialLinksEditor(profile) {
    const container = document.getElementById('social-links-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Check for new array format
    if (Array.isArray(profile.social)) {
      profile.social.forEach(link => {
        addSocialLinkRow(link);
      });
    } 
    // Handle legacy object format
    else if (profile.social) {
      if (profile.social.linkedin) {
        addSocialLinkRow({ icon: 'linkedin', url: profile.social.linkedin });
      }
      if (profile.social.github) {
        addSocialLinkRow({ icon: 'github', url: profile.social.github });
      }
      if (profile.social.website) {
        addSocialLinkRow({ icon: 'website', url: profile.social.website });
      }
    }
  }

  function initSocialLinks() {
    const addBtn = document.getElementById('btn-add-social-link');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addSocialLinkRow();
      });
    }
  }

  function populateProfile(profile) {
    console.log('[profile-edit] Populating profile data');
    
    // Profile name (top-level field)
    if (profile.profileName || profile.profile_name) {
      const el = document.getElementById('input-profile-name');
      if (el) el.value = profile.profileName || profile.profile_name;
    }
    
    // Basic fields
    if (profile.person?.name) {
      const el = document.getElementById('input-name');
      if (el) el.value = profile.person.name;
    }
    
    if (profile.title) {
      const el = document.getElementById('input-title');
      if (el) el.value = profile.title;
    }
    
    if (profile.location) {
      const el = document.getElementById('input-location');
      if (el) el.value = profile.location;
    }
    
    // Contact info
    if (profile.contact?.phone) {
      const el = document.getElementById('input-phone');
      if (el) el.value = profile.contact.phone;
    }
    
    if (profile.contact?.email) {
      const el = document.getElementById('input-email');
      if (el) el.value = profile.contact.email;
    }
    
    // Bio
    if (profile.about || profile.summary) {
      const el = document.getElementById('input-bio');
      if (el) el.value = profile.about || profile.summary;
    }
    
    // Social links (Dynamic)
    renderSocialLinksEditor(profile);
    
    // Avatar
    let avatarUrl = profile.person?.avatar_url;
    
    // WP01 Fix: Handle legacy default avatar URL stored in database
    if (avatarUrl && avatarUrl.includes('/uploads/default-avatar.jpeg')) {
      avatarUrl = '/defaults/default-avatar.jpeg';
    }

    if (avatarUrl) {
      const preview = document.getElementById('avatar-preview');
      if (preview) {
        preview.style.backgroundImage = `url(${avatarUrl})`;
        preview.innerHTML = ''; // Remove placeholder icon
      }
    }
    
    // Video - check both formats: profile.video_url (new snake_case) and legacy formats
    let videoUrl = profile.video_url || profile.videoUrl || profile.video?.url;
    
    // WP01 Fix: Handle legacy default video URL stored in database
    if (videoUrl && videoUrl.includes('/uploads/default-video.mp4')) {
      videoUrl = '/defaults/default-video.mp4';
    }

    if (videoUrl) {
      const videoSection = document.getElementById('video-section');
      if (videoSection) {
        // WP01 Enhancement: Check if this is a default video
        const isDefaultVideo = videoUrl.includes('/defaults/default-video.mp4');
        const sampleVideoLabel = isDefaultVideo ? `
          <div class="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium z-10">
            Sample Video
          </div>
        ` : '';
        
        // Replace placeholder with actual video player
        videoSection.innerHTML = `
          <div class="relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-video w-full">
            ${sampleVideoLabel}
            <video controls class="w-full h-full">
              <source src="${videoUrl}" type="video/mp4">
              <source src="${videoUrl}" type="video/webm">
              <source src="${videoUrl}" type="video/quicktime">
              Your browser does not support the video tag.
            </video>
            <button id="btn-change-video" class="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-neutral-800/90 hover:bg-white dark:hover:bg-neutral-800 rounded-lg shadow-lg text-sm font-medium">
              <span class="material-symbols-outlined text-xl">upload</span>
              <span>Change Video</span>
            </button>
            <input type="file" accept="video/*" class="hidden" id="video-file-input"/>
          </div>
        `;
        
        // Re-attach video upload handler
        const changeBtn = document.getElementById('btn-change-video');
        const input = document.getElementById('video-file-input');
        if (changeBtn && input) {
          changeBtn.addEventListener('click', () => input.click());
          input.addEventListener('change', handleVideoUpload);
        }
      }
    }
    
    // Thumbnail - check both formats
    const thumbnailUrl = profile.thumbnail_url || profile.thumbnailUrl;
    
    if (thumbnailUrl) {
      const thumbnailSection = document.getElementById('thumbnail-section');
      if (thumbnailSection) {
        thumbnailSection.innerHTML = `
          <h2 class="text-2xl font-bold leading-tight tracking-tight">Video Thumbnail</h2>
          <div class="relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-video w-full max-w-md mx-auto group">
            <img src="${thumbnailUrl}" alt="Video Thumbnail" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button id="btn-change-thumbnail" class="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg text-black text-sm font-medium transition-transform transform hover:scale-105">
                <span class="material-symbols-outlined text-xl">edit</span>
                <span>Change</span>
              </button>
            </div>
            <input type="file" accept="image/*" class="hidden" id="thumbnail-file-input"/>
          </div>
        `;
        
        // Re-attach handlers
        const changeBtn = document.getElementById('btn-change-thumbnail');
        const input = document.getElementById('thumbnail-file-input');
        if (changeBtn && input) {
          changeBtn.addEventListener('click', () => input.click());
          input.addEventListener('change', handleThumbnailUpload);
        }
      }
    }

    // Skills - clear and repopulate
    const skillsContainer = document.getElementById('skills-container');
    if (skillsContainer && profile.skills && profile.skills.length > 0) {
      skillsContainer.innerHTML = '';
      profile.skills.forEach(skill => {
        addSkillChip(skill);
      });
    }
    
    // Highlights - clear and repopulate
    const highlightsContainer = document.getElementById('highlights-container');
    if (highlightsContainer && profile.highlights && profile.highlights.length > 0) {
      highlightsContainer.innerHTML = '';
      profile.highlights.forEach(h => {
        const text = typeof h === 'string' ? h : h.text;
        if (text) addHighlightField(text);
      });
    }
    
    // Experience - clear and repopulate
    const experienceContainer = document.getElementById('experience-container');
    if (experienceContainer && profile.experience && profile.experience.length > 0) {
      experienceContainer.innerHTML = '';
      profile.experience.forEach(exp => {
        // Map old field names to new ones for backward compatibility
        const mappedExp = {
          company: exp.company || '',
          role: exp.role || exp.title || '', // Handle both 'role' and 'title'
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          description: exp.description || ''
        };
        console.log('[populateProfile] Experience mapping:', exp, '→', mappedExp);
        addExperienceBlock(mappedExp);
      });
    }
    
    // Education - clear and repopulate
    const educationContainer = document.getElementById('education-container');
    if (educationContainer && profile.education && profile.education.length > 0) {
      educationContainer.innerHTML = '';
      profile.education.forEach(edu => {
        // Map old field names to new ones for backward compatibility
        const mappedEdu = {
          institution: edu.institution || edu.school || '', // Handle both 'institution' and 'school'
          degree: edu.degree || '',
          field: edu.field || '',
          year: edu.year || edu.endDate || edu.startDate || '' // Handle various year formats
        };
        console.log('[populateProfile] Education mapping:', edu, '→', mappedEdu);
        addEducationBlock(mappedEdu);
      });
    }
    
    // Availability - reconstruct from data
    if (profile.availability) {
      currentAvailability = profile.availability;
      reconstructAvailability(profile.availability);
    }
    
    // NOTE: Resume and attachments are loaded separately by loadUserFiles()
    // which is called after populateProfile() completes
    
    console.log('[profile-edit] Profile population complete');
  }
  
  function reconstructAvailability(availability) {
    if (!availability) return;
    
    // Populate Rules
    if (availability.rules) {
      const r = availability.rules;
      
      const minNoticeEl = document.getElementById('min-notice');
      if (minNoticeEl) {
        // Handle "X hours" format or plain number
        const val = r.minNoticeHours || 24;
        // Try to find matching option, otherwise set value directly if it's a number
        const options = Array.from(minNoticeEl.options);
        const match = options.find(o => parseInt(o.value) === val || o.text.startsWith(val + ' '));
        if (match) minNoticeEl.value = match.value;
      }
      
      // Window is fixed 60, but good to ensure UI reflects it if we ever un-fix it
      // const windowEl = document.getElementById('window');
      // if (windowEl) windowEl.value = "60 days (Fixed)";
      
      const durationEl = document.getElementById('increments');
      if (durationEl) durationEl.value = r.durationMinutes || 30;
      
      const bufBeforeEl = document.getElementById('buffer-before');
      if (bufBeforeEl) bufBeforeEl.value = r.bufferBeforeMinutes || 0;
      
      const bufAfterEl = document.getElementById('buffer-after');
      if (bufAfterEl) bufAfterEl.value = r.bufferAfterMinutes || 0;
      
      const dailyCapEl = document.getElementById('daily-cap');
      if (dailyCapEl) dailyCapEl.value = r.dailyCap || 5;
    }
    
    // Populate Weekly
    if (availability.weekly) {
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      
      days.forEach(day => {
        const dayData = availability.weekly[day];
        if (!dayData) return;
        
        const checkbox = document.getElementById(day);
        if (checkbox) {
          checkbox.checked = dayData.enabled || false;
          toggleDay(day, dayData.enabled || false);
          
          // Capture blocks before clearing, in case dayData references currentAvailability
          const blocksToLoad = [...(dayData.blocks || [])];

          // Clear existing blocks to prevent duplication
          currentAvailability.weekly[day].blocks = [];
          
          // Find container to clear - use closest('.p-4') to be safe
          const dayRow = checkbox.closest('.p-4');
          if (dayRow) {
            const blocksContainer = dayRow.querySelector('.flex-wrap');
            if (blocksContainer) blocksContainer.innerHTML = '';
          }
          
          // Add time blocks
          if (blocksToLoad.length > 0) {
            blocksToLoad.forEach(block => {
              addTimeBlock(day, block.start, block.end);
            });
          }
        }
      });
    }
  }

  // ============================================================================
  // SKILLS SECTION
  // ============================================================================
  
  function initSkills() {
    const container = document.getElementById('skills-container');
    const input = document.getElementById('input-new-skill');
    const addBtn = document.getElementById('btn-add-skill');
    
    if (!container || !input || !addBtn) return;
    
    // Add skill
    addBtn.addEventListener('click', () => {
      const skill = input.value.trim();
      if (!skill) return;
      
      addSkillChip(skill);
      input.value = '';
    });
    
    // Add on Enter key
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  }

  function addSkillChip(skill) {
    const container = document.getElementById('skills-container');
    if (!container) return;
    
    const chip = document.createElement('span');
    chip.className = 'bg-[#ededed] dark:bg-neutral-700 rounded-full px-3 py-1 text-sm flex items-center gap-2';
    chip.innerHTML = `
      ${skill}
      <button class="text-neutral-500 hover:text-primary skill-remove-btn">
        <span class="material-symbols-outlined text-base">close</span>
      </button>
    `;
    
    // Add remove handler
    chip.querySelector('.skill-remove-btn').addEventListener('click', () => {
      chip.remove();
    });
    
    container.appendChild(chip);
  }

  // ============================================================================
  // HIGHLIGHTS SECTION
  // ============================================================================
  
  function initHighlights() {
    const addBtn = document.getElementById('btn-add-highlight');
    if (!addBtn) return;
    
    addBtn.addEventListener('click', () => {
      addHighlightField();
    });
  }
  
  function addHighlightField(text = '') {
    const container = document.getElementById('highlights-container');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
      <textarea class="form-input flex-1 rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark p-3 text-sm min-h-[80px]" placeholder="Highlight">${text}</textarea>
      <button class="h-10 w-10 flex items-center justify-center rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 highlight-remove-btn">
        <span class="material-symbols-outlined">delete</span>
      </button>
    `;
    
    // Add remove handler
    div.querySelector('.highlight-remove-btn').addEventListener('click', () => {
      div.remove();
    });
    
    container.appendChild(div);
  }

  // ============================================================================
  // EXPERIENCE SECTION
  // ============================================================================
  
  function initExperience() {
    const addBtn = document.getElementById('btn-add-experience');
    if (!addBtn) return;
    
    addBtn.addEventListener('click', () => {
      addExperienceBlock();
    });
  }
  
  function addExperienceBlock(data = {}) {
    const container = document.getElementById('experience-container');
    if (!container) return;
    
    const block = document.createElement('div');
    block.className = 'p-4 border border-[#cccccc] dark:border-neutral-700 rounded-lg space-y-3';
    block.innerHTML = `
      <div class="flex justify-between items-start">
        <h3 class="font-semibold">Experience Entry</h3>
        <button class="text-neutral-500 hover:text-red-600 exp-remove-btn">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input type="text" placeholder="Company" value="${data.company || ''}" class="form-input rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-10 px-3 text-sm exp-company"/>
        <input type="text" placeholder="Role/Title" value="${data.role || ''}" class="form-input rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-10 px-3 text-sm exp-role"/>
        <input type="text" placeholder="Start Date (e.g. Jan 2020)" value="${data.startDate || ''}" class="form-input rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-10 px-3 text-sm exp-start"/>
        <input type="text" placeholder="End Date (e.g. Dec 2022 or Present)" value="${data.endDate || ''}" class="form-input rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-10 px-3 text-sm exp-end"/>
      </div>
      <textarea placeholder="Description" class="form-input w-full rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark p-3 text-sm min-h-[80px] exp-desc">${data.description || ''}</textarea>
    `;
    
    // Add remove handler
    block.querySelector('.exp-remove-btn').addEventListener('click', () => {
      block.remove();
    });
    
    container.appendChild(block);
  }

  // ============================================================================
  // EDUCATION SECTION
  // ============================================================================
  
  function initEducation() {
    const addBtn = document.getElementById('btn-add-education');
    if (!addBtn) return;
    
    addBtn.addEventListener('click', () => {
      addEducationBlock();
    });
  }
  
  function addEducationBlock(data = {}) {
    const container = document.getElementById('education-container');
    if (!container) return;
    
    const block = document.createElement('div');
    block.className = 'p-4 border border-[#cccccc] dark:border-neutral-700 rounded-lg space-y-3';
    block.innerHTML = `
      <div class="flex justify-between items-start">
        <h3 class="font-semibold">Education Entry</h3>
        <button class="text-neutral-500 hover:text-red-600 edu-remove-btn">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input type="text" placeholder="Institution" value="${data.institution || ''}" class="form-input rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-10 px-3 text-sm edu-institution"/>
        <input type="text" placeholder="Degree" value="${data.degree || ''}" class="form-input rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-10 px-3 text-sm edu-degree"/>
        <input type="text" placeholder="Field of Study" value="${data.field || ''}" class="form-input rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-10 px-3 text-sm edu-field"/>
        <input type="text" placeholder="Year (e.g. 2018)" value="${data.year || ''}" class="form-input rounded-lg border-[#cccccc] dark:border-neutral-700 bg-background-light dark:bg-background-dark h-10 px-3 text-sm edu-year"/>
      </div>
    `;
    
    // Add remove handler
    block.querySelector('.edu-remove-btn').addEventListener('click', () => {
      block.remove();
    });
    
    container.appendChild(block);
  }

  // ============================================================================
  // AVATAR UPLOAD
  // ============================================================================
  
  function initAvatar() {
    const btn = document.getElementById('btn-upload-avatar');
    const input = document.getElementById('avatar-file-input');
    const preview = document.getElementById('avatar-preview');
    
    if (!btn || !input || !preview) return;
    
    btn.addEventListener('click', () => {
      input.click();
    });
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Validate image
      if (!file.type.startsWith('image/')) {
        showErrorModal('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        showErrorModal('Image file too large. Maximum size is 5MB.');
        return;
      }
      
      // Store original state
      const originalContent = preview.innerHTML;
      const originalBackground = preview.style.backgroundImage;
      
      // Create progress container below the avatar
      const avatarContainer = preview.parentElement;
      const progressContainer = document.createElement('div');
      progressContainer.id = 'avatar-progress-container';
      progressContainer.className = 'mt-3 p-3 border border-[#cccccc] dark:border-neutral-700 rounded-lg bg-background-light dark:bg-background-dark';
      progressContainer.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="relative">
            <span class="material-symbols-outlined text-2xl text-primary dark:text-neutral-50 animate-pulse">person</span>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          </div>
          <div class="flex-1 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-medium text-primary dark:text-neutral-50">${file.name}</span>
              <span class="text-sm text-neutral-600 dark:text-neutral-400">${Math.round(file.size / 1024)}KB</span>
            </div>
            <div class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span class="text-primary dark:text-neutral-50 font-medium">Uploading Avatar...</span>
                <span id="avatar-progress-text" class="text-neutral-600 dark:text-neutral-400">0%</span>
              </div>
              <div class="w-full bg-neutral-300 dark:bg-neutral-600 rounded-full h-2">
                <div id="avatar-progress-bar" class="bg-primary h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Uploading to Cloudinary...
              </p>
            </div>
          </div>
        </div>
      `;
      
      // Insert progress container after the upload button
      const uploadBtn = avatarContainer.querySelector('#btn-upload-avatar');
      uploadBtn.after(progressContainer);
      
      // Show preview in avatar (without overlay mess)
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.style.backgroundImage = `url(${e.target.result})`;
        preview.innerHTML = ''; // Clear placeholder icon
      };
      reader.readAsDataURL(file);
      
      // Simulate progress (since we can't track real progress with fetch)
      let progress = 0;
      const progressBar = document.getElementById('avatar-progress-bar');
      const progressText = document.getElementById('avatar-progress-text');
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90; // Stop at 90% until upload completes
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
        }
        if (progressText) {
          progressText.textContent = `${Math.round(progress)}%`;
        }
      }, 120);
      
      // Upload to server
      if (currentProfileId) {
        // Add avatar to active uploads
        addActiveUpload('avatar');
        
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const res = await fetch(`/api/upload/avatar/${currentProfileId}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });
          
          // Clear progress interval
          clearInterval(progressInterval);
          
          if (res.ok) {
            const data = await res.json();
            
            // Complete progress bar
            if (progressBar) {
              progressBar.style.width = '100%';
            }
            if (progressText) {
              progressText.textContent = '100%';
            }
            
            // Brief success state
            setTimeout(() => {
              // Update preview with server URL
              if (data.url) {
                preview.style.backgroundImage = `url(${data.url})`;
                preview.innerHTML = ''; // Remove any content
              }
              
              // Remove progress container
              progressContainer.remove();
              
              showToast('Avatar uploaded successfully', 'success');
              // Remove avatar from active uploads
              removeActiveUpload('avatar');
            }, 500);
          } else {
            const errorData = await res.json().catch(() => ({}));
            const errorMessage = errorData.error || 'Failed to upload avatar';
            
            // Show error state in progress container
            progressContainer.innerHTML = `
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-2xl text-red-500">error</span>
                <div class="flex-1 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-red-700 dark:text-red-300">Upload Failed</span>
                    <span class="text-sm text-red-600 dark:text-red-400">${file.name}</span>
                  </div>
                  <p class="text-sm text-red-600 dark:text-red-400">${errorMessage}</p>
                  <button id="btn-retry-avatar" class="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium">
                    <span class="material-symbols-outlined text-sm">refresh</span>
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            `;
            
            // Add retry handler
            const retryBtn = document.getElementById('btn-retry-avatar');
            if (retryBtn) {
              retryBtn.addEventListener('click', () => {
                // Restore original state
                preview.style.backgroundImage = originalBackground;
                preview.innerHTML = originalContent;
                progressContainer.remove();
              });
            }
            
            showErrorModal(errorMessage);
            // Remove avatar from active uploads after error
            removeActiveUpload('avatar');
          }
        } catch (error) {
          clearInterval(progressInterval);
          console.error('[avatar] Upload error:', error);
          
          // Show error state in progress container
          progressContainer.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-2xl text-red-500">error</span>
              <div class="flex-1 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-red-700 dark:text-red-300">Upload Failed</span>
                  <span class="text-sm text-red-600 dark:text-red-400">${file.name}</span>
                </div>
                <p class="text-sm text-red-600 dark:text-red-400">Network error occurred</p>
                <button id="btn-retry-avatar" class="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium">
                  <span class="material-symbols-outlined text-sm">refresh</span>
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          `;
          
          // Add retry handler
          const retryBtn = document.getElementById('btn-retry-avatar');
          if (retryBtn) {
            retryBtn.addEventListener('click', () => {
              // Restore original state
              preview.style.backgroundImage = originalBackground;
              preview.innerHTML = originalContent;
              progressContainer.remove();
            });
          }
          
          showErrorModal('Failed to upload avatar');
          // Remove avatar from active uploads after error
          removeActiveUpload('avatar');
        }
      }
    });
  }

  // ============================================================================
  // VIDEO UPLOAD (Simple - no auto-populate)
  // ============================================================================
  
  async function handleVideoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate video
    if (!file.type.startsWith('video/')) {
      showErrorModal('Please select a video file');
      return;
    }
    
    // Validate file size
    const maxSize = activePlanLimits?.videoStorageLimitBytes || 100 * 1024 * 1024; // Use plan limit or default 100MB
    if (file.size > maxSize) {
      showErrorModal(`Video file too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
      return;
    }

    // Validate duration if limit exists
    if (activePlanLimits?.maxInterviewLengthSeconds) {
      try {
        const duration = await new Promise((resolve, reject) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve(video.duration);
          };
          video.onerror = () => reject(new Error('Invalid video file'));
          video.src = URL.createObjectURL(file);
        });

        if (duration > activePlanLimits.maxInterviewLengthSeconds) {
          showErrorModal(`Video too long. Maximum duration is ${activePlanLimits.maxInterviewLengthSeconds} seconds.`);
          return;
        }
      } catch (e) {
        console.error('[video] Duration check failed:', e);
        showErrorModal('Could not verify video duration');
        return;
      }
    }
    
    // Upload to server with loading states
    if (currentProfileId) {
      const videoSection = document.getElementById('video-section');
      if (!videoSection) return;
      
      // Add video to active uploads
      addActiveUpload('video');
      
      try {
        // Show loading state with progress
        videoSection.innerHTML = `
          <div class="relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-video w-full flex items-center justify-center">
            <div class="text-center space-y-4">
              <!-- Animated upload icon -->
              <div class="relative">
                <span class="material-symbols-outlined text-6xl text-primary dark:text-neutral-50 animate-pulse">cloud_upload</span>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              </div>
              
              <!-- Upload status -->
              <div class="space-y-2">
                <p class="text-lg font-medium text-primary dark:text-neutral-50">Uploading Video...</p>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">
                  ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)
                </p>
                
                <!-- Progress bar -->
                <div class="w-64 mx-auto bg-neutral-300 dark:bg-neutral-600 rounded-full h-2">
                  <div id="upload-progress" class="bg-primary h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
                
                <p class="text-xs text-neutral-500 dark:text-neutral-400">
                  Uploading to Cloudinary storage...
                </p>
              </div>
            </div>
          </div>
        `;
        
        // Simulate progress (since we can't track real progress with fetch)
        let progress = 0;
        const progressBar = document.getElementById('upload-progress');
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress > 90) progress = 90; // Stop at 90% until upload completes
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
          }
        }, 200);
        
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`/api/upload/video/${currentProfileId}`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        // Clear progress interval
        clearInterval(progressInterval);
        
        if (res.ok) {
          const data = await res.json();
          const videoUrl = data.video_url || data.videoUrl; // Support both formats
          
          // Complete progress bar
          if (progressBar) {
            progressBar.style.width = '100%';
          }
          
          // Brief success state
          setTimeout(() => {
            if (videoUrl) {
              // Replace section with video player
              videoSection.innerHTML = `
                <div class="relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-video w-full">
                  <video controls class="w-full h-full">
                    <source src="${videoUrl}" type="video/mp4">
                    <source src="${videoUrl}" type="video/webm">
                    <source src="${videoUrl}" type="video/quicktime">
                    Your browser does not support the video tag.
                  </video>
                  <button id="btn-change-video" class="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-neutral-800/90 hover:bg-white dark:hover:bg-neutral-800 rounded-lg shadow-lg text-sm font-medium">
                    <span class="material-symbols-outlined text-xl">upload</span>
                    <span>Change Video</span>
                  </button>
                  <input type="file" accept="video/*" class="hidden" id="video-file-input"/>
                </div>
              `;
              
              // Re-attach handlers
              const changeBtn = document.getElementById('btn-change-video');
              const input = document.getElementById('video-file-input');
              if (changeBtn && input) {
                changeBtn.addEventListener('click', () => input.click());
                input.addEventListener('change', handleVideoUpload);
              }
            }
            showToast('Video uploaded successfully', 'success');
            // Remove video from active uploads
            removeActiveUpload('video');

            // Refresh storage limits
            if (currentUserId) {
              loadStorageLimits(currentUserId);
            }
          }, 500);
        } else {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Failed to upload video';
          
          // Show error state
          videoSection.innerHTML = `
            <div class="relative bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg overflow-hidden aspect-video w-full flex items-center justify-center">
              <div class="text-center space-y-4">
                <span class="material-symbols-outlined text-6xl text-red-500">error</span>
                <div class="space-y-2">
                  <p class="text-lg font-medium text-red-700 dark:text-red-300">Upload Failed</p>
                  <p class="text-sm text-red-600 dark:text-red-400">${errorMessage}</p>
                  <button id="btn-retry-video" class="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium mx-auto">
                    <span class="material-symbols-outlined text-lg">refresh</span>
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            </div>
          `;
          
          // Add retry handler
          const retryBtn = document.getElementById('btn-retry-video');
          if (retryBtn) {
            retryBtn.addEventListener('click', () => {
              // Reset to upload state
              videoSection.innerHTML = `
                <div class="flex flex-col items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-lg p-8 aspect-video w-full">
                  <div class="flex flex-col items-center gap-4 text-center">
                    <span class="material-symbols-outlined text-6xl text-neutral-500 dark:text-neutral-400">videocam</span>
                    <p class="text-neutral-600 dark:text-neutral-300">Your video will appear here.</p>
                    <button id="btn-upload-video" class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 text-sm font-medium leading-normal gap-2">
                      <span class="material-symbols-outlined text-xl">upload</span>
                      <span class="truncate">Upload Video</span>
                    </button>
                    <input type="file" accept="video/*" class="hidden" id="video-file-input"/>
                  </div>
                </div>
              `;
              // Re-initialize video upload
              initVideo();
            });
          }
          
          showErrorModal(errorMessage);
          // Remove video from active uploads after error
          removeActiveUpload('video');
        }
      } catch (error) {
        clearInterval(progressInterval);
        console.error('[video] Upload error:', error);
        
        // Show error state
        videoSection.innerHTML = `
          <div class="relative bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg overflow-hidden aspect-video w-full flex items-center justify-center">
            <div class="text-center space-y-4">
              <span class="material-symbols-outlined text-6xl text-red-500">error</span>
              <div class="space-y-2">
                <p class="text-lg font-medium text-red-700 dark:text-red-300">Upload Failed</p>
                <p class="text-sm text-red-600 dark:text-red-400">Network error occurred</p>
                <button id="btn-retry-video" class="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium mx-auto">
                  <span class="material-symbols-outlined text-lg">refresh</span>
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          </div>
        `;
        
        showErrorModal('Failed to upload video');
        // Remove video from active uploads after error
        removeActiveUpload('video');
      }
    }
  }
  
  function initVideo() {
    const btn = document.getElementById('btn-upload-video');
    const input = document.getElementById('video-file-input');
    
    if (!btn || !input) return;
    
    btn.addEventListener('click', () => {
      input.click();
    });
    
    input.addEventListener('change', handleVideoUpload);
  }

  // ============================================================================
  // THUMBNAIL UPLOAD
  // ============================================================================

  async function handleThumbnailUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate image
    if (!file.type.startsWith('image/')) {
      showErrorModal('Please select an image file');
      return;
    }
    
    // Validate file size (same as avatar, usually 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showErrorModal('Thumbnail file too large. Maximum size is 5MB.');
      return;
    }

    // Upload to server with loading states
    if (currentProfileId) {
      const thumbnailSection = document.getElementById('thumbnail-section');
      if (!thumbnailSection) return;
      
      // Add thumbnail to active uploads
      addActiveUpload('thumbnail');
      
      try {
        // Show loading state
        const originalContent = thumbnailSection.innerHTML;
        thumbnailSection.innerHTML = `
          <div class="flex flex-col items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-lg p-8 aspect-video w-full max-w-md mx-auto">
            <div class="text-center space-y-4">
              <div class="relative">
                <span class="material-symbols-outlined text-6xl text-primary dark:text-neutral-50 animate-pulse">cloud_upload</span>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              </div>
              <p class="text-lg font-medium text-primary dark:text-neutral-50">Uploading Thumbnail...</p>
            </div>
          </div>
        `;
        
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`/api/upload/thumbnail/${currentProfileId}`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          const thumbnailUrl = data.thumbnail_url || data.thumbnailUrl;
          
          showToast('Thumbnail uploaded successfully', 'success');
          
          if (thumbnailUrl) {
            // Update UI with new thumbnail
            thumbnailSection.innerHTML = `
              <h2 class="text-2xl font-bold leading-tight tracking-tight">Video Thumbnail</h2>
              <div class="relative bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-video w-full max-w-md mx-auto group">
                <img src="${thumbnailUrl}" alt="Video Thumbnail" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button id="btn-change-thumbnail" class="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg text-black text-sm font-medium transition-transform transform hover:scale-105">
                    <span class="material-symbols-outlined text-xl">edit</span>
                    <span>Change</span>
                  </button>
                </div>
                <input type="file" accept="image/*" class="hidden" id="thumbnail-file-input"/>
              </div>
            `;
            
            // Re-attach handlers
            const changeBtn = document.getElementById('btn-change-thumbnail');
            const input = document.getElementById('thumbnail-file-input');
            if (changeBtn && input) {
              changeBtn.addEventListener('click', () => input.click());
              input.addEventListener('change', handleThumbnailUpload);
            }
          }
          
          removeActiveUpload('thumbnail');
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to upload thumbnail');
        }
      } catch (error) {
        console.error('[thumbnail] Upload error:', error);
        showErrorModal(error.message || 'Failed to upload thumbnail');
        
        // Restore original content on error
        // Note: Ideally we'd restore the exact previous state, but resetting to default upload state is safer than leaving broken UI
        thumbnailSection.innerHTML = `
          <h2 class="text-2xl font-bold leading-tight tracking-tight">Video Thumbnail</h2>
          <div class="flex flex-col items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-lg p-8 aspect-video w-full max-w-md mx-auto">
            <div class="flex flex-col items-center gap-4 text-center">
              <span class="material-symbols-outlined text-6xl text-neutral-500 dark:text-neutral-400">image</span>
              <p class="text-neutral-600 dark:text-neutral-300">Your video thumbnail will appear here.</p>
              <button id="btn-upload-thumbnail" class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 text-sm font-medium leading-normal gap-2">
                <span class="material-symbols-outlined text-xl">upload</span>
                <span class="truncate">Upload Thumbnail</span>
              </button>
              <input type="file" accept="image/*" class="hidden" id="thumbnail-file-input"/>
            </div>
          </div>
        `;
        initThumbnail(); // Re-bind events
        
        removeActiveUpload('thumbnail');
      }
    }
  }

  function initThumbnail() {
    const btn = document.getElementById('btn-upload-thumbnail');
    const input = document.getElementById('thumbnail-file-input');
    
    if (!btn || !input) return;
    
    btn.addEventListener('click', () => {
      input.click();
    });
    
    input.addEventListener('change', handleThumbnailUpload);
  }

  // ============================================================================
  // AVAILABILITY SECTION
  // ============================================================================
  
  function initAvailability() {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    
    // Day checkboxes
    days.forEach(day => {
      const checkbox = document.getElementById(day);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          toggleDay(day, e.target.checked);
        });
      }
    });
    
    // Add Block buttons - delegate event handling
    document.addEventListener('click', (e) => {
      if (e.target.closest('button')?.textContent.includes('Add Block')) {
        const dayRow = e.target.closest('.p-4');
        const dayCheckbox = dayRow?.querySelector('input[type="checkbox"]');
        if (dayCheckbox) {
          const day = dayCheckbox.id;
          addTimeBlock(day);
        }
      }
    });
    
    // Remove block buttons - delegate event handling
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('button');
      if (closeBtn && closeBtn.querySelector('.material-symbols-outlined')?.textContent === 'close') {
        const timeBlock = closeBtn.closest('.bg-\\[\\#ededed\\]');
        if (timeBlock && timeBlock.parentElement.classList.contains('flex-wrap')) {
          // Find which day this block belongs to
          const dayRow = timeBlock.closest('.p-4');
          const dayCheckbox = dayRow?.querySelector('input[type="checkbox"]');
          if (dayCheckbox) {
            const day = dayCheckbox.id;
            // Get the index of this block
            const blocksContainer = timeBlock.parentElement;
            const blockIndex = Array.from(blocksContainer.children).indexOf(timeBlock);
            // Remove from data
            if (currentAvailability.weekly[day].blocks) {
              currentAvailability.weekly[day].blocks.splice(blockIndex, 1);
            }
          }
          // Remove from DOM
          timeBlock.remove();
        }
      }
    });
    
    // Quick Actions
    initQuickActions();
    
    // Rules Bindings (Window, Duration, etc)
    initRulesBindings();
  }
  
  function initRulesBindings() {
    // 1. Window (Fixed 60)
    const winInput = document.getElementById('window');
    if (winInput) {
      // Ensure model is enforcing it
      currentAvailability.rules.windowDays = 60;
    }

    // 2. Duration (Reuse #increments)
    const durSelect = document.getElementById('increments');
    if (durSelect) {
      durSelect.addEventListener('change', (e) => {
        const val = parseInt(e.target.value) || 30;
        currentAvailability.rules.durationMinutes = val;
      });
    }

    // 3. Min Notice
    const noticeSelect = document.getElementById('min-notice');
    if (noticeSelect) {
      noticeSelect.addEventListener('change', (e) => {
        const val = parseInt(e.target.value) || 24;
        currentAvailability.rules.minNoticeHours = val;
      });
    }

    // 4. Daily Cap
    const capInput = document.getElementById('daily-cap');
    if (capInput) {
      capInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        currentAvailability.rules.dailyCap = isNaN(val) ? '' : val;
      });
    }
    
    // 5. Buffers
    const bufBefore = document.getElementById('buffer-before');
    if (bufBefore) {
       bufBefore.addEventListener('change', (e) => {
         currentAvailability.rules.bufferBeforeMinutes = parseInt(e.target.value) || 0;
       });
    }
    
    const bufAfter = document.getElementById('buffer-after');
    if (bufAfter) {
       bufAfter.addEventListener('change', (e) => {
         currentAvailability.rules.bufferAfterMinutes = parseInt(e.target.value) || 0;
       });
    }
  }
  
  function toggleDay(day, enabled) {
    currentAvailability.weekly[day].enabled = enabled;
    
    const dayRow = document.getElementById(day)?.closest('.p-4');
    if (!dayRow) return;
    
    // Find existing elements
    const existingBlocksContainer = dayRow.querySelector('.flex-wrap');
    
    // Look for our specific button, or fallback to text search if legacy
    let existingAddBtn = dayRow.querySelector('.add-block-btn');
    if (!existingAddBtn) {
       // Fallback: find any button that looks like it
       const buttons = dayRow.querySelectorAll('button');
       for (const b of buttons) {
         if (b.textContent.includes('Add Block')) {
           existingAddBtn = b;
           break;
         }
       }
    }
    
    const existingUnavailableText = dayRow.querySelector('.text-neutral-500');
    
    if (enabled) {
      if (existingUnavailableText && existingUnavailableText.textContent === 'Unavailable') {
        existingUnavailableText.remove();
      }
      
      let blocksContainer = existingBlocksContainer;
      if (!blocksContainer) {
        blocksContainer = document.createElement('div');
        blocksContainer.className = 'flex-grow flex flex-wrap gap-2';
        
        // Find where to insert it (after checkbox label)
        const label = dayRow.querySelector('label');
        if (label) {
          label.after(blocksContainer);
        } else {
          dayRow.appendChild(blocksContainer);
        }
      }
      
      // Check for Add Block button
      if (!existingAddBtn) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'add-block-btn flex items-center gap-1 text-sm font-medium text-primary dark:text-neutral-50 hover:text-primary/80 dark:hover:text-neutral-300';
        btn.innerHTML = '<span class="material-symbols-outlined text-lg">add</span><span>Add Block</span>';
        
        // Create button (event handling is done via delegation in initAvailability)
        dayRow.appendChild(btn);
      } else {
         // If button exists, ensure it has the listener? 
         // No, we assume if it exists it has the listener. 
         // BUT, if we are re-running toggleDay, we might be re-attaching listeners if we weren't careful.
         // In this code block, we ONLY create/attach if !existingAddBtn. So that seems safe.
      }
    } else {
      if (existingBlocksContainer) existingBlocksContainer.remove();
      if (existingAddBtn) existingAddBtn.remove();
      
      if (!existingUnavailableText || existingUnavailableText.textContent !== 'Unavailable') {
        const text = document.createElement('div');
        text.className = 'flex-grow text-neutral-500 dark:text-neutral-400 text-sm';
        text.textContent = 'Unavailable';
        
        // Insert after checkbox label
        const label = dayRow.querySelector('label');
        if (label) {
          label.after(text);
        } else {
          dayRow.appendChild(text);
        }
      }
      
      currentAvailability.weekly[day].blocks = [];
    }
  }

  function generateTimeOptions(selectedTime) {
    let options = '';
    const totalMinutes = 24 * 60;
    
    for (let i = 0; i < totalMinutes; i += 15) {
      const h = Math.floor(i / 60);
      const m = i % 60;
      
      const h24 = h.toString().padStart(2, '0');
      const mStr = m.toString().padStart(2, '0');
      const val = `${h24}:${mStr}`;
      
      const period = h >= 12 ? 'PM' : 'AM';
      let h12 = h % 12;
      if (h12 === 0) h12 = 12;
      
      const label = `${h12}:${mStr} ${period}`;
      const isSelected = val === selectedTime;
      
      options += `<option value="${val}" ${isSelected ? 'selected' : ''}>${label}</option>`;
    }
    
    // Handle custom times
    if (selectedTime && !options.includes(`value="${selectedTime}"`)) {
       const [h, m] = selectedTime.split(':').map(Number);
       if (!isNaN(h) && !isNaN(m)) {
          const period = h >= 12 ? 'PM' : 'AM';
          let h12 = h % 12;
          if (h12 === 0) h12 = 12;
          const mStr = m.toString().padStart(2, '0');
          const label = `${h12}:${mStr} ${period}`;
          options += `<option value="${selectedTime}" selected>${label}</option>`;
       }
    }
    
    return options;
  }

  function addTimeBlock(day, startTime = '09:00', endTime = '17:00') {
    const dayRow = document.getElementById(day)?.closest('.p-4');
    if (!dayRow) return;
    
    let blocksContainer = dayRow.querySelector('.flex-wrap');
    if (!blocksContainer) {
      blocksContainer = document.createElement('div');
      blocksContainer.className = 'flex-grow flex flex-wrap gap-2';
      
      const label = dayRow.querySelector('label');
      if (label) {
        label.after(blocksContainer);
      } else {
        const oldContainer = dayRow.querySelector('.flex-grow');
        if (oldContainer) {
           oldContainer.replaceWith(blocksContainer);
        } else {
           dayRow.appendChild(blocksContainer);
        }
      }
    }
    
    const block = document.createElement('div');
    block.className = 'flex items-center gap-2 bg-[#ededed] dark:bg-neutral-700 rounded-md px-2 py-1';
    block.innerHTML = `
      <select class="bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 cursor-pointer">
        ${generateTimeOptions(startTime)}
      </select>
      <span class="text-sm">-</span>
      <select class="bg-transparent text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 cursor-pointer">
        ${generateTimeOptions(endTime)}
      </select>
      <button type="button" class="text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-neutral-50 remove-block-btn">
        <span class="material-symbols-outlined text-base">close</span>
      </button>
    `;
    
    blocksContainer.appendChild(block);
    
    // Data sync
    if (!currentAvailability.weekly[day].blocks) {
      currentAvailability.weekly[day].blocks = [];
    }
    // Push data
    currentAvailability.weekly[day].blocks.push({ start: startTime, end: endTime });
    
    // Helpers
    const getBlockIndex = () => {
      return Array.from(blocksContainer.children).indexOf(block);
    };

    // Remove handler
    block.querySelector('.remove-block-btn').addEventListener('click', () => {
      const idx = getBlockIndex();
      if (idx !== -1) {
        currentAvailability.weekly[day].blocks.splice(idx, 1);
      }
      block.remove();
    });
    
    // Time change handlers
    const timeInputs = block.querySelectorAll('select');
    timeInputs[0].addEventListener('change', (e) => {
      const idx = getBlockIndex();
      if (idx !== -1) currentAvailability.weekly[day].blocks[idx].start = e.target.value;
    });
    timeInputs[1].addEventListener('change', (e) => {
      const idx = getBlockIndex();
      if (idx !== -1) currentAvailability.weekly[day].blocks[idx].end = e.target.value;
    });
  }
  
  function initQuickActions() {
    const quickActions = document.querySelectorAll('.space-y-2 button');
    
    quickActions.forEach(btn => {
      const text = btn.textContent.trim();
      
      if (text.includes('Copy daily hours')) {
        btn.addEventListener('click', () => {
          const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          let sourceDay = null;
          let sourceBlocks = [];
          
          for (const day of days) {
            const checkbox = document.getElementById(day);
            const enabled = checkbox?.checked;
            const blocks = currentAvailability?.weekly?.[day]?.blocks || [];
            if (enabled && blocks.length > 0) {
              sourceDay = day;
              sourceBlocks = blocks.map(b => ({ start: b.start, end: b.end }));
              break;
            }
          }
          
          if (!sourceDay || sourceBlocks.length === 0) {
            showToast('No blocks to copy', 'info');
            return;
          }
          
          days.forEach(day => {
            if (day !== sourceDay) {
              const checkbox = document.getElementById(day);
              if (checkbox?.checked) {
                const dayRow = checkbox.closest('.p-4');
                const container = dayRow?.querySelector('.flex-wrap');
                if (container) container.innerHTML = '';
                if (currentAvailability?.weekly?.[day]) {
                  currentAvailability.weekly[day].blocks = [];
                }
                
                sourceBlocks.forEach(block => {
                  addTimeBlock(day, block.start, block.end);
                });
              }
            }
          });
          
          showToast('Hours copied to all enabled days', 'success');
        });
      } else if (text.includes('Set all to unavailable')) {
        btn.addEventListener('click', () => {
          const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          days.forEach(day => {
            const checkbox = document.getElementById(day);
            if (checkbox) {
              checkbox.checked = false;
              toggleDay(day, false);
            }
          });
          showToast('All days set to unavailable', 'success');
        });
      } else if (text.includes('Clear all hours')) {
        btn.addEventListener('click', () => {
          const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          days.forEach(day => {
            const checkbox = document.getElementById(day);
            if (checkbox?.checked) {
              const dayRow = checkbox.closest('.p-4');
              const container = dayRow?.querySelector('.flex-wrap');
              if (container) container.innerHTML = '';
              currentAvailability.weekly[day].blocks = [];
            }
          });
          showToast('All hours cleared', 'success');
        });
      }
    });
  }

  // ============================================================================
  // DATA COLLECTION FOR SAVE
  // ============================================================================
  
  function collectFormData() {
    const getValue = (selector) => document.querySelector(selector)?.value?.trim() || '';
    
    // Collect skills
    const skills = Array.from(document.querySelectorAll('#skills-container span'))
      .map(chip => chip.textContent.trim().replace('close', '').trim())
      .filter(Boolean);
    
    // Collect highlights
    const highlights = Array.from(document.querySelectorAll('#highlights-container textarea'))
      .map(ta => ta.value.trim())
      .filter(Boolean)
      .map((text, i) => ({
        id: `hi_${i+1}`,
        text,
        pin: i < 3,
        order: i + 1
      }));
    
    // Collect experience
    const experience = Array.from(document.querySelectorAll('#experience-container > div')).map(block => ({
      company: block.querySelector('.exp-company')?.value || '',
      role: block.querySelector('.exp-role')?.value || '',
      startDate: block.querySelector('.exp-start')?.value || '',
      endDate: block.querySelector('.exp-end')?.value || '',
      description: block.querySelector('.exp-desc')?.value || ''
    })).filter(exp => exp.company || exp.role);
    
    // Collect education
    const education = Array.from(document.querySelectorAll('#education-container > div')).map(block => ({
      institution: block.querySelector('.edu-institution')?.value || '',
      degree: block.querySelector('.edu-degree')?.value || '',
      field: block.querySelector('.edu-field')?.value || '',
      year: block.querySelector('.edu-year')?.value || ''
    })).filter(edu => edu.institution || edu.degree);
    
    // Get avatar URL from preview if it exists
    const avatarPreview = document.getElementById('avatar-preview');
    const bgImage = avatarPreview?.style.backgroundImage || '';
    const avatarUrl = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1] || '';
    
    console.log('[collectFormData] Avatar preview bgImage:', bgImage);
    console.log('[collectFormData] Extracted avatarUrl:', avatarUrl);
    
    // Update availability rules from UI
    if (!currentAvailability.rules) currentAvailability.rules = {};
    
    currentAvailability.rules.minNoticeHours = parseInt(getValue('#min-notice') || '24', 10);
    currentAvailability.rules.windowDays = 60; // Enforced
    currentAvailability.rules.durationMinutes = parseInt(getValue('#increments') || '30', 10);
    // Sync top-level durationMinutes with rules
    currentAvailability.durationMinutes = currentAvailability.rules.durationMinutes;
    currentAvailability.rules.bufferBeforeMinutes = parseInt(getValue('#buffer-before') || '0', 10);
    currentAvailability.rules.bufferAfterMinutes = parseInt(getValue('#buffer-after') || '0', 10);
    currentAvailability.rules.dailyCap = parseInt(getValue('#daily-cap') || '5', 10);
    
    return {
      profileName: getValue('#input-profile-name'),
      person: { 
        name: getValue('#input-name'),
        avatar_url: avatarUrl
      },
      title: getValue('#input-title'),
      location: getValue('#input-location'),
      city: getValue('#input-location'),
      about: getValue('#input-bio'),
      contact: {
        phone: getValue('#input-phone'),
        email: getValue('#input-email')
      },
      social: Array.from(document.querySelectorAll('#social-links-container > div')).map(row => {
        const platform = row.querySelector('.social-platform-select')?.value;
        const url = row.querySelector('.social-url-input')?.value?.trim();
        
        if (!url) return null;
        
        return {
          name: platform.charAt(0).toUpperCase() + platform.slice(1),
          icon: platform,
          url: url
        };
      }).filter(Boolean),
      skills,
      highlights,
      experience,
      education,
      availability: currentAvailability
    };
  }

  // ============================================================================
  // RESUME & ATTACHMENTS UPLOAD (WP2)
  // ============================================================================
  
  async function loadUserFiles() {
    if (!currentProfileId) {
      console.warn('[files] No profile ID - cannot load files');
      return;
    }
    
    try {
      console.log('[files] Loading files for profile:', currentProfileId);
      
      // Get profile to access userId
      const profileRes = await fetch(`/api/profiles/${currentProfileId}`, { credentials: 'include' });
      if (!profileRes.ok) {
        console.error('[files] Failed to load profile');
        return;
      }
      
      const profile = await profileRes.json();
      const userId = profile.userId;
      
      if (!userId) {
        console.error('[files] No userId in profile');
        return;
      }
      
      console.log('[files] Fetching files for userId:', userId);
      
      // Fetch files for profile - WP Fix
      const filesRes = await fetch(`/api/files?profileId=${currentProfileId}`, { credentials: 'include' });
      if (!filesRes.ok) {
        console.error('[files] Failed to fetch files');
        return;
      }
      
      const allFiles = await filesRes.json();
      console.log('[files] Fetched', allFiles.length, 'files');
      
      // PHASE 3: Filter by kind AFTER user restriction
      const resumeFiles = allFiles.filter(f => f.kind === 'resume');
      const videoFiles = allFiles.filter(f => f.kind === 'video');
      const attachmentFiles = allFiles.filter(f => f.kind === 'attachment');
      
      console.log('[files] Categorized:', resumeFiles.length, 'resumes,', videoFiles.length, 'videos,', attachmentFiles.length, 'attachments');
      
      // Display only ONE resume (the active one from profile.resume_file_id)
      const resumeFileId = profile.resume_file_id || profile.resumeFileId; // Support both formats
      const activeResume = resumeFiles.find(f => f.id === resumeFileId);
      displayResumeFiles(activeResume ? [activeResume] : []);
      
      // Display all attachments
      displayAttachments(attachmentFiles);
      
      // Refresh storage limits if we have userId
      if (userId) {
        loadStorageLimits(userId);
      }
      
    } catch (error) {
      console.error('[files] Error loading files:', error);
    }
  }
  
  function displayResumeFiles(resumes) {
    console.log('[resume] displayResumeFiles called with:', resumes);
    const container = document.getElementById('resume-files-container');
    if (!container) {
      console.error('[resume] Container not found!');
      return;
    }
    
    // Resume section shows ONLY ONE active resume
    if (resumes.length === 0) {
      console.log('[resume] No resumes, showing empty state');
      container.innerHTML = '<p class="text-sm text-neutral-500 dark:text-neutral-400">No resume uploaded yet.</p>';
      return;
    }
    
    // Display only the first (active) resume
    const file = resumes[0];
    console.log('[resume] Displaying resume:', file);
    container.innerHTML = `
      <div class="flex items-center justify-between p-4 border border-[#cccccc] dark:border-neutral-700 rounded-lg" data-resume-card>
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-neutral-500">description</span>
          <span class="font-medium">${file.name}</span>
        </div>
        <button class="flex min-w-[40px] h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 delete-resume-btn" data-file-id="${file.id}">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `;
    
    // Attach delete handler
    const deleteBtn = container.querySelector('.delete-resume-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteFile(deleteBtn.dataset.fileId, 'resume'));
    }
    console.log('[resume] Resume card displayed');
  }
  
  function displayAttachments(attachments) {
    console.log('[attachments] displayAttachments called with:', attachments);
    const container = document.getElementById('attachments-container');
    if (!container) {
      console.error('[attachments] Container not found!');
      return;
    }
    
    if (attachments.length === 0) {
      console.log('[attachments] No attachments, showing empty state');
      container.innerHTML = '<p class="text-sm text-neutral-500 dark:text-neutral-400">No attachments uploaded yet.</p>';
      return;
    }
    
    console.log('[attachments] Displaying', attachments.length, 'attachments');
    container.innerHTML = attachments.map(file => `
      <div class="flex items-center justify-between p-4 border border-[#cccccc] dark:border-neutral-700 rounded-lg">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-neutral-500">description</span>
          <span class="font-medium">${file.name}</span>
        </div>
        <button class="flex min-w-[40px] h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 delete-attachment-btn" data-file-id="${file.id}">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    `).join('');
    
    // Attach delete handlers
    container.querySelectorAll('.delete-attachment-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteFile(btn.dataset.fileId, 'attachment'));
    });
    console.log('[attachments] Attachment cards displayed');
  }
  
  async function deleteFile(fileId, type) {
    if (!confirm(`Delete this ${type}?`)) return;
    
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`, 'success');
        
        // If deleting active resume or video, update profile to clear the reference
        if (type === 'resume' && currentProfileId) {
          await fetch(`/api/profiles/${currentProfileId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ resumeFileId: null })
          });
        }
        
        loadUserFiles(); // Reload list
      } else {
        showErrorModal(`Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`[${type}] Delete error:`, error);
      showErrorModal(`Failed to delete ${type}`);
    }
  }
  
  // Helper: Show temporary file row with loading indicator
  function showTemporaryFileRow(container, filename) {
    const tempRow = document.createElement('div');
    tempRow.className = 'flex items-center justify-between p-4 border border-[#cccccc] dark:border-neutral-700 rounded-lg temp-file-row';
    tempRow.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-neutral-500">description</span>
        <span class="font-medium">${filename}</span>
      </div>
      <div class="flex items-center gap-2">
        <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    `;
    
    // Remove "No files" message if present
    const noFilesMsg = container.querySelector('p.text-neutral-500');
    if (noFilesMsg) noFilesMsg.remove();
    
    container.appendChild(tempRow);
    return tempRow;
  }
  
  // Helper: Convert temporary row to permanent
  function convertTemporaryToPermanent(tempElement, fileData) {
    tempElement.classList.remove('temp-file-row');
    tempElement.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-neutral-500">description</span>
        <span class="font-medium">${fileData.name}</span>
      </div>
      <button class="flex min-w-[40px] h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 delete-file-btn" data-file-id="${fileData.id}" data-file-type="${fileData.type}">
        <span class="material-symbols-outlined">delete</span>
      </button>
    `;
    
    // Attach delete handler
    const deleteBtn = tempElement.querySelector('.delete-file-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        deleteFile(deleteBtn.dataset.fileId, deleteBtn.dataset.fileType);
      });
    }
  }
  
  // Helper: Remove temporary row and show error
  function removeTemporaryRow(tempElement, errorMessage) {
    if (tempElement && tempElement.parentElement) {
      const container = tempElement.parentElement;
      tempElement.remove();
      
      // Show error message
      const errorDiv = document.createElement('p');
      errorDiv.className = 'text-sm text-red-600 dark:text-red-400 error-message';
      errorDiv.textContent = errorMessage;
      container.appendChild(errorDiv);
      
      // Remove error after 5 seconds
      setTimeout(() => {
        errorDiv.remove();
        
        // If no files, show "No files" message
        if (container.children.length === 0) {
          container.innerHTML = '<p class="text-sm text-neutral-500 dark:text-neutral-400">No files uploaded yet.</p>';
        }
      }, 5000);
    }
  }
  
  async function handleResumeFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      showErrorModal('Please select a valid resume file (PDF, DOC, DOCX, TXT, RTF)');
      e.target.value = '';
      return;
    }
    
    // Validate file size
    const maxSize = activePlanLimits?.maxResumeFileSizeBytes || 5 * 1024 * 1024; // Use plan limit or default 5MB
    if (file.size > maxSize) {
      showErrorModal(`Resume file too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
      e.target.value = '';
      return;
    }
    
    if (!currentProfileId) {
      showErrorModal('Please save your profile first');
      e.target.value = '';
      return;
    }
    
    const container = document.getElementById('resume-files-container');
    if (!container) return;
    
    // Remove existing resume card (if any) - enforce single resume rule
    const existingCard = container.querySelector('[data-resume-card]');
    if (existingCard) {
      existingCard.remove();
    }
    
    // Add resume to active uploads
    addActiveUpload('resume');
    
    // Show enhanced loading state with progress
    const tempRow = document.createElement('div');
    tempRow.className = 'flex items-center justify-between p-4 border border-[#cccccc] dark:border-neutral-700 rounded-lg temp-file-row';
    tempRow.setAttribute('data-resume-card', ''); // Mark as resume card
    tempRow.innerHTML = `
      <div class="flex items-center gap-3 flex-1">
        <div class="relative">
          <span class="material-symbols-outlined text-2xl text-primary dark:text-neutral-50 animate-pulse">description</span>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        </div>
        <div class="flex-1 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-medium text-primary dark:text-neutral-50">${file.name}</span>
            <span class="text-sm text-neutral-600 dark:text-neutral-400">${Math.round(file.size / 1024)}KB</span>
          </div>
          <div class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="text-primary dark:text-neutral-50 font-medium">Uploading Resume...</span>
              <span id="resume-progress-text" class="text-neutral-600 dark:text-neutral-400">0%</span>
            </div>
            <div class="w-full bg-neutral-300 dark:bg-neutral-600 rounded-full h-2">
              <div id="resume-progress-bar" class="bg-primary h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Processing document...
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Remove "No files" message if present
    const noFilesMsg = container.querySelector('p.text-neutral-500');
    if (noFilesMsg) noFilesMsg.remove();
    
    container.appendChild(tempRow);
    
    // Simulate progress (since we can't track real progress with fetch)
    let progress = 0;
    const progressBar = document.getElementById('resume-progress-bar');
    const progressText = document.getElementById('resume-progress-text');
    const progressInterval = setInterval(() => {
      progress += Math.random() * 12;
      if (progress > 85) progress = 85; // Stop at 85% until upload completes
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      if (progressText) {
        progressText.textContent = `${Math.round(progress)}%`;
      }
    }, 150);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/upload/resume/${currentProfileId}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      if (res.ok) {
        const data = await res.json();
        
        // Complete progress bar
        if (progressBar) {
          progressBar.style.width = '100%';
        }
        if (progressText) {
          progressText.textContent = '100%';
        }
        
        // Brief success state
        setTimeout(() => {
          // Convert to permanent card
          tempRow.classList.remove('temp-file-row');
          tempRow.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-neutral-500">description</span>
              <span class="font-medium">${file.name}</span>
            </div>
            <button class="flex min-w-[40px] h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 delete-resume-btn" data-file-id="${data.fileId || data.id}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          `;
          
          // Attach delete handler
          const deleteBtn = tempRow.querySelector('.delete-resume-btn');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteFile(deleteBtn.dataset.fileId, 'resume'));
          }
          
          showToast('Resume uploaded successfully', 'success');
          
          // Remove resume from active uploads
          removeActiveUpload('resume');
          
          // Refresh storage limits
          if (currentUserId) {
            loadStorageLimits(currentUserId);
          }

          // Also reload resume dropdown in auto-populate section
          if (window.loadResumeDropdown) {
            window.loadResumeDropdown();
          }
        }, 500);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to upload resume';
        
        // Show error state
        tempRow.innerHTML = `
          <div class="flex items-center gap-3 flex-1">
            <span class="material-symbols-outlined text-2xl text-red-500">error</span>
            <div class="flex-1 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-medium text-red-700 dark:text-red-300">Upload Failed</span>
                <span class="text-sm text-red-600 dark:text-red-400">${file.name}</span>
              </div>
              <p class="text-sm text-red-600 dark:text-red-400">${errorMessage}</p>
              <button id="btn-retry-resume" class="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium">
                <span class="material-symbols-outlined text-sm">refresh</span>
                <span>Try Again</span>
              </button>
            </div>
          </div>
        `;
        
        // Add retry handler
        const retryBtn = document.getElementById('btn-retry-resume');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            tempRow.remove();
            // If no files, show "No files" message
            if (container.children.length === 0) {
              container.innerHTML = '<p class="text-sm text-neutral-500 dark:text-neutral-400">No resume uploaded yet.</p>';
            }
          });
        }
        
        showErrorModal(errorMessage);
        // Remove resume from active uploads after error
        removeActiveUpload('resume');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('[resume] Upload error:', error);
      
      // Show error state
      tempRow.innerHTML = `
        <div class="flex items-center gap-3 flex-1">
          <span class="material-symbols-outlined text-2xl text-red-500">error</span>
          <div class="flex-1 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-medium text-red-700 dark:text-red-300">Upload Failed</span>
              <span class="text-sm text-red-600 dark:text-red-400">${file.name}</span>
            </div>
            <p class="text-sm text-red-600 dark:text-red-400">Network error occurred</p>
            <button id="btn-retry-resume" class="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium">
              <span class="material-symbols-outlined text-sm">refresh</span>
              <span>Try Again</span>
            </button>
          </div>
        </div>
      `;
      
      showErrorModal('Failed to upload resume');
      // Remove resume from active uploads after error
      removeActiveUpload('resume');
    }
    
    // Reset input
    e.target.value = '';
  }
  
  async function handleAttachmentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (25MB max for attachments)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      showErrorModal('Attachment file too large. Maximum size is 25MB.');
      e.target.value = '';
      return;
    }

    // Check plan limits if available
    if (activePlanLimits) {
      const fileSize = file.size;
      
      // Check storage quota
      const remaining = activePlanLimits.remainingDocStorageBytes;
      if (remaining !== null && fileSize > remaining) {
        const mb = Math.round(remaining / 1024 / 1024);
        showErrorModal(`Not enough storage. You have ${mb}MB of document storage remaining.`);
        e.target.value = '';
        return;
      }
    }
    
    if (!currentProfileId) {
      showErrorModal('Please save your profile first');
      e.target.value = '';
      return;
    }
    
    const container = document.getElementById('attachments-container');
    if (!container) return;
    
    // Add attachment to active uploads
    addActiveUpload('attachment');
    
    // Show enhanced loading state with progress
    const tempRow = document.createElement('div');
    tempRow.className = 'flex items-center justify-between p-4 border border-[#cccccc] dark:border-neutral-700 rounded-lg temp-file-row';
    tempRow.innerHTML = `
      <div class="flex items-center gap-3 flex-1">
        <div class="relative">
          <span class="material-symbols-outlined text-2xl text-primary dark:text-neutral-50 animate-pulse">attach_file</span>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        </div>
        <div class="flex-1 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-medium text-primary dark:text-neutral-50">${file.name}</span>
            <span class="text-sm text-neutral-600 dark:text-neutral-400">${Math.round(file.size / 1024 / 1024 * 10) / 10}MB</span>
          </div>
          <div class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="text-primary dark:text-neutral-50 font-medium">Uploading Attachment...</span>
              <span id="attachment-progress-text" class="text-neutral-600 dark:text-neutral-400">0%</span>
            </div>
            <div class="w-full bg-neutral-300 dark:bg-neutral-600 rounded-full h-2">
              <div id="attachment-progress-bar" class="bg-primary h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Uploading to secure storage...
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Remove "No files" message if present
    const noFilesMsg = container.querySelector('p.text-neutral-500');
    if (noFilesMsg) noFilesMsg.remove();
    
    container.appendChild(tempRow);
    
    // Simulate progress (since we can't track real progress with fetch)
    let progress = 0;
    const progressBar = document.getElementById('attachment-progress-bar');
    const progressText = document.getElementById('attachment-progress-text');
    const progressInterval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress > 88) progress = 88; // Stop at 88% until upload completes
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      if (progressText) {
        progressText.textContent = `${Math.round(progress)}%`;
      }
    }, 180);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/upload/attachment/${currentProfileId}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      if (res.ok) {
        const data = await res.json();
        
        // Complete progress bar
        if (progressBar) {
          progressBar.style.width = '100%';
        }
        if (progressText) {
          progressText.textContent = '100%';
        }
        
        // Brief success state
        setTimeout(() => {
          // Convert to permanent card
          tempRow.classList.remove('temp-file-row');
          tempRow.innerHTML = `
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-neutral-500">description</span>
              <span class="font-medium">${file.name}</span>
            </div>
            <button class="flex min-w-[40px] h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#ededed] dark:bg-neutral-700 text-primary dark:text-neutral-50 delete-attachment-btn" data-file-id="${data.fileId || data.id}">
              <span class="material-symbols-outlined">delete</span>
            </button>
          `;
          
          // Attach delete handler
          const deleteBtn = tempRow.querySelector('.delete-attachment-btn');
          if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteFile(deleteBtn.dataset.fileId, 'attachment'));
          }
          
          showToast('Attachment uploaded successfully', 'success');
          
          // Remove attachment from active uploads
          removeActiveUpload('attachment');

          // Refresh storage limits
          if (currentUserId) {
            loadStorageLimits(currentUserId);
          }
        }, 500);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to upload attachment';
        
        // Show error state
        tempRow.innerHTML = `
          <div class="flex items-center gap-3 flex-1">
            <span class="material-symbols-outlined text-2xl text-red-500">error</span>
            <div class="flex-1 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-medium text-red-700 dark:text-red-300">Upload Failed</span>
                <span class="text-sm text-red-600 dark:text-red-400">${file.name}</span>
              </div>
              <p class="text-sm text-red-600 dark:text-red-400">${errorMessage}</p>
              <button id="btn-retry-attachment" class="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium">
                <span class="material-symbols-outlined text-sm">refresh</span>
                <span>Try Again</span>
              </button>
            </div>
          </div>
        `;
        
        // Add retry handler
        const retryBtn = document.getElementById('btn-retry-attachment');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            tempRow.remove();
            // If no files, show "No files" message
            if (container.children.length === 0) {
              container.innerHTML = '<p class="text-sm text-neutral-500 dark:text-neutral-400">No attachments uploaded yet.</p>';
            }
          });
        }
        
        showErrorModal(errorMessage);
        // Remove attachment from active uploads after error
        removeActiveUpload('attachment');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('[attachment] Upload error:', error);
      
      // Show error state
      tempRow.innerHTML = `
        <div class="flex items-center gap-3 flex-1">
          <span class="material-symbols-outlined text-2xl text-red-500">error</span>
          <div class="flex-1 space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-medium text-red-700 dark:text-red-300">Upload Failed</span>
              <span class="text-sm text-red-600 dark:text-red-400">${file.name}</span>
            </div>
            <p class="text-sm text-red-600 dark:text-red-400">Network error occurred</p>
            <button id="btn-retry-attachment" class="flex items-center gap-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium">
              <span class="material-symbols-outlined text-sm">refresh</span>
              <span>Try Again</span>
            </button>
          </div>
        </div>
      `;
      
      showErrorModal('Failed to upload attachment');
      // Remove attachment from active uploads after error
      removeActiveUpload('attachment');
    }
    
    // Reset input
    e.target.value = '';
  }
  
  function initResumeAndAttachments() {
    // Resume file upload
    const resumeBtn = document.getElementById('btn-upload-resume-file');
    const resumeInput = document.getElementById('resume-file-upload-input');
    if (resumeBtn && resumeInput) {
      resumeBtn.addEventListener('click', () => resumeInput.click());
      resumeInput.addEventListener('change', handleResumeFileUpload);
    }
    
    // Attachment upload
    const attachmentBtn = document.getElementById('btn-upload-attachment');
    const attachmentInput = document.getElementById('attachment-file-input');
    if (attachmentBtn && attachmentInput) {
      attachmentBtn.addEventListener('click', () => attachmentInput.click());
      attachmentInput.addEventListener('change', handleAttachmentUpload);
    }
    
    // NOTE: loadUserFiles() is now called from loadProfile() after profile data is loaded
  }

  // ============================================================================
  // SAVE PROFILE
  // ============================================================================
  
  async function saveProfile() {
    // Show loading state immediately
    showSaveLoading();
    
    if (!currentProfileId) {
      // Try to get profile ID from /api/profiles/mine
      try {
        const res = await fetch('/api/profiles/mine', { credentials: 'include' });
        if (res.ok) {
          const profile = await res.json();
          currentProfileId = profile.id;
          window.history.replaceState({}, '', `?id=${currentProfileId}`);
        } else {
          hideSaveLoading();
          showErrorModal('Please log in to save your profile');
          return;
        }
      } catch (e) {
        hideSaveLoading();
        showErrorModal('Error getting profile');
        return;
      }
    }

    const data = collectFormData();
    
    try {
      const res = await fetch(`/api/profiles/${currentProfileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (res.ok) {
        // Keep loading state for a moment to show success
        showToast('Profile saved successfully! ✓', 'success');
        
        // Update button to show success state briefly
        const saveButtons = [
          document.getElementById('btn-save-profile'),
          document.getElementById('btn-save-bottom')
        ];
        
        saveButtons.forEach(btn => {
          if (btn) {
            btn.innerHTML = `
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">check_circle</span>
                <span class="truncate">Saved!</span>
              </div>
            `;
            btn.classList.add('bg-green-600', 'hover:bg-green-700');
            btn.classList.remove('bg-primary', 'hover:bg-primary/90');
          }
        });
        
        // WP1-WP3: Redirect to template view after save
        setTimeout(() => {
          window.location.href = `/owner_preview.html?id=${currentProfileId}`;
        }, 1500);
      } else {
        hideSaveLoading();
        const err = await res.json();
        showErrorModal(err.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('[profile-edit] Save error:', error);
      hideSaveLoading();
      showErrorModal('Failed to save profile');
    }
  }

  // ============================================================================
  // SHARE PROFILE
  // ============================================================================
  
  async function shareProfile() {
    // First check if logged in
    try {
      const authRes = await fetch('/auth/me', { credentials: 'include' });
      if (!authRes.ok) {
        // Not logged in - redirect to login
        const returnUrl = window.location.pathname + window.location.search;
        window.location.href = `/login-page.html?returnTo=${encodeURIComponent(returnUrl)}&action=share`;
        return;
      }
    } catch (e) {
      window.location.href = '/login-page.html?action=share';
      return;
    }

    if (!currentProfileId) {
      showErrorModal('Please save your profile first');
      return;
    }

    try {
      const res = await fetch(`/api/profiles/${currentProfileId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Profile shared! Redirecting to dashboard...', 'success');
        setTimeout(() => {
          window.location.href = '/home.html?shared=1';
        }, 1500);
      } else if (res.status === 401) {
        window.location.href = '/login-page.html?returnTo=' + encodeURIComponent(window.location.href);
      } else if (res.status === 403 && data.error?.includes('limit')) {
        showErrorModal('Share limit reached. Upgrade to share more profiles.');
        setTimeout(() => {
          window.location.href = '/subscription.html';
        }, 2000);
      } else {
        showErrorModal(data.error || 'Failed to share profile');
      }
    } catch (error) {
      console.error('[profile-edit] Share error:', error);
      showErrorModal('Failed to share profile');
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  // Attach save/share event listeners
  document.querySelectorAll('#btn-save-profile, #btn-save-bottom').forEach(btn => {
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      saveProfile();
    });
  });

  document.querySelectorAll('#btn-share-profile, #btn-share-bottom').forEach(btn => {
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      shareProfile();
    });
  });

  // Listen for profile load to update currentProfileId
  window.addEventListener('profile:loaded', (e) => {
    if (e.detail?.id) {
      currentProfileId = e.detail.id;
    }
  });
  
  // Listen for custom events from auto-populate
  window.addEventListener('add-skill', (e) => {
    if (e.detail?.skill) {
      addSkillChip(e.detail.skill);
    }
  });
  
  window.addEventListener('add-highlight', (e) => {
    if (e.detail?.text) {
      addHighlightField(e.detail.text);
    }
  });
  
  window.addEventListener('add-experience', (e) => {
    if (e.detail?.data) {
      addExperienceBlock(e.detail.data);
    }
  });
  
  window.addEventListener('add-education', (e) => {
    if (e.detail?.data) {
      addEducationBlock(e.detail.data);
    }
  });

  window.addEventListener('add-social-link', (e) => {
    if (e.detail?.data) {
      addSocialLinkRow(e.detail.data);
    }
  });
  
  // Show loading state immediately
  showPageLoading();
  
  // Initialize all UI sections
  initSkills();
  initHighlights();
  initExperience();
  initEducation();
  initAvatar();
  initVideo();
  initThumbnail();
  initAvailability();
  initResumeAndAttachments(); // WP2: Resume & Attachments
  initSocialLinks();
  
  console.log('[profile-edit] All UI handlers initialized');
  
  // Load profile data on page load
  loadProfile();
  
  // ============================================================================
  // GLOBAL EXPORTS - For integration with other upload scripts
  // ============================================================================
  
  // Expose upload state management functions globally
  window.addActiveUpload = addActiveUpload;
  window.removeActiveUpload = removeActiveUpload;
  window.updateSaveButtonState = updateSaveButtonState;
  
  console.log('[profile-edit] Global upload state functions exposed');
})();
