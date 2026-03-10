// // public/js/paywall-modal.js
// // WP4 + WP7: Production-Grade Paywall Modal - Uses Real API Data Only

// const PaywallModal = {
//   modal: null,
//   isOpen: false,
//   plans: null,
//   isLoading: false,
  
//   // Create the modal HTML
//   createModal() {
//     if (this.modal) return;
    
//     const modalHTML = `
//       <div id="paywall-modal" class="fixed inset-0 z-50 hidden">
//         <!-- Backdrop -->
//         <div class="paywall-modal-backdrop fixed inset-0 bg-black/50 transition-opacity duration-300 opacity-0"></div>
        
//         <!-- Modal Container -->
//         <div class="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
//           <div class="paywall-modal-content relative w-full max-w-4xl bg-white dark:bg-neutral-900 shadow-xl transform transition-all duration-300 my-8 scale-95 opacity-0">
//             <!-- Close Button -->
//             <button type="button" class="paywall-modal-close absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 z-10 transition-colors duration-200">
//               <span class="material-symbols-outlined">close</span>
//             </button>
            
//             <!-- Modal Body -->
//             <div class="p-8">
//               <!-- Header -->
//               <div class="text-center mb-8">
//                 <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4 transition-all duration-300">
//                   <span class="material-symbols-outlined text-3xl text-amber-600">lock</span>
//                 </div>
//                 <h2 class="text-2xl font-bold text-primary dark:text-white">You've reached your limit</h2>
//                 <p class="text-neutral-600 dark:text-neutral-400 mt-2" id="paywall-subtitle">
//                   You've used your 1 free share. Upgrade to share more profiles.
//                 </p>
//               </div>
              
//               <!-- Plans Grid -->
//               <div id="paywall-plans">
//                 <!-- Plans will be inserted here -->
//               </div>
              
//               <!-- Features List -->
//               <div class="border-t border-neutral-200 dark:border-neutral-700 pt-6 mt-8">
//                 <h3 class="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">All paid plans include:</h3>
//                 <div class="grid grid-cols-2 gap-3 text-sm">
//                   <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
//                     <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
//                     Unlimited profile edits
//                   </div>
//                   <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
//                     <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
//                     Video interview hosting
//                   </div>
//                   <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
//                     <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
//                     Calendar integration
//                   </div>
//                   <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
//                     <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
//                     Analytics dashboard
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
      
//       <!-- Professional Animation Styles -->
//       <style>
//         @keyframes fadeInUp {
//           from {
//             opacity: 0;
//             transform: translateY(30px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }
        
//         .paywall-plan-card:hover {
//           transform: translateY(-2px);
//         }
        
//         .paywall-plan-button:hover:not(:disabled) {
//           transform: scale(1.02);
//         }
        
//         .paywall-plan-button:active:not(:disabled) {
//           transform: scale(0.98);
//         }
//       </style>
//     `;
    
//     document.body.insertAdjacentHTML('beforeend', modalHTML);
//     this.modal = document.getElementById('paywall-modal');
//     this.bindEvents();
//   },
  
//   // Bind event handlers
//   bindEvents() {
//     if (!this.modal) return;
    
//     // Close button
//     this.modal.querySelector('.paywall-modal-close').addEventListener('click', () => this.close());
    
//     // Backdrop click
//     this.modal.querySelector('.paywall-modal-backdrop').addEventListener('click', () => this.close());
    
//     // ESC key
//     document.addEventListener('keydown', (e) => {
//       if (e.key === 'Escape' && this.isOpen) {
//         this.close();
//       }
//     });
//   },
  
//   // Fetch plans from API
//   async fetchPlans() {
//     if (this.plans) return this.plans;
    
//     try {
//       const response = await fetch('/api/plans', {
//         credentials: 'include'
//       });
      
//       if (!response.ok) {
//         throw new Error(`Failed to fetch plans: ${response.status}`);
//       }
      
//       this.plans = await response.json();
//       return this.plans;
//     } catch (error) {
//       console.error('[paywall] Error fetching plans:', error);
//       throw error;
//     }
//   },

//   // Render loading state
//   renderLoading() {
//     const container = this.modal.querySelector('#paywall-plans');
//     if (!container) return;
    
//     container.innerHTML = `
//       <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
//         ${Array(3).fill(0).map(() => `
//           <div class="relative flex flex-col p-6 border border-neutral-200 dark:border-neutral-700 animate-pulse">
//             <div class="text-center mb-4">
//               <div class="h-6 bg-neutral-200 dark:bg-neutral-700 mb-2"></div>
//               <div class="h-8 bg-neutral-200 dark:bg-neutral-700"></div>
//             </div>
//             <div class="space-y-3 mb-6 flex-1">
//               <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
//               <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
//               <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
//             </div>
//             <div class="h-12 bg-neutral-200 dark:bg-neutral-700"></div>
//           </div>
//         `).join('')}
//       </div>
//     `;
//   },

//   // Render error state
//   renderError(error) {
//     const container = this.modal.querySelector('#paywall-plans');
//     if (!container) return;
    
//     container.innerHTML = `
//       <div class="text-center py-12">
//         <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
//           <span class="material-symbols-outlined text-3xl text-red-600">error</span>
//         </div>
//         <h3 class="text-lg font-semibold text-primary dark:text-white mb-2">Unable to load plans</h3>
//         <p class="text-neutral-600 dark:text-neutral-400 mb-4">
//           We're having trouble loading our pricing plans. Please try again later.
//         </p>
//         <button type="button" onclick="PaywallModal.retryLoadPlans()" 
//           class="px-6 py-2 bg-primary text-white font-medium hover:opacity-90 transition-opacity">
//           Try Again
//         </button>
//       </div>
//     `;
//   },

//   // Retry loading plans
//   async retryLoadPlans() {
//     this.plans = null; // Clear cache
//     this.renderLoading();
    
//     try {
//       const plans = await this.fetchPlans();
//       this.renderPlans(plans);
//     } catch (error) {
//       this.renderError(error);
//     }
//   },

//   // Render plans from API data
//   renderPlans(plans) {
//     const container = this.modal.querySelector('#paywall-plans');
//     if (!container) return;
    
