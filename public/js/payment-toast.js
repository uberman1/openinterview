// public/js/payment-toast.js
// WP11: Payment Success/Cancel Modal Notifications (Modified from Toast)

(function initPaymentModal() {
  const params = new URLSearchParams(window.location.search);
  
  // Check for payment success
  if (params.get('payment') === 'success' || params.get('upgraded') === 'true') {
    showPaymentModal(
      'Payment Successful!', 
      'Your subscription has been upgraded successfully. You now have access to all premium features.', 
      'success'
    );
    cleanUrl();
  }
  
  // Check for payment cancelled
  if (params.get('payment') === 'cancelled' || params.get('cancelled') === 'true') {
    showPaymentModal(
      'Payment Cancelled', 
      'The payment process was cancelled. No charges were made to your account.', 
      'error'
    );
    cleanUrl();
  }
  
  function showPaymentModal(title, message, type) {
    // Remove any existing modal
    const existing = document.getElementById('payment-modal');
    if (existing) existing.remove();
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'payment-modal';
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm opacity-0 transition-opacity duration-300 ease-out';
    
    const iconHtml = type === 'success' 
      ? `<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
           <span class="material-symbols-outlined text-4xl text-green-600 dark:text-green-500">check_circle</span>
         </div>`
      : `<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
           <span class="material-symbols-outlined text-4xl text-red-600 dark:text-red-500">error</span>
         </div>`;

    const buttonClass = type === 'success'
      ? 'bg-primary text-white hover:bg-primary/90 dark:bg-white dark:text-primary dark:hover:bg-gray-100'
      : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600';

    // Create modal content
    modal.innerHTML = `
      <div class="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform scale-95 opacity-0 transition-all duration-300 ease-out border border-neutral-200 dark:border-neutral-800">
        <div class="p-8 text-center">
          ${iconHtml}
          <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">${title}</h3>
          <p class="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">${message}</p>
          <button id="close-payment-modal" class="w-full py-3 px-4 ${buttonClass} font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            ${type === 'success' ? 'Continue' : 'Close'}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Trigger animation
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      const content = modal.querySelector('div > div');
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    });
    
    // Close function
    const closeModal = () => {
      modal.classList.add('opacity-0');
      const content = modal.querySelector('div > div');
      content.classList.remove('scale-100', 'opacity-100');
      content.classList.add('scale-95', 'opacity-0');
      
      setTimeout(() => {
        modal.remove();
      }, 300);
    };

    // Add event listener to close button
    document.getElementById('close-payment-modal').addEventListener('click', closeModal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  function cleanUrl() {
    // Remove query params from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('upgraded');
    url.searchParams.delete('cancelled');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.pathname);
  }
})();
