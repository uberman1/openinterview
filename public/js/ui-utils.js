// UI Utilities for Profile Edit and other pages

window.showErrorModal = function(message, title = 'Error') {
    const modal = document.getElementById('error-modal');
    const titleEl = document.getElementById('error-modal-title');
    const msgEl = document.getElementById('error-modal-message');
    
    if (!modal || !titleEl || !msgEl) {
        // Fallback if modal not found
        console.warn('Error modal elements not found, falling back to alert');
        alert(`${title}: ${message}`);
        return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Small delay to allow display:block to apply before opacity transition
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    });
};

window.hideErrorModal = function() {
    const modal = document.getElementById('error-modal');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

// Bind close events when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('close-error-modal')?.addEventListener('click', window.hideErrorModal);
    document.getElementById('error-modal-action')?.addEventListener('click', window.hideErrorModal);
});
