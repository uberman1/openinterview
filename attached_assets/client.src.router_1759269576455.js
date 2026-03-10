// /client/src/router.js
import React from 'react'

export function useHashLocation(){
  const [path, setPath] = React.useState(window.location.hash.replace(/^#/, '') || '/')
  React.useEffect(()=>{
    const onHash = ()=> setPath(window.location.hash.replace(/^#/, '') || '/')
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  }, [])
  return [path, (to)=> { window.location.hash = to.startsWith('#')? to : ('#' + to) }]
}

export function matchRoute(pathPattern, currentPath){
  // very small pattern matcher for /profiles/:id and deeper segments
  const pp = pathPattern.split('/').filter(Boolean)
  const cp = currentPath.split('?')[0].split('/').filter(Boolean)
  if (pp.length !== cp.length) return null
  const params = {}
  for (let i=0;i<pp.length;i++){
    const p = pp[i], c = cp[i]
    if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(c)
    else if (p !== c) return null
  }
  return params
}

export function getQuery(currentPath){
  const i = currentPath.indexOf('?')
  const q = new URLSearchParams(i>=0 ? currentPath.slice(i+1) : '')
  const obj = {}; for (const [k,v] of q.entries()) obj[k]=v
  return obj
}
