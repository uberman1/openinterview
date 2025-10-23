// /js/safe-render-shim.js
(function () {
  var isHeadless = !!(navigator.webdriver) || /playwright|headless|puppeteer/i.test(navigator.userAgent);
  if (isHeadless) document.documentElement.classList.add('safe-mode');

  if (!document.getElementById('safe-render-inline-css')) {
    var style = document.createElement('style');
    style.id = 'safe-render-inline-css';
    style.textContent =
      "html.safe-mode *{animation:none!important;transition:none!important}" +
      "body{visibility:visible!important;opacity:1!important}";
    document.head.appendChild(style);
  }

  function isVisible() {
    var b = document.body;
    if (!b) return false;
    var cs = getComputedStyle(b);
    var rect = b.getBoundingClientRect();
    return (b.scrollHeight > 50 || rect.height > 20) && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0;
  }

  var tries = 0, maxTries = 6;
  var t = setInterval(function () {
    if (isVisible()) { clearInterval(t); return; }
    tries++;

    if (document.body) {
      var prev = document.body.style.display;
      document.body.style.display = 'none';
      void document.body.offsetHeight;
      document.body.style.display = prev || 'block';
    }

    if (tries === 3) {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(function (lnk) {
        var href = (lnk.getAttribute('href') || '').toLowerCase();
        if (/app\.min\.css|material|googleapis|material-symbols/.test(href)) {
          lnk.dataset._disabledBySafeShim = '1';
          lnk.disabled = true;
        }
      });
    }

    if (tries === 5) {
      var hard = document.getElementById('safe-render-hard');
      if (!hard) {
        hard = document.createElement('style');
        hard.id = 'safe-render-hard';
        hard.textContent =
          "body, #app, main{opacity:1!important;transform:none!important;filter:none!important}" +
          "html, body{height:auto!important}";
        document.head.appendChild(hard);
      }
    }

    if (tries >= maxTries) clearInterval(t);
  }, 200);

  try {
    var u = new URL(location.href);
    if (u.searchParams.get('safe') === '1') {
      document.documentElement.classList.add('safe-mode');
    }
  } catch(_) {}
})();
