(async () => {
    const params = new URLSearchParams(location.search);
    let bookingId = params.get('bookingId');
    let token = params.get('token');

    const loadingState = document.getElementById('loading-state');
    const successState = document.getElementById('success-state');
    const errorState = document.getElementById('error-state');
    const detailsText = document.getElementById('booking-details');
    const errorText = document.getElementById('error-message');

    function showState(state) {
        loadingState.classList.add('hidden');
        successState.classList.add('hidden');
        errorState.classList.add('hidden');
        state.classList.remove('hidden');
        state.classList.add('flex');
    }

    if (!bookingId || !token) {
        errorText.textContent = "Invalid cancellation link.";
        showState(errorState);
        return;
    }

    // Attempt to fetch booking details for nicer UI
    let bookingInfo = null;
    try {
        const res = await fetch(`/api/public/bookings/${bookingId}?token=${encodeURIComponent(token)}`);
        if (res.ok) bookingInfo = await res.json();
    } catch (e) {
        console.warn('Could not fetch booking details', e);
    }

    // Execute Cancellation
    const endpoints = [
        { url: `/api/public/bookings/${bookingId}/cancel?token=${encodeURIComponent(token)}`, method: 'POST' },
        { url: `/api/bookings/${bookingId}/cancel`, method: 'POST' }
    ];

    let cancelled = false;
    let cancellationSms = null;
    for (const ep of endpoints) {
        try {
            const r = await fetch(ep.url, { 
                method: ep.method, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) 
            });
            
            if (r.ok) {
                const data = await r.json().catch(() => ({}));
                cancellationSms = data?.sms || null;
                cancelled = true;
                break;
            } else {
                // If already cancelled, check response or status
                // Some APIs might return 400 or 404 if already cancelled
                const data = await r.json().catch(() => ({}));
                if (r.status === 400 && (data.error?.includes('already cancelled') || data.message?.includes('already cancelled'))) {
                    cancelled = true;
                    break;
                }
                // Check if the booking status is already cancelled from the fetch
                if (bookingInfo && bookingInfo.status === 'cancelled') {
                    cancelled = true;
                    break;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
    
    // Double check status if fetch succeeded but cancel call failed (maybe already cancelled)
    if (!cancelled && bookingInfo && bookingInfo.status === 'cancelled') {
        cancelled = true;
    }

    if (cancelled) {
        if (bookingInfo) {
            const start = new Date(bookingInfo.start || bookingInfo.startTime); // Handle potential field naming diffs
            let dateStr = 'the scheduled time';
            if (!isNaN(start.getTime())) {
                dateStr = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(start);
            }
            const name = bookingInfo.candidate?.name || bookingInfo.profileName || 'Candidate';
            detailsText.textContent = `Your interview with ${name} on ${dateStr} has been cancelled.`;
        } else {
            detailsText.textContent = "Your booking has been successfully cancelled.";
        }
        showState(successState);
        if (cancellationSms?.attempted && cancellationSms.success === false) {
            showSmsFailureModal(`Cancellation succeeded, but SMS could not be sent: ${cancellationSms.errorMessage || 'Unknown SMS error'}`);
        }
    } else {
        errorText.textContent = "Could not cancel the booking. It may have already been cancelled or the link is expired.";
        showState(errorState);
    }
})();

function showSmsFailureModal(msg) {
    let modal = document.getElementById('sms-failure-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sms-failure-modal';
        modal.className = 'fixed inset-0 z-[120] hidden items-center justify-center bg-black/40 p-4';
        modal.innerHTML = `
          <div class="w-full max-w-md rounded-xl bg-white dark:bg-background-dark p-5 shadow-2xl">
            <div class="flex items-start justify-between mb-3">
              <h3 class="text-lg font-bold text-primary dark:text-white">SMS Notification Failed</h3>
              <button id="sms-failure-close" class="text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <p class="text-sm text-primary/80 dark:text-white/80 mb-4" id="sms-failure-text"></p>
            <div class="flex justify-end">
              <button id="sms-failure-ok" class="rounded bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">OK</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const close = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };
        modal.querySelector('#sms-failure-close')?.addEventListener('click', close);
        modal.querySelector('#sms-failure-ok')?.addEventListener('click', close);
    }

    const text = modal.querySelector('#sms-failure-text');
    if (text) text.textContent = msg || 'SMS could not be sent.';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}