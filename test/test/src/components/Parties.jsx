import { useState, useEffect } from "react";
import CreateParty from "./CreateParty";
import PartyDetails from "./PartyDetails";

import api from "../services/api.js";

// ── Light Pastel Theme (Notion/Airtable style) — inline, independent of theme.js ──
const lightTheme = {
  bg: "#FAFAF8",
  cardBg: "#FFFFFF",
  surfaceBase: "#F6F5F2",
  surfaceRaised: "#FBFAF8",
  surfaceHighlight: "#FFFFFF",
  border: "#E8E6E1",
  borderStrong: "#DEDBD4",
  textPrimary: "#2F2F2E",
  textSecondary: "#6F6E69",
  textMuted: "#9B9A94",
  accent: "#7C9CF6",
  accentLight: "#7C9CF6",
  accentGradient: "linear-gradient(135deg, #B8C6FB 0%, #C9B8FB 100%)",
  accentGlow: "0 4px 14px rgba(124,156,246,0.25)",
  success: "#4F9D6E",
  successBg: "#E6F4EA",
  successBorder: "#BFE3CC",
  warning: "#C98A2B",
  warningBg: "#FBF1DD",
  warningBorder: "#F0DBA8",
  danger: "#D8635A",
  dangerBg: "#FBEAE8",
  dangerBorder: "#F3CBC6",
  info: "#5E8FE0",
  infoBg: "#E7EEFC",
};

const cardStyle = {
  background: lightTheme.cardBg,
  border: `1px solid ${lightTheme.border}`,
  borderRadius: "16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const primaryButtonStyle = {
  background: lightTheme.accentGradient,
  color: "#3A3A6E",
  border: "none",
  borderRadius: "10px",
  padding: "10px 18px",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
  boxShadow: lightTheme.accentGlow,
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
};

const ghostButtonStyle = {
  background: lightTheme.surfaceBase,
  color: lightTheme.textSecondary,
  border: `1px solid ${lightTheme.border}`,
  borderRadius: "8px",
  padding: "8px 14px",
  fontWeight: "600",
  fontSize: "12px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const actionBtnStyle = {
  padding: "6px 12px",
  borderRadius: "7px",
  border: `1px solid ${lightTheme.border}`,
  background: lightTheme.surfaceRaised,
  color: lightTheme.textPrimary,
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "12px",
  marginRight: "6px",
  transition: "all 0.15s ease",
};

const dangerBtnStyle = {
  ...actionBtnStyle,
  marginRight: 0,
  border: `1px solid ${lightTheme.dangerBorder}`,
  background: lightTheme.dangerBg,
  color: lightTheme.danger,
};

const inputStyle = {
  background: lightTheme.surfaceRaised,
  border: `1px solid ${lightTheme.border}`,
  borderRadius: "10px",
  padding: "11px 14px",
  fontSize: "14px",
  outline: "none",
  transition: "all 0.15s ease",
};

