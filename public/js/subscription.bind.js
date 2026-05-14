// public/js/subscription.bind.js
// Subscription page binder – DB-driven, with skeleton loading UX

(async function initSubscription() {
  // Show skeleton loading immediately
  showSkeletonLoading();
  
  // 1) Auth guard
  try {
    const authRes = await fetch('/auth/me', { credentials: 'include' });
    if (authRes.status === 401 || authRes.status === 403) {
      window.location.href = '/login-page.html?returnTo=/subscription.html';
      return;
    }
    if (!authRes.ok) {
      console.warn('[subscription] Skipping strict auth redirect for transient status:', authRes.status);
    }
  } catch (err) {
    console.warn('[subscription] Auth check failed, continuing without redirect:', err);
  }

  // 2) Load subscription + usage data
  try {
    const res = await fetch('/api/dashboard', { credentials: 'include' });
    if (!res.ok) {
      console.error('[subscription] /api/dashboard failed:', res.status);
      hideSkeletonLoading();
      showError('Failed to load subscription data');
      return;
    }

    const data = await res.json();
    console.log('[subscription] Loaded:', data);

    // Hide skeleton and show real content
    hideSkeletonLoading();
    buildCompleteContent(data);

  } catch (err) {
    console.error('[subscription] Fatal error:', err);
    hideSkeletonLoading();
    showError('Error loading subscription data');
  } finally {
    // Hide global loader with fade out
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }
})();

/* ----------------------- skeleton loading ----------------------- */

function showSkeletonLoading() {
  const contentContainer = document.getElementById('subscription-content');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = `
    <!-- Skeleton for Current Plan -->
    <div class="bg-white dark:bg-primary/5 p-6 rounded-lg border border-primary/5 dark:border-white/5">
      <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4 animate-pulse"></div>
      <div class="flex items-center justify-between">
        <div class="space-y-2">
          <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
        </div>
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
      </div>
    </div>
    
    <!-- Skeleton for Payment Method -->
    <div class="bg-white dark:bg-primary/5 p-6 rounded-lg border border-primary/5 dark:border-white/5">
      <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4 animate-pulse"></div>
      <div class="flex items-center justify-between">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 animate-pulse"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
      </div>
    </div>
    
    <!-- Skeleton for Billing History -->
    <div class="bg-white dark:bg-primary/5 p-6 rounded-lg border border-primary/5 dark:border-white/5">
      <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-4 animate-pulse"></div>
      <div class="space-y-3">
        <div class="flex items-center justify-between py-3">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        <div class="flex items-center justify-between py-3">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
      </div>
    </div>
    
    <!-- Skeleton for Footer Button -->
    <div class="flex justify-end pt-4">
      <div class="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse"></div>
    </div>
  `;
}

function hideSkeletonLoading() {
  // Content will be replaced by real content in buildCompleteContent
}

function showError(message) {
  const contentContainer = document.getElementById('subscription-content');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = `
    <div class="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
      <div class="flex items-center">
        <div class="text-red-600 dark:text-red-400">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
          <p class="text-sm text-red-700 dark:text-red-300 mt-1">${message}</p>
        </div>
      </div>
    </div>
  `;
}

/* ----------------------- helpers ----------------------- */

function num(v, d = 0) {
  return Number.isFinite(Number(v)) ? Number(v) : d;
}

function planLabel(code) {
  switch ((code || 'free').toLowerCase()) {
    case 'starter': return 'Starter Plan';
    case 'pro': return 'Pro Plan';
    case 'premium': return 'Premium Plan';
    default: return 'Free Plan';
  }
}

function openPlansModal(data) {
  if (!window.PaywallModal || typeof window.PaywallModal.open !== 'function') {
    console.warn('[subscription] PaywallModal not available');
    return;
  }

  const c = data?.credits || {};

  window.PaywallModal.open({
    context: 'subscription_upgrade',
    plan: c.plan || 'free',
    sharesUsed: Number(c.sharesUsed) || 0,
    sharesLimit: c.sharesLimit === null ? null : (Number(c.sharesLimit) || 1),
    bookingsUsed: Number(c.bookingsUsed) || 0,
    bookingsLimit: c.bookingsLimit === null ? null : (Number(c.bookingsLimit) || 0)
  });
}

