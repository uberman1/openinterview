// // public/js/dashboard.credits.bind.js
// // WP10: Dashboard Credits + Share Link Display

// (async function initDashboardCredits() {
//   // Wait for DOM
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', init);
//   } else {
//     init();
//   }
  
//   async function init() {
//     try {
//       const response = await fetch('/api/dashboard', {
//         credentials: 'include'
//       });
      
//       if (!response.ok) {
//         if (response.status === 401) {
//           // Not logged in - hide credits section
//           hideCreditsSection();
//           return;
//         }
//         throw new Error('Failed to load dashboard data');
//       }
      
//       const data = await response.json();
//       renderCredits(data.credits);
//       renderShareLink(data.shareLink);
//       renderAnalytics(data.analytics);
//     } catch (error) {
//       console.error('[dashboard] Error:', error);
//     }
//   }
  
//   function hideCreditsSection() {
//     const section = document.getElementById('credits-section');
//     if (section) section.style.display = 'none';
//   }
  
//   function renderCredits(credits) {
//     if (!credits) return;
    
//     // Find or create credits container
//     let container = document.getElementById('credits-section');
//     if (!container) {
//       container = createCreditsSection();
//       if (!container) return;
//     }
    
//     // Update values
//     const remaining = document.getElementById('credits-remaining');
//     const total = document.getElementById('credits-total');
//     const bar = document.getElementById('credits-bar');
//     const resetDate = document.getElementById('credits-reset-date');
    
//     if (remaining) remaining.textContent = credits.remaining;
//     if (total) total.textContent = credits.limit;
//     if (bar) {
//       if (credits.limit === 'Unlimited') {
//         bar.style.width = '100%';
//       } else {
//         const limit = Number(credits.limit) || 0;
//         const used = Number(credits.used) || 0;
//         const percent = limit > 0 ? (used / limit) * 100 : 0;
//         bar.style.width = `${Math.max(0, 100 - percent)}%`;
//       }
//     }
//     if (resetDate) {
//       const date = new Date(credits.nextResetDate);
//       resetDate.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
//     }
//   }
  
//   function renderShareLink(shareLink) {
//     if (!shareLink || !shareLink.url) return;
    
//     const input = document.getElementById('share-link-input');
//     const container = document.getElementById('share-link-section');
    
//     if (input) {
//       input.value = shareLink.url;
//     }
    
//     if (container && !shareLink.active) {
//       container.style.display = 'none';
//     }
//   }
  
//   function renderAnalytics(analytics) {
//     if (!analytics) return;
    
//     const views = document.getElementById('total-views');
//     const bookings = document.getElementById('total-bookings');
    
//     if (views) views.textContent = analytics.totalViews || 0;
//     if (bookings) bookings.textContent = analytics.totalBookings || 0;
//   }
  
//     // Find a good place to insert
//     const main = document.querySelector('main') || document.body;
    
//     const section = document.createElement('div');
//     section.id = 'credits-section';
//     section.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-8';
//     section.innerHTML = `
//       <!-- Credits Card -->
//       <div class="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
//         <div class="flex items-center justify-between mb-4">
//           <div>
//             <p class="text-sm text-neutral-500 dark:text-neutral-400">Booking credits this month</p>
//             <p class="text-2xl font-bold text-primary dark:text-white">
//               <span id="credits-remaining">0</span> / <span id="credits-total">0</span> remaining
//             </p>
//           </div>
//           <div class="w-12 h-12 bg-primary/10 dark:bg-white/10 rounded-full flex items-center justify-center">
//             <span class="material-symbols-outlined text-primary dark:text-white">calendar_month</span>
//           </div>
//         </div>
//         <div class="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
//           <div id="credits-bar" class="h-full bg-primary dark:bg-white rounded-full transition-all duration-500" style="width: 100%"></div>
//         </div>
//         <p class="text-xs text-neutral-400 mt-2">Resets on <span id="credits-reset-date">-</span></p>
//       </div>
      
//       <!-- Share Link Card -->
//       <div id="share-link-section" class="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
//         <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Your active share link</p>
//         <div class="flex gap-2">
//           <input type="text" readonly id="share-link-input"
//             value=""
//             class="flex-1 h-12 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700 text-primary dark:text-white text-sm truncate">
//           <button onclick="copyShareLink()" 
//             class="h-12 px-4 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
//             <span class="material-symbols-outlined">content_copy</span>
//             Copy
//           </button>
//         </div>
//       </div>
//     `;
    
//     // Insert at beginning of main
//     main.insertBefore(section, main.firstChild);
//     return section;
//   }
// })();

// // Copy share link function
// async function copyShareLink() {
//   const input = document.getElementById('share-link-input');
//   if (!input || !input.value) return;
  
//   try {
//     await navigator.clipboard.writeText(input.value);
//     showToast('Link copied to clipboard!', 'success');
//   } catch (error) {
//     // Fallback
//     input.select();
//     document.execCommand('copy');
//     showToast('Link copied!', 'success');
//   }
// }

// // Toast helper
// function showToast(message, type = 'info') {
//   const existing = document.querySelector('.dashboard-toast');
//   if (existing) existing.remove();
  
//   const toast = document.createElement('div');
//   toast.className = 'dashboard-toast fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300';
  