function Parties({ onOpenInvoices }) {
  console.log("PARTIES COMPONENT LOADED");

  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState("");
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [editingParty, setEditingParty] = useState(null);
  const [partyType, setPartyType] = useState("customer");
  const [page, setPage] = useState("list");
  const [typeFilter, setTypeFilter] = useState("all");
  const [partyStats, setPartyStats] = useState({ toCollect: 0, toPay: 0 });
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [initialTab, setInitialTab] = useState("transactions");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const itemsPerPage = 10;
  const [deleteConfirm, setDeleteConfirm] = useState(null); 

  const [salesStats, setSalesStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalInvoices: 0,
  });

  const loadParties = async () => {
  const data = await api.getParties();
  // Load credit notes for all parties
  const creditData = {};
  for (const p of data) {
    const credits = await api.getPartyCreditNotes(p.id);
    if (credits?.length > 0) {
      creditData[p.id] = credits.reduce((s, c) => s + Number(c.remaining || 0), 0);
    }
  }
  setParties(data.map(p => ({ ...p, creditBalance: creditData[p.id] || 0 })));
};

  const loadPartyStats = async () => {
  const data = await api.getParties();
  const toCollect = data
    .filter((p) => p.balance > 0)
    .reduce((sum, p) => sum + Number(p.balance || 0), 0);
  setPartyStats({ toCollect, toPay: 0 });
};

  const loadSalesStats = async () => {
    const data = await api.getSalesStats();
    setSalesStats(data);
  };

  useEffect(() => {
    loadParties();
    loadSalesStats();
    loadPartyStats();

    const handleUpdate = () => {
      loadParties();
      loadSalesStats();
      loadPartyStats();
    };

    window.addEventListener("invoice-updated", handleUpdate);
    window.addEventListener("purchase-updated", handleUpdate);
    window.addEventListener("customer-updated", handleUpdate);
    window.addEventListener("sales-return-updated", handleUpdate);

    return () => {
      window.removeEventListener("invoice-updated", handleUpdate);
      window.removeEventListener("purchase-updated", handleUpdate);
      window.removeEventListener("customer-updated", handleUpdate);
      window.removeEventListener("sales-return-updated", handleUpdate);
    };
  }, []);

  const filtered = parties.filter((p) => {
  const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
  const matchesType = typeFilter === "all" || p.type === typeFilter;
  const matchesBalance = balanceFilter === "all" || (balanceFilter === "toCollect" && p.balance > 0);
  return matchesSearch && matchesType && matchesBalance;
});

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParties = filtered.slice(startIndex, endIndex);
  const totalParties = parties.length;

  const handleDelete = async (id) => {
    await api.deleteParty(id);
    loadParties();
    loadPartyStats();
  };

  const handleEdit = (party) => {
    setEditingParty(party);
    setPage("create");
  };

  const statCardStyle = (bg, border) => ({
    flex: 1,
    background: bg,
    padding: "20px 22px",
    borderRadius: "14px",
    border: `1px solid ${border}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  });

  const labelStyle = {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: lightTheme.textSecondary,
    marginBottom: "8px",
  };

  const valueStyle = {
    fontSize: "26px",
    fontWeight: "800",
    color: lightTheme.textPrimary,
    letterSpacing: "0.2px",
  };

  if (selectedPartyId) {
  return (
    <PartyDetails
      partyId={selectedPartyId}
      initialTab={initialTab}
      onBack={() => {
        setSelectedPartyId(null);
        setInitialTab("transactions");
        loadParties();
        loadPartyStats();
      }}
    />
  );
}

  return (
    <>
      {page === "create" ? (
        <CreateParty
          key={editingParty ? editingParty.id : "new-" + page}
          editingParty={editingParty}
          onBack={() => {
            setEditingParty(null);
            setPage("list");
            loadParties();
            loadPartyStats();
          }}
        />
      ) : (
        <div style={{ padding: "24px", background: lightTheme.bg, minHeight: "100vh", boxSizing: "border-box" }}>
          <style>{`
            .party-row:hover { background: rgba(124,156,246,0.06); }
            .party-search::placeholder { color: ${lightTheme.textMuted}; }
            .filter-pill { transition: all 0.15s ease; }
            .filter-pill:hover { transform: translateY(-1px); }
            .action-btn:hover { background: ${lightTheme.surfaceHighlight}; border-color: ${lightTheme.borderStrong}; }
            .danger-btn:hover { background: #F6D8D4; }
            .stat-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
            .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
          `}</style>

          {/* ── Header ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "10px",
              background: lightTheme.accentGradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", boxShadow: lightTheme.accentGlow,
            }}>🤝</div>
            <h2 style={{ margin: 0, fontWeight: "800", fontSize: "24px", color: lightTheme.textPrimary, letterSpacing: "0.2px" }}>
              Parties
            </h2>
          </div>

          {/* ── Top Stat Cards (filterable) ───────────────────────────── */}
<div style={{ display: "flex", gap: "14px", marginBottom: "20px", width: "100%" }}>
  <div
    className="stat-card"
    onClick={() => { setBalanceFilter("all"); setCurrentPage(1); }}
    style={{
      flex: 1,
      background: balanceFilter === "all"
        ? "linear-gradient(135deg, #7C9CF6 0%, #A78BFA 100%)"
        : "#F0ECFB",
      padding: "22px 24px",
      borderRadius: "16px",
      border: balanceFilter === "all" ? "none" : `1px solid #DDD3F7`,
      boxShadow: balanceFilter === "all"
        ? "0 8px 24px rgba(124,156,246,0.35)"
        : "0 1px 3px rgba(0,0,0,0.03)",
      cursor: "pointer",
      transition: "all 0.2s ease",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {balanceFilter === "all" && (
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
      }} />
    )}
    <div style={{
      fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px",
      textTransform: "uppercase", marginBottom: "10px",
      color: balanceFilter === "all" ? "rgba(255,255,255,0.8)" : lightTheme.textSecondary,
    }}>
      🏢 All Parties
    </div>
    <div style={{
      fontSize: "32px", fontWeight: "800", letterSpacing: "0.2px",
      color: balanceFilter === "all" ? "#fff" : lightTheme.textPrimary,
    }}>
      {totalParties}
    </div>
    <div style={{
      fontSize: "12px", marginTop: "6px",
      color: balanceFilter === "all" ? "rgba(255,255,255,0.65)" : lightTheme.textMuted,
    }}>
      {parties.filter(p => p.type === "customer").length} customers · {parties.filter(p => p.type === "supplier").length} suppliers
    </div>
  </div>

  <div
    className="stat-card"
    onClick={() => { setBalanceFilter("toCollect"); setCurrentPage(1); }}
    style={{
      flex: 1,
      background: balanceFilter === "toCollect"
        ? "linear-gradient(135deg, #4F9D6E 0%, #34D399 100%)"
        : lightTheme.successBg,
      padding: "22px 24px",
      borderRadius: "16px",
      border: balanceFilter === "toCollect" ? "none" : `1px solid ${lightTheme.successBorder}`,
      boxShadow: balanceFilter === "toCollect"
        ? "0 8px 24px rgba(79,157,110,0.35)"
        : "0 1px 3px rgba(0,0,0,0.03)",
      cursor: "pointer",
      transition: "all 0.2s ease",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {balanceFilter === "toCollect" && (
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
      }} />
    )}
    <div style={{
      fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px",
      textTransform: "uppercase", marginBottom: "10px",
      color: balanceFilter === "toCollect" ? "rgba(255,255,255,0.8)" : lightTheme.textSecondary,
    }}>
      💰 To Collect
    </div>
    <div style={{
      fontSize: "32px", fontWeight: "800", letterSpacing: "0.2px",
      color: balanceFilter === "toCollect" ? "#fff" : lightTheme.success,
    }}>
      ₹{Number(partyStats.toCollect).toLocaleString("en-IN")}
    </div>
    <div style={{
      fontSize: "12px", marginTop: "6px",
      color: balanceFilter === "toCollect" ? "rgba(255,255,255,0.65)" : lightTheme.textMuted,
    }}>
      Pending & partial payments
    </div>
  </div>
</div>

{/* ── Sales / Profit / Invoices ─────────────────────────────── */}
<div style={{ display: "flex", gap: "14px", width: "100%", marginBottom: "20px" }}>
  <div className="stat-card" style={{
    flex: 1,
    background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
    padding: "20px 22px",
    borderRadius: "16px",
    border: "1px solid #C7D2FE",
    boxShadow: "0 2px 8px rgba(99,102,241,0.08)",
    position: "relative", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", bottom: -16, right: -10,
      fontSize: "52px", opacity: 0.12, userSelect: "none",
    }}>📈</div>
    <div style={{
      fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px",
      textTransform: "uppercase", color: "#6366F1", marginBottom: "8px",
    }}>Total Sales</div>
    <div style={{ fontSize: "26px", fontWeight: "800", color: "#3730A3" }}>
      ₹{Number(salesStats.totalSales).toLocaleString("en-IN")}
    </div>
  </div>

  <div className="stat-card" style={{
    flex: 1,
    background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
    padding: "20px 22px",
    borderRadius: "16px",
    border: "1px solid #A7F3D0",
    boxShadow: "0 2px 8px rgba(16,185,129,0.08)",
    position: "relative", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", bottom: -16, right: -10,
      fontSize: "52px", opacity: 0.12, userSelect: "none",
    }}>💹</div>
    <div style={{
      fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px",
      textTransform: "uppercase", color: "#059669", marginBottom: "8px",
    }}>Total Profit</div>
    <div style={{ fontSize: "26px", fontWeight: "800", color: "#065F46" }}>
      ₹{Number(salesStats.totalProfit).toLocaleString("en-IN")}
    </div>
  </div>

  <div
    className="stat-card"
    onClick={onOpenInvoices}
    style={{
      flex: 1,
      background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
      padding: "20px 22px",
      borderRadius: "16px",
      border: "1px solid #FDE68A",
      boxShadow: "0 2px 8px rgba(217,119,6,0.08)",
      cursor: "pointer",
      position: "relative", overflow: "hidden",
    }}
  >
    <div style={{
      position: "absolute", bottom: -16, right: -10,
      fontSize: "52px", opacity: 0.12, userSelect: "none",
    }}>🧾</div>
    <div style={{
      fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px",
      textTransform: "uppercase", color: "#D97706", marginBottom: "8px",
    }}>Invoices</div>
    <div style={{ fontSize: "26px", fontWeight: "800", color: "#92400E" }}>
      {salesStats.totalInvoices}
    </div>
  </div>
</div>

{/* ── Search + Filters + Create ─────────────────────────────── */}
<div style={{
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: "18px", gap: "16px", flexWrap: "wrap",
}}>
  <div style={{ position: "relative", flex: "1", minWidth: "240px", maxWidth: "320px" }}>
    <span style={{
      position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
      fontSize: "15px", color: lightTheme.accentLight, pointerEvents: "none",
    }}>🔍</span>
    <input
      className="party-search"
      placeholder="Search party..."
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
      }}
      style={{
        ...inputStyle,
        width: "100%",
        boxSizing: "border-box",
        paddingLeft: "40px",
        color: lightTheme.textPrimary,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = lightTheme.accent;
        e.target.style.boxShadow = `0 0 0 3px rgba(124,156,246,0.15)`;
        e.target.style.background = "#fff";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = lightTheme.border;
        e.target.style.boxShadow = "none";
        e.target.style.background = lightTheme.surfaceRaised;
      }}
    />
  </div>

  <div style={{ display: "flex", gap: "8px" }}>
    {["all", "customer", "supplier"].map((type) => (
      <button
        key={type}
        className="filter-pill"
        onClick={() => {
          setTypeFilter(type);
          setCurrentPage(1);
        }}
        style={{
          padding: "9px 18px",
          borderRadius: "999px",
          border: typeFilter === type ? "none" : `1px solid ${lightTheme.border}`,
          background: typeFilter === type ? lightTheme.accentGradient : lightTheme.cardBg,
          color: typeFilter === type ? "#3A3A6E" : lightTheme.textSecondary,
          cursor: "pointer",
          fontWeight: typeFilter === type ? "700" : "500",
          fontSize: "13px",
          textTransform: "capitalize",
          boxShadow: typeFilter === type ? lightTheme.accentGlow : "none",
        }}
      >
        {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
      </button>
    ))}
  </div>

  <button
    onClick={() => setPage("create")}
    style={primaryButtonStyle}
  >
    + Create Party
  </button>
</div>
          {/* ── Table ──────────────────────────────────────────────────── */}
          <div style={{ ...cardStyle, overflow: "hidden", width: "100%" }}>
            {filtered.length > 0 && (
              <div style={{
                display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px",
                padding: "14px 18px", borderBottom: `1px solid ${lightTheme.border}`,
              }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    ...ghostButtonStyle,
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Previous
                </button>

                <span style={{ fontWeight: "700", fontSize: "13px", color: lightTheme.textPrimary }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    ...ghostButtonStyle,
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{
                  background: lightTheme.surfaceRaised,
                  fontWeight: "700",
                  fontSize: "11px",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  color: lightTheme.textMuted,
                  textAlign: "left",
                }}>
                  <th style={{ padding: "14px 14px 14px 24px", width: "25%" }}>Party Name</th>
                  <th style={{ padding: "14px 14px 14px 24px", width: "20%" }}>Mobile</th>
                  <th style={{ padding: "14px 14px 14px 24px", width: "20%" }}>Party Type</th>
                  <th style={{ padding: "14px 14px 14px 24px", width: "15%", textAlign: "right" }}>Balance</th>
                  <th style={{ padding: "14px 14px 14px 24px", width: "20%", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "32px", color: lightTheme.textMuted }}>
                      No parties found
                    </td>
                  </tr>
                )}

                {paginatedParties.map((p) => (
                  <tr
                    key={p.id}
                    className="party-row"
                    onClick={() => setSelectedPartyId(p.id)}
                    style={{
                      borderTop: `1px solid ${lightTheme.border}`,
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "14px 14px 14px 24px", fontWeight: "500", fontSize: "17px", color: lightTheme.textPrimary }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {p.name}
                        {p.creditBalance > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPartyId(p.id);
                              setInitialTab("credits");
                            }}
                            style={{
                              background: lightTheme.successBg, color: lightTheme.success,
                              padding: "3px 10px", borderRadius: "999px",
                              fontSize: "11px", fontWeight: "700",
                              border: `1px solid ${lightTheme.successBorder}`, cursor: "pointer",
                            }}
                          >
                            🎫 ₹{Number(p.creditBalance).toLocaleString("en-IN")} credit
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "14px 14px 14px 24px", whiteSpace: "nowrap", color: lightTheme.textSecondary, fontSize: "13px" }}>
                      {p.phone}
                    </td>
                    <td style={{ padding: "14px 14px 14px 24px" }}>
                      <span style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "capitalize",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        background: p.type === "supplier" ? lightTheme.infoBg : "#F0ECFB",
                        color: p.type === "supplier" ? lightTheme.info : "#7C5CD6",
                        border: `1px solid ${p.type === "supplier" ? "#CFDDF8" : "#DDD3F7"}`,
                      }}>
                        {p.type || "-"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "14px 14px 14px 24px",
                        textAlign: "right",
                        color: p.balance > 0 ? lightTheme.danger : p.balance < 0 ? lightTheme.success : lightTheme.textMuted,
                        fontWeight: "700",
                        fontSize: "13px",
                      }}
                    >
                      {p.balance > 0
                        ? `₹${Number(p.balance).toLocaleString("en-IN")}`
                        : p.balance < 0
                        ? `−₹${Number(Math.abs(p.balance)).toLocaleString("en-IN")}`
                        : "₹0"}
                    </td>
                    <td style={{ padding: "14px 14px 14px 24px", textAlign: "center" }}>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(p);
                        }}
                        style={actionBtnStyle}
                      >
                        Edit
                      </button>
                     <button
  className="danger-btn"
  onClick={(e) => {
    e.stopPropagation();
    setDeleteConfirm(p);
  }}
  style={dangerBtnStyle}
