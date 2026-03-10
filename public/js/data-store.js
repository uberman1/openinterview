// public/js/data-store.js

class DataStore {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
    }

    async getCurrentUser() {
        if (this.currentUser) return this.currentUser;
        
        try {
            const res = await fetch('/auth/me', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                this.currentUser = data.user;
                return this.currentUser;
            }
        } catch (e) {
            console.error('[data-store] Error getting current user:', e);
        }
        return null;
    }

    async createDraftProfile() {
        // WP01 Enhancement: Try to get authenticated user's profile first
        try {
            const res = await fetch('/api/profiles/mine', { credentials: 'include' });
            if (res.ok) {
                this.currentProfile = await res.json();
                return this.currentProfile;
            }
        } catch (e) {
            console.log('[data-store] User not authenticated, will create anonymous profile on resume upload');
        }
        
        // WP01 Enhancement: For anonymous users, return null - profile will be created during resume upload
        return null;
    }

    async getProfile(id) {
        const response = await fetch(`/api/profiles/${id}`, { credentials: 'include' });
        if (response.ok) {
            return response.json();
        }
        return null;
    }

    async updateProfile(id, patch) {
        const response = await fetch(`/api/profiles/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
            credentials: 'include'
        });
        if (response.ok) {
            return response.json();
        }
        return null;
    }

    async publishProfile(id) {
        const response = await fetch(`/api/profiles/${id}/share`, {
            method: 'POST',
            credentials: 'include'
        });
        if (response.ok) {
            return response.json();
        }
        return null;
    }

    async uploadResume(profileId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // WP01 Enhancement: Use anonymous upload if no profileId (anonymous user)
        const endpoint = profileId ? `/api/upload/resume/${profileId}` : '/api/upload-resume-anon';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            credentials: 'include'  // Important for session management
        });
        return response.json();
    }

    async ingestResume(profileId) {
        const response = await fetch(`/api/profiles/${profileId}/ingest`, {
            method: 'POST',
        });
        return response.json();
    }

    async shareProfile(profileId) {
        const response = await fetch(`/api/profiles/${profileId}/share`, {
            method: 'POST',
        });
        return response.json();
    }

    async getInterviews(userId) {
        const response = await fetch(`/api/interviews?userId=${userId}`);
        return response.json();
    }

    async getResumes(userId) {
        const response = await fetch(`/api/files?userId=${userId}`);
        return response.json();
    }

    async getMetrics(userId) {
        const response = await fetch(`/api/metrics?userId=${userId}`);
        return response.json();
    }
}

export const store = new DataStore();
