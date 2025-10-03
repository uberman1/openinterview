import { useEffect, useState } from 'react';

const LS_USERS = "mockAdminUsers";

function loadUsers() {
  try {
    const raw = localStorage.getItem(LS_USERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed = [
    { id: "u1", email: "admin@example.com", is_public: true, is_admin: true },
    { id: "u2", email: "alice@example.com", is_public: true, is_admin: false },
    { id: "u3", email: "bob@example.com", is_public: false, is_admin: false }
  ];
  try { localStorage.setItem(LS_USERS, JSON.stringify(seed)); } catch {}
  return seed;
}

function saveUsers(users) {
  try { localStorage.setItem(LS_USERS, JSON.stringify(users)); } catch {}
}

export default function AdminConsole({ path }) {
  const subRoute = path.replace('/admin', '') || '/';
  
  if (subRoute === '/' || subRoute === '') {
    return <AdminHome />;
  }
  if (subRoute === '/users') {
    return <AdminUsers />;
  }
  if (subRoute === '/settings') {
    return <AdminSettings />;
  }
  return <div style={{ padding: 24 }}>Admin - Unknown route: {subRoute}</div>;
}

function AdminHome() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16 }} data-testid="heading-admin">Admin Console</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>Manage users, settings, and system configuration.</p>
      <nav style={{ display: 'flex', gap: 16 }}>
        <a href="#/admin/users" style={{ color: '#3b82f6', textDecoration: 'underline' }} data-testid="link-admin-users">
          Users
        </a>
        <a href="#/admin/settings" style={{ color: '#3b82f6', textDecoration: 'underline' }} data-testid="link-admin-settings">
          Settings
        </a>
      </nav>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState(() => loadUsers());
  
  useEffect(() => {
    saveUsers(users);
  }, [users]);
  
  const toggle = (id, field) => {
    setUsers(us => us.map(u => u.id === id ? { ...u, [field]: !u[field] } : u));
  };
  
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }} data-testid="heading-users">Users</h1>
      <a href="#/admin" style={{ color: '#3b82f6', fontSize: 14, marginBottom: 16, display: 'block' }} data-testid="link-back-admin">
        ← Back to Admin
      </a>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th align="left" style={{ padding: '8px 0' }}>Email</th>
            <th style={{ padding: '8px 0' }}>Public</th>
            <th style={{ padding: '8px 0' }}>Admin</th>
            <th style={{ padding: '8px 0' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }} data-testid={`row-user-${u.id}`}>
              <td style={{ padding: '12px 0' }} data-testid={`text-email-${u.id}`}>{u.email}</td>
              <td align="center" style={{ padding: '12px 0' }} data-testid={`text-public-${u.id}`}>
                {u.is_public ? "Yes" : "No"}
              </td>
              <td align="center" style={{ padding: '12px 0' }} data-testid={`text-admin-${u.id}`}>
                {u.is_admin ? "Yes" : "No"}
              </td>
              <td align="center" style={{ padding: '12px 0' }}>
                <button
                  onClick={() => toggle(u.id, "is_public")}
                  style={{ padding: '4px 8px', marginRight: 8, borderRadius: 4, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
                  data-testid={`button-toggle-public-${u.id}`}
                >
                  Toggle Public
                </button>
                <button
                  onClick={() => toggle(u.id, "is_admin")}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}
                  data-testid={`button-toggle-admin-${u.id}`}
                >
                  Toggle Admin
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminSettings() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }} data-testid="heading-settings">Settings</h1>
      <a href="#/admin" style={{ color: '#3b82f6', fontSize: 14, marginBottom: 16, display: 'block' }} data-testid="link-back-admin">
        ← Back to Admin
      </a>
      <div style={{ color: '#64748b', marginTop: 16 }}>Mock admin settings page. Configuration options would appear here.</div>
    </div>
  );
}