//   if (type === 'success') {
//     toast.classList.add('bg-green-600', 'text-white');
//     toast.innerHTML = `<span class="material-symbols-outlined">check_circle</span><span>${message}</span>`;
//   } else if (type === 'error') {
//     toast.classList.add('bg-red-600', 'text-white');
//     toast.innerHTML = `<span class="material-symbols-outlined">error</span><span>${message}</span>`;
//   } else {
//     toast.classList.add('bg-primary', 'text-white');
//     toast.innerHTML = `<span class="material-symbols-outlined">info</span><span>${message}</span>`;
//   }
  
//   document.body.appendChild(toast);
  
//   setTimeout(() => {
//     toast.style.opacity = '0';
//     setTimeout(() => toast.remove(), 300);
//   }, 3000);
// }
// public/js/dashboard.credits.bind.js
// WP10: Dashboard Credits + Share Link Display

(async function initDashboardCredits() {
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  async function init() {
    try {
      const response = await fetch('/api/dashboard', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not logged in - hide credits section
          hideCreditsSection();
          return;
        }
        throw new Error('Failed to load dashboard data');
      }
      
      const data = await response.json();
      renderCredits(data.credits);
      renderShareLink(data.shareLink);
      renderAnalytics(data.analytics);
    } catch (error) {
      console.error('[dashboard] Error:', error);
    }
  }
  
  function hideCreditsSection() {
    const section = document.getElementById('credits-section');
    if (section) section.style.display = 'none';
  }
  
  function renderCredits(credits) {
    if (!credits) return;
    
    // Find or create credits container
    let container = document.getElementById('credits-section');
    if (!container) {
      container = createCreditsSection();
    }
    
    // Update values
    const remaining = document.getElementById('credits-remaining');
    const total = document.getElementById('credits-total');
    const bar = document.getElementById('credits-bar');
    const resetDate = document.getElementById('credits-reset-date');
    
    if (remaining) remaining.textContent = credits.remaining;
    if (total) total.textContent = credits.limit;
    if (bar) {
      if (credits.limit === 'Unlimited') {
        bar.style.width = '100%';
      } else {
        const limit = Number(credits.limit) || 0;
        const used = Number(credits.used) || 0;
        const percent = limit > 0 ? (used / limit) * 100 : 0;
        bar.style.width = `${Math.max(0, 100 - percent)}%`;
      }
    }
    if (resetDate) {
      const date = new Date(credits.nextResetDate);
      resetDate.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  
  function renderShareLink(shareLink) {
    if (!shareLink || !shareLink.url) return;
    
    const input = document.getElementById('share-link-input');
    const container = document.getElementById('share-link-section');
    
    if (input) {
      input.value = shareLink.url;
    }
    
    if (container && !shareLink.active) {
      container.style.display = 'none';
    }
  }
  
  function renderAnalytics(analytics) {
    if (!analytics) return;
    
    const views = document.getElementById('total-views');
    const bookings = document.getElementById('total-bookings');
    
    if (views) views.textContent = analytics.totalViews || 0;
    if (bookings) bookings.textContent = analytics.totalBookings || 0;
  }
  
  function createCreditsSection() {
    // Find a good place to insert
    const main = document.querySelector('main') || document.body;
    
    const section = document.createElement('div');
    section.id = 'credits-section';
    section.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 mb-8';
    section.innerHTML = `
      <!-- Credits Card -->
      <div class="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">Booking credits this month</p>
            <p class="text-2xl font-bold text-primary dark:text-white">
              <span id="credits-remaining">0</span> / <span id="credits-total">0</span> remaining
            </p>
          </div>
          <div class="w-12 h-12 bg-primary/10 dark:bg-white/10 rounded-full flex items-center justify-center">
            <span class="material-symbols-outlined text-primary dark:text-white">calendar_month</span>
          </div>
        </div>
        <div class="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div id="credits-bar" class="h-full bg-primary dark:bg-white rounded-full transition-all duration-500" style="width: 100%"></div>
        </div>
        <p class="text-xs text-neutral-400 mt-2">Resets on <span id="credits-reset-date">-</span></p>
      </div>
      
      <!-- Share Link Card -->
      <div id="share-link-section" class="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Your active share link</p>
        <div class="flex gap-2">
          <input type="text" readonly id="share-link-input"
            value=""
            class="flex-1 h-12 px-4 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700 text-primary dark:text-white text-sm truncate">
          <button onclick="copyShareLink()" 
            class="h-12 px-4 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
            <span class="material-symbols-outlined">content_copy</span>
            Copy
          </button>
        </div>
      </div>
    `;
    
    // Insert at beginning of main
    main.insertBefore(section, main.firstChild);
    return section;
  }
})();

// Copy share link function
async function copyShareLink() {
  const input = document.getElementById('share-link-input');
  if (!input || !input.value) return;
  
  try {
    await navigator.clipboard.writeText(input.value);
    showToast('Link copied to clipboard!', 'success');
  } catch (error) {
    // Fallback
    input.select();
    document.execCommand('copy');
    showToast('Link copied!', 'success');
  }
}

// Toast helper
function showToast(message, type = 'info') {
  const existing = document.querySelector('.dashboard-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'dashboard-toast fixed bottom-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300';
  
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
  }, 3000);
}