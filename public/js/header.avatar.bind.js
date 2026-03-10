(function(){
  function apply(url){
    if(!url) return;
    var nodes = document.querySelectorAll('header [data-avatar], header .header-avatar, header .rounded-full, header #avatar-header, header img.header-avatar');
    nodes.forEach(function(el){
      if(el.tagName === 'IMG') el.src = url; else el.style.backgroundImage = 'url("'+url+'")';
    });
  }

  // Check auth status and update Home Page UI
  async function checkAuthAndUpdateHome() {
    try {
      const res = await fetch('/auth/me', { credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        const authContainer = document.getElementById('auth-buttons-container');
        if (authContainer) {
             const signInBtn = authContainer.querySelector('#sign-in-btn') || authContainer.querySelector('a[href*="login"]');
             if (signInBtn) {
                 signInBtn.classList.remove('rounded'); 
                 signInBtn.classList.add('rounded-lg');
             }
        }
        return;
      }
      if (!res.ok) {
        console.warn('Transient auth status:', res.status);
        return;
      }
      const data = await res.json();
      
      if (data.user) {
        // Save avatar to local storage if available
        if (data.user && data.user.avatar) {
          localStorage.setItem('oi.avatarUrl', data.user.avatar);
          apply(data.user.avatar);
        }

        // Update Home Page "Sign In" button to "Dashboard" + Avatar
        const authContainer = document.getElementById('auth-buttons-container');
        if (authContainer) {
          const avatarUrl = data.user?.avatar || localStorage.getItem('oi.avatarUrl') || "https://lh3.googleusercontent.com/aida-public/AB6AXuDgS88QhSBYUengqyuPFZ-0rqaPoKmMT7v6UlmL9ZwjTSGh6tftgo0ETzEAZf8y-6d0AfCL_5TvJqd-MeDxWbSg03T5D1lPLSNi53oaZkCOoZ1oVRzfLbXc3_Qxe6CJpZLo2ppNz7zInTb-x9-fjO1hQyI8pySg-EPISStHYg_HPGbQDsKOfmNkGSxdfVMjAPPZVefqiPImJaGHAAwAxj-3mhyzTEwlx9PqerIK5EwF3lY74MdDJcyCTOYicZ9--VPI2pvucAXNOTE";
          
          authContainer.innerHTML = `
            <div class="flex items-center gap-4">
              <a href="/dashboard.html" class="hidden md:flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90 transition-colors">
                Dashboard
              </a>
              <a href="/user_settings.html" class="block cursor-pointer hover:opacity-80 transition-opacity" title="User Settings">
                <div class="aspect-square w-10 rounded-full bg-cover bg-center bg-no-repeat header-avatar border border-primary/10" style='background-image: url("${avatarUrl}");'></div>
              </a>
            </div>
          `;
        }
      } else {
        // Ensure Sign In button has rounded corners (fix for unrounded button issue)
        const authContainer = document.getElementById('auth-buttons-container');
        if (authContainer) {
             const signInBtn = authContainer.querySelector('#sign-in-btn') || authContainer.querySelector('a[href*="login"]');
             if (signInBtn) {
                 // Enforce rounded-lg and ensure no conflicting classes
                 signInBtn.classList.remove('rounded'); 
                 signInBtn.classList.add('rounded-lg');
             }
        }
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    try{ apply(localStorage.getItem('oi.avatarUrl')); }catch(e){}
    checkAuthAndUpdateHome();
  });
  window.addEventListener('avatar:updated', function(ev){
    apply((ev.detail && ev.detail.url) || localStorage.getItem('oi.avatarUrl'));
  });
})();
