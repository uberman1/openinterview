// public/js/login-modal.js
// WP3: Login Modal Component - Matches Stitch UI Style

const LoginModal = {
  modal: null,
  isOpen: false,
  onSuccess: null,
  returnTo: null,
  
  // Create the modal HTML
  createModal() {
    if (this.modal) return;
    
    const modalHTML = `
      <div id="login-modal" class="fixed inset-0 z-50 hidden">
        <!-- Backdrop -->
        <div class="login-modal-backdrop fixed inset-0 bg-black/50 transition-opacity"></div>
        
        <!-- Modal Container -->
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="login-modal-content relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-lg shadow-xl transform transition-all">
            <!-- Close Button -->
            <button type="button" class="login-modal-close absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              <span class="material-symbols-outlined">close</span>
            </button>
            
            <!-- Modal Body -->
            <div class="p-8">
              <!-- Header -->
              <div class="text-center mb-8">
                <div class="flex justify-center mb-4">
                  <svg class="w-8 h-8 text-primary dark:text-white" fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 11.2727C44 14.0109 39.8386 16.3957 33.69 17.6364C39.8386 18.877 44 21.2618 44 24C44 26.7382 39.8386 29.123 33.69 30.3636C39.8386 31.6043 44 33.9891 44 36.7273C44 40.7439 35.0457 44 24 44C12.9543 44 4 40.7439 4 36.7273C4 33.9891 8.16144 31.6043 14.31 30.3636C8.16144 29.123 4 26.7382 4 24C4 21.2618 8.16144 18.877 14.31 17.6364C8.16144 16.3957 4 14.0109 4 11.2727C4 7.25611 12.9543 4 24 4C35.0457 4 44 7.25611 44 11.2727Z"></path>
                  </svg>
                </div>
                <h2 class="text-2xl font-bold text-primary dark:text-white">Sign in to continue</h2>
                <p class="text-neutral-600 dark:text-neutral-400 mt-2">Sign in to share your profile</p>
              </div>
              
              <!-- Google Sign In Button -->
              <button type="button" id="login-google-btn" class="w-full flex items-center justify-center gap-3 h-12 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-primary dark:text-white font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors mb-4">
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
              
              <!-- Divider -->
              <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-neutral-300 dark:border-neutral-700"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-white dark:bg-neutral-900 text-neutral-500">or continue with email</span>
                </div>
              </div>
              
              <!-- Login Form -->
              <form id="login-form" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-primary dark:text-white mb-1">Email</label>
                  <input type="email" name="email" required
                    class="w-full h-12 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-primary dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="you@example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-primary dark:text-white mb-1">Password</label>
                  <input type="password" name="password" required
                    class="w-full h-12 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-primary dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="••••••••">
                </div>
                
                <!-- Error Message -->
                <div id="login-error" class="hidden text-red-600 text-sm text-center"></div>
                
                <!-- Submit Button -->
                <button type="submit" id="login-submit-btn"
                  class="w-full h-12 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                  Sign In
                </button>
              </form>
              
              <!-- Toggle to Signup -->
              <div class="mt-6 text-center">
                <p class="text-neutral-600 dark:text-neutral-400">
                  Don't have an account?
                  <button type="button" id="toggle-signup" class="text-primary dark:text-white font-medium hover:underline">Sign up</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('login-modal');
    this.bindEvents();
  },
  
  // Bind event handlers
  bindEvents() {
    if (!this.modal) return;
    
    // Close button
    this.modal.querySelector('.login-modal-close').addEventListener('click', () => this.close());
    
    // Backdrop click
    this.modal.querySelector('.login-modal-backdrop').addEventListener('click', () => this.close());
    
    // Google login
    this.modal.querySelector('#login-google-btn').addEventListener('click', () => {
      const returnTo = this.returnTo || window.location.pathname + window.location.search;
      window.Auth?.loginWithGoogle(returnTo);
    });
    
    // Form submit
    this.modal.querySelector('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit(e.target);
    });
    
    // Toggle signup
    this.modal.querySelector('#toggle-signup').addEventListener('click', () => {
      this.toggleMode();
    });
    
    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },
  
  // Handle form submit
  async handleSubmit(form) {
    const email = form.email.value.trim();
    const password = form.password.value;
    const errorEl = this.modal.querySelector('#login-error');
    const submitBtn = this.modal.querySelector('#login-submit-btn');
    const isSignup = submitBtn.textContent.includes('Sign Up');
    
    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = isSignup ? 'Creating account...' : 'Signing in...';
    
    try {
      if (isSignup) {
        await window.Auth.signup(email, password, email.split('@')[0]);
      } else {
        await window.Auth.login(email, password);
      }
      
      this.close();
      
      if (this.onSuccess) {
        this.onSuccess(window.Auth.user);
      }
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isSignup ? 'Sign Up' : 'Sign In';
    }
  },
  
  // Toggle between login and signup
  toggleMode() {
    const submitBtn = this.modal.querySelector('#login-submit-btn');
    const toggleBtn = this.modal.querySelector('#toggle-signup');
    const headerText = this.modal.querySelector('h2');
    const subText = this.modal.querySelector('h2 + p');
    
    const isLogin = submitBtn.textContent === 'Sign In';
    
    if (isLogin) {
      submitBtn.textContent = 'Sign Up';
      toggleBtn.textContent = 'Sign in';
      toggleBtn.previousSibling.textContent = 'Already have an account? ';
      headerText.textContent = 'Create an account';
      subText.textContent = 'Sign up to share your profile';
    } else {
      submitBtn.textContent = 'Sign In';
      toggleBtn.textContent = 'Sign up';
      toggleBtn.previousSibling.textContent = "Don't have an account? ";
      headerText.textContent = 'Sign in to continue';
      subText.textContent = 'Sign in to share your profile';
    }
  },
  
  // Open modal
  open(options = {}) {
    this.createModal();
    this.onSuccess = options.onSuccess || null;
    this.returnTo = options.returnTo || null;
    
    this.modal.classList.remove('hidden');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
    
    // Focus email input
    setTimeout(() => {
      this.modal.querySelector('input[name="email"]')?.focus();
    }, 100);
  },
  
  // Close modal
  close() {
    if (!this.modal) return;
    
    this.modal.classList.add('hidden');
    this.isOpen = false;
    document.body.style.overflow = '';
    
    // Reset form
    this.modal.querySelector('#login-form')?.reset();
    this.modal.querySelector('#login-error')?.classList.add('hidden');
  }
};

// Make available globally
window.LoginModal = LoginModal;
