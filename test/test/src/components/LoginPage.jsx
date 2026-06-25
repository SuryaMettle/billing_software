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
    <div style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoBadge}>
            <span style={styles.logoText}>POS</span>
          </div>
          <h1 style={styles.title}>Billing Console</h1>
          <p style={styles.subtitle}>Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoFocus
              autoComplete="username"
              required
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#334155";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#334155";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = "#2563eb";
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = "#1d4ed8";
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={styles.divider} />

        
      </div>

      <div style={styles.copyright}>© {new Date().getFullYear()} POS Billing System</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0b1120 0%, #0f172a 50%, #0b1120 100%)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  glowOne: {
    position: "absolute",
    top: "-15%",
    left: "-10%",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  glowTwo: {
    position: "absolute",
    bottom: "-15%",
    right: "-10%",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(29,78,216,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "rgba(17,24,39,0.85)",
    backdropFilter: "blur(20px)",
    borderRadius: 12,
    width: 400,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
    position: "relative",
    zIndex: 1,
  },
  header: {
    padding: "40px 40px 28px",
    textAlign: "center",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  logoBadge: {
    width: 56,
    height: 56,
    margin: "0 auto 18px",
    borderRadius: 14,
    background: "linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
  },
  logoText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "0.06em",
  },
  title: {
    margin: 0,
    fontSize: 21,
    color: "#f1f5f9",
    fontWeight: 700,
    letterSpacing: "0.01em",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#94a3b8",
    fontSize: 13,
  },
  form: {
    padding: "28px 40px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  input: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "rgba(15,23,42,0.6)",
    color: "#f1f5f9",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    boxSizing: "border-box",
  },
  error: {
    background: "rgba(127,29,29,0.3)",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#fca5a5",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 500,
  },
  btn: {
    padding: "13px",
    borderRadius: 8,
    border: "none",
    background: "#1d4ed8",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.02em",
    marginTop: 4,
    transition: "background 0.15s ease",
    boxShadow: "0 4px 16px rgba(29,78,216,0.4)",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "8px 40px 0",
  },
  footer: {
    padding: "16px 40px 28px",
    textAlign: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#64748b",
  },
  copyright: {
    marginTop: 24,
    fontSize: 12,
    color: "#475569",
    position: "relative",
    zIndex: 1,
  },
};