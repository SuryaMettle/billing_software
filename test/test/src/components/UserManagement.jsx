// src/components/UserManagement.jsx
import { useEffect, useState } from "react";
import api from "../services/api.js";

const ROLE_LABEL = { admin: "Admin", cashier: "Cashier" };

const ALL_PAGES = [
  { key: "billing",          label: "Billing" },
  { key: "products",         label: "Products" },
  { key: "invoices",         label: "Invoices" },
  { key: "sales-return",     label: "Sales Return" },
  { key: "parties",          label: "Parties" },
  { key: "purchases",        label: "Purchase Invoice" },
  { key: "purchase-history", label: "Purchase History" },
  { key: "purchase-return",  label: "Purchase Return" },
  { key: "offers",           label: "Offers" },
  { key: "gst-reports",      label: "GST Reports" },
];

const LOCKED_PAGES = ["billing", "invoices", "parties"];

export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null); 
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); 
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
  if (page > totalPages) setPage(totalPages);
}, [totalPages]);

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditUser(null); setShowForm(true); setError(""); setSuccess(""); };
  const openEdit   = (u)  => { setEditUser(u);   setShowForm(true); setError(""); setSuccess(""); };
  const closeForm  = ()   => { setShowForm(false); setEditUser(null); };

  const handleDelete = async () => {
  if (!confirmDelete) return;
  try {
    await api.deleteUser(confirmDelete.id);
    setConfirmDelete(null);
    setSuccess("User deleted.");
    load();
  } catch (err) {
    setError(err.message);
    setConfirmDelete(null);
  }
};

  const handleToggle = async (u) => {
    try {
      await api.updateUser(u.id, { active: u.active ? 0 : 1 });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>User Management</h2>
        <button style={s.addBtn} onClick={openCreate}>+ Add User</button>
      </div>

      {error   && <div style={s.error}>{error}</div>}
      {success && <div style={s.success}>{success}</div>}

      <table style={s.table}>
        <thead>
          <tr>
            {["Username", "Role", "Status", "Created", "Actions"].map((h) => (
              <th key={h} style={s.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedUsers.map((u) => (
            <tr key={u.id} style={s.tr}>
              <td style={s.td}>{u.username}</td>
              <td style={s.td}>
                <span style={{ ...s.badge, background: u.role === "admin" ? "#1d4ed8" : "#065f46" }}>
                  {ROLE_LABEL[u.role] || u.role}
                </span>
              </td>
              <td style={s.td}>
                <span style={{ ...s.badge, background: u.active ? "#065f46" : "#7f1d1d" }}>
                  {u.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td style={s.td}>{u.created_at?.slice(0, 10) || "—"}</td>
              <td style={s.td}>
                <button style={s.actionBtn} onClick={() => openEdit(u)}>Edit</button>
                <button style={{ ...s.actionBtn, background: "#374151" }} onClick={() => handleToggle(u)}>
                  {u.active ? "Deactivate" : "Activate"}
                </button>
                <button style={{ ...s.actionBtn, background: "#7f1d1d" }} onClick={() => setConfirmDelete(u)}>
  Delete
</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
    <button
      onClick={() => setPage(p => Math.max(1, p - 1))}
      disabled={page === 1}
      style={{ ...s.actionBtn, background: page === 1 ? "#9ca3af" : "#374151", cursor: page === 1 ? "not-allowed" : "pointer" }}
    >
      ← Prev
    </button>
    <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
      Page {page} of {totalPages}
    </span>
    <button
      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
      disabled={page === totalPages}
      style={{ ...s.actionBtn, background: page === totalPages ? "#9ca3af" : "#374151", cursor: page === totalPages ? "not-allowed" : "pointer" }}
    >
      Next →
    </button>
  </div>
)}

      {showForm && (
        <UserForm
          user={editUser}
          onSaved={() => { closeForm(); load(); setSuccess(editUser ? "User updated." : "User created."); }}
          onCancel={closeForm}
        />
      )}
      
      {confirmDelete && (
  <div style={s.modalOverlay}>
    <div style={{ ...s.modal, width: 340, textAlign: "center" }}>
      <h3 style={{ margin: "0 0 10px", color: "#111827" }}>Delete User</h3>
      <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
        Are you sure you want to delete <strong>{confirmDelete.username}</strong>? This cannot be undone.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button
          onClick={() => setConfirmDelete(null)}
          style={{ ...s.actionBtn, background: "#374151", padding: "8px 20px" }}
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          style={{ ...s.actionBtn, background: "#7f1d1d", padding: "8px 20px" }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

function UserForm({ user, onSaved, onCancel }) {
  const isEdit = !!user;
  const [username, setUsername] = useState(user?.username || "");
  const [role,     setRole]     = useState(user?.role || "cashier");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const parsePerms = (raw) => {
    try { return JSON.parse(raw || "[]"); } catch { return []; }
  };

  const defaultPerms = [...LOCKED_PAGES];
  const [permissions, setPermissions] = useState(
    isEdit ? parsePerms(user.permissions) : [...defaultPerms]
  );

  const togglePerm = (key) => {
    if (LOCKED_PAGES.includes(key)) return;
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isEdit) {
        const payload = { username, role };
        if (password) payload.password = password;
        if (role === "cashier") payload.permissions = JSON.stringify(permissions);
        await api.updateUser(user.id, payload);
      } else {
        await api.createUser({
          username, role, password,
          permissions: role === "cashier" ? JSON.stringify(permissions) : null
        });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.modalOverlay}>
      <div style={{ ...s.modal, width: role === "cashier" ? 460 : 380, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={s.modalTitle}>{isEdit ? "Edit User" : "Create User"}</h3>

        <form onSubmit={handleSubmit} style={s.form}>
          <label style={s.label}>Username</label>
          <input
  style={s.input}
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  required
  autoFocus  
/>

          <label style={s.label}>Role</label>
          <select style={s.input} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="cashier">Cashier</option>
            <option value="admin">Admin</option>
          </select>

          <label style={s.label}>{isEdit ? "New Password (leave blank to keep)" : "Password"}</label>
          <input
            style={s.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isEdit}
            placeholder={isEdit ? "Leave blank to keep current" : "Min 4 characters"}
          />

          {/* ── Page Permissions (cashier only) ── */}
          {role === "cashier" && (
            <div style={{ marginTop: 8 }}>
              <label style={{ ...s.label, marginBottom: 8, display: "block" }}>
                Page Access
              </label>
              <div style={{
                border: "1px solid #e5e7eb", borderRadius: 8,
                padding: "12px 14px", background: "#f9fafb",
                display: "flex", flexDirection: "column", gap: 8
              }}>
                {ALL_PAGES.map(({ key, label }) => {
                  const locked  = LOCKED_PAGES.includes(key);
                  const checked = locked || permissions.includes(key);
                  return (
                    <label
                      key={key}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        cursor: locked ? "not-allowed" : "pointer",
                        opacity: locked ? 0.6 : 1,
                        fontSize: 13, color: "#374151"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => togglePerm(key)}
                        style={{ width: 15, height: 15, cursor: locked ? "not-allowed" : "pointer" }}
                      />
                      {label}
                      {locked && (
                        <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                          always on
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {error && <div style={s.error}>{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="submit" style={s.addBtn} disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
            <button type="button" style={{ ...s.actionBtn, background: "#374151", padding: "10px 20px" }} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  page: { padding: 24 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { margin: 0, color: "#111827", fontSize: 20, fontWeight: 700 },
  addBtn: {
    padding: "10px 20px", background: "#3b82f6", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 14px", background: "#0f3460", color: "#fff", fontSize: 13, fontWeight: 600 },
  tr: { borderBottom: "1px solid #e5e7eb", background: "#fff" },
  td: { padding: "10px 14px", color: "#111827", fontSize: 14 },
  badge: {
    display: "inline-block", padding: "3px 10px", borderRadius: 12,
    fontSize: 12, fontWeight: 600, color: "#fff",
  },
  actionBtn: {
    padding: "6px 12px", background: "#1d4ed8", color: "#fff",
    border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12,
    marginRight: 6, fontWeight: 500,
  },
  error:   { background: "#fef2f2", border: "1px solid #ef4444", color: "#dc2626", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 },
  success: { background: "#f0fdf4", border: "1px solid #10b981", color: "#065f46", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 32, width: 380 },
  modalTitle: { margin: "0 0 20px", color: "#111827", fontSize: 18, fontWeight: 700 },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontSize: 13, color: "#374151", fontWeight: 500 },
  input: {
    padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db",
    background: "#f9fafb", color: "#111827", fontSize: 14, outline: "none",
  },
};