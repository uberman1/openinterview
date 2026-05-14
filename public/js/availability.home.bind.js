// availability.home.bind.js - Injects Home button next to Save button
(function(){
  function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; }
  
  document.addEventListener('DOMContentLoaded', function(){
    const saveBtn = document.getElementById('btnSave');
    if(!saveBtn) return;
    
    // Check if already added
    if(document.getElementById('btnHome')) return;
    
    // Create Home button with same styling as Save
    const homeBtn = el('<a id="btnHome" href="/home.html" class="px-4 py-2 rounded-lg bg-primary text-white">Home</a>');
    
    // Insert after Save button
    saveBtn.parentElement.insertBefore(homeBtn, saveBtn.nextSibling);
  });
})();
