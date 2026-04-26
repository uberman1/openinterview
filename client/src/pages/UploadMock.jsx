import { useEffect, useState } from "react";

const LS_VIDEOS = "mockVideos"; // [{id, name, size, ts}]
const LS_SHARES = "mockShares"; // { token: videoId }

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function save(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
}
function rid() { return Math.random().toString(36).slice(2, 10) }
function rtoken() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2, 6) }

export default function UploadMock() {
  const [items, setItems] = useState(() => load(LS_VIDEOS, []))
  const [shares, setShares] = useState(() => load(LS_SHARES, {}))
  useEffect(() => save(LS_VIDEOS, items), [items])
  useEffect(() => save(LS_SHARES, shares), [shares])

  const onPick = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const next = files.map(f => ({ id: rid(), name: f.name, size: f.size, ts: Date.now() }))
    setItems(curr => [...next, ...curr])
    e.target.value = ""
  }

  const genShare = (id) => {
    const token = rtoken()
    setShares(s => ({ ...s, [token]: id }))
    const url = `${location.origin}/#/s/${token}`
    navigator.clipboard?.writeText(url).catch(() => {})
    alert(`Share link copied:\n${url}`)
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Mock Uploads</h1>
      <input type="file" multiple onChange={onPick} data-testid="input-file-upload" />
      <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280" }}>Files are simulated and stored in localStorage only.</div>

      <ul style={{ marginTop: 16, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
        {items.length === 0 && <li style={{ color: "#64748b" }} data-testid="text-no-uploads">No uploads yet.</li>}
        {items.map(it => (
          <li key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }} data-testid={`item-upload-${it.id}`}>
            <div>
              <div style={{ fontWeight: 600 }} data-testid={`text-filename-${it.id}`}>{it.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{Math.round(it.size/1024)} KB • {new Date(it.ts).toLocaleString()}</div>
            </div>
            <button onClick={() => genShare(it.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc", cursor: "pointer" }} data-testid={`button-share-${it.id}`}>
              Generate Share Link
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
