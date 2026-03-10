import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PAGE_SIZE = 10;
const LS_DATA = "mockItems"; // persist generated dataset

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

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function PaginationSearchMock() {
  const nav = useNavigate();
  const qs = useQuery();
  const [all] = useState(() => loadData());
  const [query, setQuery] = useState(qs.get("query") || "");
  const [page, setPage] = useState(parseInt(qs.get("page") || "1", 10));

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (page > 1) params.set("page", String(page));
    nav({ search: params.toString() }, { replace: true });
  }, [query, page]);

  const filtered = useMemo(() => {
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(x => x.title.toLowerCase().includes(q) || x.desc.toLowerCase().includes(q));
  }, [all, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const view = filtered.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Browse Items</h1>
      <input
        value={query}
        onChange={e => { setPage(1); setQuery(e.target.value); }}
        placeholder="Search items…"
        style={{ width: 320, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px" }}
      />
      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        {view.map(it => (
          <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{it.title}</div>
            <div style={{ color: "#6b7280" }}>{it.desc}</div>
          </div>
        ))}
        {view.length === 0 && <div style={{ color: "#64748b" }}>No results.</div>}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
        <span>Page {page} / {pageCount}</span>
        <button disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Next</button>
      </div>
    </div>
  );
}
