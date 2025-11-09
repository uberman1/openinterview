// public/js/data-store.js

class DataStore {
    constructor() {
        this.db = {
            users: [],
            profiles: [],
            entitlements: [],
            interviews: [],
            resumes: [],
        };
    }

    getCurrentUser() {
        // Mock user
        return { id: 'u1' };
    }

    createDraftProfile() {
        const profile = {
            id: `prof_${Math.random().toString(36).slice(2)}`,
            ownerId: this.getCurrentUser().id,
            status: 'draft',
        };
        this.db.profiles.push(profile);
        return profile;
    }

    getProfile(id) {
        return this.db.profiles.find(p => p.id === id);
    }

    updateProfile(id, patch) {
        const index = this.db.profiles.findIndex(p => p.id === id);
        if (index !== -1) {
            this.db.profiles[index] = { ...this.db.profiles[index], ...patch };
        }
        return this.db.profiles[index];
    }

    publishProfile(id) {
        const index = this.db.profiles.findIndex(p => p.id === id);
        if (index !== -1) {
            this.db.profiles[index].status = 'live';
        }
        return this.db.profiles[index];
    }

    async uploadResume(profileId, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`/api/upload/resume/${profileId}`, {
            method: 'POST',
            body: formData,
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
