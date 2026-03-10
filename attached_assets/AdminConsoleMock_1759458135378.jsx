import { useEffect, useMemo, useState } from "react";
import { Link, Routes, Route, useNavigate } from "react-router-dom";

const LS_USERS = "mockUsers";
function loadUsers() {
  try { const raw = localStorage.getItem(LS_USERS); if (raw) return JSON.parse(raw); } catch {}
  const seed = [
    { id: "u1", email: "alice@example.com", is_public: true, is_admin: true },
    { id: "u2", email: "bob@example.com", is_public: true, is_admin: false },
    { id: "u3", email: "carol@example.com", is_public: false, is_admin: false }
  ];
  try { localStorage.setItem(LS_USERS, JSON.stringify(seed)); } catch {}
  return seed;
}
function saveUsers(users) { try { localStorage.setItem(LS_USERS, JSON.stringify(users)); } catch {} }

export default function AdminConsoleMock() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Admin</h1>
      <nav style={{ marginTop: 8, marginBottom: 16, display: "flex", gap: 12 }}>
        <Link to="/#/admin/users">Users</Link>
        <Link to="/#/admin/settings">Settings</Link>
      </nav>
      <Routes>
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  );
}

function UsersPage() {
  const [users, setUsers] = useState(() => loadUsers());
  useEffect(() => saveUsers(users), [users]);
  const toggle = (id, field) => setUsers(us => us.map(u => u.id === id ? { ...u, [field]: !u[field] } : u));
  return (
    <div>
      <h2>Users</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <th align="left">Email</th>
            <th>Public</th>
            <th>Admin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td align="center">{u.is_public ? "Yes" : "No"}</td>
              <td align="center">{u.is_admin ? "Yes" : "No"}</td>
              <td align="center">
                <button onClick={() => toggle(u.id, "is_public")}>Toggle Public</button>
                <button onClick={() => toggle(u.id, "is_admin")}>Toggle Admin</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPage() {
  return (
    <div>
      <h2>Settings</h2>
      <div style={{ color: "#64748b" }}>Mock admin settings go here.</div>
    </div>
  );
}
