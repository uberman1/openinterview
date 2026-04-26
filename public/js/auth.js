// public/js/auth.js
// WP3: Authentication Client-Side Handler

const Auth = {
  // Current user state
  user: null,
  
  // Check if user is logged in
  async checkAuth() {
    try {
      const response = await fetch('/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        return this.user;
      }
      if (response.status === 401 || response.status === 403) {
        this.user = null;
        return null;
      }
      console.warn('[auth] Transient auth status:', response.status);
      return this.user;
    } catch (error) {
      console.error('[auth] Check auth error:', error);
      return this.user;
    }
  },
  
  // Login with email/password
  async login(email, password) {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      this.user = data.user;
      window.dispatchEvent(new CustomEvent('auth:login', { detail: this.user }));
      return this.user;
    } catch (error) {
      console.error('[auth] Login error:', error);
      throw error;
    }
  },
  
  // Signup with email/password
  async signup(email, password, name) {
    try {
      const response = await fetch('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      
      this.user = data.user;
      window.dispatchEvent(new CustomEvent('auth:login', { detail: this.user }));
      return this.user;
    } catch (error) {
      console.error('[auth] Signup error:', error);
      throw error;
    }
  },
  
  // Logout
  async logout() {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      try {
        localStorage.removeItem('oi.avatarUrl');
      } catch {}

      this.user = null;
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return true;
    } catch (error) {
      console.error('[auth] Logout error:', error);
      return false;
    }
  },
  
  // Redirect to Google OAuth
  loginWithGoogle(returnTo) {
    const url = returnTo 
      ? `/auth/google?returnTo=${encodeURIComponent(returnTo)}`
      : '/auth/google';
    window.location.href = url;
  },
  
  // Check if logged in
  isLoggedIn() {
    return !!this.user;
  },
  
  // Get current user
  getUser() {
    return this.user;
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}

// Make available globally
window.Auth = Auth;
