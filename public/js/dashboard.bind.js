// public/js/dashboard.bind.js
// Loads real dashboard data from /api/dashboard

(async function initDashboard() {
  // Storage calculation logic
  let activePlanLimits = null;

  async function loadDashboardStorage(userId) {
    try {
      const res = await fetch(`/api/profiles/status/${userId}`, { credentials: 'include' });
      if (res.ok) {
        const status = await res.json();
        if (status.storage) {
          activePlanLimits = status.storage;
          updateDashboardStorageUI();
        }
      }
    } catch (e) {
      console.error('[dashboard] Failed to load storage limits:', e);
    }
  }

  function updateDashboardStorageUI() {
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
    const videoBarContainer = document.getElementById('video-storage-bar-container');
    
    if (videoLimit !== null && videoText && videoBar) {
      // Remove skeleton classes
      videoText.classList.remove('h-4', 'w-24', 'animate-pulse', 'bg-gray-200', 'dark:bg-gray-700', 'rounded');
      videoText.classList.add('text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400');
      if (videoBarContainer) videoBarContainer.classList.remove('animate-pulse');

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
    const docBarContainer = document.getElementById('doc-storage-bar-container');

    if (docLimit !== null && docText && docBar) {
      // Remove skeleton classes
      docText.classList.remove('h-4', 'w-24', 'animate-pulse', 'bg-gray-200', 'dark:bg-gray-700', 'rounded');
      docText.classList.add('text-xs', 'font-medium', 'text-neutral-500', 'dark:text-neutral-400');
      if (docBarContainer) docBarContainer.classList.remove('animate-pulse');

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
  }

  // Check if logged in
  try {
    const authRes = await fetch('/auth/me', { credentials: 'include' });
    if (authRes.status === 401 || authRes.status === 403) {
      window.location.href = '/login-page.html?returnTo=/dashboard.html';
      return;
    }
    if (authRes.ok) {
      const authData = await authRes.json();
      console.log('[dashboard] User:', authData.user?.name);

      const titleEl = document.getElementById('dashboard-title');
      if (titleEl) {
          const name = authData.user?.name || 'User';
          titleEl.textContent = `Welcome, ${name}`;
      }
      
      if (window.Auth) {
        window.Auth.user = authData.user;
      }
      
      if (authData.user && (authData.user.id || authData.user.user_id)) {
          loadDashboardStorage(authData.user.id || authData.user.user_id);
      }
    } else {
      console.warn('[dashboard] Skipping strict auth redirect for transient status:', authRes.status);
    }
    
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  } catch (e) {
    console.warn('[dashboard] Auth check failed, continuing without redirect:', e);
  }

  // Load dashboard data
  try {
    const res = await fetch('/api/dashboard', { credentials: 'include' });
    if (!res.ok) {
      console.error('[dashboard] Failed to load data');
      return;
    }
    
    const data = await res.json();
    console.log('[dashboard] Data:', data);
    
    // Update stats
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
      const credits = data.credits || {};
      // Defensive rendering - ensure all values are numeric
      const sharesUsed = Number(credits.sharesUsed) || 0;
      const rawSharesLimit = credits.sharesLimit;
      const sharesLimit = rawSharesLimit === null ? 'Unlimited' : (Number(rawSharesLimit) || 1);
      
      const bookingsUsed = Number(credits.bookingsUsed) || 0;
      const rawBookingsLimit = credits.bookingsLimit;
      const bookingsLimit = rawBookingsLimit === null ? 'Unlimited' : (Number(rawBookingsLimit) || 0);
      
      const totalViews = Number(data.analytics?.totalViews) || 0;
      
      statsContainer.innerHTML = `
        <div class="flex flex-col gap-1 rounded border border-primary/10 bg-white p-4 dark:border-white/10 dark:bg-primary animate-[fadeIn_0.5s_ease-out]">
          <p class="text-3xl font-bold tracking-tight">${sharesUsed} / ${sharesLimit}</p>
          <p class="text-sm text-primary/60 dark:text-white/60">Shares Openinterviews’ (Published)</p>
        </div>
        <div class="flex flex-col gap-1 rounded border border-primary/10 bg-white p-4 dark:border-white/10 dark:bg-primary animate-[fadeIn_0.5s_ease-out_0.1s_both]">
          <p class="text-3xl font-bold tracking-tight">${totalViews}</p>
          <p class="text-sm text-primary/60 dark:text-white/60">Total Views</p>
        </div>
        <div class="flex flex-col gap-1 rounded border border-primary/10 bg-white p-4 dark:border-white/10 dark:bg-primary animate-[fadeIn_0.5s_ease-out_0.2s_both]">
          <p class="text-3xl font-bold tracking-tight">${bookingsUsed} / ${bookingsLimit}</p>
          <p class="text-sm text-primary/60 dark:text-white/60">Bookings${bookingsLimit === 0 ? ' (Upgrade to unlock)' : ''}</p>
        </div>
      `;
    }

    // Update "My Interviews" table with skeleton replacement
    const interviewsTableBody = document.getElementById('interviews-table-body');
    if (interviewsTableBody && data.profiles && Array.isArray(data.profiles)) {
        interviewsTableBody.innerHTML = ''; // Clear skeletons
        
        if (data.profiles.length === 0) {
            interviewsTableBody.innerHTML = `
                <tr class="animate-[fadeIn_0.5s_ease-out]">
                    <td colspan="6" class="px-6 py-4 text-center text-sm text-primary/60 dark:text-white/60">
                        No interviews found. Create a new one!
                    </td>
                </tr>
            `;
        } else {
            data.profiles.forEach((profile, index) => {
                const dateObj = new Date(profile.createdAt || profile.created_at || Date.now());
                const date = dateObj.toISOString().split('T')[0]; // Format: YYYY-MM-DD
                const isShared = profile.visibility === 'public';
                const status = isShared ? 'Published' : 'Draft';
                const statusClass = isShared 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                    : 'bg-primary/10 text-primary/60 dark:bg-white/10 dark:text-white/60';
                
                const row = document.createElement('tr');
                row.className = `animate-[fadeIn_0.5s_ease-out_${index * 0.1}s_both]`;
                row.innerHTML = `
                  <td class="px-6 py-4 text-sm font-medium">
                    ${profile.title || profile.profile_name || 'Untitled Interview'}
                  </td>
                  <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${date}</td>
                  <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">
                    <span class="material-symbols-outlined text-sm ${isShared ? 'text-green-500' : 'text-gray-400'}">
                        ${isShared ? 'check_circle' : 'cancel'}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${profile.viewCount || 0}</td>
                  <td class="px-6 py-4 text-sm">
                    <span class="rounded px-2 py-1 text-xs font-medium ${statusClass}">${status}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 text-primary hover:bg-primary/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20" onclick="openOwnerPreview('${profile.id}')" title="Open owner preview" aria-label="Open owner preview">
                            <span class="material-symbols-outlined text-base">person</span>
                        </button>
                        <button class="flex h-8 w-8 items-center justify-center rounded hover:bg-primary/10 dark:hover:bg-white/10 text-primary/60 hover:text-primary dark:text-white/60 dark:hover:text-white" onclick="shareProfile('${profile.id}', '${profile.visibility}', '${profile.publicHandle || ''}')" title="Share">
                            <span class="material-symbols-outlined text-sm">share</span>
                        </button>
                        <button class="flex h-8 w-8 items-center justify-center rounded hover:bg-primary/10 dark:hover:bg-white/10 text-primary/60 hover:text-primary dark:text-white/60 dark:hover:text-white" onclick="editProfile(event, '${profile.id}')" title="Edit" aria-label="Edit profile">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button class="flex h-8 w-8 items-center justify-center rounded hover:bg-red-500/10 text-red-500 hover:text-red-700" onclick="deleteProfile('${profile.id}')" title="Delete" aria-label="Delete profile">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                  </td>
                `;
                interviewsTableBody.appendChild(row);
            });
        }
    }

    // Update "My Resumes" and "My Attachments" tables
    const resumesTableBody = document.getElementById('resumes-table-body');
    const attachmentsTableBody = document.getElementById('attachments-table-body');

    if (data.files && Array.isArray(data.files)) {
        const resumeFiles = data.files.filter(f => f.kind === 'resume');
        const attachmentFiles = data.files.filter(f => {
            const isAvatarUrl =
              typeof f.url === 'string' &&
              (f.url.includes('/openinterview/avatars/') ||
               f.url.includes('openinterview%2Favatars%2F'));
            
            const isAvatarName =
              f.mime?.includes('image') &&
              f.name?.toLowerCase().includes('avatar');
            
            const isAvatar = isAvatarUrl || isAvatarName;

            if (f.kind) {
              if (isAvatar) return false;
              return f.kind !== 'resume';
            }

            return !isAvatar;
        });

        // Render Resumes
        if (resumesTableBody) {
            resumesTableBody.innerHTML = ''; // Clear skeletons
            
            if (resumeFiles.length === 0) {
                 resumesTableBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="px-6 py-4 text-center text-sm text-primary/60 dark:text-white/60">
                            No resumes found.
                        </td>
                    </tr>
                `;
            } else {
                resumeFiles.forEach((file, index) => {
                    const dateObj = new Date(file.createdAt || file.created_at || Date.now());
                    const date = dateObj.toISOString().split('T')[0]; // Format: YYYY-MM-DD
                    const filename = file.name || file.original_name || 'Untitled';
                    const size = file.sizeLabel || file.size_label || 'Unknown';
                    
                    const row = document.createElement('tr');
                    row.className = `animate-[fadeIn_0.5s_ease-out_${index * 0.1}s_both]`;
                    row.innerHTML = `
                      <td class="px-6 py-4 text-sm font-medium">${filename}</td>
                      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${date}</td>
                      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${size}</td>
                    `;
                    resumesTableBody.appendChild(row);
                });
            }
        }

        // Render Attachments
        if (attachmentsTableBody) {
            attachmentsTableBody.innerHTML = ''; // Clear skeletons
            
            if (attachmentFiles.length === 0) {
                 attachmentsTableBody.innerHTML = `
                    <tr>
                        <td colspan="3" class="px-6 py-4 text-center text-sm text-primary/60 dark:text-white/60">
                            No attachments found.
                        </td>
                    </tr>
                `;
            } else {
                attachmentFiles.forEach((file, index) => {
                    const dateObj = new Date(file.createdAt || file.created_at || Date.now());
                    const date = dateObj.toISOString().split('T')[0]; // Format: YYYY-MM-DD
                    const filename = file.name || file.original_name || 'Untitled';
                    const size = file.sizeLabel || file.size_label || 'Unknown';
                    
                    const row = document.createElement('tr');
                    row.className = `animate-[fadeIn_0.5s_ease-out_${index * 0.1}s_both]`;
                    row.innerHTML = `
                      <td class="px-6 py-4 text-sm font-medium">${filename}</td>
                      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${date}</td>
                      <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${size}</td>
                    `;
                    attachmentsTableBody.appendChild(row);
                });
            }
        }
    } else {
        // Fallback
        if (resumesTableBody) {
             resumesTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-6 py-4 text-center text-sm text-primary/60 dark:text-white/60">
                        No resumes found.
                    </td>
                </tr>
            `;
        }
        if (attachmentsTableBody) {
             attachmentsTableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-6 py-4 text-center text-sm text-primary/60 dark:text-white/60">
                        No attachments found.
                    </td>
                </tr>
            `;
        }
    }
    
    // Show share link if available
    if (data.shareLink?.url) {
      const shareLinkSection = document.createElement('div');
      shareLinkSection.className = 'flex flex-col gap-4 rounded border border-green-500 bg-green-50 p-6 dark:bg-green-900/20';
      shareLinkSection.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-green-600">link</span>
          <h3 class="text-lg font-bold text-green-800 dark:text-green-200">Your Share Link</h3>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <input type="text" readonly value="${data.shareLink.url}" 
            class="w-full sm:flex-1 min-w-0 rounded border border-green-300 bg-white px-4 py-2 text-sm dark:bg-green-900/30 dark:border-green-700"
            id="share-link-input"/>
          <button onclick="copyShareLink()" 
            class="w-full sm:w-auto flex items-center justify-center gap-2 rounded bg-green-600 px-6 py-2 text-sm font-bold text-white hover:bg-green-700 transition-colors">
            <span class="material-symbols-outlined text-sm">content_copy</span>
            Copy
          </button>
        </div>
        <p class="text-sm text-green-700 dark:text-green-300">
          Status: ${data.shareLink.active ? '✓ Active' : 'Inactive'} | Handle: ${data.shareLink.handle}
        </p>
      `;
      
      const mainContent = document.querySelector('.mx-auto.flex.max-w-\\[960px\\]');
      if (mainContent) {
        mainContent.insertBefore(shareLinkSection, mainContent.children[1]);
      }
    }
    
    // Update user name in header
    if (data.user?.name) {
      const headerTitle = document.querySelector('h1.text-4xl');
      if (headerTitle) {
        headerTitle.textContent = `Welcome, ${data.user.name}`;
      }
    }
    
    // Update "My Profile" link with user's profile ID
    // WP1-WP3: Profile exists → Template View, No profile → Disabled (to prevent creating new profile accidentally)
    const myProfileLink = document.getElementById('my-profile-link');
    if (myProfileLink) {
      if (data.profile?.id) {
        // Profile exists → Go to Template View (owner_preview.html)
        console.log('[dashboard] Profile exists, linking to template view:', data.profile.id);
        myProfileLink.href = `/owner_preview.html?id=${data.profile.id}`;
        
        // Enable the link
        myProfileLink.classList.remove('text-primary/50', 'dark:text-white/50', 'cursor-not-allowed', 'pointer-events-none');
        myProfileLink.classList.add('text-primary', 'dark:text-white', 'cursor-pointer');
      } else {
        // No profile found → Keep disabled as per user request
        console.log('[dashboard] No profile found, keeping My Profile disabled');
        myProfileLink.removeAttribute('href');
        myProfileLink.classList.add('text-primary/50', 'dark:text-white/50', 'cursor-not-allowed', 'pointer-events-none');
        myProfileLink.classList.remove('text-primary', 'dark:text-white', 'cursor-pointer');
      }
    }
    
    // Add subscription management CTA after stats
    if (statsContainer && data.credits) {
      const ctaSection = document.createElement('div');
      ctaSection.className = 'flex items-center justify-between rounded border border-primary/10 bg-white p-6 dark:border-white/10 dark:bg-primary animate-[fadeIn_0.5s_ease-out_0.3s_both]';
      
      if (data.credits.plan === 'free') {
        ctaSection.innerHTML = `
          <div>
            <h3 class="text-lg font-semibold text-primary dark:text-white">Upgrade Your Plan</h3>
            <p class="mt-1 text-sm text-primary/60 dark:text-white/60">Get more shares and bookings with a paid plan</p>
          </div>
          <a href="/subscription.html" onclick="handleUpgradeClick(event, this)" class="flex items-center gap-2 rounded bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 dark:bg-white dark:text-primary dark:hover:bg-white/90 transition-all duration-200">
            <span class="material-symbols-outlined transition-opacity duration-200">upgrade</span>
            <span class="btn-text transition-opacity duration-200">Upgrade Plan</span>
            <div class="absolute inset-0 hidden items-center justify-center gap-2">
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-primary/30 dark:border-t-primary"></div>
                <span class="font-medium">Redirecting...</span>
            </div>
          </a>
        `;
      } else {
        ctaSection.innerHTML = `
          <div>
            <h3 class="text-lg font-semibold text-primary dark:text-white">Manage Subscription</h3>
            <p class="mt-1 text-sm text-primary/60 dark:text-white/60">View billing details and manage your plan</p>
          </div>
          <a href="/subscription.html" onclick="handleUpgradeClick(event, this)" class="flex items-center gap-2 rounded bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary/90 dark:bg-white dark:text-primary dark:hover:bg-white/90 transition-all duration-200">
            <span class="material-symbols-outlined transition-opacity duration-200">settings</span>
            <span class="btn-text transition-opacity duration-200">Manage</span>
            <div class="absolute inset-0 hidden items-center justify-center gap-2">
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-primary/30 dark:border-t-primary"></div>
                <span class="font-medium">Redirecting...</span>
            </div>
          </a>
        `;
      }
      
      // Insert after stats grid
      statsContainer.parentNode.insertBefore(ctaSection, statsContainer.nextSibling);
    }


    
  } catch (error) {
    console.error('[dashboard] Error:', error);
  } finally {
    // Hide global loader with fade out
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }
})();

// Add delete handler to window
window.deleteProfile = async function(profileId) {
    if (!confirm('Are you sure you want to delete this interview? This will delete all associated videos and resumes and release your storage/credits.')) {
        return;
    }

    const btn = document.querySelector(`button[onclick="deleteProfile('${profileId}')"]`);
    const originalContent = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span>';
        }

        const res = await fetch(`/api/profiles/${profileId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete profile');
        }

        // Show success toast or just reload
        // Reload is safer to ensure all counts (storage, credits) are refreshed
        window.location.reload();

    } catch (error) {
        console.error('Error deleting profile:', error);
        alert(`Failed to delete profile: ${error.message}`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }
};

window.openOwnerPreview = function(profileId) {
    if (!profileId) return;
    const url = `/owner_preview.html?id=${encodeURIComponent(profileId)}`;
    window.location.href = url;
};

window.copyShareLink = function() {
    const input = document.getElementById('share-link-input');
    if (input) {
      input.select();
      document.execCommand('copy');
      
      const btn = input.nextElementSibling;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Copied!';
      btn.classList.replace('bg-green-600', 'bg-green-700');
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.replace('bg-green-700', 'bg-green-600');
      }, 2000);
    }
};

// Handle upgrade button click with loading state
window.handleUpgradeClick = function(e, btn) {
    e.preventDefault();
    const href = btn.getAttribute('href');
    const icon = btn.querySelector('.material-symbols-outlined');
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('div.absolute');
    
    // Save for restoration
    activeUpgradeBtn = btn;
    
    // Disable button and show loader
    btn.style.pointerEvents = 'none';
    btn.classList.add('relative', 'overflow-hidden'); // Ensure relative positioning
    
    // Fade out content
    if (icon) icon.style.opacity = '0';
    if (text) text.style.opacity = '0';
    
    // Show loader
    if (loader) {
        loader.classList.remove('hidden');
        loader.classList.add('flex');
    }
    
    // Navigate after short delay to show animation
    setTimeout(() => {
        window.location.href = href;
    }, 300);
};

// Copy share link function
window.copyShareLink = async function() {
  const input = document.getElementById('share-link-input');
  if (!input || !input.value) return;
  
  try {
    await navigator.clipboard.writeText(input.value);
    showToast('Link copied to clipboard!', 'success');
  } catch (error) {
    // Fallback for older browsers
    input.select();
    document.execCommand('copy');
    showToast('Link copied!', 'success');
  }
};

// Track active buttons to restore state on back navigation
let activeEditBtn = null;
let activeEditBtnContent = '';
let activeUpgradeBtn = null;

// Restore button state when page is shown (e.g., from back/forward cache)
window.addEventListener('pageshow', function() {
    if (activeEditBtn) {
        activeEditBtn.innerHTML = activeEditBtnContent;
        activeEditBtn.classList.remove('cursor-not-allowed', 'opacity-70');
        activeEditBtn.disabled = false;
        activeEditBtn = null;
    }
    
    if (activeUpgradeBtn) {
        activeUpgradeBtn.style.pointerEvents = 'auto';
        const icon = activeUpgradeBtn.querySelector('.material-symbols-outlined');
        const text = activeUpgradeBtn.querySelector('.btn-text');
        const loader = activeUpgradeBtn.querySelector('div.absolute');
        
        if (icon) icon.style.opacity = '1';
        if (text) text.style.opacity = '1';
        if (loader) {
            loader.classList.add('hidden');
            loader.classList.remove('flex');
        }
        activeUpgradeBtn = null;
    }
});

// Edit profile handler with loading state
window.editProfile = function(event, profileId) {
    const btn = event.currentTarget;
    if (!btn) return;
    
    // Save state
    activeEditBtn = btn;
    activeEditBtnContent = btn.innerHTML;
    
    // Add loading state
    btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span>';
    btn.classList.add('cursor-not-allowed', 'opacity-70');
    btn.disabled = true; // Prevent multiple clicks
    
    // Redirect
    window.location.href = `/profile_edit.html?id=${profileId}`;
};

// Share profile handler - Uses shared ShareModalController
window.shareProfile = function(profileId, visibility, publicHandle) {
    if (window.ShareModalController) {
        window.ShareModalController.open({
            id: profileId,
            visibility: visibility,
            handle: publicHandle
        });
    } else {
        console.error('ShareModalController not loaded');
        // Minimal fallback
        if (visibility === 'public') {
             const url = `${window.location.origin}/u/${publicHandle}`;
             navigator.clipboard.writeText(url).then(() => showToast('Link copied!', 'success'));
        } else if (window.ShareProfile) {
            window.ShareProfile.share(profileId).then(res => {
                if (res) window.location.reload();
            });
        }
    }
};

// Toast helper function
function showToast(message, type = 'info') {
  const existing = document.querySelector('.dashboard-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'dashboard-toast fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300';
  
  if (type === 'success') {
    toast.classList.add('bg-green-600', 'text-white');
    toast.innerHTML = '<span class="material-symbols-outlined">check_circle</span><span>' + message + '</span>';
  } else {
    toast.classList.add('bg-primary', 'text-white');
    toast.innerHTML = '<span class="material-symbols-outlined">info</span><span>' + message + '</span>';
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
