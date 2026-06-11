// public/js/admin-plans.js

let plansData = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await fetchPlans();
    
    // Auth check (basic)
    try {
        const res = await fetch('/auth/me', { credentials: 'include' });
        if (res.status === 401 || res.status === 403) {
            console.error('Auth check failed:', res.status, res.statusText);
            throw new Error('Not authenticated');
        }
        if (!res.ok) {
            console.warn('Skipping strict auth redirect for transient status:', res.status);
            return;
        }
        const data = await res.json();
        console.log('Current user:', data.user);
        
        if (!data.user || data.user.role !== 'admin') {
            console.warn('User is not admin:', data.user);
            alert('Access Denied: You must be an admin to view this page.');
            window.location.href = '/';
        }
    } catch (e) {
        console.error('Auth error:', e);
        window.location.href = '/login-page.html';
    }
}

// Expose logout to window to ensure it's accessible from HTML
window.logout = async function(btn) {
    console.log('Logging out...');
    
    // Loading state
    if(btn) {
        btn.disabled = true;
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[18px] align-text-bottom mr-1">progress_activity</span> Logging out...`;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
    }

    try {
        await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/login-page.html';
    } catch (e) {
        console.error('Logout error:', e);
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = 'Logout'; // Or restore originalContent if captured
            btn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
        alert('Logout failed. Please try again.');
    }
};

async function fetchPlans() {
    const grid = document.getElementById('plans-grid');
    grid.innerHTML = '<div class="col-span-full flex justify-center py-12"><span class="material-symbols-outlined animate-spin text-4xl">refresh</span></div>';

    try {
        const res = await fetch('/api/plans');
        if (!res.ok) throw new Error('Failed to load plans');
        plansData = await res.json();
        renderPlans(plansData);
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500">Failed to load plans: ${error.message}</div>`;
    }
}

