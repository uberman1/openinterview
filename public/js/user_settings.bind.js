// user_settings.bind.js

import { uploadFile } from './uploader.js';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('user-settings-form');
  const nameInput = document.getElementById('name-input');
  const emailInput = document.getElementById('email-input');
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('avatar-preview');
  const avatarOverlay = document.getElementById('avatar-overlay');
  const saveBtn = document.getElementById('save-btn');
  const saveSpinner = document.getElementById('save-spinner');
  const logoutBtn = document.getElementById('logout-btn');
  const pageLoader = document.getElementById('page-loader');
  const settingsContent = document.getElementById('settings-content');

  let currentAvatarUrl = null;

  // 1. Fetch User Data
  try {
    const res = await fetch('/auth/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      const user = data.user;
      
      nameInput.value = user.name || '';
      emailInput.value = user.email || '';

      const passwordSection = document.getElementById('password-section');

      // Debug logging
      console.log('User data:', user);
      console.log('Google ID:', user.google_id);
      console.log('Password Section:', passwordSection);

      // Show password section if not a Google user
      // Handle various falsy values for google_id
      const isGoogleUser = user.google_id && user.google_id !== 'null' && user.google_id !== 'undefined' && user.google_id !== '';
      
      if (!isGoogleUser && passwordSection) {
        console.log('Showing password section (User is not Google)');
        passwordSection.classList.remove('hidden');
      } else {
        console.log('Not showing password section. Google ID:', user.google_id);
      }
      
      if (user.avatar) {
        currentAvatarUrl = user.avatar;
        avatarPreview.style.backgroundImage = `url("${user.avatar}")`;
      } else {
        // Default avatar
        avatarPreview.style.backgroundImage = `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDgS88QhSBYUengqyuPFZ-0rqaPoKmMT7v6UlmL9ZwjTSGh6tftgo0ETzEAZf8y-6d0AfCL_5TvJqd-MeDxWbSg03T5D1lPLSNi53oaZkCOoZ1oVRzfLbXc3_Qxe6CJpZLo2ppNz7zInTb-x9-fjO1hQyI8pySg-EPISStHYg_HPGbQDsKOfmNkGSxdfVMjAPPZVefqiPImJaGHAAwAxj-3mhyzTEwlx9PqerIK5EwF3lY74MdDJcyCTOYicZ9--VPI2pvucAXNOTE")`;
      }
    } else if (res.status === 401 || res.status === 403) {
      // Not authenticated, redirect to login
      window.location.href = '/login-page.html?returnTo=/user_settings.html';
    } else {
      console.warn('[user_settings] Skipping strict auth redirect for transient status:', res.status);
    }
  } catch (error) {
    console.warn('[user_settings] Auth check failed, continuing without redirect:', error);
  } finally {
    // Hide loader and show content
    if (pageLoader && settingsContent) {
        settingsContent.classList.remove('hidden');
        settingsContent.classList.add('flex');
        pageLoader.style.opacity = '0';
        setTimeout(() => {
            pageLoader.classList.add('hidden');
        }, 500);
    }
  }

  // 2. Handle Avatar Click
  avatarOverlay.addEventListener('click', () => {
    avatarInput.click();
  });

  // 3. Handle Avatar File Selection
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview.style.backgroundImage = `url("${e.target.result}")`;
    };
    reader.readAsDataURL(file);

    // Upload immediately? Or wait for save? 
    // Let's upload immediately to get the URL, but only save the URL to user profile on form submit.
    // Or simpler: Upload now, get URL, store in variable.
    
    setLoading(true);
    try {
      const uploadResult = await uploadFile(file);
      if (uploadResult && uploadResult.url) {
        currentAvatarUrl = uploadResult.url;
        console.log('Avatar uploaded:', currentAvatarUrl);
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  // 4. Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true);

    const updates = {
      name: nameInput.value,
      avatar: currentAvatarUrl
    };

    try {
      const res = await fetch('/auth/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        const data = await res.json();
        // Update local storage for header avatar
        if (data.user.avatar) {
          localStorage.setItem('oi.avatarUrl', data.user.avatar);
          // Trigger event for header to update immediately
          window.dispatchEvent(new CustomEvent('avatar:updated', { detail: { url: data.user.avatar } }));
        }
        
        // Show success feedback
        const originalText = saveBtn.querySelector('span:first-child').textContent;
        saveBtn.querySelector('span:first-child').textContent = 'Saved!';
        setTimeout(() => {
            saveBtn.querySelector('span:first-child').textContent = originalText;
        }, 2000);
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  });

  // 5. Handle Logout
  const logoutModal = document.getElementById('logout-modal');
  const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
  const confirmLogoutBtn = document.getElementById('confirm-logout-btn');

  if (logoutBtn && logoutModal && cancelLogoutBtn && confirmLogoutBtn) {
    const modalContent = logoutModal.querySelector('div');

    function showLogoutModal() {
        logoutModal.classList.remove('hidden');
        logoutModal.classList.add('flex');
        // Trigger reflow
        void logoutModal.offsetWidth;
        logoutModal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
    }

    function hideLogoutModal() {
        logoutModal.classList.add('opacity-0');
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('scale-95');
        setTimeout(() => {
            logoutModal.classList.remove('flex');
            logoutModal.classList.add('hidden');
        }, 200);
    }

    logoutBtn.addEventListener('click', () => {
        showLogoutModal();
    });

    cancelLogoutBtn.addEventListener('click', () => {
        hideLogoutModal();
    });

    // Close on background click
    logoutModal.addEventListener('click', (e) => {
        if (e.target === logoutModal) hideLogoutModal();
    });

    confirmLogoutBtn.addEventListener('click', async () => {
      if (confirmLogoutBtn.disabled) return;
      
      // Show spinner on modal button
      const spinner = confirmLogoutBtn.querySelector('.animate-spin');
      if (spinner) spinner.classList.remove('hidden');
      confirmLogoutBtn.disabled = true;
      cancelLogoutBtn.disabled = true;

      try {
        await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
        // Clear local storage
        localStorage.removeItem('oi.auth.token'); // Adjust key if needed
        localStorage.removeItem('oi.user');
        localStorage.removeItem('oi.avatarUrl');
        
        window.location.href = '/login-page.html';
      } catch (error) {
        console.error('Logout failed:', error);
        alert('Failed to log out.');
        confirmLogoutBtn.disabled = false;
        cancelLogoutBtn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
      }
    });
  }

  // 6. Handle Change Password Button
  const changePasswordBtn = document.getElementById('change-password-btn');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', (e) => {
        // Prevent double clicks
        if (changePasswordBtn.classList.contains('pointer-events-none')) {
            e.preventDefault();
            return;
        }

        // Show spinner and disable interaction immediately
        const spinner = changePasswordBtn.querySelector('.animate-spin');
        if (spinner) spinner.classList.remove('hidden');
        
        changePasswordBtn.style.pointerEvents = 'none';
        changePasswordBtn.classList.add('opacity-70', 'pointer-events-none');
        
        // Navigation will happen naturally if we don't preventDefault, 
        // but since we want to show loading state, we might need to wait or just let it happen.
        // If we don't preventDefault, the browser navigates.
        // The original code prevented default and manually navigated.
        // We'll keep that pattern but ensure the UI update happens first.
    });

    // Reset button state when page is shown (e.g. from bfcache or back navigation)
    window.addEventListener('pageshow', () => {
        const spinner = changePasswordBtn.querySelector('.animate-spin');
        if (spinner) spinner.classList.add('hidden');
        changePasswordBtn.style.pointerEvents = '';
        changePasswordBtn.classList.remove('opacity-70');
    });
  }

  function setLoading(isLoading) {
    saveBtn.disabled = isLoading;
    if (isLoading) {
      saveSpinner.classList.remove('hidden');
    } else {
      saveSpinner.classList.add('hidden');
    }
  }
});
