// js/redirect-shim.js
(function(){
  const legacyMap = [
    { rx: /^\/?(profile|profiles|account)\/?$/i, hash: '#profile' },
    { rx: /^\/?(uploads|documents)\/?$/i,       hash: '#attachments' }
  ];
  const path = (location.pathname || '').replace(/\/+$/,'').toLowerCase() || '/';
  const match = legacyMap.find(m => m.rx.test(path));
  if (!match) return;
  const onHome = /home(\.html)?$/.test(path) || /home(\.html)?$/.test(document.referrer || '');
  if (onHome) { location.replace(match.hash); return; }
  const homeTarget = (location.origin ? (location.origin + '/home.html') : '/home.html') + match.hash;
  location.replace(homeTarget);
})();
