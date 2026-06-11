// public/js/share-profile.js
// WP3 + WP4: Share Profile Handler with Auth Check and Paywall

const ShareProfile = {
  // Share a profile - handles auth check and paywall
  async share(profileId, options = {}) {
    // First check if user is logged in
    // Optimization: check memory first (populated by dashboard)
    let user = window.Auth?.user;
    
    if (!user) {
      user = await window.Auth?.checkAuth();
    }
    
    if (!user) {
      // Show login modal
      return new Promise((resolve, reject) => {
        window.LoginModal?.open({
          returnTo: window.location.pathname + window.location.search,
          onSuccess: async () => {
            // After login, try sharing again
            try {
              const result = await this.doShare(profileId, options);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        });
      });
    }
    
    return this.doShare(profileId, options);
  },
  
  // Actually perform the share API call
  async doShare(profileId, options = {}) {
    try {
      const response = await fetch(`/api/profiles/${profileId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Only open paywall when the server explicitly says upgrade is required
        if (data.requiresUpgrade) {
          window.PaywallModal?.open({
            context: 'paywall_share',
            sharesUsed: data.sharesUsed,
            sharesLimit: data.sharesLimit,
            currentPlanCode: data.planCode || data.plan || 'free'
          });
          throw new Error('PAYWALL_REQUIRED');
        }

        // Check if auth required
        if (data.code === 'AUTH_REQUIRED' || response.status === 401) {
          window.LoginModal?.open({
            returnTo: window.location.pathname + window.location.search
          });
          throw new Error('AUTH_REQUIRED');
        }

        // Any other error (including 403 ownership failures) - show plain error message
        throw new Error(data.error || 'Share failed');
      }
      
      // Success - show the share link unless suppressed
      if (!options.suppressSuccessModal) {
        this.showShareSuccess(data);
      }
      return data;
      
    } catch (error) {
      if (error.message !== 'PAYWALL_REQUIRED' && error.message !== 'AUTH_REQUIRED') {
        this.showError(error.message);
      }
      throw error;
    }
  },
  
  // Show success modal with share link
  showShareSuccess(data) {
    // Prefer token exchange URL for recruiters; fall back to clean /u/ URL
    let publicUrl = data.accessUrl || data.publicUrl;
    
    // Ensure we don't double-prepend origin
    if (publicUrl) {
      const origin = window.location.origin;
      // If it doesn't start with http AND doesn't include the host, assume relative
      if (!publicUrl.startsWith('http') && !publicUrl.includes(window.location.host)) {
        publicUrl = origin + (publicUrl.startsWith('/') ? '' : '/') + publicUrl;
      }
    }
    
    // Determine message based on state
    let title = 'Profile Shared!';
    let message = '';
    
    if (data.alreadyPublic) {
      title = 'Link Ready';
      message = 'Your profile is already public. Here is your share link.';
    } else if (data.sharesRemaining === 'Unlimited') {
      message = 'You have unlimited shares.';
    } else {
      message = data.sharesRemaining > 0 
        ? `You have ${data.sharesRemaining} share${data.sharesRemaining === 1 ? '' : 's'} remaining.`
        : 'This was your last free share.';
    }
    
    // Create success modal
    const modalHTML = `
      <div id="share-success-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" onclick="document.getElementById('share-success-modal').remove()"></div>
        <div class="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 animate-[fadeIn_0.3s_ease-out]">
          <button type="button" onclick="document.getElementById('share-success-modal').remove()" 
            class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600">
            <span class="material-symbols-outlined">close</span>
          </button>
          
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-symbols-outlined text-3xl text-green-600">check_circle</span>
            </div>
            <h2 class="text-2xl font-bold text-primary dark:text-white">${title}</h2>
            <p class="text-neutral-600 dark:text-neutral-400 mt-2">
              ${message}
            </p>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-primary dark:text-white mb-2">Share Link</label>
              <div class="flex gap-2">
                <input type="text" readonly value="${publicUrl}" 
                  class="flex-1 h-12 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-primary dark:text-white text-sm"
                  id="share-link-input">
                <button type="button" onclick="ShareProfile.copyLink('${publicUrl}')"
                  class="h-12 px-4 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                  <span class="material-symbols-outlined text-xl">content_copy</span>
                  Copy
                </button>
              </div>
            </div>
            
            <div class="flex gap-3 pt-4">
              <a href="${publicUrl}" target="_blank"
                class="flex-1 h-12 flex items-center justify-center gap-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-primary dark:text-white font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                <span class="material-symbols-outlined">open_in_new</span>
                View Profile
              </a>
              <button type="button" onclick="document.getElementById('share-success-modal').remove()"
                class="flex-1 h-12 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove any existing modal
    document.getElementById('share-success-modal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },
  
  // Copy link to clipboard
  async copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      this.showToast('Link copied to clipboard!', 'success');
    } catch (error) {
      // Fallback for older browsers
      const input = document.getElementById('share-link-input');
      if (input) {
        input.select();
        document.execCommand('copy');
        this.showToast('Link copied to clipboard!', 'success');
      }
    }
  },
  
  // Show error toast
  showError(message) {
    if (typeof window.showErrorModal === 'function') {
      window.showErrorModal(message);
    } else {
      this.showToast(message, 'error');
    }
  },
  
  // Show toast notification
  showToast(message, type = 'info') {
    const existing = document.querySelector('.share-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'share-toast fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300';
    
    if (type === 'success') {
      toast.classList.add('bg-green-600', 'text-white');
      toast.innerHTML = `<span class="material-symbols-outlined">check_circle</span><span>${message}</span>`;
    } else if (type === 'error') {
      toast.classList.add('bg-red-600', 'text-white');
      toast.innerHTML = `<span class="material-symbols-outlined">error</span><span>${message}</span>`;
    } else {
      toast.classList.add('bg-primary', 'text-white');
      toast.innerHTML = `<span class="material-symbols-outlined">info</span><span>${message}</span>`;
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// Make available globally
window.ShareProfile = ShareProfile;