//     if (!plans || plans.length === 0) {
//       this.renderError(new Error('No plans available'));
//       return;
//     }

//     // Filter out free plan and sort by price
//     const paidPlans = plans
//       .filter(plan => plan.code !== 'free')
//       .sort((a, b) => a.priceCents - b.priceCents);

//     if (paidPlans.length === 0) {
//       this.renderError(new Error('No paid plans available'));
//       return;
//     }

//     // Mark middle plan as popular if we have 3+ plans
//     const popularIndex = paidPlans.length >= 3 ? 1 : Math.floor(paidPlans.length / 2);
    
//     container.innerHTML = `
//       <div class="grid grid-cols-1 md:grid-cols-${Math.min(paidPlans.length, 3)} gap-4 mb-8">
//         ${paidPlans.map((plan, index) => {
//           const isPopular = index === popularIndex;
//           const isPurchasable = plan.isPurchasable;
//           const price = plan.priceCents > 0 ? `$${(plan.priceCents / 100).toFixed(0)}` : 'Free';
//           const shares = plan.sharesLimit === 999999 ? 'Unlimited' : plan.sharesLimit;
//           const bookings = plan.bookingsLimit === 999999 ? 'Unlimited' : plan.bookingsLimit;
          
//           return `
//             <div class="paywall-plan-card relative flex flex-col p-6 border ${isPopular ? 'border-primary dark:border-white ring-2 ring-primary dark:ring-white' : 'border-neutral-200 dark:border-neutral-700'} transition-all duration-300 hover:shadow-lg ${!isPurchasable ? 'opacity-60' : ''}" 
//                  style="animation: fadeInUp 0.6s ease-out ${index * 0.1}s both;">
//               ${isPopular ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary dark:bg-white text-white dark:text-primary text-xs font-bold">POPULAR</div>' : ''}
              
//               <div class="text-center mb-4">
//                 <h3 class="text-lg font-bold text-primary dark:text-white">${plan.name}</h3>
//                 <div class="mt-2">
//                   <span class="text-3xl font-bold text-primary dark:text-white">${price}</span>
//                   ${plan.priceCents > 0 ? '<span class="text-neutral-500 dark:text-neutral-400">/month</span>' : ''}
//                 </div>
//               </div>
              
//               <ul class="space-y-3 mb-6 flex-1">
//                 <li class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
//                   <span class="material-symbols-outlined text-green-500 text-lg">check</span>
//                   ${shares} profile shares
//                 </li>
//                 <li class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
//                   <span class="material-symbols-outlined text-green-500 text-lg">check</span>
//                   ${bookings} interview bookings
//                 </li>
//                 <li class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
//                   <span class="material-symbols-outlined text-green-500 text-lg">check</span>
//                   Priority support
//                 </li>
//               </ul>
              
//               <button type="button" 
//                 ${isPurchasable ? `onclick="PaywallModal.selectPlan('${plan.code}')"` : 'disabled'}
//                 class="paywall-plan-button w-full h-12 font-bold transition-all duration-200 ${
//                   isPurchasable 
//                     ? isPopular 
//                       ? 'bg-primary dark:bg-white text-white dark:text-primary hover:opacity-90' 
//                       : 'border border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary'
//                     : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
//                 }">
//                 ${isPurchasable ? `Choose ${plan.name}` : 'Coming Soon'}
//               </button>
              
//               ${!isPurchasable ? '<p class="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">This plan will be available soon</p>' : ''}
//             </div>
//           `;
//         }).join('')}
//       </div>
//     `;
//   },
  
//   // Select a plan - redirect to Stripe checkout
//   async selectPlan(planId) {
//     try {
//       // Show loading state
//       const button = this.modal.querySelector(`button[onclick*="'${planId}'"]`);
//       if (button) {
//         button.disabled = true;
//         button.innerHTML = '<span class="animate-spin material-symbols-outlined">refresh</span> Processing...';
//       }
      
//       // Call checkout API
//       const response = await fetch('/api/checkout', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         body: JSON.stringify({ planId })
//       });
      
//       const data = await response.json();
      
//       if (data.checkoutUrl) {
//         window.location.href = data.checkoutUrl;
//       } else if (data.error) {
//         throw new Error(data.error);
//       }
//     } catch (error) {
//       console.error('[paywall] Checkout error:', error);
      
//       // Show error toast
//       this.showToast(error.message || 'Failed to start checkout. Please try again.', 'error');
      
//       // Reset button
//       const button = this.modal.querySelector(`button[onclick*="'${planId}'"]`);
//       if (button) {
//         button.disabled = false;
//         const plan = this.plans?.find(p => p.code === planId);
//         button.innerHTML = plan ? `Choose ${plan.name}` : 'Choose Plan';
//       }
//     }
//   },
  
//   // Show toast notification
//   showToast(message, type = 'info') {
//     const existing = document.querySelector('.paywall-toast');
//     if (existing) existing.remove();
    
//     const toast = document.createElement('div');
//     toast.className = 'paywall-toast fixed bottom-4 right-4 z-50 px-6 py-4 shadow-lg flex items-center gap-3 transition-all duration-300 transform translate-y-full';
    
//     if (type === 'success') {
//       toast.classList.add('bg-green-600', 'text-white');
//       toast.innerHTML = `<span class="material-symbols-outlined">check_circle</span><span>${message}</span>`;
//     } else if (type === 'error') {
//       toast.classList.add('bg-red-600', 'text-white');
//       toast.innerHTML = `<span class="material-symbols-outlined">error</span><span>${message}</span>`;
//     } else {
//       toast.classList.add('bg-primary', 'text-white');
//       toast.innerHTML = `<span class="material-symbols-outlined">info</span><span>${message}</span>`;
//     }
    
//     document.body.appendChild(toast);
    
//     // Animate in
//     requestAnimationFrame(() => {
//       toast.style.transform = 'translateY(0)';
//     });
    
//     // Auto remove
//     setTimeout(() => {
//       toast.style.transform = 'translateY(100%)';
//       setTimeout(() => toast.remove(), 300);
//     }, 4000);
//   },
  
