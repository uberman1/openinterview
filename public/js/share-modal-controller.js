/**
 * Shared Share Modal Controller
 * Handles the logic for the share modal on both Dashboard and Owner Preview pages.
 * Dependencies: ShareProfile (global)
 */
const ShareModalController = {
    modalId: 'share-modal',
    profile: null, // { id, visibility, handle, publicUrl, wasDraft }

    init() {
        if (this.initialized) return;
        
        const modal = document.getElementById(this.modalId);
        if (!modal) return;

        this.initialized = true;

        // Close button
        modal.querySelector('[data-action="close-share-modal"]')?.addEventListener('click', () => {
            this.close();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        // Copy Link button
        modal.querySelector('[data-action="copy-link"]')?.addEventListener('click', async () => {
            await this.handleShareAction('copy');
        });

        // Send Invite button
        modal.querySelector('[data-action="send-invite"]')?.addEventListener('click', async () => {
            await this.handleShareAction('invite');
        });
    },

    open(profileData) {
        this.profile = {
            id: profileData.id || profileData._id || profileData.profileId,
            visibility: profileData.visibility || 'public', // Default to public if not specified
            handle: profileData.handle || profileData.publicHandle,
            wasDraft: false
        };

        const modal = document.getElementById(this.modalId);
        if (modal) {
            // Reset inputs
            const emailInput = modal.querySelector('input[placeholder="Enter email address"]');
            const messageInput = modal.querySelector('textarea[placeholder="Add a personal message (optional)"]');
            if (emailInput) emailInput.value = '';
            if (messageInput) messageInput.value = '';

            modal.classList.remove('hidden');
            modal.classList.add('flex');
        } else {
            console.error('Share modal element not found');
        }
    },

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        
        // If we published a draft profile, reload to update UI
        if (this.profile && this.profile.wasDraft) {
            window.location.reload();
        }
    },

    async handleShareAction(action) {
        if (!this.profile) return;
        
        const modal = document.getElementById(this.modalId);
        let btn;
        if (action === 'copy') {
            btn = modal.querySelector('[data-action="copy-link"]');
        } else if (action === 'invite') {
            btn = modal.querySelector('[data-action="send-invite"]');
        }
        
        if (!btn) return;

        // Save original state
        const originalText = btn.innerHTML;
        
        try {
            // Set loading state immediately
            btn.disabled = true;
            
            // Use different spinner colors based on button type
            // Copy button is light (gray-100), Invite button is primary (black)
            const spinnerColorClass = action === 'copy' ? 'border-primary' : 'border-white';
            const loadingText = action === 'copy' ? 'Processing...' : 'Sending...';
            
            btn.innerHTML = `
                <div class="flex items-center justify-center gap-2">
                    <div class="w-4 h-4 border-2 ${spinnerColorClass}/30 border-t-${spinnerColorClass.split('-')[1]} rounded-full animate-spin"></div>
                    <span>${loadingText}</span>
                </div>
            `;

            let { id, visibility, handle } = this.profile;
            
            // Step 1: Ensure profile is public (Status Changing Logic)
            if (visibility !== 'public') {
                if (window.ShareProfile) {
                    try {
                        // Triggers paywall/credits check
                        // suppressSuccessModal: true -> because we are in the modal, we just want to proceed
                        const result = await window.ShareProfile.share(id, { suppressSuccessModal: true });
                        if (!result) {
                            // Cancelled/Failed
                            return; 
                        }

                        // Update state
                        this.profile.visibility = 'public';
                        this.profile.wasDraft = true;
                        
                        // Update handle if returned
                        if (result.publicUrl) {
                            const match = result.publicUrl.match(/\/u\/([^\/]+)$/);
                            if (match) this.profile.handle = match[1];
                            handle = this.profile.handle;
                        }
                    } catch (error) {
                        console.error('Share failed:', error);
                        // If it's a paywall error, the modal is already shown, so we don't need another toast
                        if (error.message !== 'PAYWALL_REQUIRED' && error.message !== 'AUTH_REQUIRED') {
                             this.showToast('Failed to publish profile', 'error');
                        }
                        return; 
                    }
                } else {
                    console.error('ShareProfile module not found');
                    this.showToast('System error: Share module not loaded', 'error');
                    return;
                }
            }

            // Step 2: Perform action
            if (action === 'copy') {
                let url;
                if (handle && handle.trim() !== '' && handle !== 'null' && handle !== 'undefined') {
                    url = `${window.location.origin}/u/${handle}`;
                } else {
                    // Fallback
                    url = `${window.location.origin}/u/${id}`;
                }

                try {
                    await navigator.clipboard.writeText(url);
                    this.showToast('Link copied to clipboard!', 'success');
                } catch (error) {
                    // Fallback
                    const input = document.createElement('input');
                    input.value = url;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    this.showToast('Link copied!', 'success');
                }
            } else if (action === 'invite') {
                const emailInput = modal.querySelector('input[placeholder="Enter email address"]');
                const messageInput = modal.querySelector('textarea[placeholder="Add a personal message (optional)"]');
                const email = emailInput?.value.trim();
                const message = messageInput?.value.trim();

                if (!email) {
                    this.showToast('Please enter an email address', 'error');
                    return;
                }

                try {
                    const response = await fetch(`/api/profiles/${id}/invite`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, message })
                    });

                    if (response.ok) {
                        this.showToast('Invite sent successfully!', 'success');
                        if (emailInput) emailInput.value = '';
                        if (messageInput) messageInput.value = '';
                    } else {
                        this.showToast('Failed to send invite', 'error');
                    }
                } catch (error) {
                    this.showToast('Failed to send invite', 'error');
                }
            }
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            // Restore button
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    showToast(message, type = 'info') {
        // Use existing showToast if available globally (e.g. from dashboard.bind.js or owner-preview-loader.js)
        if (typeof window.showToast === 'function' && !document.querySelector('.share-modal-toast')) {
             window.showToast(message, type);
             return;
        }

        const existing = document.querySelector('.share-modal-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'share-modal-toast fixed bottom-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300';
        
        const colors = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            info: 'bg-blue-600 text-white'
        };
        toast.classList.add(...(colors[type] || colors.info).split(' '));
        
        const icons = {
            success: 'check_circle',
            error: 'error',
            info: 'info'
        };
        
        // Add Material Symbols if not loaded
        if (!document.querySelector('link[href*="Material+Symbols"]')) {
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

        toast.innerHTML = `<span class="material-symbols-outlined">${icons[type] || icons.info}</span><span>${message}</span>`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

// Expose globally
window.ShareModalController = ShareModalController;

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    ShareModalController.init();
});
