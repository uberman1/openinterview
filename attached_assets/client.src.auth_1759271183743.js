// /client/src/auth.js
const KEY = 'oi_token'

export const authStore = {
  get token(){ return localStorage.getItem(KEY) },
  set token(v){ if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY) },
  isLoggedIn(){ return !!localStorage.getItem(KEY) },
  logout(){ localStorage.removeItem(KEY) }
}
