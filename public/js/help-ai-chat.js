/**
 * Shared Help / Home AI chat: POST /api/help/ai, streaming, Markdown rendering.
 * Uses marked + DOMPurify (ESM) for assistant replies.
 */
import { marked } from 'https://esm.sh/marked@12.0.2';
import DOMPurify from 'https://esm.sh/dompurify@3.1.7';

marked.setOptions({ gfm: true, breaks: true });

const PURIFY = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'colspan', 'rowspan'],
  ALLOW_DATA_ATTR: false
};

export function formatAssistantHtml(markdown) {
  if (!markdown) return '';
  try {
    const raw = marked.parse(String(markdown), { async: false });
    return DOMPurify.sanitize(raw, PURIFY);
  } catch {
    return DOMPurify.sanitize(`<p>${escapeHtmlPlain(String(markdown))}</p>`, PURIFY);
  }
}

function escapeHtmlPlain(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getHelpAiUrl() {
  const base =
    typeof window !== 'undefined' && window.__OPENINTERVIEW_API_BASE__
      ? String(window.__OPENINTERVIEW_API_BASE__).replace(/\/$/, '')
      : '';
  return base ? `${base}/api/help/ai` : '/api/help/ai';
}

export function friendlyHelpAiHttpError(status, bodyText) {
  const t = bodyText || '';
  if (/cannot POST/i.test(t) || /<\s*!DOCTYPE\s+html/i.test(t)) {
    return (
      'Help AI is not available here: the server has no POST /api/help/ai. ' +
      'Run the OpenInterview Node server (npm run dev or node index.js), restart it after updating, and open Help from that same origin. ' +
      'If you use the Vite dev server, set BACKEND_URL to your Express URL and keep Express running.'
    );
  }
  const short = t.replace(/\s+/g, ' ').trim().slice(0, 400);
  return short || `Request failed (${status}).`;
}

export async function streamHelpAi(messages, onDelta) {
  const res = await fetch(getHelpAiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (ct.includes('application/json')) {
      const j = await res.json().catch(() => ({}));
      const retryText = j.retryAfterSeconds
        ? ` Try again in ${j.retryAfterSeconds} seconds.`
        : '';
      throw new Error(`${j.error || res.statusText || 'Request failed'}${retryText}`);
    }
    const t = await res.text();
    throw new Error(friendlyHelpAiHttpError(res.status, t));
  }
  if (!res.body) {
    const t = await res.text();
    onDelta(t);
    return t;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    onDelta(full);
  }
  full += dec.decode();
  onDelta(full);
  return full;
}

/**
 * @param {object} opts
 * @param {string} [opts.idPrefix] '' → ids like help-ai-modal; 'home-' → home-help-ai-modal
 * @param {'center'|'fab'} [opts.placement]
 * @param {HTMLElement | null} [opts.fabButton] required when placement==='fab'
 */
export function initHelpAiChat(opts) {
  const idPrefix = opts.idPrefix ?? '';
  const placement = opts.placement ?? 'center';
  const fabButton = opts.fabButton ?? null;

  const id = (suffix) => `${idPrefix}${suffix}`;

  let helpAiThread = [];
  let helpAiStreaming = false;

  const el = (suffix) => document.getElementById(id(suffix));

  function setThreadVisibility(hasMessages) {
    const empty = el('help-ai-empty');
    const thread = el('help-ai-thread');
    if (empty) empty.classList.toggle('hidden', hasMessages);
    if (thread) {
      thread.classList.toggle('hidden', !hasMessages);
      if (!hasMessages) thread.innerHTML = '';
    }
  }

  function openModal() {
    const modal = el('help-ai-modal');
    const input = el('help-ai-input');
    const err = el('help-ai-error');
    const sendLabel = el('help-ai-send-label');
    if (!modal) return;
    helpAiThread = [];
    helpAiStreaming = false;
    const thread = el('help-ai-thread');
    if (thread) thread.innerHTML = '';
    setThreadVisibility(false);
    if (err) {
      err.classList.add('hidden');
      err.textContent = '';
    }
    if (sendLabel) sendLabel.textContent = 'Send';
    modal.classList.add('help-ai-modal--open');
    modal.setAttribute('aria-hidden', 'false');
    if (placement === 'fab' && fabButton) {
      fabButton.classList.add('home-help-ai-fab--hidden');
      fabButton.setAttribute('aria-expanded', 'true');
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => input?.focus());
    });
  }

  function closeModal() {
    const modal = el('help-ai-modal');
    if (!modal) return;
    modal.classList.remove('help-ai-modal--open');
    modal.setAttribute('aria-hidden', 'true');
    helpAiThread = [];
    helpAiStreaming = false;
    const thread = el('help-ai-thread');
    if (thread) thread.innerHTML = '';
    setThreadVisibility(false);
    if (placement === 'fab' && fabButton) {
      fabButton.classList.remove('home-help-ai-fab--hidden');
      fabButton.setAttribute('aria-expanded', 'false');
    }
  }

  function appendUserBubble(text) {
    const thread = el('help-ai-thread');
    if (!thread) return;
    setThreadVisibility(true);
    const row = document.createElement('div');
    row.className = 'flex justify-end';
    row.innerHTML = `
    <div class="max-w-[min(100%,28rem)] rounded-2xl border border-neutral-200 bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/[0.03] dark:border-neutral-600 dark:bg-neutral-900 dark:ring-white/[0.04]">
      <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">You</p>
      <p class="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900 dark:text-neutral-100"></p>
    </div>`;
    row.querySelector('p:last-child').textContent = text;
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
  }

  function appendAssistantShell() {
    const thread = el('help-ai-thread');
    if (!thread) return { answerEl: null, cursorEl: null };
    setThreadVisibility(true);
    const row = document.createElement('div');
    row.className = 'flex justify-start';
    row.innerHTML = `
    <div class="flex max-w-[min(100%,32rem)] gap-2.5">
      <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-primary shadow-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100">
        <span class="material-symbols-outlined text-lg" aria-hidden="true">menu_book</span>
      </div>
      <div class="min-w-0 flex-1 rounded-2xl border border-neutral-200 bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/[0.03] dark:border-neutral-600 dark:bg-neutral-900 dark:ring-white/[0.04]">
        <div class="mb-1.5 flex flex-wrap items-center justify-between gap-1">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Assistant</span>
          <span class="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">Handbook</span>
        </div>
        <div class="flex items-start gap-1">
          <div class="help-ai-answer help-ai-md min-h-[1.25rem] flex-1 text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200"></div>
          <span class="help-ai-cursor mt-1 shrink-0" aria-hidden="true"></span>
        </div>
      </div>
    </div>`;
    thread.appendChild(row);
    thread.scrollTop = thread.scrollHeight;
    return {
      answerEl: row.querySelector('.help-ai-answer'),
      cursorEl: row.querySelector('.help-ai-cursor')
    };
  }

  function wire() {
    const modal = el('help-ai-modal');
    const btn = placement === 'fab' ? fabButton : document.getElementById(id('help-ask-ai-btn'));
    const backdrop = el('help-ai-backdrop');
    const closeBtn = el('help-ai-close');
    const cancelBtn = el('help-ai-cancel');
    const form = el('help-ai-form');
    const input = el('help-ai-input');
    const sendBtn = el('help-ai-send');
    const errEl = el('help-ai-error');
    const sendLabel = el('help-ai-send-label');

    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
    backdrop?.addEventListener('click', () => closeModal());
    closeBtn?.addEventListener('click', () => closeModal());
    cancelBtn?.addEventListener('click', () => closeModal());

    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (!modal?.classList.contains('help-ai-modal--open')) return;
      closeModal();
    };
    document.addEventListener('keydown', onKey);

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form?.requestSubmit();
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = String(input?.value || '').trim();
      if (!text || !sendBtn || helpAiStreaming) return;
      if (errEl) {
        errEl.classList.add('hidden');
        errEl.textContent = '';
      }
      helpAiStreaming = true;
      sendBtn.disabled = true;
      if (sendLabel) sendLabel.textContent = 'Sending…';
      const userMsg = { role: 'user', content: text };
      helpAiThread.push(userMsg);
      appendUserBubble(text);
      if (input) input.value = '';
      const { answerEl, cursorEl } = appendAssistantShell();
      try {
        const messagesForApi = helpAiThread.map((m) => ({ role: m.role, content: m.content }));
        const full = await streamHelpAi(messagesForApi, (fullText) => {
          if (answerEl) {
            answerEl.innerHTML = formatAssistantHtml(fullText);
          }
          if (cursorEl && fullText.length > 0) cursorEl.classList.add('hidden');
          const t = el('help-ai-thread');
          if (t) t.scrollTop = t.scrollHeight;
        });
        helpAiThread.push({ role: 'assistant', content: full });
        if (cursorEl) cursorEl.remove();
      } catch (err) {
        console.error(err);
        if (errEl) {
          errEl.textContent = err instanceof Error ? err.message : 'Something went wrong.';
          errEl.classList.remove('hidden');
        }
        helpAiThread.pop();
        const threadEl = el('help-ai-thread');
        threadEl?.lastElementChild?.remove();
        threadEl?.lastElementChild?.remove();
        if (threadEl && !threadEl.children.length) setThreadVisibility(false);
      } finally {
        helpAiStreaming = false;
        sendBtn.disabled = false;
        if (sendLabel) sendLabel.textContent = 'Send';
        input?.focus();
      }
    });

    return () => document.removeEventListener('keydown', onKey);
  }

  const teardown = wire();
  return { open: openModal, close: closeModal, teardown };
}
