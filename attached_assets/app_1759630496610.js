
export async function api(path, opts={}){
  const res = await fetch(path, { headers:{'Content-Type':'application/json'}, ...opts });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
export function me(){ try{return JSON.parse(localStorage.getItem('me'))}catch{return null} }
export function requireUser(){ const u=me(); if(!u) location.replace('/login.html'); if(u.role==='admin') location.replace('/admin.html'); return u; }
export function logout(){ localStorage.clear(); location.href='/login.html'; }
export function $$ (s){ return Array.from(document.querySelectorAll(s)); }
export const $ = (s)=>document.querySelector(s);
export function toast(msg){ alert(msg); }
