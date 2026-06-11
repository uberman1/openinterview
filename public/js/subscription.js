// public/js/subscription.js
import { store } from './data-store.js';

function init() {
    const manageInStripeBtn = document.querySelector('[data-action="manage-in-stripe"]');

    if (manageInStripeBtn) {
        manageInStripeBtn.addEventListener('click', async () => {
            const response = await fetch('/api/billing/portal', {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.url) {
                throw new Error(data.error || 'Unable to open Stripe billing portal');
            }
            window.location.href = data.url;
        });
    }
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
