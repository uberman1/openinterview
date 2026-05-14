import { useEffect, useMemo, useState } from "react";

const LS_VIDEOS = "mockVideos"; // [{id, name, size, ts}]
const LS_SHARES = "mockShares"; // { token: videoId }

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}

export default function ShareMock({ token }) {
  const videos = load(LS_VIDEOS, []);
  const shares = load(LS_SHARES, {});
  const video = useMemo(() => videos.find(v => v.id === shares[token]), [token]);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Shared Item</h1>
      {!shares[token] && (
        <div style={{ color: "#dc2626" }} data-testid="text-invalid-token">Invalid or unknown token.</div>
      )}
      {shares[token] && !video && (
        <div style={{ color: "#f59e0b" }} data-testid="text-item-not-found">Item exists but not found locally. This is expected if the share was generated on another device.</div>
      )}
      {video && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fafafa" }} data-testid="container-shared-video">
          <div style={{ fontWeight: 600, marginBottom: 8 }} data-testid="text-video-name">{video.name}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{Math.round(video.size/1024)} KB • {new Date(video.ts).toLocaleString()}</div>
          <div style={{ marginTop: 12, padding: 24, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 8 }} data-testid="container-mock-player">
            Mock player preview
          </div>
        </div>
      )}
    </div>
  );
}
