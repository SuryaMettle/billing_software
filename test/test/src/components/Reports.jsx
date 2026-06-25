// src/components/Reports.jsx
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import api from "../services/api.js";

const T = {
  bg: "#f0f4ff",
  border: "#e2e8f0",
  text: "#1e293b",
  textMid: "#475569",
  textSoft: "#94a3b8",
  accent: "#6366f1",
  green: "#059669",
  red: "#dc2626",
  amber: "#d97706",
  teal: "#0d9488",
  pink: "#db2777",
};

const PIE_COLORS = ["#6366f1","#0d9488","#d97706","#db2777","#059669","#dc2626","#7c3aed","#0ea5e9"];

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatPeriodLabel(periodValue, period) {
  if (period === "weekly") {
    const start = new Date(periodValue);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const opts = { day: "numeric", month: "short" };
    return `${start.toLocaleDateString("en-IN", opts)} – ${end.toLocaleDateString("en-IN", opts)}`;
  }
  if (period === "monthly") {
    const [year, month] = periodValue.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }
  return new Date(periodValue).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Card({ title, subtitle, children, action }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20, border: `1px solid ${T.border}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(99,102,241,0.08)",
      overflow: "hidden", marginBottom: 20,
    }}>
      <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, background: "#fafbff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: T.textSoft, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding: "22px 24px" }}>{children}</div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: "#f8fafc", borderRadius: 14, padding: "14px 18px",
      border: `1px solid ${T.border}`, minWidth: 140,
    }}>
      <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || T.text }}>{value}</div>
    </div>
  );
}

// ── Product Detail Page ───────────────────────────────────────────────────────
function ProductDetailPage({ product: prod, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendPeriod, setTrendPeriod] = useState("daily");

  useEffect(() => {
    api.getProductTrend(prod.id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [prod.id]);

  const p = data?.product || {};
  const trend = data?.trend || [];

  const totalQty = trend.reduce((s, r) => s + Number(r.qty_sold || 0), 0);
  const totalRevenue = trend.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const stockValue = Number(p.stock || 0) * Number(p.cost_price || 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = p.expiry_date ? new Date(`${p.expiry_date}T00:00:00`) : null;
  const daysToExpiry = expiryDate ? Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) : null;
  const expiryStatus = daysToExpiry === null ? null : daysToExpiry < 0 ? "expired" : daysToExpiry <= 30 ? "soon" : "ok";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, color: T.textSoft, fontSize: 15 }}>
      Loading product data…
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", background: T.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <button onClick={onBack} style={{
            padding: "8px 16px", borderRadius: 10, border: `1px solid ${T.border}`,
            background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, color: T.textMid,
          }}>← Back to Reports</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}>{p.name}</h1>
            <span style={{ fontSize: 12, color: T.textSoft }}>{p.category || "Uncategorized"} · HSN: {p.hsn_code || "—"} · {p.unit_type || "unit"}</span>
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Current Stock", value: p.stock ?? "—", color: Number(p.stock) <= Number(p.min_stock) ? T.red : T.green },
            { label: "Selling Price", value: `₹${formatMoney(p.price)}`, color: T.accent },
            { label: "Total Sold (all time)", value: totalQty, color: T.teal },
            { label: "Total Revenue", value: `₹${formatMoney(totalRevenue)}`, color: T.pink },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, color: T.textSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Extra info row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.textSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Stock Value (at cost)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.amber }}>₹{formatMoney(stockValue)}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.textSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Min Stock Level</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.textMid }}>{p.min_stock ?? "—"}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.textSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>Expiry Date</div>
            {expiryStatus === null ? (
              <div style={{ fontSize: 20, fontWeight: 700, color: T.textSoft }}>—</div>
            ) : expiryStatus === "expired" ? (
              <div style={{ fontSize: 16, fontWeight: 700, color: T.red }}>Expired ({p.expiry_date})</div>
            ) : expiryStatus === "soon" ? (
              <div style={{ fontSize: 16, fontWeight: 700, color: T.amber }}>{p.expiry_date} ({daysToExpiry}d left)</div>
            ) : (
              <div style={{ fontSize: 16, fontWeight: 700, color: T.green }}>{p.expiry_date}</div>
            )}
          </div>
        </div>

        {/* Revenue trend chart */}
        <Card title="Revenue Trend" subtitle="Daily sales revenue over time">
          {trend.length === 0 ? (
            <div style={{ textAlign: "center", color: T.textSoft, padding: 40 }}>No sales data for this product</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" fontSize={12} tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => `₹${formatMoney(v)}`} labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
                <Line dataKey="revenue" name="Revenue" stroke={T.accent} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Qty sold bar chart */}
        <Card title="Units Sold Per Day" subtitle="Quantity sold trend">
          {trend.length === 0 ? (
            <div style={{ textAlign: "center", color: T.textSoft, padding: 40 }}>No sales data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" fontSize={12} tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                <YAxis fontSize={12} />
                <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
                <Bar dataKey="qty_sold" name="Units Sold" fill={T.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

      </div>
    </div>
  );
}

// ── Main Reports Page ─────────────────────────────────────────────────────────
function Reports() {
  const [period, setPeriod] = useState("daily");
  const [chartType, setChartType] = useState("bar");
  const [summary, setSummary] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSortBy, setTopSortBy] = useState("revenue");
  const [topLimit, setTopLimit] = useState(10);
  const [topProductsPage, setTopProductsPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const topProductsTotalPages = Math.max(1, Math.ceil(topProducts.length / 10));
  const paginatedTopProducts = topProducts.slice((topProductsPage - 1) * 10, topProductsPage * 10);

  const [slowMoving, setSlowMoving] = useState([]);
  const [slowDays, setSlowDays] = useState(30);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Inventory
  const [inventory, setInventory] = useState(null);
  const [invTab, setInvTab] = useState("category");

  const [movementPage, setMovementPage] = useState(1);
  const movementPageSize = 10;
  const [expiryPage, setExpiryPage] = useState(1);   
  const expiryPageSize = 5;
  const [slowPage, setSlowPage] = useState(1);   
  const slowPageSize = 10;
  const [lowStockPage, setLowStockPage] = useState(1);   
  const lowStockPageSize = 10;  

  const loadSummary = async () => {
    setLoading(true);
    try {
      const params = { period };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const data = await api.getSalesSummary(params);
      setSummary(Array.isArray(data) ? data : []);
    } catch { }
    finally { setLoading(false); }
  };

  const loadTopProducts = async () => {
    try {
      const data = await api.getTopProducts({ limit: topLimit, sortBy: topSortBy });
      setTopProducts(Array.isArray(data) ? data : []);
    } catch { }
  };

  const loadSlowMoving = async () => {
    try {
      const data = await api.getSlowMoving({ days: slowDays });
      setSlowMoving(Array.isArray(data) ? data : []);
    } catch { }
  };

  const loadLowStock = async () => {
    try {
      const data = await api.getLowStock();
      setLowStock(Array.isArray(data) ? data : []);
    } catch { }
  };

  const loadInventory = async () => {
    try {
      const data = await api.getInventoryReport();
      setInventory(data);
    } catch { }
  };

  useEffect(() => { loadSummary(); }, [period, fromDate, toDate]);
  useEffect(() => { loadTopProducts(); }, [topSortBy, topLimit]);
  useEffect(() => { setTopProductsPage(1); }, [topSortBy, topLimit]);
  useEffect(() => { loadSlowMoving(); }, [slowDays]);
  useEffect(() => { loadLowStock(); loadInventory(); }, []);
  useEffect(() => { setMovementPage(1); }, [invTab]);
  useEffect(() => { setMovementPage(1); setExpiryPage(1); }, [invTab]);
  useEffect(() => { loadSlowMoving(); setSlowPage(1); }, [slowDays]);

  const totalSales = summary.reduce((s, r) => s + Number(r.sales || 0), 0);
  const totalPurchases = summary.reduce((s, r) => s + Number(r.purchases || 0), 0);
  const totalProfit = summary.reduce((s, r) => s + Number(r.profit || 0), 0);

  const ChartComp = chartType === "bar" ? BarChart : LineChart;
  const SeriesComp = chartType === "bar" ? Bar : Line;

  // Product detail drill-down
  if (selectedProduct) {
    return <ProductDetailPage product={selectedProduct} onBack={() => setSelectedProduct(null)} />;
  }

  const expiryAlerts = inventory?.expiryAlerts || [];
  const categoryStock = inventory?.categoryStock || [];
  const movement = inventory?.movement || [];

  const expiredCount = expiryAlerts.filter(p => p.expiry_status === "expired").length;
  const expiringSoonCount = expiryAlerts.filter(p => p.expiry_status === "expiring_soon").length;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter', sans-serif", background: T.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: T.text }}>Reports</h1>
          <p style={{ margin: "4px 0 0", color: T.textSoft, fontSize: 14 }}>
            Sales, purchases, and inventory insights
          </p>
        </div>

        {/* ── Sales vs Purchases ── */}
        <Card title="Sales & Purchases" subtitle="Grouped by selected period">
          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            {["daily", "weekly", "monthly"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 13, textTransform: "capitalize",
                background: period === p ? T.accent : "#eef2ff",
                color: period === p ? "#fff" : T.accent,
              }}>{p}</button>
            ))}
            <div style={{ flex: 1 }} />
            {["bar", "line"].map((c) => (
              <button key={c} onClick={() => setChartType(c)} style={{
                padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 13, textTransform: "capitalize",
                background: chartType === c ? "#0f172a" : "#f1f5f9",
                color: chartType === c ? "#fff" : T.textMid,
              }}>{c} chart</button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: T.textMid, fontWeight: 600 }}>From</span>
            <input type="date" value={fromDate} max={toDate || today}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit" }} />
            <span style={{ fontSize: 13, color: T.textMid, fontWeight: 600 }}>To</span>
            <input type="date" value={toDate} min={fromDate} max={today}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit" }} />
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(""); setToDate(""); }}
                style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: "#f1f5f9", color: T.textMid }}>
                ✕ Clear
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <StatPill label="Total Sales" value={`₹${formatMoney(totalSales)}`} color={T.accent} />
            <StatPill label="Total Purchases" value={`₹${formatMoney(totalPurchases)}`} color={T.amber} />
            <StatPill label="Gross Profit" value={`₹${formatMoney(totalProfit)}`} color={totalProfit >= 0 ? T.green : T.red} />
          </div>

          {loading ? (
            <div style={{ textAlign: "center", color: T.textSoft, padding: 40 }}>Loading…</div>
          ) : summary.length === 0 ? (
            <div style={{ textAlign: "center", color: T.textSoft, padding: 40 }}>No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ChartComp data={summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" fontSize={12} tickFormatter={(value) => formatPeriodLabel(value, period)} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => `₹${formatMoney(v)}`} labelFormatter={(value) => formatPeriodLabel(value, period)} />
                <Legend />
                <SeriesComp dataKey="sales" name="Sales" fill={T.accent} stroke={T.accent} />
                <SeriesComp dataKey="purchases" name="Purchases" fill={T.amber} stroke={T.amber} />
              </ChartComp>
            </ResponsiveContainer>
          )}
        </Card>

        {/* ── Top Products ── */}
        <Card
          title={`Top ${topLimit} Selling Products`}
          subtitle="Click any product row to view full details"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {[{ key: "revenue", label: "By Revenue" }, { key: "quantity", label: "By Quantity" }].map((o) => (
              <button key={o.key} onClick={() => setTopSortBy(o.key)} style={{
                padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 13,
                background: topSortBy === o.key ? T.accent : "#eef2ff",
                color: topSortBy === o.key ? "#fff" : T.accent,
              }}>{o.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: T.textMid }}>Show top</span>
            <input type="number" min={1} max={100} value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value) || 1)}
              style={{ width: 70, padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }} />
            <span style={{ fontSize: 13, color: T.textMid }}>products</span>
          </div>

          {topProducts.length === 0 ? (
            <div style={{ textAlign: "center", color: T.textSoft, padding: 24 }}>No sales data yet</div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>
                    {["#", "Product", "Qty Sold", "Revenue", ""].map((h) => (
                      <th key={h} style={{
                        textAlign: h === "Revenue" || h === "Qty Sold" ? "right" : "left",
                        padding: "8px 12px", color: T.textSoft, fontSize: 12,
                        borderBottom: `1px solid ${T.border}`
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedTopProducts.map((p, i) => (
                    <tr key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      style={{ cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f0f4ff"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "10px 12px", color: T.textSoft }}>{(topProductsPage - 1) * 10 + i + 1}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: T.text }}>{p.name}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: T.textMid }}>{p.total_qty}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: T.accent }}>₹{formatMoney(p.total_revenue)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "4px 10px",
                          borderRadius: 20, background: "#eef2ff", color: T.accent,
                          cursor: "pointer",
                        }}>
                          View details →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {topProductsTotalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
                  <button onClick={() => setTopProductsPage(p => Math.max(1, p - 1))} disabled={topProductsPage === 1}
                    style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: topProductsPage === 1 ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: topProductsPage === 1 ? "#f1f5f9" : "#eef2ff", color: topProductsPage === 1 ? "#bbb" : T.accent }}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textMid }}>Page {topProductsPage} of {topProductsTotalPages}</span>
                  <button onClick={() => setTopProductsPage(p => Math.min(topProductsTotalPages, p + 1))} disabled={topProductsPage === topProductsTotalPages}
                    style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: topProductsPage === topProductsTotalPages ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: topProductsPage === topProductsTotalPages ? "#f1f5f9" : "#eef2ff", color: topProductsPage === topProductsTotalPages ? "#bbb" : T.accent }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── Inventory Reports ── */}
        <Card title="Inventory Reports" subtitle="Category summary, expiry alerts & stock movement">

          {/* Alert banner */}
          {(expiredCount > 0 || expiringSoonCount > 0) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {expiredCount > 0 && (
                <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fef2f2", border: `1px solid #fecaca`, color: T.red, fontSize: 13, fontWeight: 600 }}>
                  ⚠ {expiredCount} product{expiredCount > 1 ? "s" : ""} expired
                </div>
              )}
              {expiringSoonCount > 0 && (
                <div style={{ padding: "10px 16px", borderRadius: 10, background: "#fffbeb", border: `1px solid #fde68a`, color: T.amber, fontSize: 13, fontWeight: 600 }}>
                  🕐 {expiringSoonCount} expiring within 30 days
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { key: "category", label: "Category Summary" },
              { key: "expiry", label: `Expiry Alerts${expiryAlerts.length > 0 ? ` (${expiryAlerts.length})` : ""}` },
              { key: "movement", label: "Stock Movement" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setInvTab(tab.key)} style={{
                padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 13,
                background: invTab === tab.key ? T.teal : "#f1f5f9",
                color: invTab === tab.key ? "#fff" : T.textMid,
              }}>{tab.label}</button>
            ))}
          </div>

          {/* Tab: Category Summary */}
          {invTab === "category" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
              <div>
                {categoryStock.length === 0 ? (
                  <div style={{ textAlign: "center", color: T.textSoft, padding: 24 }}>No categories found</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr>
                        {["Category", "Products", "Total Stock", "Stock Value"].map((h) => (
                          <th key={h} style={{ textAlign: h === "Category" || h === "Products" ? "left" : "right", padding: "8px 12px", color: T.textSoft, fontSize: 12, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryStock.map((c, i) => (
                        <tr key={c.category}>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], display: "inline-block", flexShrink: 0 }} />
                            {c.category}
                          </td>
                          <td style={{ padding: "10px 12px", color: T.textMid }}>{c.product_count}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: T.textMid }}>{c.total_stock}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: T.teal }}>₹{formatMoney(c.stock_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {categoryStock.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 8, textAlign: "center" }}>Stock value by category</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart margin={{ top: 30, bottom: 30, left: 30, right: 30 }}>
                      <Pie data={categoryStock} dataKey="stock_value" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true} fontSize={11}>
                        {categoryStock.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${formatMoney(v)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Tab: Expiry Alerts */}
          {invTab === "expiry" && (() => {
  const expiryTotalPages = Math.max(1, Math.ceil(expiryAlerts.length / expiryPageSize));
  const paginatedExpiry = expiryAlerts.slice(
    (expiryPage - 1) * expiryPageSize,
    expiryPage * expiryPageSize
  );

  return expiryAlerts.length === 0 ? (
    <div style={{ textAlign: "center", color: T.green, padding: 32, fontSize: 14, fontWeight: 600 }}>
      ✅ No products expiring within 30 days
    </div>
  ) : (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {["Product", "Category", "Stock", "Expiry Date", "Status"].map((h) => (
              <th key={h} style={{ textAlign: h === "Stock" ? "right" : "left", padding: "8px 12px", color: T.textSoft, fontSize: 12, borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedExpiry.map((p) => {
            const isExpired = p.expiry_status === "expired";
            return (
              <tr key={p.id}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: T.text }}>{p.name}</td>
                <td style={{ padding: "10px 12px", color: T.textMid }}>{p.category || "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: T.textMid }}>{p.stock}</td>
                <td style={{ padding: "10px 12px", color: T.textMid }}>{p.expiry_date}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
                    background: isExpired ? "#fef2f2" : "#fffbeb",
                    color: isExpired ? T.red : T.amber,
                    border: `1px solid ${isExpired ? "#fecaca" : "#fde68a"}`,
                  }}>
                    {isExpired ? "Expired" : "Expiring soon"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {expiryTotalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button
            onClick={() => setExpiryPage(p => Math.max(1, p - 1))}
            disabled={expiryPage === 1}
            style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: expiryPage === 1 ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: expiryPage === 1 ? "#f1f5f9" : "#fffbeb", color: expiryPage === 1 ? "#bbb" : T.amber }}
          >← Prev</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.textMid }}>
            Page {expiryPage} of {expiryTotalPages}
          </span>
          <button
            onClick={() => setExpiryPage(p => Math.min(expiryTotalPages, p + 1))}
            disabled={expiryPage === expiryTotalPages}
            style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: expiryPage === expiryTotalPages ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: expiryPage === expiryTotalPages ? "#f1f5f9" : "#fffbeb", color: expiryPage === expiryTotalPages ? "#bbb" : T.amber }}
          >Next →</button>
        </div>
      )}
    </>
  );
})()}

          {/* Tab: Stock Movement */}
{invTab === "movement" && (() => {
  const movementTotalPages = Math.max(1, Math.ceil(movement.length / movementPageSize));
  const paginatedMovement = movement.slice((movementPage - 1) * movementPageSize, movementPage * movementPageSize);

  return movement.length === 0 ? (
    <div style={{ textAlign: "center", color: T.textSoft, padding: 24 }}>No movement data</div>
  ) : (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {["Product", "Category", "Purchased", "Sold", "Returned", "Current Stock"].map((h) => (
              <th key={h} style={{ textAlign: h === "Product" || h === "Category" ? "left" : "right", padding: "8px 12px", color: T.textSoft, fontSize: 12, borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedMovement.map((p) => (
            <tr key={p.id}
              style={{ transition: "background 0.12s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding: "10px 12px", fontWeight: 600, color: T.text }}>{p.name}</td>
              <td style={{ padding: "10px 12px", color: T.textMid }}>{p.category || "—"}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: T.teal, fontWeight: 600 }}>+{p.purchased_qty}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: T.accent, fontWeight: 600 }}>{p.sold_qty}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", color: T.amber, fontWeight: 600 }}>{p.returned_qty}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: Number(p.current_stock) === 0 ? T.red : T.text }}>{p.current_stock}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {movementTotalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button
            onClick={() => setMovementPage(p => Math.max(1, p - 1))}
            disabled={movementPage === 1}
            style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: movementPage === 1 ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: movementPage === 1 ? "#f1f5f9" : "#f0fdfa", color: movementPage === 1 ? "#bbb" : T.teal }}
          >← Prev</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.textMid }}>
            Page {movementPage} of {movementTotalPages}
          </span>
          <button
            onClick={() => setMovementPage(p => Math.min(movementTotalPages, p + 1))}
            disabled={movementPage === movementTotalPages}
            style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: movementPage === movementTotalPages ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: movementPage === movementTotalPages ? "#f1f5f9" : "#f0fdfa", color: movementPage === movementTotalPages ? "#bbb" : T.teal }}
          >Next →</button>
        </div>
      )}
    </>
  );
})()}
        </Card>

        {/* ── Slow Moving ── */}
