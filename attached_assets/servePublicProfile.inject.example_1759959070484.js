// server/examples/servePublicProfile.inject.example.js
const fs = require('fs');
const path = require('path');

module.exports = function attachPublicProfileRoute(app) {
  app.get(['/public_profile.html', '/public/public_profile.html'], (req, res) => {
    const filePath = path.join(__dirname, '..', '..', 'public', 'public_profile.html');
    let html = fs.readFileSync(filePath, 'utf8');
    const tag = '<script src="/js/public_profile.hero-shrink.bind.js"></script>\n</body>';
    if (html.includes('</body>')) {
      html = html.replace('</body>', tag);
    } else {
      html += '\n<script src="/js/public_profile.hero-shrink.bind.js"></script>\n';
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });
};
