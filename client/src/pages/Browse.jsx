import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;
const LS_DATA = "mockItems";

function loadData() {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (raw) return JSON.parse(raw);
  } catch {}
  const items = Array.from({ length: 75 }).map((_, i) => ({
    id: i + 1,
    title: `Sample Item ${i + 1}`,
    desc: `This is a description for item ${i + 1}`
  }));
  try { localStorage.setItem(LS_DATA, JSON.stringify(items)); } catch {}
  return items;
}

function parseQuery(hash) {
  const idx = hash.indexOf('?');
  if (idx === -1) return {};
  const params = new URLSearchParams(hash.slice(idx + 1));
  return {
    page: parseInt(params.get('page') || '1', 10),
    query: params.get('query') || ''
  };
}

function buildHash(page, query) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `#/browse${qs ? '?' + qs : ''}`;
}

export default function Browse() {
  const [all] = useState(() => loadData());
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const parsed = parseQuery(window.location.hash);
    setQuery(parsed.query || '');
    setPage(parsed.page || 1);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseQuery(window.location.hash);
      setQuery(parsed.query || '');
      setPage(parsed.page || 1);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(x => x.title.toLowerCase().includes(q) || x.desc.toLowerCase().includes(q));
  }, [all, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const view = filtered.slice(start, start + PAGE_SIZE);

  const updateState = (newPage, newQuery) => {
    const finalPage = Math.max(1, Math.min(newPage, pageCount));
    window.location.hash = buildHash(finalPage, newQuery);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Browse Items</h1>
      <input
        value={query}
        onChange={e => updateState(1, e.target.value)}
        placeholder="Search items…"
        style={{ width: 320, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}
        data-testid="input-search"
      />
      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        {view.map(it => (
          <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }} data-testid={`item-${it.id}`}>
            <div style={{ fontWeight: 600 }} data-testid={`text-title-${it.id}`}>{it.title}</div>
            <div style={{ color: "#6b7280" }}>{it.desc}</div>
          </div>
        ))}
        {view.length === 0 && <div style={{ color: "#64748b" }} data-testid="text-no-results">No results.</div>}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          disabled={page <= 1}
          onClick={() => updateState(page - 1, query)}
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: page <= 1 ? "#f8fafc" : "#fff", cursor: page <= 1 ? "not-allowed" : "pointer" }}
          data-testid="button-prev"
        >
          Prev
        </button>
        <span data-testid="text-pagination">Page {page} / {pageCount}</span>
        <button
          disabled={page >= pageCount}
          onClick={() => updateState(page + 1, query)}
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: page >= pageCount ? "#f8fafc" : "#fff", cursor: page >= pageCount ? "not-allowed" : "pointer" }}
          data-testid="button-next"
        >
          Next
        </button>
      </div>
    </div>
  );
}