//   // Open modal
//   async open(options = {}) {
//     this.createModal();
//     this.isOpen = true;
    
//     // Update subtitle
//     const subtitle = this.modal.querySelector('#paywall-subtitle');
//     if (subtitle && options.sharesUsed !== undefined) {
//       subtitle.textContent = `You've used ${options.sharesUsed} of ${options.sharesLimit} shares. Upgrade to share more profiles.`;
//     }
    
//     // Show modal with animation
//     this.modal.classList.remove('hidden');
//     document.body.style.overflow = 'hidden';
    
//     // Animate backdrop and content
//     requestAnimationFrame(() => {
//       const backdrop = this.modal.querySelector('.paywall-modal-backdrop');
//       const content = this.modal.querySelector('.paywall-modal-content');
      
//       backdrop.style.opacity = '1';
//       content.style.opacity = '1';
//       content.style.transform = 'scale(1)';
//     });
    
//     // Load and render plans
//     this.renderLoading();
    
//     try {
//       const plans = await this.fetchPlans();
//       this.renderPlans(plans);
//     } catch (error) {
//       this.renderError(error);
//     }
//   },
  
//   // Close modal
//   close() {
//     if (!this.modal || !this.isOpen) return;
    
//     const backdrop = this.modal.querySelector('.paywall-modal-backdrop');
//     const content = this.modal.querySelector('.paywall-modal-content');
    
//     // Animate out
//     backdrop.style.opacity = '0';
//     content.style.opacity = '0';
//     content.style.transform = 'scale(0.95)';
    
//     setTimeout(() => {
//       this.modal.classList.add('hidden');
//       this.isOpen = false;
//       document.body.style.overflow = '';
//     }, 300);
//   }
// };

// // Make available globally
// window.PaywallModal = PaywallModal;


// public/js/paywall-modal.js
// WP4 + WP7: Production-Grade Paywall Modal - Uses Real API Data Only
// Updated: context-aware modal + renders all 4 plans when viewing plans + fixes "Free" label for non-purchasable paid plans



//second ayyempt//



// const PaywallModal = {
//   modal: null,
//   isOpen: false,
//   plans: null,
//   isLoading: false,

//   // Context handling
//   context: 'paywall_share', // 'paywall_share' | 'subscription_upgrade' | 'subscription_view'
//   currentPlanCode: 'free',
//   popularPlanCode: 'pro',

//   // Create the modal HTML
//   createModal() {
//     if (this.modal) return;

//     const modalHTML = `
//       <div id="paywall-modal" class="fixed inset-0 z-50 hidden">
//         <!-- Backdrop -->
//         <div class="paywall-modal-backdrop fixed inset-0 bg-black/50 transition-opacity duration-300 opacity-0"></div>

//         <!-- Modal Container -->
//         <div class="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
//           <div class="paywall-modal-content relative w-full max-w-4xl bg-white dark:bg-neutral-900 shadow-xl transform transition-all duration-300 my-8 scale-95 opacity-0">
//             <!-- Close Button -->
//             <button type="button" class="paywall-modal-close absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 z-10 transition-colors duration-200">
//               <span class="material-symbols-outlined">close</span>
//             </button>

//             <!-- Modal Body -->
//             <div class="p-8">
//               <!-- Header -->
//               <div class="text-center mb-8">
//                 <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4 transition-all duration-300">
//                   <span class="material-symbols-outlined text-3xl text-amber-600">lock</span>
//                 </div>
//                 <h2 id="paywall-title" class="text-2xl font-bold text-primary dark:text-white">You've reached your limit</h2>
//                 <p class="text-neutral-600 dark:text-neutral-400 mt-2" id="paywall-subtitle">
//                   You've used your 1 free share. Upgrade to share more profiles.
//                 </p>
//               </div>

//               <!-- Plans Grid -->
//               <div id="paywall-plans">
//                 <!-- Plans will be inserted here -->
//               </div>

//               <!-- Features List -->
//               <div class="border-t border-neutral-200 dark:border-neutral-700 pt-6 mt-8">
//                 <h3 class="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">All paid plans include:</h3>
//                 <div class="grid grid-cols-2 gap-3 text-sm">
//                   <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
//                     <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
//                     Unlimited profile edits
//                   </div>
//                   <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
//                     <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
//                     Video interview hosting
//                   </div>
//                   <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
//                     <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
//                     Calendar integration
//                   </div>
//                   <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
//                     <span class="material-symbols-outlined text-green-500 text-lg">check_circle</span>
//                     Analytics dashboard
//                   </div>
//                 </div>
//               </div>

//             </div>
//           </div>
//         </div>
//       </div>

//       <!-- Professional Animation Styles -->
//       <style>
//         @keyframes fadeInUp {
//           from {
//             opacity: 0;
//             transform: translateY(30px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }

//         .paywall-plan-card:hover {
//           transform: translateY(-2px);
//         }

//         .paywall-plan-button:hover:not(:disabled) {
//           transform: scale(1.02);
//         }

//         .paywall-plan-button:active:not(:disabled) {
//           transform: scale(0.98);
//         }
//       </style>
//     `;

//     document.body.insertAdjacentHTML('beforeend', modalHTML);
//     this.modal = document.getElementById('paywall-modal');
//     this.bindEvents();
//   },

//   // Bind event handlers
//   bindEvents() {
//     if (!this.modal) return;

//     // Close button
//     this.modal.querySelector('.paywall-modal-close').addEventListener('click', () => this.close());

//     // Backdrop click
//     this.modal.querySelector('.paywall-modal-backdrop').addEventListener('click', () => this.close());

//     // ESC key
//     document.addEventListener('keydown', (e) => {
//       if (e.key === 'Escape' && this.isOpen) {
//         this.close();
//       }
//     });
//   },

//   // Fetch plans from API
//   async fetchPlans() {
//     if (this.plans) return this.plans;

//     try {
//       const response = await fetch('/api/plans', {
//         credentials: 'include'
//       });

//       if (!response.ok) {
//         throw new Error(`Failed to fetch plans: ${response.status}`);
//       }

