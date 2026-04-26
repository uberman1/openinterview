
class AppNavbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.setupActiveState();
        this.fetchDefaultProfile();
        this.setupNewInterview();
    }

    setupNewInterview() {
        const handleNewInterview = async (e) => {
            e.preventDefault();
            try {
                const btn = e.currentTarget;
                const originalText = btn.textContent;
                
                // Show loading state
                btn.textContent = 'Creating...';
                btn.style.opacity = '0.7';
                btn.style.pointerEvents = 'none';

                const response = await fetch('/api/profiles/new-guest', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.redirectUrl) {
                        window.location.href = data.redirectUrl;
                    }
                } else {
                    console.error('Failed to create profile');
                    // Restore button state
                    btn.textContent = originalText;
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                    
                    // Handle auth error
                    if (response.status === 401) {
                         window.location.href = '/login-page.html';
                    } else {
                        alert('Failed to create profile. Please try again.');
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                e.currentTarget.textContent = 'Error';
            }
        };

        const desktopBtn = this.querySelector('#nav-new-interview-desktop');
        const mobileBtn = this.querySelector('#nav-new-interview-mobile');

        if (desktopBtn) desktopBtn.addEventListener('click', handleNewInterview);
        if (mobileBtn) mobileBtn.addEventListener('click', handleNewInterview);
    }

    render() {
        const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuDgS88QhSBYUengqyuPFZ-0rqaPoKmMT7v6UlmL9ZwjTSGh6tftgo0ETzEAZf8y-6d0AfCL_5TvJqd-MeDxWbSg03T5D1lPLSNi53oaZkCOoZ1oVRzfLbXc3_Qxe6CJpZLo2ppNz7zInTb-x9-fjO1hQyI8pySg-EPISStHYg_HPGbQDsKOfmNkGSxdfVMjAPPZVefqiPImJaGHAAwAxj-3mhyzTEwlx9PqerIK5EwF3lY74MdDJcyCTOYicZ9--VPI2pvucAXNOTE";
        
        this.innerHTML = `
            <header class="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md transition-all duration-300">
                <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
                    <a href="/home.html" class="flex items-center gap-4 hover:opacity-80 transition-opacity">
                        <div class="h-8 w-auto">
                            <img src="/defaults/logo_1.png" alt="OpenInterview Logo" class="h-full w-auto object-contain">
                        </div>
                    </a>
                    
                    <!-- Desktop Nav -->
                    <div class="hidden md:flex flex-1 items-center justify-end gap-6">
                        <nav class="flex items-center gap-6">
                            <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white transition-colors" href="/dashboard.html">Dashboard</a>
                            <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white transition-colors" href="/my_bookings.html">My Bookings</a>
                            <a class="text-sm font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white transition-colors" href="/subscription.html">Subscription</a>
                        </nav>
                        <a href="#" id="nav-new-interview-desktop" class="flex h-10 items-center justify-center rounded bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90 transition-colors">New Interview</a>
                        <a href="/user_settings.html" class="block cursor-pointer hover:opacity-80 transition-opacity" title="User Settings">
                            <div class="aspect-square w-10 rounded-full bg-cover bg-center bg-no-repeat header-avatar border border-primary/10" style='background-image: url("${defaultAvatar}");'></div>
                        </a>
                    </div>

                    <!-- Mobile Menu Button -->
                    <button id="mobile-menu-btn" class="md:hidden p-2 text-primary dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors" aria-label="Toggle menu">
                        <span class="material-symbols-outlined text-2xl">menu</span>
                    </button>
                </div>

                <!-- Mobile Menu -->
                <div id="mobile-menu" class="hidden md:hidden border-t border-primary/10 bg-white dark:bg-neutral-900">
                    <nav class="flex flex-col p-4 gap-4">
                        <a class="text-base font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white py-2" href="/dashboard.html">Dashboard</a>
                        <a class="text-base font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white py-2" href="/my_bookings.html">My Bookings</a>
                        <a class="text-base font-medium text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white py-2" href="/subscription.html">Subscription</a>
                        <div class="pt-2 border-t border-primary/10 flex flex-col gap-4 mt-2">
                             <a href="#" id="nav-new-interview-mobile" class="flex h-10 items-center justify-center rounded bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90 transition-colors w-full">New Interview</a>
                             <a href="/user_settings.html" class="flex items-center gap-3 px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors" title="User Settings">
                                <div class="aspect-square w-8 rounded-full bg-cover bg-center bg-no-repeat header-avatar border border-primary/10" style='background-image: url("${defaultAvatar}");'></div>
                                <span class="text-sm font-medium text-primary dark:text-white">Settings</span>
                            </a>
                        </div>
                    </nav>
                </div>
            </header>
        `;

        // Add mobile menu toggle logic
        const mobileMenuBtn = this.querySelector('#mobile-menu-btn');
        const mobileMenu = this.querySelector('#mobile-menu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }

    setupActiveState() {
        const currentPath = window.location.pathname;
        const links = this.querySelectorAll('nav a');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath) {
                // Remove inactive classes
                link.classList.remove('text-primary/70', 'dark:text-white/70', 'hover:text-primary', 'dark:hover:text-white');
                // Add active classes
                link.classList.add('text-primary', 'dark:text-white', 'font-bold');
            }
        });
    }

    async fetchDefaultProfile() {
        try {
            // First check if we have a default profile URL cached
            const cachedUrl = localStorage.getItem('oi.defaultProfileUrl');
            if (cachedUrl) {
                this.updateProfileLink(cachedUrl);
            }

            // Fetch fresh data
            const res = await fetch('/api/dashboard');
            if (!res.ok) return;

            const data = await res.json();
            if (data.profiles && data.profiles.length > 0) {
                // Find default profile or use the first one (most recent)
                // Logic: 1. Explicit default 2. First public 3. First created
                let defaultProfile = data.profiles.find(p => p.isDefault === true || p.isDefault === 1 || p.isDefault === 'true' || p.is_default === true || p.is_default === 1 || p.is_default === 'true');
                if (!defaultProfile) {
                    // Sort by ID descending (newest first) since dashboard uses ID for ordering
                    data.profiles.sort((a, b) => b.id - a.id);
                    defaultProfile = data.profiles[0];
                }
                
                if (defaultProfile) {
                    const profileUrl = `/owner_preview.html?id=${defaultProfile.id}`;
                    this.updateProfileLink(profileUrl);
                    
                    // Only cache if we actually found a default profile, or if we fell back to the newest one
                    // We update the cache so subsequent navigations are fast
                    localStorage.setItem('oi.defaultProfileUrl', profileUrl);
                }
            }
        } catch (e) {
            console.error('Failed to fetch profile for navigation', e);
        }
    }

    updateProfileLink(url) {}
}

customElements.define('app-navbar', AppNavbar);
