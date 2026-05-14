// public/js/home.js
import { store } from './data-store.js';

async function handleResumeUpload(file) {
    console.log("handleResumeUpload called");
    if (!file) {
        return;
    }

    try {
        // WP01 Enhancement: Get or create the user's profile (null for anonymous users)
        const profile = await store.createDraftProfile();
        
        let profileId;
        if (profile) {
            // Authenticated user - use existing profile
            console.log("[home.js] Using authenticated profile:", profile.id);
            profileId = profile.id;
        } else {
            // Anonymous user - profile will be created during upload
            console.log("[home.js] Anonymous user - profile will be created during upload");
        }
        
        // Upload resume (creates anonymous profile if needed)
        const uploadResult = await store.uploadResume(profileId, file);
        console.log("[home.js] Resume uploaded:", uploadResult);
        
        // Redirect using backend's redirectUrl
        if (uploadResult.redirectUrl) {
            window.location.href = uploadResult.redirectUrl;
        } else {
            // Fallback if no redirectUrl provided
            const actualProfileId = uploadResult.profileId || profileId;
            window.location.href = `/owner_preview.html?id=${actualProfileId}&ownerPreview=1`;
        }
    } catch (error) {
        console.error("Error during resume upload and ingestion:", error);
        // Redirect to profile edit instead of broken preview
        window.location.href = `/profile_edit.html?error=ingestion-failed`;
    }
}

function init() {
    console.log("home.js loaded");
    // NOTE: Resume upload is now handled by inline script in home.html
    // This avoids duplicate event handlers that cause the file dialog to open twice
    // The inline script handles: browse button, drop zone, and file input change events
    
    // Keep this file for future home page functionality
    // but don't add duplicate upload handlers
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
