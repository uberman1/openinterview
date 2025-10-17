// src/js/home-bindings.js
import { store } from './data-store.js';

function findCreateLinks(){
  const links = Array.from(document.querySelectorAll('a,button'))
    .filter(el => /create new/i.test(el.textContent || ''));
  return links;
}

function init(){
  const links = findCreateLinks();
  links.forEach(link => {
    link.addEventListener('click', (e)=>{
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      const p = store.createDraftProfile();
      window.location.href = `/profile/${encodeURIComponent(p.id)}`;
    });
  });
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