//       this.plans = await response.json();

//       console.log("this plans ",this.plans);
      
//       return this.plans;
//     } catch (error) {
//       console.error('[paywall] Error fetching plans:', error);
//       throw error;
//     }
//   },

//   // Render loading state
//   renderLoading() {
//     const container = this.modal.querySelector('#paywall-plans');
//     if (!container) return;

//     container.innerHTML = `
//       <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
//         ${Array(3).fill(0).map(() => `
//           <div class="relative flex flex-col p-6 border border-neutral-200 dark:border-neutral-700 animate-pulse">
//             <div class="text-center mb-4">
//               <div class="h-6 bg-neutral-200 dark:bg-neutral-700 mb-2"></div>
//               <div class="h-8 bg-neutral-200 dark:bg-neutral-700"></div>
//             </div>
//             <div class="space-y-3 mb-6 flex-1">
//               <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
//               <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
//               <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
//             </div>
//             <div class="h-12 bg-neutral-200 dark:bg-neutral-700"></div>
//           </div>
//         `).join('')}
//       </div>
//     `;
//   },

//   // Render error state
//   renderError(error) {
//     const container = this.modal.querySelector('#paywall-plans');
//     if (!container) return;

//     container.innerHTML = `
//       <div class="text-center py-12">
//         <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
//           <span class="material-symbols-outlined text-3xl text-red-600">error</span>
//         </div>
//         <h3 class="text-lg font-semibold text-primary dark:text-white mb-2">Unable to load plans</h3>
//         <p class="text-neutral-600 dark:text-neutral-400 mb-4">
//           We're having trouble loading our pricing plans. Please try again later.
//         </p>
//         <button type="button" onclick="PaywallModal.retryLoadPlans()"
//           class="px-6 py-2 bg-primary text-white font-medium hover:opacity-90 transition-opacity">
//           Try Again
//         </button>
//       </div>
//     `;
//   },

//   // Retry loading plans
//   async retryLoadPlans() {
//     this.plans = null; // Clear cache
//     this.renderLoading();

//     try {
//       const plans = await this.fetchPlans();
//       this.renderPlans(plans);
//     } catch (error) {
//       this.renderError(error);
//     }
//   },

//   // Helpers
//   normalizeContext(ctx) {
//     if (!ctx) return 'paywall_share';
//     const allowed = ['paywall_share', 'subscription_upgrade', 'subscription_view'];
//     return allowed.includes(ctx) ? ctx : 'paywall_share';
//   },

//   // Render plans from API data
//   renderPlans(plans) {
//     const container = this.modal.querySelector('#paywall-plans');
//     if (!container) return;

//     if (!plans || plans.length === 0) {
//       this.renderError(new Error('No plans available'));
//       return;
//     }

//     // Decide what to show based on context:
//     // - paywall_share / subscription_upgrade => show paid plans only (existing behavior)
//     // - subscription_view => show all plans including free (so user sees current plan)
//     let visiblePlans = plans.slice();

//     if (this.context !== 'subscription_view') {
//       visiblePlans = visiblePlans.filter(plan => plan.code !== 'free');
//     }

//     // Stable ordering:
//     // Prefer known order for clarity; otherwise fallback to price
//     const order = ['free', 'starter', 'pro', 'premium'];
//     visiblePlans.sort((a, b) => {
//       const ai = order.indexOf(a.code);
//       const bi = order.indexOf(b.code);
//       if (ai !== -1 && bi !== -1) return ai - bi;
//       if (ai !== -1) return -1;
//       if (bi !== -1) return 1;
//       return (a.priceCents || 0) - (b.priceCents || 0);
//     });

//     if (visiblePlans.length === 0) {
//       this.renderError(new Error('No plans available'));
//       return;
//     }

//     // Popular badge:
//     // - Prefer a specific plan code (default "pro") if present.
//     // - Otherwise fallback to "middle" plan.
//     const popularIndexByCode = visiblePlans.findIndex(p => p.code === this.popularPlanCode);
//     const popularIndex = popularIndexByCode !== -1
//       ? popularIndexByCode
//       : (visiblePlans.length >= 3 ? 1 : Math.floor(visiblePlans.length / 2));

//     const columns = Math.min(visiblePlans.length, 3);

//     container.innerHTML = `
//       <div class="grid grid-cols-1 md:grid-cols-${columns} gap-4 mb-8">
//         ${visiblePlans.map((plan, index) => {
//           const isPopular = index === popularIndex && plan.code !== 'free';
//           const isPurchasable = !!plan.isPurchasable && !!plan.stripePriceId;
//           const isCurrentPlan = this.context === 'subscription_view' && plan.code === this.currentPlanCode;

//           const shares = plan.sharesLimit === 999999 ? 'Unlimited' : plan.sharesLimit;
//           const bookings = plan.bookingsLimit === 999999 ? 'Unlimited' : plan.bookingsLimit;

//           // Price label rules:
//           // - If purchasable and price > 0 => show $x /month
//           // - If not purchasable => show "Coming Soon" (avoid misleading "Free")
//           // - If free plan => show "Free"
//           let priceLabel = '';
//           let priceSuffix = '';

//           if (plan.code === 'free') {
//             priceLabel = 'Free';
//           } else if (!isPurchasable) {
//             priceLabel = 'Coming Soon';
//           } else if ((plan.priceCents || 0) > 0) {
//             priceLabel = `$${(plan.priceCents / 100).toFixed(0)}`;
//             priceSuffix = '/month';
//           } else {
//             // If a paid plan is purchasable but priceCents=0, show "$0" to avoid "Free"
//             priceLabel = '$0';
//             priceSuffix = '/month';
//           }

//           // Button rules:
//           // - Current plan => disabled "Current Plan"
//           // - Not purchasable => disabled "Coming Soon"
//           // - Purchasable => "Choose/Upgrade"
//           let buttonText = `Choose ${plan.name}`;
//           let buttonDisabled = false;

//           if (isCurrentPlan) {
//             buttonText = 'Current Plan';
//             buttonDisabled = true;
//           } else if (!isPurchasable) {
//             buttonText = 'Coming Soon';
//             buttonDisabled = true;
//           }

