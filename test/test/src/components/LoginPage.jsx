// src/components/LoginPage.jsx
import { useState } from "react";
import api from "../services/api.js";
import { saveSession } from "../services/auth.js";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.login({ username: username.trim(), password });
      saveSession(data.token, data.user);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>🏪</span>
          <h1 style={styles.title}>POS System</h1>
        </div>
        <p style={styles.subtitle}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              autoComplete="username"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={styles.hint}>Default: admin / admin123</p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a1a2e",
  },
  card: {
    background: "#16213e",
    border: "1px solid #0f3460",
    borderRadius: 12,
    padding: "40px 36px",
    width: 360,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    margin: 0,
    fontSize: 22,
    color: "#e2e8f0",
    fontWeight: 700,
  },
  subtitle: {
    margin: "4px 0 24px",
    color: "#94a3b8",
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: 500,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #0f3460",
    background: "#0f3460",
    color: "#e2e8f0",
    fontSize: 15,
    outline: "none",
  },
  error: {
    background: "#7f1d1d",
    border: "1px solid #ef4444",
    color: "#fca5a5",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
  },
  btn: {
    padding: "12px",
    borderRadius: 8,
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    transition: "opacity 0.2s",
  },
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
  },
};