>
  Delete
</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {deleteConfirm && (
  <div
    onClick={() => setDeleteConfirm(null)}
    style={{
      position: "fixed", top: 0, left: 0,
      width: "100%", height: "100%",
      background: "rgba(47,47,46,0.40)",
      backdropFilter: "blur(6px)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 2000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        borderRadius: "20px",
        padding: "32px 28px",
        width: "100%",
        maxWidth: "400px",
        border: "1px solid #DEDBD4",
        boxShadow: "0 32px 80px rgba(47,47,46,0.18)",
      }}
    >
      {/* Icon */}
      <div style={{
        width: "52px", height: "52px", borderRadius: "14px",
        background: "#FBEAE8",
        border: "1px solid #F3CBC6",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "24px", marginBottom: "18px",
      }}>🗑️</div>

      {/* Title */}
      <div style={{ fontWeight: "800", fontSize: "18px", color: "#2F2F2E", marginBottom: "8px" }}>
        Delete party?
      </div>

      {/* Body */}
      <div style={{ fontSize: "14px", color: "#6F6E69", lineHeight: "1.6", marginBottom: "6px" }}>
        You're about to delete{" "}
        <span style={{ fontWeight: "700", color: "#2F2F2E" }}>
          {deleteConfirm.name}
        </span>.
      </div>
      <div style={{
        fontSize: "13px", color: "#D8635A",
        background: "#FBEAE8",
        border: "1px solid #F3CBC6",
        borderRadius: "10px",
        padding: "10px 14px",
        marginBottom: "24px",
        lineHeight: "1.5",
      }}>
        ⚠ This will permanently remove the party and all associated data. This action cannot be undone.
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => setDeleteConfirm(null)}
          style={{
            flex: 1, padding: "11px",
            borderRadius: "10px",
            border: "1px solid #E8E6E1",
            background: "#F6F5F2",
            color: "#6F6E69",
            fontWeight: "600", fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            handleDelete(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          style={{
            flex: 1, padding: "11px",
            borderRadius: "10px",
            border: "none",
            background: "#D8635A",
            color: "#fff",
            fontWeight: "700", fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(216,99,90,0.35)",
          }}
        >
          Yes, delete
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}

export default Parties;