function renderPlans(plans) {
    const grid = document.getElementById('plans-grid');
    grid.innerHTML = '';

    if (plans.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12">No plans found. Create one to get started.</div>';
        return;
    }

    plans.forEach((plan, index) => {
        const price = `$${(plan.priceCents / 100).toFixed(2)}`;
        const shares = plan.sharesLimit === null ? 'Unlimited' : plan.sharesLimit;
        const bookings = plan.bookingsLimit === null ? 'Unlimited' : plan.bookingsLimit;
        const views = plan.viewsLimit === null ? 'Unlimited' : plan.viewsLimit;
        
        // Conversions
        const videoGB = (plan.videoStorageLimitBytes / (1024 ** 3)).toFixed(1);
        const docGB = (plan.docStorageLimitBytes / (1024 ** 3)).toFixed(1);
        const resumeMB = (plan.maxResumeFileSizeBytes / (1024 ** 2)).toFixed(0);
        const interviewMins = Math.floor(plan.maxInterviewLengthSeconds / 60);

        const card = document.createElement('div');
        // Enterprise card styling: Rounded corners, subtle border, hover lift & shadow
        card.className = 'bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col hover:shadow-2xl hover:-translate-y-1 hover:border-primary/30 dark:hover:border-white/30 transition-all duration-300 relative overflow-hidden group';
        card.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s both`;

        // Active Badge
        const activeBadge = plan.isActive 
            ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>Active</span>'
            : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"><span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span>Inactive</span>';

        card.innerHTML = `
            <!-- Floating Edit Action (Top Right) -->
            <div class="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                 <button onclick="openModal('${plan.code}')" class="p-2 rounded-full bg-white dark:bg-neutral-800 shadow-lg text-gray-500 hover:text-primary dark:hover:text-white transition-colors border border-gray-100 dark:border-gray-700" title="Edit Plan">
                    <span class="material-symbols-outlined text-[20px]">edit</span>
                </button>
            </div>

            <!-- Card Header -->
            <div class="p-6 pb-4">
                <div class="flex items-center justify-between mb-3">
                    ${activeBadge}
                    <div class="text-xs font-mono text-gray-400 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded border border-gray-100 dark:border-gray-700">${plan.code}</div>
                </div>
                
                <h3 class="text-xl font-black tracking-tight text-gray-900 dark:text-white mb-1">${plan.name}</h3>
                
                <div class="flex items-baseline gap-1">
                    <span class="text-3xl font-bold text-primary dark:text-white">${price}</span>
                    <span class="text-sm font-medium text-gray-500 dark:text-gray-400">/${plan.interval}</span>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="flex-1 bg-gray-50/50 dark:bg-neutral-800/30 p-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <!-- Usage Limits -->
                <div class="space-y-2 mb-5">
                    <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Usage Limits</div>
                    ${renderStatRow('share', 'Active/Published Profiles', shares)}
                    ${renderStatRow('send', 'Shares', 'Unlimited')}
                    ${renderStatRow('calendar_today', 'Bookings', bookings)}
                    ${renderStatRow('visibility', 'Profile Views', views)}
                    ${renderStatRow('timer', 'Interview Limit', interviewMins + ' mins')}
                </div>

                <!-- Storage Limits -->
                <div class="space-y-2">
                    <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">Storage & Files</div>
                    ${renderStatRow('video_library', 'Video Storage', videoGB + ' GB')}
                    ${renderStatRow('folder', 'Doc Storage', docGB + ' GB')}
                    ${renderStatRow('description', 'Max Resume', resumeMB + ' MB')}
                </div>
            </div>

            <!-- Footer Action -->
            <div class="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-neutral-900">
                <button onclick="openModal('${plan.code}')" class="w-full py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group-hover:border-primary/50 dark:group-hover:border-white/50">
                    <span>Manage Plan</span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderStatRow(icon, label, value) {
    const isUnlimited = value === 'Unlimited';
    const valueClass = isUnlimited ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-900 dark:text-white font-semibold';
    
    return `
    <div class="flex items-center justify-between text-sm group/row hover:bg-white dark:hover:bg-neutral-800 p-1.5 rounded-md transition-colors -mx-1.5">
        <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <span class="material-symbols-outlined text-[18px] opacity-70">${icon}</span>
            <span>${label}</span>
        </div>
        <span class="${valueClass}">${value}</span>
    </div>
    `;
}

/* Modal Logic */
const modal = document.getElementById('plan-modal');
const backdrop = document.getElementById('modal-backdrop');
const panel = document.getElementById('modal-panel');

function openModal(planCode = null) {
    const form = document.getElementById('plan-form');
    const modeInput = document.getElementById('plan-mode');
    const title = document.getElementById('modal-title');
    const codeInput = document.getElementById('code');

    form.reset();
    
    // Reset "unlimited" checkboxes state
    ['sharesLimit', 'bookingsLimit', 'viewsLimit'].forEach(id => {
        document.getElementById(`${id}_unlimited`).checked = false;
        document.getElementById(id).disabled = false;
    });

    if (planCode) {
        // Edit Mode
        const plan = plansData.find(p => p.code === planCode);
        if (!plan) return;

        modeInput.value = 'update';
        title.textContent = `Edit Plan: ${plan.name}`;
        
        // Populate fields
        codeInput.value = plan.code;
        codeInput.disabled = true; // Cannot change ID
        codeInput.classList.add('opacity-50', 'cursor-not-allowed');

        document.getElementById('name').value = plan.name;
        document.getElementById('priceCents').value = plan.priceCents;
        document.getElementById('currency').value = plan.currency;
        document.getElementById('interval').value = plan.interval;
        
        // Limits
        setLimitField('sharesLimit', plan.sharesLimit);
        setLimitField('bookingsLimit', plan.bookingsLimit);
        setLimitField('viewsLimit', plan.viewsLimit);

        document.getElementById('maxInterviewLengthMinutes').value = Math.floor(plan.maxInterviewLengthSeconds / 60);
        
        // Storage
        document.getElementById('videoStorageLimitGB').value = (plan.videoStorageLimitBytes / (1024 ** 3)).toFixed(2);
        document.getElementById('docStorageLimitGB').value = (plan.docStorageLimitBytes / (1024 ** 3)).toFixed(2);
        document.getElementById('maxResumeFileSizeMB').value = (plan.maxResumeFileSizeBytes / (1024 ** 2)).toFixed(0);

        document.getElementById('stripePriceId').value = plan.stripePriceId || '';
        document.getElementById('isActive').checked = plan.isActive;

    } else {
        // Create Mode
        modeInput.value = 'create';
        title.textContent = 'Create New Plan';
        codeInput.value = '';
        codeInput.disabled = false;
        codeInput.classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Defaults
        document.getElementById('currency').value = 'USD';
        document.getElementById('interval').value = 'month';
        document.getElementById('isActive').checked = true;
    }

    // Show Modal
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        panel.classList.remove('opacity-0', 'scale-95');
        panel.classList.add('scale-100');
    });
}

function setLimitField(id, value) {
    const input = document.getElementById(id);
    const checkbox = document.getElementById(`${id}_unlimited`);
    
    if (value === null || value === 999999) {
        input.value = '';
        input.disabled = true;
        checkbox.checked = true;
    } else {
        input.value = value;
        input.disabled = false;
        checkbox.checked = false;
    }
}

function toggleUnlimited(id) {
    const input = document.getElementById(id);
    const checkbox = document.getElementById(`${id}_unlimited`);
    
    if (checkbox.checked) {
        input.value = '';
        input.disabled = true;
    } else {
        input.disabled = false;
        input.focus();
    }
}

function closeModal() {
    backdrop.classList.add('opacity-0');
    panel.classList.remove('scale-100');
    panel.classList.add('opacity-0', 'scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

/* Success Modal Logic */
const successModal = document.getElementById('success-modal');
const successBackdrop = document.getElementById('success-backdrop');
const successPanel = document.getElementById('success-panel');

function showSuccessModal(message) {
    document.getElementById('success-message').textContent = message;
    successModal.classList.remove('hidden');
    requestAnimationFrame(() => {
        successBackdrop.classList.remove('opacity-0');
        successPanel.classList.remove('opacity-0', 'scale-95');
        successPanel.classList.add('scale-100');
    });
}

function closeSuccessModal() {
    successBackdrop.classList.add('opacity-0');
    successPanel.classList.remove('scale-100');
    successPanel.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        successModal.classList.add('hidden');
    }, 200);
}

/* Error Modal Logic */
const errorModal = document.getElementById('error-modal');
const errorBackdrop = document.getElementById('error-backdrop');
const errorPanel = document.getElementById('error-panel');

function showErrorModal(message) {
    document.getElementById('error-message').textContent = message;
    errorModal.classList.remove('hidden');
    requestAnimationFrame(() => {
        errorBackdrop.classList.remove('opacity-0');
        errorPanel.classList.remove('opacity-0', 'scale-95');
        errorPanel.classList.add('scale-100');
    });
}

function closeErrorModal() {
    errorBackdrop.classList.add('opacity-0');
    errorPanel.classList.remove('scale-100');
    errorPanel.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        errorModal.classList.add('hidden');
    }, 200);
}

