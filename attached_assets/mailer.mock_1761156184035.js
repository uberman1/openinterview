export async function sendEmail({ to, subject, html }) {
  const item = {
    id: (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    to, subject, html,
    sentAt: new Date().toISOString()
  };
  const key = 'oi.outbox';
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.unshift(item);
  localStorage.setItem(key, JSON.stringify(list));
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const w = 860, h = 900;
    const left = (screen.width - w) / 2;
    const top  = (screen.height - h) / 2;
    window.open(url, 'emailPreview', `width=${w},height=${h},left=${left},top=${top}`);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch {}
  return item;
}
