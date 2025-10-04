export async function api(path, opts={}){
  const res = await fetch(path, { headers:{'Content-Type':'application/json'}, ...opts });
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
export function me(){ try{return JSON.parse(localStorage.getItem('me'))}catch{return null} }
export function logout(){ localStorage.clear(); location.href="/login.html" }