async function openStripePortal(button) {
  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = 'Opening...';
  }

  try {
    const response = await fetch('/api/billing/portal', {
      method: 'POST',
      credentials: 'include'
    });

    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }

    if (response.status === 401 || response.status === 403) {
      window.location.href = '/login-page.html?returnTo=/subscription.html';
      return;
    }

    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Unable to open Stripe billing portal');
    }

    window.location.href = data.url;
  } catch (error) {
    console.error('[subscription] Stripe portal error:', error);
    alert(error.message || 'Unable to open Stripe billing portal. Please try again.');
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

/* ----------------------- content building ----------------------- */

function buildCompleteContent(data) {
  const contentContainer = document.getElementById('subscription-content');
  if (!contentContainer) return;

  const c = data?.credits || {};
  const plan = c.plan || 'free';
  
  contentContainer.innerHTML = `
    <!-- Current Plan -->
    <div class="bg-white dark:bg-primary/5 p-6 rounded-lg border border-primary/5 dark:border-white/5 animate-[fadeIn_0.5s_ease-out]">
      <h3 class="text-base font-semibold leading-6 text-primary dark:text-white">
        Current Plan
      </h3>

      <div class="mt-4 flex items-center justify-between">
        <div>
          <p class="text-lg font-semibold text-primary dark:text-white">
            ${planLabel(plan)}
          </p>
          <p class="mt-1 text-sm text-primary/60 dark:text-white/60">
            ${num(c.sharesUsed)}/${c.sharesLimit === null ? 'Unlimited' : num(c.sharesLimit)} shares •
            ${num(c.bookingsUsed)}/${c.bookingsLimit === null ? 'Unlimited' : num(c.bookingsLimit)} bookings
          </p>
        </div>

        ${
          plan === 'free'
            ? `<button id="sub-upgrade"
                class="text-sm font-medium text-blue-600 hover:text-blue-700">
                View Plans
              </button>`
            : `<span class="text-sm font-semibold text-green-600">Active</span>`
        }
      </div>
    </div>
    
    <!-- Payment Method -->
    <div class="bg-white dark:bg-primary/5 p-6 rounded-lg border border-primary/5 dark:border-white/5 animate-[fadeIn_0.5s_ease-out_0.1s_both]">
      <h3 class="text-base font-semibold leading-6 text-primary dark:text-white">
        Payment Method
      </h3>

      <div class="mt-4 flex items-center justify-between">
        <p class="text-sm text-primary/60 dark:text-white/60">
          ${plan === 'free'
            ? 'No payment method required for free plan'
            : 'Payment method is managed through Stripe'}
        </p>
        ${
          plan !== 'free'
            ? `<button id="sub-manage-payment"
                class="text-sm font-medium text-primary dark:text-white hover:text-primary/80 dark:hover:text-white/80">
                Manage
              </button>`
            : ''
        }
      </div>
    </div>
    
    <!-- Billing History -->
    <div class="bg-white dark:bg-primary/5 p-6 rounded-lg border border-primary/5 dark:border-white/5 animate-[fadeIn_0.5s_ease-out_0.2s_both]">
      <h3 class="text-base font-semibold leading-6 text-primary dark:text-white">
        Billing History
      </h3>

      <div class="mt-4">
        <p class="text-sm text-primary/60 dark:text-white/60">
          ${plan === 'free'
            ? 'No billing history for free plan'
            : 'Billing history is managed through Stripe'}
        </p>
      </div>
    </div>
    
    <!-- Footer Button -->
    <div class="flex justify-end pt-4 animate-[fadeIn_0.5s_ease-out_0.3s_both]">
      <button id="manage-stripe-btn" class="bg-primary text-white dark:bg-white dark:text-primary px-6 py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 dark:hover:bg-white/90 transition-colors">
        ${plan === 'free' ? 'View Plans' : 'Manage in Stripe'}
      </button>
    </div>
  `;
  
  // Attach event listeners
  const upgradeBtn = contentContainer.querySelector('#sub-upgrade');
  if (upgradeBtn) {
    upgradeBtn.onclick = () => openPlansModal(data);
  }
  
  const managePaymentBtn = contentContainer.querySelector('#sub-manage-payment');
  if (managePaymentBtn) {
    managePaymentBtn.onclick = () => openStripePortal(managePaymentBtn);
  }
  
  const manageBtn = contentContainer.querySelector('#manage-stripe-btn');
  if (manageBtn) {
    manageBtn.onclick = () => {
      if (plan === 'free') {
        openPlansModal(data);
      } else {
        openStripePortal(manageBtn);
      }
    };
  }
}
