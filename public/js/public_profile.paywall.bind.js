// public/js/public_profile.paywall.bind.js
// WP7: Public Profile Paywall Banner - Logic for checking owner limits

window.PublicProfilePaywall = (function() {

  async function checkOwnerStatus(ownerId) {
    try {
      // This endpoint would need to be public or use a token
      // For now, we'll check via a public status endpoint
      const response = await fetch(`/api/profiles/status/${ownerId}`);
      
      if (!response.ok) {
        // If endpoint doesn't exist, assume no limit exceeded
        return { limitExceeded: false };
      }
      
      const data = await response.json();
      return {
        limitExceeded: data.bookingsExceeded || data.sharesExceeded,
        plan: data.plan,
        message: data.message
      };
    } catch (error) {
      return { limitExceeded: false };
    }
  }

  function showLimitModal() {
    // Check if modal already exists
    if (document.getElementById('limit-modal')) return;

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'limit-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/50" onclick="document.getElementById('limit-modal').remove()"></div>
      <div class="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-lg shadow-xl p-8 text-center animate-fade-in">
        <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined text-3xl text-amber-600">block</span>
        </div>
        <h2 class="text-2xl font-bold text-primary dark:text-white mb-2">Booking Unavailable</h2>
        <p class="text-neutral-600 dark:text-neutral-400 mb-6">
          This profile owner has reached their booking limit. Please try again later.
        </p>
        <button onclick="document.getElementById('limit-modal').remove()"
          class="w-full h-12 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
          Got it
        </button>
      </div>
    `;
    
    // Add Material Symbols if not present
    if (!document.querySelector('link[href*="Material+Symbols"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
      document.head.appendChild(link);
    }
    
    document.body.appendChild(modal);
  }

  return {
    checkOwnerStatus,
    showLimitModal
  };
})();
