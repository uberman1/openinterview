// Builds a subject + HTML for our email using an inline Tailwind-y template (works in browser preview)
export function buildEmail({ senderName = "A colleague", message = "", link = "#" }) {
  const subject = `${senderName} shared an interview with you`;
  // Inline template mirrors email.html with token replacement
  const html = `<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>OpenInterview.me Email</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet"/>
<style>
  body { background:#f7f7f7; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#141414; }
  .card { max-width: 640px; margin: 32px auto; background:#fff; border:1px solid #e5e5e5; border-radius:12px; overflow:hidden; }
  .header, .footer { padding:20px 24px; border-bottom:1px solid #e5e5e5; }
  .footer { border-top:1px solid #e5e5e5; border-bottom:none; text-align:center; color:#6b7280; font-size:12px;}
  .content { padding:24px; }
  .title { font-weight:900; font-size:28px; margin:0 0 8px 0; }
  .msg { background:#f7f7f7; border-radius:10px; padding:16px; color:#374151; font-style:italic; }
  .btn { display:inline-block; padding:12px 20px; border-radius:10px; background:#141414; color:#fff; text-decoration:none; font-weight:700; }
  .muted { color:#6b7280; }
</style>
</head>
<body>
  <div class="card">
    <div class="header"><strong>OpenInterview.me</strong></div>
    <div class="content">
      <h1 class="title">You're invited to view an interview</h1>
      <p class="muted">Hello,</p>
      <p><strong>${escapeHtml(senderName)}</strong> has shared a video interview with you on OpenInterview.me.</p>
      ${message ? `<div class="msg">${escapeHtml(message)}</div>` : ``}
      <p style="margin:18px 0 4px 0;">
        <a href="${link}" class="btn" target="_blank" rel="noopener">View Interview</a>
      </p>
    </div>
    <div class="footer">
      <a href="#" style="color:#6b7280; text-decoration:none">OpenInterview.me</a> &nbsp;|&nbsp; <a href="#" style="color:#6b7280; text-decoration:none">Unsubscribe</a>
      <div style="margin-top:6px">123 Minimalist St, Suite 101, Executive City, 12345</div>
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

// very small HTML escape for preview safety
function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}