//           const subtitleNote = (!isPurchasable && plan.code !== 'free')
//             ? '<p class="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">This plan will be available soon</p>'
//             : (isCurrentPlan ? '<p class="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">You are on this plan</p>' : '');

//           const cardOpacity = (!isPurchasable && !isCurrentPlan && plan.code !== 'free') ? 'opacity-60' : '';

//           return `
//             <div class="paywall-plan-card relative flex flex-col p-6 border ${
//               isPopular
//                 ? 'border-primary dark:border-white ring-2 ring-primary dark:ring-white'
//                 : 'border-neutral-200 dark:border-neutral-700'
//             } transition-all duration-300 hover:shadow-lg ${cardOpacity}"
//               style="animation: fadeInUp 0.6s ease-out ${index * 0.1}s both;">

//               ${isPopular ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary dark:bg-white text-white dark:text-primary text-xs font-bold">POPULAR</div>' : ''}

//               <div class="text-center mb-4">
//                 <h3 class="text-lg font-bold text-primary dark:text-white">${plan.name}</h3>
//                 <div class="mt-2">
//                   <span class="text-3xl font-bold text-primary dark:text-white">${priceLabel}</span>
//                   ${priceSuffix ? `<span class="text-neutral-500 dark:text-neutral-400">${priceSuffix}</span>` : ''}
//                 </div>
//               </div>

//               <ul class="space-y-3 mb-6 flex-1">
//                 <li class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
//                   <span class="material-symbols-outlined text-green-500 text-lg">check</span>
//                   ${shares} profile shares
//                 </li>
//                 <li class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
//                   <span class="material-symbols-outlined text-green-500 text-lg">check</span>
//                   ${bookings} interview bookings
//                 </li>
//                 <li class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
//                   <span class="material-symbols-outlined text-green-500 text-lg">check</span>
//                   Priority support
//                 </li>
//               </ul>

//               <button type="button"
//                 ${buttonDisabled ? 'disabled' : `onclick="PaywallModal.selectPlan('${plan.code}')"`}
//                 class="paywall-plan-button w-full h-12 font-bold transition-all duration-200 ${
//                   buttonDisabled
//                     ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
//                     : (isPopular
//                         ? 'bg-primary dark:bg-white text-white dark:text-primary hover:opacity-90'
//                         : 'border border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary')
//                 }">
//                 ${buttonText}
//               </button>

//               ${subtitleNote}
//             </div>
//           `;
//         }).join('')}
//       </div>
//     `;
//   },

//   // Select a plan - redirect to Stripe checkout
//   async selectPlan(planId) {
//     try {
//       // Show loading state
//       const button = this.modal.querySelector(`button[onclick*="'${planId}'"]`);
//       if (button) {
//         button.disabled = true;
//         button.innerHTML = '<span class="animate-spin material-symbols-outlined">refresh</span> Processing...';
//       }

//       // Call checkout API
//       const response = await fetch('/api/checkout', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         body: JSON.stringify({ planId })
//       });

//       const data = await response.json();

//       if (data.checkoutUrl) {
//         window.location.href = data.checkoutUrl;
//       } else if (data.error) {
//         throw new Error(data.error);
//       } else {
//         throw new Error('Failed to start checkout.');
//       }
//     } catch (error) {
//       console.error('[paywall] Checkout error:', error);

//       // Show error toast
//       this.showToast(error.message || 'Failed to start checkout. Please try again.', 'error');

//       // Reset button
//       const button = this.modal.querySelector(`button[onclick*="'${planId}'"]`);
//       if (button) {
//         button.disabled = false;
//         const plan = this.plans?.find(p => p.code === planId);
//         button.innerHTML = plan ? `Choose ${plan.name}` : 'Choose Plan';
//       }
//     }
//   },

//   // Show toast notification
//   showToast(message, type = 'info') {
//     const existing = document.querySelector('.paywall-toast');
//     if (existing) existing.remove();

//     const toast = document.createElement('div');
//     toast.className = 'paywall-toast fixed bottom-4 right-4 z-50 px-6 py-4 shadow-lg flex items-center gap-3 transition-all duration-300 transform translate-y-full';

//     if (type === 'success') {
//       toast.classList.add('bg-green-600', 'text-white');
//       toast.innerHTML = `<span class="material-symbols-outlined">check_circle</span><span>${message}</span>`;
//     } else if (type === 'error') {
//       toast.classList.add('bg-red-600', 'text-white');
//       toast.innerHTML = `<span class="material-symbols-outlined">error</span><span>${message}</span>`;
//     } else {
//       toast.classList.add('bg-primary', 'text-white');
//       toast.innerHTML = `<span class="material-symbols-outlined">info</span><span>${message}</span>`;
//     }

//     document.body.appendChild(toast);

//     // Animate in
//     requestAnimationFrame(() => {
//       toast.style.transform = 'translateY(0)';
//     });

//     // Auto remove
//     setTimeout(() => {
//       toast.style.transform = 'translateY(100%)';
//       setTimeout(() => toast.remove(), 300);
//     }, 4000);
//   },

//   // Open modal
//   async open(options = {}) {
//     this.createModal();
//     this.isOpen = true;

//     // Context + current plan
//     this.context = this.normalizeContext(options.context);
//     this.currentPlanCode = options.currentPlanCode || this.currentPlanCode;

//     // Update title/subtitle based on context
//     const title = this.modal.querySelector('#paywall-title');
//     const subtitle = this.modal.querySelector('#paywall-subtitle');

//     if (this.context === 'paywall_share') {
//       if (title) title.textContent = "You've reached your limit";
//       if (subtitle) {
//         if (options.sharesUsed !== undefined && options.sharesLimit !== undefined) {
//           subtitle.textContent = `You've used ${options.sharesUsed} of ${options.sharesLimit} shares. Upgrade to share more profiles.`;
//         } else {
//           subtitle.textContent = "You've used your free share. Upgrade to share more profiles.";
//         }
//       }
//     } else if (this.context === 'subscription_upgrade') {
//       if (title) title.textContent = "Upgrade your plan";
//       if (subtitle) subtitle.textContent = "Choose a plan that fits your needs.";
//     } else if (this.context === 'subscription_view') {
//       if (title) title.textContent = "Plans";
//       if (subtitle) subtitle.textContent = "Compare available plans.";
//     }

