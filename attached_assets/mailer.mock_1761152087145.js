// Local "mailer" that saves messages to localStorage and opens a preview window.
// In production, replace sendEmail() with a real API POST.
export async function sendEmail({ to, subject, html, previewUrl }) {
  const item = {
    id: crypto.randomUUID(),
    to,
    subject,
    html,
    previewUrl: previewUrl || null,
    sentAt: new Date().toISOString()
  };
  const key = 'oi.outbox';
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.unshift(item);
  localStorage.setItem(key, JSON.stringify(list));

  // Open a preview window so devs can see what was "sent"
  const w = 860, h = 900;
  const left = (screen.width - w) / 2;
  const top  = (screen.height - h) / 2;
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, 'emailPreview', `width=${w},height=${h},left=${left},top=${top}`);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return item;
}
