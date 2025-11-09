// public/js/owner_preview.js
import { store } from './data-store.js';

function getProfileIdFromUrl() {
    const u = new URL(window.location.href);
    return u.searchParams.get('profileId');
}

function populateProfile(profile) {
    document.querySelector('[data-field="person.name"]').textContent = profile.person.name;
    document.querySelector('[data-field="title"]').textContent = profile.title;
    document.querySelector('[data-field="location"]').textContent = profile.location;
    document.querySelector('[data-field="about"]').textContent = profile.about;
    // ... populate other fields ...
}

function init() {
    const profileId = getProfileIdFromUrl();
    const profile = store.getProfile({ id: profileId });

    if (profile) {
        populateProfile(profile);
    }

    const editProfileBtn = document.querySelector('[data-action="edit-profile"]');
    const shareProfileBtn = document.querySelector('[data-action="share-profile"]');
    const shareModal = document.getElementById('share-modal');
    const limitReachedModal = document.getElementById('limit-reached-modal');
    const closeShareModalBtn = document.querySelector('[data-action="close-share-modal"]');
    const closeLimitReachedModalBtn = document.querySelector('[data-action="close-limit-reached-modal"]');
    const copyLinkBtn = document.querySelector('[data-action="copy-link"]');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            window.location.href = `/profile_edit.html?id=${profileId}`;
        });
    }

    if (shareProfileBtn) {
        shareProfileBtn.addEventListener('click', async () => {
            const response = await store.shareProfile(profileId);
            if (response.requiresPayment) {
                limitReachedModal.classList.remove('hidden');
            } else {
                shareModal.classList.remove('hidden');
                if (copyLinkBtn) {
                    copyLinkBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(window.location.origin + response.publicUrl);
                        alert('Link copied to clipboard!');
                    });
                }
            }
        });
    }

    if (closeShareModalBtn) {
        closeShareModalBtn.addEventListener('click', () => {
            shareModal.classList.add('hidden');
        });
    }

    if (closeLimitReachedModalBtn) {
        closeLimitReachedModalBtn.addEventListener('click', () => {
            limitReachedModal.classList.add('hidden');
        });
    }
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
