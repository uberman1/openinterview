import { useEffect, useMemo, useState } from "react";

const LS_KEY = "userProfile";
const defaults = {
  name: "Your Name",
  headline: "What you do",
  avatarUrl: ""
};

export default function ProfileEditor() {
  const [draft, setDraft] = useState(defaults);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setDraft({ ...defaults, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(draft));
        setSavedAt(new Date());
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [draft]);

  const initials = useMemo(() => {
    return draft.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0]?.toUpperCase())
      .join("") || "U";
  }, [draft.name]);

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>Your Profile</h1>
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 24, alignItems: "start", marginBottom: 24 }}>
        <div style={{ width: 160, height: 160, borderRadius: "50%", border: "1px solid #e5e7eb", display: "grid", placeItems: "center", overflow: "hidden", background: "#f8fafc" }}>
          {draft.avatarUrl ? (
            <img src={draft.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 40, color: "#64748b" }}>{initials}</span>
          )}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Name</div>
            <input value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} style={inputStyle} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Headline</div>
            <input value={draft.headline} onChange={e => setDraft(v => ({ ...v, headline: e.target.value }))} style={inputStyle} />
          </label>
          <label>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Avatar URL</div>
            <input value={draft.avatarUrl} onChange={e => setDraft(v => ({ ...v, avatarUrl: e.target.value }))} style={inputStyle} />
          </label>
          <div style={{ fontSize: 12, color: "#64748b" }}>{savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Auto-saves as you type"}</div>
        </div>
      </div>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fafafa" }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Preview</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", border: "1px solid #e5e7eb", background: "#f8fafc", display: "grid", placeItems: "center" }}>
            {draft.avatarUrl ? (
              <img src={draft.avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontWeight: 700, color: "#475569" }}>{initials}</span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{draft.name || "Your Name"}</div>
            <div style={{ color: "#6b7280" }}>{draft.headline || "What you do"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "10px 12px",
  outline: "none"
};