//     // Show modal with animation
//     this.modal.classList.remove('hidden');
//     document.body.style.overflow = 'hidden';

//     // Animate backdrop and content
//     requestAnimationFrame(() => {
//       const backdrop = this.modal.querySelector('.paywall-modal-backdrop');
//       const content = this.modal.querySelector('.paywall-modal-content');

//       backdrop.style.opacity = '1';
//       content.style.opacity = '1';
//       content.style.transform = 'scale(1)';
//     });

//     // Load and render plans
//     this.renderLoading();

//     try {
//       const plans = await this.fetchPlans();
//       console.log('plans caught',plans);
      
//       this.renderPlans(plans);
//     } catch (error) {
//       this.renderError(error);
//     }
//   },

//   // Close modal
//   close() {
//     if (!this.modal || !this.isOpen) return;

//     const backdrop = this.modal.querySelector('.paywall-modal-backdrop');
//     const content = this.modal.querySelector('.paywall-modal-content');

//     // Animate out
//     backdrop.style.opacity = '0';
//     content.style.opacity = '0';
//     content.style.transform = 'scale(0.95)';

//     setTimeout(() => {
//       this.modal.classList.add('hidden');
//       this.isOpen = false;
//       document.body.style.overflow = '';
//     }, 300);
//   }
// };

// // Make available globally
// window.PaywallModal = PaywallModal;


//third attempt


// public/js/paywall-modal.js
// WP4 + WP7: Production-Grade Paywall Modal - Uses Real API Data Only
// Option A UX: Do NOT show "Free" as a card in the modal. Show "Current plan: X" in the header/subtitle.





