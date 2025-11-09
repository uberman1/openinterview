// public/js/dashboard.js
import { store } from './data-store.js';

function populateDashboard() {
    const interviewsTable = document.querySelector('[data-field="interviews-table"]');
    const resumesTable = document.querySelector('[data-field="resumes-table"]');
    const metrics = {
        interviews: document.querySelector('[data-field="interviews-count"]'),
        views: document.querySelector('[data-field="views-count"]'),
        shares: document.querySelector('[data-field="shares-count"]'),
    };

    const user = store.getCurrentUser();
    if (!user) {
        return;
    }

    store.getInterviews(user.id).then(interviews => {
        if (interviewsTable) {
            interviewsTable.innerHTML = interviews.map(interview => `
                <tr>
                    <td class="px-6 py-4 text-sm font-medium">${interview.title}</td>
                    <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${interview.date}</td>
                    <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${interview.views}</td>
                    <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${interview.shares}</td>
                    <td class="px-6 py-4 text-sm">
                        <span class="rounded bg-primary/10 px-2 py-1 text-xs font-medium dark:bg-white/10">${interview.status}</span>
                    </td>
                </tr>
            `).join('');
        }
        if (metrics.interviews) {
            metrics.interviews.textContent = interviews.length;
        }
    });

    store.getResumes(user.id).then(resumes => {
        if (resumesTable) {
            resumesTable.innerHTML = resumes.map(resume => `
                <tr>
                    <td class="px-6 py-4 text-sm font-medium">${resume.name}</td>
                    <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${resume.uploadedAt}</td>
                    <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${resume.size}</td>
                </tr>
            `).join('');
        }
    });

    store.getMetrics(user.id).then(data => {
        if (metrics.views) {
            metrics.views.textContent = data.totalViews;
        }
        if (metrics.shares) {
            metrics.shares.textContent = data.totalShares;
        }
    });
}

function init() {
    populateDashboard();
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
