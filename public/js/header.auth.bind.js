// public/js/header.auth.bind.js
// WP3: Header Authentication State Handler

(async function initHeaderAuth() {
  // Wait for Auth to be available
  if (!window.Auth) {
    console.warn('[header-auth] Auth not loaded');
    return;
  }
  
  // Check auth status
  const user = await window.Auth.checkAuth();
  
  // Find auth containers
  const authContainers = [];
  
  // Desktop
  const desktopContainer = document.getElementById('auth-buttons-container');
  if (desktopContainer) authContainers.push(desktopContainer);
  
  // Mobile
  const mobileContainer = document.getElementById('auth-buttons-container-mobile');
  if (mobileContainer) authContainers.push(mobileContainer);
  
  // Fallback for other pages using legacy structure
  if (authContainers.length === 0) {
      const fallback = document.querySelector('header .flex.items-center.gap-4:last-child') || 
                       document.querySelector('header > div > div:last-child') ||
                       document.querySelector('header nav');
      if (fallback) authContainers.push(fallback);
  }

  if (authContainers.length === 0) {
    console.warn('[header-auth] Could not find any auth container');
    return;
  }
  
  const updateAll = (userData) => {
      authContainers.forEach(container => {
          if (userData) {
              updateHeaderForLoggedInUser(container, userData);
          } else {
              ensureSignInButton(container);
          }
      });
  };

  if (user) {
    updateAll(user);
  } else {
    updateAll(null);
  }
  
  // Listen for auth events
  window.addEventListener('auth:login', (e) => {
    updateAll(e.detail);
  });
  
  window.addEventListener('auth:logout', () => {
    updateAll(null);
  });
})();

function updateHeaderForLoggedInUser(container, user) {
  // Remove existing sign in button
  const existingBtn = container.querySelector('[data-auth-btn]');
  if (existingBtn) existingBtn.remove();
  
  // Check if user menu already exists
  if (container.querySelector('[data-user-menu]')) return;
  
  // Create user menu
  const userMenu = document.createElement('div');
  userMenu.setAttribute('data-user-menu', 'true');
  userMenu.className = 'relative';
  userMenu.innerHTML = `
    <button type="button" class="flex items-center gap-2 h-10 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" id="user-menu-btn">
      <div class="w-8 h-8 rounded-full bg-primary dark:bg-white text-white dark:text-primary flex items-center justify-center font-bold text-sm">
        ${user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
      </div>
      <span class="hidden sm:inline text-sm font-medium">${user.name || user.email.split('@')[0]}</span>
      <span class="material-symbols-outlined text-lg">expand_more</span>
    </button>
    <div id="user-menu-dropdown" class="hidden absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-50">
      <div class="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
        <p class="text-sm font-medium truncate">${user.name || 'User'}</p>
        <p class="text-xs text-neutral-500 truncate">${user.email}</p>
      </div>
      <a href="/home.html" class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700">
        <span class="material-symbols-outlined text-lg">home</span>
        Dashboard
      </a>
      <a href="/profiles" class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700">
        <span class="material-symbols-outlined text-lg">person</span>
        My Profiles
      </a>
      <a href="/subscription" class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700">
        <span class="material-symbols-outlined text-lg">credit_card</span>
        Subscription
      </a>
      <div class="border-t border-neutral-200 dark:border-neutral-700 mt-2 pt-2">
        <button type="button" id="logout-btn" class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left">
          <span class="material-symbols-outlined text-lg">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  `;
  
  container.appendChild(userMenu);
  
  // Toggle dropdown
  const menuBtn = userMenu.querySelector('#user-menu-btn');
  const dropdown = userMenu.querySelector('#user-menu-dropdown');
  
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });
  
  // Close on outside click
  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
  });
  
  // Logout handler
  userMenu.querySelector('#logout-btn').addEventListener('click', async () => {
    await window.Auth.logout();
    window.location.href = '/login-page.html';
  });
}

function ensureSignInButton(container) {
  // Remove user menu if exists
  const userMenu = container.querySelector('[data-user-menu]');
  if (userMenu) userMenu.remove();
  
  // Check if sign in button already exists
  if (container.querySelector('[data-auth-btn]')) return;
  
  // Create sign in button
  const signInBtn = document.createElement('a');
  signInBtn.setAttribute('data-auth-btn', 'true');
  signInBtn.href = '/login-page.html';
  // Match static button style: bg-primary text-white rounded-lg
  signInBtn.className = 'flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90 transition-colors';
  signInBtn.innerHTML = 'Sign In';
  
  container.appendChild(signInBtn);
}