<Card title="Slow-Moving Products" subtitle="No sales within the chosen window">
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
    <span style={{ fontSize: 13, color: T.textMid }}>No sales in the last</span>
    <input type="number" min={1} value={slowDays}
      onChange={(e) => setSlowDays(Number(e.target.value) || 1)}
      style={{ width: 70, padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }} />
    <span style={{ fontSize: 13, color: T.textMid }}>days</span>
  </div>

  {slowMoving.length === 0 ? (
    <div style={{ textAlign: "center", color: T.textSoft, padding: 24 }}>No slow-moving products found</div>
  ) : (() => {
    const slowTotalPages = Math.max(1, Math.ceil(slowMoving.length / slowPageSize));
    const paginatedSlow = slowMoving.slice(
      (slowPage - 1) * slowPageSize,
      slowPage * slowPageSize
    );

    return (
      <>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              {["Product", "Stock", "Last Sold"].map((h) => (
                <th key={h} style={{ textAlign: h === "Stock" ? "right" : "left", padding: "8px 12px", color: T.textSoft, fontSize: 12, borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedSlow.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: T.text }}>{p.name}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: T.textMid }}>{p.stock}</td>
                <td style={{ padding: "10px 12px", color: T.textSoft }}>
                  {p.last_sold_at ? new Date(p.last_sold_at).toLocaleDateString("en-IN") : "Never sold"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {slowTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
            <button
              onClick={() => setSlowPage(p => Math.max(1, p - 1))}
              disabled={slowPage === 1}
              style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: slowPage === 1 ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: slowPage === 1 ? "#f1f5f9" : "#fff7ed", color: slowPage === 1 ? "#bbb" : T.amber }}
            >← Prev</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.textMid }}>
              Page {slowPage} of {slowTotalPages}
            </span>
            <button
              onClick={() => setSlowPage(p => Math.min(slowTotalPages, p + 1))}
              disabled={slowPage === slowTotalPages}
              style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: slowPage === slowTotalPages ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: slowPage === slowTotalPages ? "#f1f5f9" : "#fff7ed", color: slowPage === slowTotalPages ? "#bbb" : T.amber }}
            >Next →</button>
          </div>
        )}
      </>
    );
  })()}