const PaywallModal = {
  modal: null,
  isOpen: false,
  plans: null,
  isLoading: false,

  // Context handling
  // 'paywall_share' | 'paywall_booking' | 'subscription_upgrade' | 'subscription_view'
  context: 'paywall_share',
  currentPlanCode: null,
  popularPlanCode: 'pro',


  ensureMaterialSymbols() {
    // If already present, do nothing
    if (document.querySelector('link[data-material-symbols="outlined"]')) return;

    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('data-material-symbols', 'outlined');

    // Material Symbols Outlined (Google Fonts)
    link.href =
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0';

    document.head.appendChild(link);

    // Ensure the class has the correct font settings (some pages miss this CSS)
    if (!document.getElementById('material-symbols-outlined-css')) {
      const style = document.createElement('style');
      style.id = 'material-symbols-outlined-css';
      style.textContent = `
        .material-symbols-outlined{
          font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
          font-family:'Material Symbols Outlined';
          font-weight:normal;
          font-style:normal;
          display:inline-block;
          line-height:1;
          text-transform:none;
          letter-spacing:normal;
          white-space:nowrap;
          word-wrap:normal;
          direction:ltr;
          -webkit-font-smoothing:antialiased;
        }
      `;
      document.head.appendChild(style);
    }
  },


  // Create the modal HTML
  createModal() {
    if (this.modal) return;
    this.ensureMaterialSymbols();
    const modalHTML = `
      <div id="paywall-modal" class="fixed inset-0 z-50 hidden">
        <!-- Backdrop -->
        <div class="paywall-modal-backdrop fixed inset-0 bg-black/50 transition-opacity duration-300 opacity-0"></div>

        <!-- Scroll Container -->
        <div class="paywall-modal-scroll-wrapper fixed inset-0 z-10 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <div class="paywall-modal-content relative w-full max-w-4xl bg-white dark:bg-neutral-900 shadow-xl transform transition-all duration-300 scale-95 opacity-0 rounded-xl">
            <!-- Close Button -->
            <button type="button" class="paywall-modal-close absolute top-3 right-3 md:top-4 md:right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 z-10 transition-colors duration-200">
              <span class="material-symbols-outlined">close</span>
            </button>

            <!-- Modal Body -->
            <div class="p-5 md:p-8">
              <!-- Header -->
              <div class="text-center mb-6 md:mb-8">
                <div class="w-12 h-12 md:w-16 md:h-16 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3 md:mb-4 transition-all duration-300 rounded-full">
                  <span class="material-symbols-outlined text-2xl md:text-3xl text-amber-600">lock</span>
                </div>
                <h2 class="text-xl md:text-2xl font-bold text-primary dark:text-white" id="paywall-title">You've reached your limit</h2>

                <p class="text-sm md:text-base text-neutral-600 dark:text-neutral-400 mt-2" id="paywall-subtitle">
                  Upgrade to unlock more shares and bookings.
                </p>
              </div>

              <!-- Plans Grid -->
              <div id="paywall-plans">
                <!-- Plans will be inserted here -->
              </div>

              <!-- Features List -->
              <div class="border-t border-neutral-200 dark:border-neutral-700 pt-6 mt-6 md:mt-8">
                <h3 class="text-xs md:text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">All paid plans include:</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
                  <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check_circle</span>
                    Unlimited profile edits
                  </div>
                  <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check_circle</span>
                    Video interview hosting
                  </div>
                  <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check_circle</span>
                    Calendar integration
                  </div>
                  <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check_circle</span>
                    Analytics dashboard
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- Professional Animation Styles -->
      <style>
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .paywall-plan-card:hover {
          transform: translateY(-2px);
        }

        .paywall-plan-button:hover:not(:disabled) {
          transform: scale(1.02);
        }

        .paywall-plan-button:active:not(:disabled) {
          transform: scale(0.98);
        }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('paywall-modal');
    this.bindEvents();
  },

  // Bind event handlers
  bindEvents() {
    if (!this.modal) return;

    // Close button
    this.modal.querySelector('.paywall-modal-close').addEventListener('click', () => this.close());

    // Backdrop click
    this.modal.querySelector('.paywall-modal-backdrop').addEventListener('click', () => this.close());

    // Scroll wrapper click (outside modal)
    const scrollWrapper = this.modal.querySelector('.paywall-modal-scroll-wrapper');
    if (scrollWrapper) {
      scrollWrapper.addEventListener('click', (e) => {
        if (!e.target.closest('.paywall-modal-content')) {
          this.close();
        }
      });
    }

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  // Fetch plans from API
  async fetchPlans() {
    if (this.plans) return this.plans;

    const response = await fetch('/api/plans', { credentials: 'include' });
    if (!response.ok) throw new Error(`Failed to fetch plans: ${response.status}`);

    this.plans = await response.json();
    return this.plans;
  },

  // Render loading state
  renderLoading() {
    const container = this.modal.querySelector('#paywall-plans');
    if (!container) return;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        ${Array(3).fill(0).map(() => `
          <div class="relative flex flex-col p-6 border border-neutral-200 dark:border-neutral-700 animate-pulse">
            <div class="text-center mb-4">
              <div class="h-6 bg-neutral-200 dark:bg-neutral-700 mb-2"></div>
              <div class="h-8 bg-neutral-200 dark:bg-neutral-700"></div>
            </div>
            <div class="space-y-3 mb-6 flex-1">
              <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
              <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
              <div class="h-4 bg-neutral-200 dark:bg-neutral-700"></div>
            </div>
            <div class="h-12 bg-neutral-200 dark:bg-neutral-700"></div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // Render error state
  renderError(error) {
    const container = this.modal.querySelector('#paywall-plans');
    if (!container) return;

    container.innerHTML = `
      <div class="text-center py-12">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <span class="material-symbols-outlined text-3xl text-red-600">error</span>
        </div>
        <h3 class="text-lg font-semibold text-primary dark:text-white mb-2">Unable to load plans</h3>
        <p class="text-neutral-600 dark:text-neutral-400 mb-4">
          We're having trouble loading our pricing plans. Please try again later.
        </p>
        <button type="button" onclick="PaywallModal.retryLoadPlans()"
          class="px-6 py-2 bg-primary text-white font-medium hover:opacity-90 transition-opacity">
          Try Again
        </button>
      </div>
    `;
  },

  // Retry loading plans
  async retryLoadPlans() {
    this.plans = null; // Clear cache
    this.renderLoading();

    try {
      const plans = await this.fetchPlans();
      this.renderPlans(plans);
    } catch (error) {
      this.renderError(error);
    }
  },

  // Internal helpers
  getPlanLabel(code) {
    if (!code) return 'Free';
    const fromAPI = this.plans?.find(p => p.code === code)?.name;
    return fromAPI || (code.charAt(0).toUpperCase() + code.slice(1));
  },

  updateHeader(options = {}) {
    const titleEl = this.modal.querySelector('#paywall-title');
    const subtitleEl = this.modal.querySelector('#paywall-subtitle');

    const planLabel = this.getPlanLabel(this.currentPlanCode);

    const sharesUsed = options.sharesUsed;
    const sharesLimit = options.sharesLimit;
    const bookingsUsed = options.bookingsUsed;
    const bookingsLimit = options.bookingsLimit;

    // Title by context
    if (titleEl) {
      if (this.context === 'subscription_view') titleEl.textContent = 'Plans';
      else titleEl.textContent = "You've reached your limit";
    }

    // Subtitle — Option A: show current plan here (no free card)
    if (subtitleEl) {
      const parts = [];
      parts.push(`Current plan: ${planLabel}`);

      // Prefer explicit usage if available
      if (typeof sharesUsed === 'number' && typeof sharesLimit === 'number') {
        parts.push(`You've used ${sharesUsed} of ${sharesLimit} shares.`);
      }

      if (typeof bookingsUsed === 'number' && typeof bookingsLimit === 'number') {
        parts.push(`You've used ${bookingsUsed} of ${bookingsLimit} bookings.`);
      }

      // Context-specific CTA
      if (this.context === 'paywall_booking') {
        parts.push('Upgrade to unlock more bookings.');
      } else if (this.context === 'subscription_view') {
        parts.push('Choose a plan that fits your needs.');
      } else {
        parts.push('Upgrade to unlock more shares and bookings.');
      }

      subtitleEl.textContent = parts.join(' ');
    }
  },

  // Render plans from API data
  renderPlans(plans) {
    const container = this.modal.querySelector('#paywall-plans');
    if (!container) return;

    if (!plans || plans.length === 0) {
      this.renderError(new Error('No plans available'));
      return;
    }

    // Option A: Filter out FREE plan (do not show as a card)
    const paidPlans = plans
      .filter(plan => plan.code !== 'free')
      .sort((a, b) => (a.priceCents || 0) - (b.priceCents || 0));

    if (paidPlans.length === 0) {
      this.renderError(new Error('No paid plans available'));
      return;
    }

    // Popular plan selection:
    // 1) If popularPlanCode exists in list => mark it
    // 2) else fallback: if 3+ plans => middle; else => first
    let popularIndex = paidPlans.findIndex(p => p.code === this.popularPlanCode);
    if (popularIndex === -1) {
      popularIndex = paidPlans.length >= 3 ? 1 : 0;
    }

    // Grid columns: keep max 3 in one row (matches your current design)
    const gridCols = Math.min(paidPlans.length, 3);

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-${gridCols} gap-4 mb-8">
        ${paidPlans.map((plan, index) => {
          const isPopular = index === popularIndex;
          const isPurchasable = !!plan.isPurchasable;
          const price = (plan.priceCents && plan.priceCents > 0)
            ? `$${(plan.priceCents / 100).toFixed(0)}`
            : 'Free'; // (If you set cents later, it will render properly)

          // Conversions and formatting
          const videoLimitGB = (plan.videoStorageLimitBytes / (1024 * 1024 * 1024)).toFixed(1);
          const docLimitGB = (plan.docStorageLimitBytes / (1024 * 1024 * 1024)).toFixed(1);
          const resumeLimitMB = (plan.maxResumeFileSizeBytes / (1024 * 1024)).toFixed(0);
          const maxInterviewMinutes = Math.floor(plan.maxInterviewLengthSeconds / 60);

          const shares = (plan.sharesLimit === null || plan.sharesLimit === 999999) ? 'Unlimited' : plan.sharesLimit;
          const bookings = (plan.bookingsLimit === null || plan.bookingsLimit === 999999) ? 'Unlimited' : plan.bookingsLimit;
          const views = (plan.viewsLimit === null || plan.viewsLimit === 999999) ? 'Unlimited' : plan.viewsLimit;

          return `
            <div class="paywall-plan-card relative flex flex-col p-4 md:p-6 border ${
              isPopular
                ? 'border-primary dark:border-white ring-2 ring-primary dark:ring-white'
                : 'border-neutral-200 dark:border-neutral-700'
            } transition-all duration-300 hover:shadow-lg ${!isPurchasable ? 'opacity-60' : ''}"
                 style="animation: fadeInUp 0.6s ease-out ${index * 0.1}s both;">

              ${isPopular ? `
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary dark:bg-white text-white dark:text-primary text-[10px] md:text-xs font-bold rounded-b-lg shadow-sm">
                  POPULAR
                </div>
              ` : ''}

              <div class="text-center mb-3 md:mb-4">
                <h3 class="text-base md:text-lg font-bold text-primary dark:text-white">${plan.name}</h3>
                <div class="mt-1 md:mt-2">
                  <span class="text-2xl md:text-3xl font-bold text-primary dark:text-white">${isPurchasable ? price : 'Coming Soon'}</span>
                  ${isPurchasable && plan.priceCents > 0 ? '<span class="text-xs md:text-sm text-neutral-500 dark:text-neutral-400">/month</span>' : ''}
                </div>
              </div>

              <ul class="space-y-2 md:space-y-3 mb-4 md:mb-6 flex-1">
                <li class="flex items-center gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
                  <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check</span>
                  ${shares} Shares (Active/Published Profiles)
                </li>
                <li class="flex items-center gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
                  <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check</span>
                  ${bookings} interview bookings
                </li>
                <li class="flex items-center gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
                  <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check</span>
                  ${views} profile views
                </li>
                <li class="flex items-center gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
                  <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check</span>
                  ${maxInterviewMinutes} mins max video length
                </li>
                <li class="flex items-center gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
                  <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check</span>
                  ${videoLimitGB} GB video storage
                </li>
                <li class="flex items-center gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
                  <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check</span>
                  ${docLimitGB} GB doc storage
                </li>
                <li class="flex items-center gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
                  <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check</span>
                  ${resumeLimitMB} MB max resume size
                </li>
                <li class="flex items-center gap-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-300">
                  <span class="material-symbols-outlined text-green-500 text-base md:text-lg">check</span>
                  Priority support
                </li>
              </ul>

              <button type="button"
                ${isPurchasable ? `onclick="PaywallModal.selectPlan('${plan.code}')"` : 'disabled'}
                class="paywall-plan-button w-full h-10 md:h-12 text-sm md:text-base font-bold transition-all duration-200 rounded-lg ${
                  isPurchasable
                    ? isPopular
                      ? 'bg-primary dark:bg-white text-white dark:text-primary hover:opacity-90'
                      : 'border border-primary dark:border-white text-primary dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
                }">
                ${isPurchasable ? `Choose ${plan.name}` : 'Coming Soon'}
              </button>

              ${!isPurchasable ? '<p class="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">This plan will be available soon</p>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // Select a plan - redirect to Stripe checkout
  async selectPlan(planId) {
    try {
      // Show loading state
      const button = this.modal.querySelector(`button[onclick*="'${planId}'"]`);
      if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="animate-spin material-symbols-outlined">refresh</span> Processing...';
      }

      // Call checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId })
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.error) throw new Error(data.error);
      throw new Error('Failed to start checkout.');

    } catch (error) {
      console.error('[paywall] Checkout error:', error);
      this.showToast(error.message || 'Failed to start checkout. Please try again.', 'error');

      // Reset button
      const button = this.modal.querySelector(`button[onclick*="'${planId}'"]`);
      if (button) {
        button.disabled = false;
        const plan = this.plans?.find(p => p.code === planId);
        button.innerHTML = plan ? `Choose ${plan.name}` : 'Choose Plan';
      }
    }
  },

  // Show toast notification
  showToast(message, type = 'info') {
    const existing = document.querySelector('.paywall-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'paywall-toast fixed bottom-4 right-4 z-50 px-6 py-4 shadow-lg flex items-center gap-3 transition-all duration-300 transform translate-y-full';

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

    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.transform = 'translateY(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Open modal
  async open(options = {}) {
    this.createModal();
    this.isOpen = true;

    // Update context + current plan
    this.context = options.context || this.context || 'paywall_share';
    // accept either { plan } or { currentPlanCode } to be backward compatible
    this.currentPlanCode = options.currentPlanCode || options.plan || this.currentPlanCode || 'free';

    // Show modal with animation
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Animate backdrop and content
    requestAnimationFrame(() => {
      const backdrop = this.modal.querySelector('.paywall-modal-backdrop');
      const content = this.modal.querySelector('.paywall-modal-content');

      backdrop.style.opacity = '1';
      content.style.opacity = '1';
      content.style.transform = 'scale(1)';
    });

    // Loading state
    this.renderLoading();

    try {
      const plans = await this.fetchPlans();
      // Use plan names from API when available (improves "Current plan: X" text)
      this.updateHeader(options);
      this.renderPlans(plans);
    } catch (error) {
      this.updateHeader(options);
      this.renderError(error);
    }
  },

  // Close modal
  close() {
    if (!this.modal || !this.isOpen) return;

    const backdrop = this.modal.querySelector('.paywall-modal-backdrop');
    const content = this.modal.querySelector('.paywall-modal-content');

    backdrop.style.opacity = '0';
    content.style.opacity = '0';
    content.style.transform = 'scale(0.95)';

    setTimeout(() => {
      this.modal.classList.add('hidden');
      this.isOpen = false;
      document.body.style.overflow = '';
    }, 300);
  }
};

// Make available globally
window.PaywallModal = PaywallModal;
