// js/redirect-shim.js
// DISABLED - All legacy route redirects are now handled server-side in index.js
// Server redirects:
//   /profile, /account → /home.html#profile
//   /uploads, /documents → /home.html#attachments
(function(){
  // No client-side redirect needed - server handles all legacy routes
  return;
})();
