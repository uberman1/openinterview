export function toast(msg, kind='info') {
  let root = document.getElementById('toastRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toastRoot';
    root.className = 'fixed inset-x-0 top-4 z-[9999] flex justify-center px-4';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  const colors = kind === 'error'
    ? 'bg-red-600 text-white'
    : kind === 'success'
      ? 'bg-emerald-600 text-white'
      : 'bg-gray-900 text-white';
  el.className = `toast px-4 py-2 rounded-lg shadow ${colors}`;
  el.style.animation = 'slideUp .2s ease-out';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}
export function ensureStyles() {
  if (document.getElementById('utils-inline-styles')) return;
  const style = document.createElement('style');
  style.id = 'utils-inline-styles';
  style.textContent = `@keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`;
  document.head.appendChild(style);
}
