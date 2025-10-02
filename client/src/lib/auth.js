export function setToken(token){
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('token', token);
  }
}
export function getToken(){
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('token');
  }
  return null;
}
export function clearToken(){
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('token');
  }
}
