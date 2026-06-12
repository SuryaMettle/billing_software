// src/App.jsx
import { useEffect, useState } from "react";
import Billing from "./components/Billing";
import ProductForm from "./components/ProductForm";
import ProductList from "./components/ProductList";
import InvoiceList from "./components/InvoiceList";
import Parties from "./components/Parties";
import PurchaseBilling from "./components/PurchaseBilling";
import PurchaseInvoiceList from "./components/PurchaseInvoiceList";
import Settings from "./components/Settings";
import SalesReturn from "./components/SalesReturn";
import PurchaseReturn from "./components/PurchaseReturn";
import Offers from "./components/Offers";
import GSTReports from "./components/GSTReports";
import LoginPage from "./components/LoginPage";
import UserManagement from "./components/UserManagement";
import "./App.css";

import api from "./services/api.js";
import { isLoggedIn, getStoredUser, clearSession } from "./services/auth.js";
import { subscribeToRealtimeEvents } from "./services/socket.js";

// ─── Permission map ───────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "billing",          label: "Billing",           roles: ["admin", "cashier"] },
  { key: "products",         label: "Products",          roles: ["admin", "cashier"] },
  { key: "invoices",         label: "Invoices",          roles: ["admin", "cashier"] },
  { key: "sales-return",     label: "Sales Return",      roles: ["admin", "cashier"] },
  { key: "parties",          label: "Parties",           roles: ["admin", "cashier"] },
  { key: "purchases",        label: "Purchase Invoice",  roles: ["admin"] },
  { key: "purchase-history", label: "Purchase History",  roles: ["admin"] },
  { key: "purchase-return",  label: "Purchase Return",   roles: ["admin"] },
  { key: "offers",           label: "Offers",            roles: ["admin"] },
  { key: "gst-reports",      label: "GST Reports",       roles: ["admin"] },
  { key: "settings",         label: "Settings",          roles: ["admin"] },
  { key: "users",            label: "Users",             roles: ["admin"] },
];

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser]         = useState(() => isLoggedIn() ? getStoredUser() : null);
  const [page, setPage]         = useState("billing");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showLogoutSummary, setShowLogoutSummary]   = useState(false);
  const [showLoginSummary, setShowLoginSummary]     = useState(false);
  const [sessionSummary, setSessionSummary]         = useState(null);
  const [lastSessionSummary, setLastSessionSummary] = useState(null);
  const [sidebarOpen, setSidebarOpen]               = useState(true);

  const role = user?.role || null;

  // ── Auth handlers ──────────────────────────────────────────────────────────
  const handleLogin = async (loggedInUser) => {
    setUser(loggedInUser);
    setPage("billing");
    try {
      const last = await api.getLastSession();
      if (last && last.username !== loggedInUser.username) {
        setLastSessionSummary(last);
        setShowLoginSummary(true);
      }
    } catch(e) { /* ignore */ }
  };

  const handleLogout = async () => {
    const storedUser = getStoredUser();
    const sessionId = storedUser?.sessionId;
    try {
      const res = await api.logout({ session_id: sessionId });
      if (res?.summary) {
        setSessionSummary(res.summary);
        setShowLogoutSummary(true);
        return;
      }
    } catch(e) { /* ignore */ }
    doLogout();
  };

  const doLogout = () => {
    clearSession();
    setUser(null);
    setProducts([]);
    setCategories([]);
    setShowLogoutSummary(false);
    setSessionSummary(null);
  };

  useEffect(() => {
    const listener = () => handleLogout();
    window.addEventListener("auth:logout", listener);
    return () => window.removeEventListener("auth:logout", listener);
  }, []);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch { }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories?.();
      setCategories(Array.isArray(data) ? data : []);
    } catch { }
  };

  const refreshInventoryData = async () => {
    await Promise.all([loadProducts(), loadCategories()]);
  };

  const deleteProduct = async (id) => {
    await api.deleteProduct(id);
    await refreshInventoryData();
  };

  useEffect(() => {
    if (user) refreshInventoryData();
  }, [user]);

  // ── Realtime events ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const dispatchLocalEvent = (eventName) => window.dispatchEvent(new Event(eventName));
    return subscribeToRealtimeEvents({
      onInventoryChanged: () => { refreshInventoryData(); dispatchLocalEvent("stock-updated"); dispatchLocalEvent("product-updated"); },
      onInvoiceChanged:   () => { refreshInventoryData(); dispatchLocalEvent("invoice-updated"); },
      onPurchaseChanged:  () => { refreshInventoryData(); dispatchLocalEvent("purchase-updated"); },
      onCustomerChanged:  () => { dispatchLocalEvent("customer-updated"); },
      onOffersChanged:    () => { dispatchLocalEvent("offers-updated"); },
      onSettingsChanged:  () => { dispatchLocalEvent("settings-updated"); },
    });
  }, [user]);

  useEffect(() => {
    const h = () => refreshInventoryData();
    window.addEventListener("purchase-updated", h);
    window.addEventListener("invoice-updated", h);
    return () => {
      window.removeEventListener("purchase-updated", h);
      window.removeEventListener("invoice-updated", h);
    };
  }, []);

  if (!user) return <LoginPage onLogin={handleLogin} />;

  // ── Permissions ────────────────────────────────────────────────────────────
  const ALWAYS_ALLOWED = ["billing", "invoices", "parties"];
  const getUserPermissions = () => {
    if (role === "admin") return null;
    try {
      const storedUser = getStoredUser();
      const saved = JSON.parse(storedUser?.permissions || "[]");
      return [...new Set([...ALWAYS_ALLOWED, ...saved])];
    } catch { return [...ALWAYS_ALLOWED]; }
  };

  const userPerms = getUserPermissions();
  const canAccess = (key) => role === "admin" ? true : (userPerms?.includes(key) ?? false);
  const allowedPages = NAV_ITEMS.filter((n) => n.roles.includes(role) && canAccess(n.key)).map((n) => n.key);
  const extraPages   = ["create-product"];
  const activePage   = (allowedPages.includes(page) || extraPages.includes(page)) ? page : "billing";
  const visibleNav   = NAV_ITEMS.filter((n) => n.roles.includes(role) && canAccess(n.key));

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* ── SIDEBAR ── */}
      <div
        className="sidebar"
        style={{
          width: sidebarOpen ? 196 : 48,
          minWidth: sidebarOpen ? 196 : 48,
          transition: "width 0.25s ease, min-width 0.25s ease",
          flexShrink: 0,
        }}
      >
        <div style={{ width: "100%", display: "flex", flexDirection: "column", transition: "width 0.25s ease" }}>

          {/* TOP ROW: hamburger always at left, title beside it when open */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8, flexShrink: 0 }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ccc",
                fontSize: 22,
                cursor: "pointer",
                padding: "4px 8px",
                lineHeight: 1,
                flexShrink: 0,
              }}
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              ☰
            </button>

          </div>

          {/* Nav buttons */}
          {sidebarOpen && visibleNav.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`nav-btn ${activePage === key ? "active" : ""}`}
            >
              {label}
            </button>
          ))}

          {/* ── User info + logout ── */}
          {sidebarOpen && (
            <div style={styles.sidebarFooter}>
              <div style={styles.userInfo}>
                <span style={styles.userIcon}>👤</span>
                <span style={styles.userName}>{user.username}</span>
                <span style={styles.userRole}>{role === "admin" ? "Admin" : "Cashier"}</span>
              </div>
              <button style={styles.logoutBtn} onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="main" style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "auto", position: "relative" }}>
        <div style={{ flex: 1, width: "100%", padding: "20px 30px" }}>

          {activePage === "billing" && (
            <Billing onInvoiceSaved={refreshInventoryData} products={products} />
          )}

          {activePage === "products" && canAccess("products") && (
            <ProductList
              products={products}
              onDelete={role === "admin" ? deleteProduct : undefined}
              onProductAdded={refreshInventoryData}
              onCreateProduct={role === "admin" ? () => setPage("create-product") : undefined}
            />
          )}

          {activePage === "create-product" && role === "admin" && (
            <ProductForm
              products={products}
              onBack={() => setPage("products")}
              onProductAdded={() => { refreshInventoryData(); setPage("products"); }}
            />
          )}

          {activePage === "invoices" && <InvoiceList />}

          {activePage === "sales-return" && canAccess("sales-return") && (
            <SalesReturn products={products} onReturnSaved={refreshInventoryData} />
          )}

          {activePage === "parties" && (
            <Parties onOpenInvoices={() => setPage("invoices")} />
          )}

          {activePage === "purchases" && role === "admin" && <PurchaseBilling />}
          {activePage === "purchase-history" && role === "admin" && <PurchaseInvoiceList />}
          {activePage === "purchase-return" && role === "admin" && (
            <PurchaseReturn onReturnSaved={refreshInventoryData} />
          )}
          {activePage === "offers" && role === "admin" && (
            <Offers products={products} categories={categories} />
          )}
          {activePage === "gst-reports" && role === "admin" && <GSTReports />}
          {activePage === "settings" && role === "admin" && <Settings />}
          {activePage === "users" && role === "admin" && <UserManagement />}

        </div>
      </div>

      {/* ── LOGOUT SUMMARY MODAL ── */}
      {showLogoutSummary && sessionSummary && (
        <div onClick={() => setShowLogoutSummary(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 16, padding: 32,
            width: 380, boxShadow: "0 25px 50px rgba(0,0,0,0.3)", textAlign: "center",
            position: "relative"
          }}>
            <button onClick={() => setShowLogoutSummary(false)} style={{
              position: "absolute", top: 12, right: 12, background: "transparent",
              border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af", lineHeight: 1, padding: 4
            }}>✕</button>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
            <h3 style={{ margin: "0 0 4px", color: "#111" }}>Session Summary</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#666" }}>
              {sessionSummary.username} • {sessionSummary.login_at}
            </p>
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "20px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Total Sales</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#16a34a" }}>
                ₹{Number(sessionSummary.total_sales).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
                {sessionSummary.invoice_count} invoice{sessionSummary.invoice_count !== 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={doLogout} style={{
              width: "100%", padding: "12px", borderRadius: 8, border: "none",
              background: "#7f1d1d", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer"
            }}>Confirm Logout</button>
          </div>
        </div>
      )}

      {/* ── LAST SESSION SUMMARY ON LOGIN ── */}
      {showLoginSummary && lastSessionSummary && (
        <div onClick={() => { setShowLoginSummary(false); setLastSessionSummary(null); }} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 16, padding: 32,
            width: 380, boxShadow: "0 25px 50px rgba(0,0,0,0.3)", textAlign: "center",
            position: "relative"
          }}>
            <button onClick={() => { setShowLoginSummary(false); setLastSessionSummary(null); }} style={{
              position: "absolute", top: 12, right: 12, background: "transparent",
              border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af", lineHeight: 1, padding: 4
            }}>✕</button>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <h3 style={{ margin: "0 0 4px", color: "#111" }}>Previous Session</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#666" }}>
              {lastSessionSummary.username} • {lastSessionSummary.login_at}
            </p>
            <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 12, padding: "20px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Total Sales</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#1d4ed8" }}>
                ₹{Number(lastSessionSummary.total_sales).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 8 }}>
                {lastSessionSummary.invoice_count} invoice{lastSessionSummary.invoice_count !== 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={() => { setShowLoginSummary(false); setLastSessionSummary(null); }} style={{
              width: "100%", padding: "12px", borderRadius: 8, border: "none",
              background: "#1d4ed8", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer"
            }}>OK, Got It</button>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  sidebarFooter: {
    marginTop: 8,
    paddingTop: 16,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  userInfo: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0",
  },
  userIcon: { fontSize: 24 },
  userName: { color: "#e2e8f0", fontWeight: 600, fontSize: 14 },
  userRole: { color: "#64748b", fontSize: 12 },
  logoutBtn: {
    width: "100%", padding: "8px 0", marginTop: 8,
    background: "#7f1d1d", color: "#fca5a5", border: "none",
    borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
    transition: "background 0.2s",
  },
};

export default App;