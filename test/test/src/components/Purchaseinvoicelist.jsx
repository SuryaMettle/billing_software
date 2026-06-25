import { useEffect, useState, useRef } from "react";
import PurchaseInvoiceDetails from "./PurchaseInvoiceDetails";

import api from "../services/api.js";

function PurchaseInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [openDropdown, setOpenDropdown] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [stats, setStats] = useState({ totalPurchases: 0, totalPending: 0 });
  const dropdownRef = useRef(null);
  const listTopRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadInvoices = async () => {
    const data = await api.getPurchaseInvoices();
    setInvoices(data);

    // Total Purchases (Excludes returned amounts)
    const totalPurchases = data.reduce(
      (sum, inv) => sum + Number(inv.total || 0) - Number(inv.return_total || 0),
      0
    );

    // Total Pending (Balance calculation must subtract returns)
    const totalPending = data
      .filter((inv) => inv.payment_status === "pending" || inv.payment_status === "partial")
      .reduce(
        (sum, inv) =>
          sum +
          (Number(inv.total || 0) -
          Number(inv.paid_amount || 0) -
          Number(inv.return_total || 0)),
        0
      );

    setStats({ totalPurchases, totalPending });
  };

  useEffect(() => {
    loadInvoices();

    window.addEventListener("purchase-updated", loadInvoices);
    return () => window.removeEventListener("purchase-updated", loadInvoices);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpenDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDueDateNear = (inv) => {
    if (!inv.due_date) return false;
    if (inv.payment_status === "paid") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(inv.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 10;
  };

  const getDueDaysBadge = (inv) => {
    if (!inv.due_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(inv.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `Overdue by ${Math.abs(diffDays)}d`, color: "#d32f2f", bg: "#ffebee" };
    if (diffDays === 0) return { label: "Due Today", color: "#e65100", bg: "#fff3e0" };
    return { label: `${diffDays}d left`, color: "#1565c0", bg: "#e3f2fd" };
  };

  const filteredInvoices = invoices
    .filter((inv) => {
      const dateStr = new Date(inv.created_at + " UTC").toLocaleString().toLowerCase();
      const partyName = (inv.party_name || "").toLowerCase();
      const matchesSearch =
        dateStr.includes(search.toLowerCase()) ||
        partyName.includes(search.toLowerCase()) ||
        String(inv.id).includes(search);

      if (filterType === "pending")
        return matchesSearch && (inv.payment_status === "pending" || inv.payment_status === "partial");
      if (filterType === "paid")
        return matchesSearch && inv.payment_status === "paid";
      if (filterType === "dueDate")
        return matchesSearch && isDueDateNear(inv);
      if (filterType === "returned")
        return matchesSearch && inv.has_return === 1;
      return matchesSearch;
    })
    .sort((a, b) =>
      sortOrder === "latest"
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at)
    );

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (nextPage) => {
    setCurrentPage(nextPage);
    setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const statusColor = (status) => {
    if (status === "paid") return "#2e7d32";
    if (status === "partial") return "#f57c00";
    return "#d32f2f";
  };

  const headingMap = {
  all: "All Purchase Invoices",
  paid: "Paid Purchases",
  pending: "Pending Purchases",
  dueDate: "Purchases Due Soon",
  returned: "Returned Purchases",   
};

  if (selectedId) {
    return (
      <PurchaseInvoiceDetails
        invoiceId={selectedId}
        onBack={() => { setSelectedId(null); loadInvoices(); }}
      />
    );
  }

  return (
    <div style={{ marginTop: "30px", fontFamily: "sans-serif" }}>

      {/* ── Search + Sort ── */}
<div style={{
  display: "flex", alignItems: "center", gap: "10px",
  marginBottom: "20px",
}}>
  <div style={{ position: "relative", flex: 1, maxWidth: "340px" }}>
    <span style={{
      position: "absolute", left: "12px", top: "50%",
      transform: "translateY(-50%)", fontSize: "16px",
      color: "#9B9A94", pointerEvents: "none",
    }}>🔍</span>
    <input
      type="text"
      placeholder="Search by supplier, date, invoice #…"
      value={search}
      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
      style={{
        width: "100%", padding: "10px 14px 10px 38px",
        border: "1px solid #E8E6E1", borderRadius: "10px",
        fontSize: "14px", background: "#fff",
        color: "#2F2F2E", outline: "none",
        transition: "all 0.15s", boxSizing: "border-box",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "#7C9CF6";
        e.target.style.boxShadow = "0 0 0 3px rgba(124,156,246,0.14)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "#E8E6E1";
        e.target.style.boxShadow = "none";
      }}
    />
  </div>

  <div ref={dropdownRef} style={{ position: "relative" }}>
    <button
      onClick={() => setOpenDropdown(!openDropdown)}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "10px 16px", border: "1px solid #E8E6E1",
        borderRadius: "10px", background: "#fff",
        fontSize: "13px", fontWeight: "600", color: "#6F6E69",
        cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#F6F5F2"; e.currentTarget.style.borderColor = "#DEDBD4"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#E8E6E1"; }}
    >
      <span style={{ fontSize: "14px" }}>⇅</span>
      {sortOrder === "latest" ? "Latest first" : "Oldest first"}
      <span style={{
        fontSize: "10px", transition: "transform 0.2s",
        transform: openDropdown ? "rotate(180deg)" : "rotate(0deg)",
      }}>▼</span>
    </button>

    {openDropdown && (
      <div style={{
        position: "absolute", top: "calc(100% + 6px)", left: 0,
        background: "#fff", border: "1px solid #E8E6E1",
        borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        width: "160px", overflow: "hidden", zIndex: 100,
      }}>
        {["latest", "oldest"].map((order) => (
          <div
            key={order}
            onClick={() => { setSortOrder(order); setCurrentPage(1); setOpenDropdown(false); }}
            style={{
              padding: "10px 14px", cursor: "pointer", fontSize: "13px",
              fontWeight: sortOrder === order ? "700" : "500",
              color: sortOrder === order ? "#534AB7" : "#2F2F2E",
              background: sortOrder === order ? "#EEEDFE" : "transparent",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => { if (sortOrder !== order) e.currentTarget.style.background = "#F6F5F2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = sortOrder === order ? "#EEEDFE" : "transparent"; }}
          >
            {order === "latest" ? "Latest first" : "Oldest first"}
          </div>
        ))}
      </div>
    )}
  </div>
</div>

{/* ── Stat Cards ── */}
{(() => {
  const cards = [
    {
      key: "all",
      label: "All invoices",
      value: invoices.length,
      sub: "total records",
      icon: "🧾",
      activeGradient: "linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)",
      activeBorder: "#534AB7",
      idleBg: "#EEEDFE",
      idleBorder: "#AFA9EC",
      idleLabel: "#534AB7",
      idleValue: "#3C3489",
      idleSub: "#534AB7",
      activeLabel: "rgba(255,255,255,0.75)",
      activeValue: "#fff",
      activeSub: "rgba(255,255,255,0.65)",
      iconActiveBg: "rgba(255,255,255,0.18)",
      iconIdleBg: "rgba(127,119,221,0.18)",
    },
    {
      key: "pending",
      label: "To collect",
      value: `₹${Number(stats.totalPending).toLocaleString("en-IN")}`,
      sub: "pending & partial",
      icon: "💰",
      activeGradient: "linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)",
      activeBorder: "#0F6E56",
      idleBg: "#E1F5EE",
      idleBorder: "#9FE1CB",
      idleLabel: "#0F6E56",
      idleValue: "#085041",
      idleSub: "#0F6E56",
      activeLabel: "rgba(255,255,255,0.75)",
      activeValue: "#fff",
      activeSub: "rgba(255,255,255,0.65)",
      iconActiveBg: "rgba(255,255,255,0.18)",
      iconIdleBg: "rgba(29,158,117,0.15)",
    },
    {
      key: "dueDate",
      label: "Due soon",
      value: invoices.filter((inv) => isDueDateNear(inv)).length,
      sub: "within 10 days",
      icon: "📅",
      activeGradient: "linear-gradient(135deg, #BA7517 0%, #854F0B 100%)",
      activeBorder: "#854F0B",
      idleBg: "#FAEEDA",
      idleBorder: "#FAC775",
      idleLabel: "#854F0B",
      idleValue: "#633806",
      idleSub: "#854F0B",
      activeLabel: "rgba(255,255,255,0.75)",
      activeValue: "#fff",
      activeSub: "rgba(255,255,255,0.65)",
      iconActiveBg: "rgba(255,255,255,0.18)",
      iconIdleBg: "rgba(186,117,23,0.14)",
    },
    {
      key: "returned",
      label: "Returned",
      value: invoices.filter((inv) => inv.has_return === 1).length,
      sub: "with returns",
      icon: "↩",
      activeGradient: "linear-gradient(135deg, #D4537E 0%, #993556 100%)",
      activeBorder: "#993556",
      idleBg: "#FBEAF0",
      idleBorder: "#F4C0D1",
      idleLabel: "#993556",
      idleValue: "#72243E",
      idleSub: "#993556",
      activeLabel: "rgba(255,255,255,0.75)",
      activeValue: "#fff",
      activeSub: "rgba(255,255,255,0.65)",
      iconActiveBg: "rgba(255,255,255,0.18)",
      iconIdleBg: "rgba(212,83,126,0.14)",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
      {cards.map((c) => {
        const isActive = filterType === c.key;
        return (
          <div
            key={c.key}
            onClick={() => { setFilterType(c.key); setCurrentPage(1); }}
            style={{
              borderRadius: "16px",
              padding: "20px 22px",
              cursor: "pointer",
              border: `1.5px solid ${isActive ? c.activeBorder : c.idleBorder}`,
              background: isActive ? c.activeGradient : c.idleBg,
              boxShadow: isActive ? "0 8px 24px rgba(0,0,0,0.14)" : "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.18s ease",
              position: "relative",
              overflow: "hidden",
              transform: isActive ? "translateY(-2px)" : "none",
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.transform = "none"; }}
          >
            {/* icon bubble */}
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "14px", fontSize: "18px",
              background: isActive ? c.iconActiveBg : c.iconIdleBg,
            }}>{c.icon}</div>

            <div style={{
              fontSize: "11px", fontWeight: "700", letterSpacing: "0.7px",
              textTransform: "uppercase", marginBottom: "6px",
              color: isActive ? c.activeLabel : c.idleLabel,
            }}>{c.label}</div>

            <div style={{
              fontSize: "26px", fontWeight: "800", letterSpacing: "-0.5px",
              marginBottom: "4px",
              color: isActive ? c.activeValue : c.idleValue,
            }}>{c.value}</div>

            <div style={{
              fontSize: "12px",
              color: isActive ? c.activeSub : c.idleSub,
            }}>{c.sub}</div>

            {/* decorative bg text */}
            <div style={{
              position: "absolute", bottom: "-14px", right: "-10px",
              fontSize: "60px", opacity: 0.1,
              userSelect: "none", pointerEvents: "none",
            }}>{c.icon}</div>
          </div>
        );
      })}
    </div>
  );
})()}

      <h2 ref={listTopRef} style={{ marginBottom: "14px" }}>
        {headingMap[filterType] || "Purchase Invoice History"}
      </h2>

      {filteredInvoices.length === 0 ? (
        <p style={{ color: "#999" }}>No purchase invoices found</p>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "820px" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
                {["Invoice #", "Supplier", "Total Amount", "Paid", "Balance", "Mode", "Date & Time", "Status"].map((col) => (
                  <th key={col} style={{ padding: "12px 16px", textAlign: ["Total Amount", "Paid", "Balance"].includes(col) ? "right" : "left", fontWeight: "600", fontSize: "13px", color: "#555", whiteSpace: "nowrap" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((inv, idx) => {
                // FIXED CALCULATION: Total - Paid - Returned
                const balance = Number(inv.total || 0) - Number(inv.paid_amount || 0) - Number(inv.return_total || 0);
                const dueBadge = filterType === "dueDate" ? getDueDaysBadge(inv) : null;

                return (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f5f0ff"}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa"}
                  >
                    <td style={{ padding: "12px 16px", fontWeight: "600", color: "#7c3aed" }}>#{inv.id}</td>
                    <td style={{ padding: "12px 16px", color: "#333" }}>{inv.party_name || "N/A"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ fontWeight: "600" }}>₹{Number(inv.total).toLocaleString("en-IN")}</div>
                      {Number(inv.return_total || 0) > 0 && (
                        <div style={{ fontSize: "11px", color: "#be185d", marginTop: "2px" }}>
                          − ₹{Number(inv.return_total).toLocaleString("en-IN")} returned
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#2e7d32" }}>
                      ₹{Number(inv.paid_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: balance > 0 ? "#d32f2f" : "#2e7d32" }}>
                      ₹{balance.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#555", textTransform: "capitalize" }}>{inv.payment_mode || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#666", fontSize: "13px" }}>{new Date(inv.created_at + " UTC").toLocaleString()}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {inv.has_return === 1 && (
                          <span style={{ background: "#fce4ec", color: "#880e4f", padding: "3px 9px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", border: "1px solid #f48fb1" }}>↩ Return</span>
                        )}
                        {dueBadge && (
                          <span style={{ background: dueBadge.bg, color: dueBadge.color, padding: "3px 9px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", border: `1px solid ${dueBadge.color}` }}>{dueBadge.label}</span>
                        )}
                        <span style={{ background: statusColor(inv.payment_status), color: "#fff", padding: "3px 9px", borderRadius: "12px", fontSize: "11px", textTransform: "capitalize" }}>{inv.payment_status}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {filteredInvoices.length > itemsPerPage && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "20px", padding: "14px" }}>
          <button
            onClick={() => goToPage(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #ccc", background: currentPage === 1 ? "#eee" : "#7c3aed", color: "#fff", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
          >Previous</button>
          <span style={{ fontWeight: "600" }}>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => goToPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #ccc", background: currentPage === totalPages ? "#eee" : "#7c3aed", color: "#fff", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
          >Next</button>
        </div>
      )}
    </div>
  );
}

export default PurchaseInvoiceList;