async function savePlan(e) {
    e.preventDefault();
    console.log('Saving plan...');
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm align-middle mr-2">refresh</span>Saving...';
    
    const formData = new FormData(e.target);
    const mode = formData.get('plan-mode'); // 'create' or 'update'
    const code = document.getElementById('code').value;
    
    // Prepare payload
    const payload = {
        name: formData.get('name'),
        priceCents: parseInt(formData.get('priceCents')),
        currency: formData.get('currency'),
        interval: formData.get('interval'),
        stripePriceId: formData.get('stripePriceId') || null,
        isActive: document.getElementById('isActive').checked
    };

    // Helper to get limit value
    const getLimit = (id) => {
        if (document.getElementById(`${id}_unlimited`).checked) return 'unlimited';
        return parseInt(document.getElementById(id).value) || 0;
    };

    payload.sharesLimit = getLimit('sharesLimit');
    payload.bookingsLimit = getLimit('bookingsLimit');
    payload.viewsLimit = getLimit('viewsLimit');

    // Conversions
    payload.maxInterviewLengthSeconds = parseInt(formData.get('maxInterviewLengthMinutes')) * 60;
    payload.videoStorageLimitBytes = Math.round(parseFloat(formData.get('videoStorageLimitGB')) * 1024 * 1024 * 1024);
    payload.docStorageLimitBytes = Math.round(parseFloat(formData.get('docStorageLimitGB')) * 1024 * 1024 * 1024);
    payload.maxResumeFileSizeBytes = Math.round(parseFloat(formData.get('maxResumeFileSizeMB')) * 1024 * 1024);

    if (mode === 'create') {
        payload.code = code;
    }

    try {
        const url = mode === 'create' ? '/api/plans' : `/api/plans/${code}`;
        const method = mode === 'create' ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to save plan');
        }

        closeModal();
        showSuccessModal(`Plan ${mode === 'create' ? 'created' : 'updated'} successfully!`);
        fetchPlans(); // Refresh list

    } catch (error) {
        showErrorModal(error.message);
    } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}