</Card>

        {/* ── Low Stock ── */}
<Card title="Low Stock Alerts" subtitle="Products at or below minimum stock level">
  {lowStock.length === 0 ? (
    <div style={{ textAlign: "center", color: T.textSoft, padding: 24 }}>All products are sufficiently stocked</div>
  ) : (() => {
    const lowStockTotalPages = Math.max(1, Math.ceil(lowStock.length / lowStockPageSize));
    const paginatedLowStock = lowStock.slice(
      (lowStockPage - 1) * lowStockPageSize,
      lowStockPage * lowStockPageSize
    );

    return (
      <>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              {["Product", "Category", "Current Stock", "Min Stock"].map((h) => (
                <th key={h} style={{ textAlign: h.includes("Stock") ? "right" : "left", padding: "8px 12px", color: T.textSoft, fontSize: 12, borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedLowStock.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: T.text }}>{p.name}</td>
                <td style={{ padding: "10px 12px", color: T.textMid }}>{p.category || "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: T.red }}>{p.stock}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: T.textSoft }}>{p.min_stock}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {lowStockTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
            <button
              onClick={() => setLowStockPage(p => Math.max(1, p - 1))}
              disabled={lowStockPage === 1}
              style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: lowStockPage === 1 ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: lowStockPage === 1 ? "#f1f5f9" : "#fef2f2", color: lowStockPage === 1 ? "#bbb" : T.red }}
            >← Prev</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.textMid }}>
              Page {lowStockPage} of {lowStockTotalPages}
            </span>
            <button
              onClick={() => setLowStockPage(p => Math.min(lowStockTotalPages, p + 1))}
              disabled={lowStockPage === lowStockTotalPages}
              style={{ padding: "8px 16px", borderRadius: 12, border: "none", cursor: lowStockPage === lowStockTotalPages ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13, background: lowStockPage === lowStockTotalPages ? "#f1f5f9" : "#fef2f2", color: lowStockPage === lowStockTotalPages ? "#bbb" : T.red }}
            >Next →</button>
          </div>
        )}
      </>
    );
  })()}
</Card>

      </div>
    </div>
  );
}

export default Reports;