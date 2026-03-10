// public/js/pricing.js

let plansData = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await fetchPlans();
}

async function fetchPlans() {
    const grid = document.getElementById('plans-grid');
    grid.innerHTML = '<div class="col-span-full flex justify-center py-12"><span class="material-symbols-outlined animate-spin text-4xl">refresh</span></div>';

    try {
        const res = await fetch('/api/plans');
        if (!res.ok) throw new Error('Failed to load plans');
        plansData = await res.json();
        // Filter only active plans for public view
        const activePlans = plansData.filter(plan => plan.isActive);
        renderPlans(activePlans);
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500">Failed to load plans: ${error.message}</div>`;
    }
}

function renderPlans(plans) {
    const grid = document.getElementById('plans-grid');
    grid.innerHTML = '';

    if (plans.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-12">No active plans available.</div>';
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

        card.innerHTML = `
            <!-- Card Header -->
            <div class="p-6 pb-4">
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
                    ${renderStatRow('share', 'Shares (Active/Published Profiles)', shares)}
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
