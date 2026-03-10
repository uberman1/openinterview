// public/js/my_bookings.bind.js

(async function initMyBookings() {
    // 1. Auth Check
    try {
        const authRes = await fetch('/auth/me', { credentials: 'include' });
        if (authRes.status === 401 || authRes.status === 403) {
            window.location.href = '/login-page.html?returnTo=/my_bookings.html';
            return;
        }
        if (authRes.ok) {
            const authData = await authRes.json();
            if (window.Auth) {
                window.Auth.user = authData.user;
            }
        } else {
            console.warn('[my_bookings] Skipping strict auth redirect for transient status:', authRes.status);
        }

        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }
    } catch (e) {
        console.warn('[my_bookings] Auth check failed, continuing without redirect:', e);
    }

    // 2. Fetch Profiles (for mapping)
    let profileMap = new Map();
    try {
        const profilesRes = await fetch('/api/dashboard', { credentials: 'include' });
        if (profilesRes.ok) {
            const data = await profilesRes.json();
            if (data.profiles && Array.isArray(data.profiles)) {
                data.profiles.forEach(p => {
                    // profileMap.set(p.id, p.title || p.profile_name || 'Untitled Interview');
                    const name = p.profileName || p.profile_name || p.title || p.profileNameText || 'Untitled Interview';
                    // Store object with name and timezone
                    profileMap.set(p.id, { name, timezone: p.timezone || 'UTC' });
                });
            }

            // Update header link based on dashboard logic
            const myProfileLink = document.getElementById('my-profile-link');
            if (myProfileLink) {
                if (data.profile?.id) {
                    myProfileLink.href = `/owner_preview.html?id=${data.profile.id}`;
                } else if (data.analytics?.profileCount > 0) {
                    myProfileLink.href = '/profiles.html';
                } else {
                    myProfileLink.href = '/profile_edit.html';
                }
            }
        }
    } catch (e) {
        console.error('Failed to fetch profiles:', e);
    }

    // 3. Fetch Bookings
    loadBookings();

    // Helper to resolve timezone strings to IANA format
    function resolveTimezone(tz) {
        if (!tz) return 'UTC';

        // Map descriptive strings to IANA timezones
        const map = {
            'UTC -05:00 Eastern Time (US & Canada)': 'America/New_York',
            'UTC -05:00 Eastern Time (US &amp; Canada)': 'America/New_York',
            'UTC -06:00 Central Time (US & Canada)': 'America/Chicago',
            'UTC -06:00 Central Time (US &amp; Canada)': 'America/Chicago',
            'UTC -07:00 Mountain Time (US & Canada)': 'America/Denver',
            'UTC -07:00 Mountain Time (US &amp; Canada)': 'America/Denver',
            'UTC -08:00 Pacific Time (US & Canada)': 'America/Los_Angeles',
            'UTC -08:00 Pacific Time (US &amp; Canada)': 'America/Los_Angeles',
            'UTC +00:00 London': 'Europe/London',
            'UTC +01:00 Central European Time': 'Europe/Paris',
            'UTC +08:00 China Standard Time': 'Asia/Shanghai'
        };

        if (map[tz]) return map[tz];

        // Try to use it directly to check validity
        try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            return tz;
        } catch (e) {
            console.warn(`[my_bookings] Invalid timezone "${tz}", falling back to UTC`);
            return 'UTC';
        }
    }

    async function loadBookings() {
        try {
            const res = await fetch('/api/bookings', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to load bookings');
            const bookings = await res.json();

            renderStats(bookings);
            renderTable(bookings);
        } catch (e) {
            console.error('Error loading bookings:', e);
            const tbody = document.getElementById('bookings-table-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Failed to load bookings. Please try again.</td></tr>`;
            }
        }
    }

    function renderStats(bookings) {
        const now = new Date();

        // Filter logic
        const upcoming = bookings.filter(b => {
            const start = new Date(b.startTime);
            return start >= now && (b.status === 'pending' || b.status === 'confirmed');
        }).length;

        const today = bookings.filter(b => {
            const start = new Date(b.startTime);
            const isToday = start.toDateString() === now.toDateString();
            return isToday && (b.status === 'pending' || b.status === 'confirmed');
        }).length;

        const pending = bookings.filter(b => {
            const start = new Date(b.startTime);
            return b.status === 'pending' && start >= now;
        }).length;

        const container = document.getElementById('stats-container');
        if (container) {
            container.innerHTML = `
            <div class="flex flex-col gap-1 rounded border border-primary/10 bg-white p-4 dark:border-white/10 dark:bg-primary animate-[fadeIn_0.5s_ease-out]">
                <p class="text-3xl font-bold tracking-tight">${upcoming}</p>
                <p class="text-sm text-primary/60 dark:text-white/60">Upcoming Bookings</p>
            </div>
            <div class="flex flex-col gap-1 rounded border border-primary/10 bg-white p-4 dark:border-white/10 dark:bg-primary animate-[fadeIn_0.5s_ease-out_0.1s_both]">
                <p class="text-3xl font-bold tracking-tight">${today}</p>
                <p class="text-sm text-primary/60 dark:text-white/60">Today's Bookings</p>
            </div>
            <div class="flex flex-col gap-1 rounded border border-primary/10 bg-white p-4 dark:border-white/10 dark:bg-primary animate-[fadeIn_0.5s_ease-out_0.2s_both]">
                <p class="text-3xl font-bold tracking-tight">${pending}</p>
                <p class="text-sm text-primary/60 dark:text-white/60">Pending Approvals</p>
            </div>
          `;
        }
    }

    function renderTable(bookings) {
        const tbody = document.getElementById('bookings-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-4 text-center text-sm text-primary/60 dark:text-white/60">
                    No bookings found.
                </td>
            </tr>
          `;
            return;
        }

        // Sort by startTime descending (newest first)
        bookings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        bookings.forEach((b, index) => {
            let profileName = b.profileId;
            let timezone = 'UTC';
            
            if (profileMap.has(b.profileId)) {
                const pData = profileMap.get(b.profileId);
                if (typeof pData === 'object') {
                    profileName = pData.name;
                    timezone = resolveTimezone(pData.timezone);
                } else {
                    profileName = pData;
                }
            }

            const start = new Date(b.startTime);
            // Format: YYYY-MM-DD hh:mm AM/PM using profile timezone
            let timeStr;
            try {
                const datePart = start.toLocaleDateString('sv-SE', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                const timePart = start.toLocaleTimeString('en-US', {
                    timeZone: timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                timeStr = `${datePart} ${timePart}`;
            } catch (e) {
                console.error('Timezone error', e);
                // Fallback to UTC
                const datePart = start.toLocaleDateString('sv-SE', {
                    timeZone: 'UTC',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                const timePart = start.toLocaleTimeString('en-US', {
                    timeZone: 'UTC',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                timeStr = `${datePart} ${timePart}`;
            }

            const status = (b.status || 'pending').toLowerCase();

            let statusClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
            if (status === 'confirmed') statusClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            if (status === 'cancelled') statusClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            if (status === 'pending') statusClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';

            const row = document.createElement('tr');
            row.className = `animate-[fadeIn_0.5s_ease-out_${index * 0.05}s_both]`;
            row.innerHTML = `
            <td class="px-6 py-4 text-sm font-medium">${profileName}</td>
            <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${b.bookerName || 'Guest'}</td>
            <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${b.bookerEmail || '-'}</td>
            <td class="px-6 py-4 text-sm text-primary/60 dark:text-white/60">${timeStr}</td>
            <td class="px-6 py-4 text-sm">
                <span class="rounded px-2 py-1 text-xs font-medium capitalize ${statusClass}">${status}</span>
            </td>
            <td class="px-6 py-4 text-sm text-right">
                <div class="flex items-center justify-end gap-2">
                    <button class="flex h-8 w-8 items-center justify-center rounded hover:bg-primary/10 dark:hover:bg-white/10 text-primary/60 hover:text-primary dark:text-white/60 dark:hover:text-white" 
                        onclick="openMessageModal('${b.id}')" title="View Message">
                        <span class="material-symbols-outlined text-sm">mail</span>
                    </button>
                    <button class="flex h-8 w-8 items-center justify-center rounded hover:bg-primary/10 dark:hover:bg-white/10 text-primary/60 hover:text-primary dark:text-white/60 dark:hover:text-white" 
                        onclick="openStatusModal('${b.id}', '${status}')" title="Change Status">
                        <span class="material-symbols-outlined text-sm">edit_calendar</span>
                    </button>
                    <button class="flex h-8 w-8 items-center justify-center rounded hover:bg-primary/10 dark:hover:bg-white/10 text-primary/60 hover:text-primary dark:text-white/60 dark:hover:text-white ${status !== 'confirmed' ? 'opacity-50 cursor-not-allowed' : ''}" 
                        onclick="${status === 'confirmed' ? `window.open('/api/bookings/${b.id}/ics?role=owner', '_blank')` : 'return false;'}"
                        title="${status === 'confirmed' ? 'Download ICS' : 'Available after confirmation'}">
                        <span class="material-symbols-outlined text-sm">calendar_month</span>
                    </button>
                </div>
            </td>
          `;

            // Store data for modals
            row.dataset.booking = JSON.stringify(b);
            row.dataset.profileName = profileName;
            row.dataset.bookingId = b.id;
            row.dataset.timeStr = timeStr; // Store the exact formatted time from table

            tbody.appendChild(row);
        });
    }

    // Expose modal functions to global scope
    window.openMessageModal = function (bookingId) {

        const row = document.querySelector(`tr[data-booking-id="${bookingId}"]`);

        //const row = document.querySelector(`tr[data-booking*='"id":"${bookingId}"']`);
        if (!row) return;
        const b = JSON.parse(row.dataset.booking);
        const profileName = row.dataset.profileName;

        // Use the exact time string from the table to ensure consistency
        const timeStr = row.dataset.timeStr || new Date(b.startTime).toLocaleString();

        document.getElementById('modal-booker-info').textContent = `${b.bookerName || 'Guest'} (${b.bookerEmail || '-'})`;
        document.getElementById('modal-profile-name').textContent = profileName;
        document.getElementById('modal-time').textContent = timeStr;
        document.getElementById('modal-message-content').textContent = b.message || 'No message provided.';

        const modal = document.getElementById('message-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closeMessageModal = function () {
        const modal = document.getElementById('message-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    window.openStatusModal = function (bookingId, currentStatus) {
        const modal = document.getElementById('status-modal');
        const actionsContainer = document.getElementById('status-actions');
        actionsContainer.innerHTML = '';

        const actions = [];

        if (currentStatus === 'pending') {
            actions.push({ label: 'Confirm Booking', status: 'confirmed', class: 'bg-green-600 text-white hover:bg-green-700' });
            actions.push({ label: 'Cancel Booking', status: 'cancelled', class: 'bg-red-600 text-white hover:bg-red-700' });
        } else if (currentStatus === 'confirmed') {
            actions.push({ label: 'Cancel Booking', status: 'cancelled', class: 'bg-red-600 text-white hover:bg-red-700' });
        } else {
            actionsContainer.innerHTML = '<p class="text-sm text-gray-500">No actions available for this status.</p>';
        }

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = `w-full rounded px-4 py-2 text-sm font-bold transition-colors ${action.class}`;
            btn.textContent = action.label;
            // Pass the button element to handle UI state
            btn.onclick = (e) => updateStatus(bookingId, action.status, e.target);
            actionsContainer.appendChild(btn);
        });

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    window.closeStatusModal = function () {
        const modal = document.getElementById('status-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    async function updateStatus(id, newStatus, btnElement) {
        let originalText = '';
        const allButtons = document.querySelectorAll('#status-actions button');
        
        try {
            // UI Feedback: Disable ALL buttons to prevent race conditions
            if (btnElement) {
                if (btnElement.disabled) return; // Double-click guard
                
                originalText = btnElement.textContent;
                btnElement.textContent = 'Processing...';
            }

            // Disable all buttons in the modal
            allButtons.forEach(btn => {
                btn.disabled = true;
                btn.classList.add('opacity-75', 'cursor-not-allowed');
            });

            const res = await fetch(`/api/bookings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });

            if (res.status === 409) {
                throw new Error('This booking has already been modified. Please refresh.');
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update status');
            }

            // Success: Close modal and refresh
            closeStatusModal();
            loadBookings();
            
        } catch (e) {
            console.error('Update failed:', e);
            alert(e.message || 'Failed to update booking status');
            
            // Restore UI on failure - Enable all buttons
            allButtons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('opacity-75', 'cursor-not-allowed');
            });
            
            if (btnElement) {
                btnElement.textContent = originalText;
            }
        }
    }

})();
