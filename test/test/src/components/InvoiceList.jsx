import { useEffect, useState, useRef } from "react";
import InvoiceDetails from "./InvoiceDetails";
import { isAdmin, getUserRole } from "../services/auth.js";
import api from "../services/api.js";

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [openDropdown, setOpenDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const listTopRef = useRef(null);
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [stats, setStats] = useState({ toCollect: 0, toPay: 0 });

  const loadInvoices = async () => {
  const data = isAdmin()
    ? await api.getInvoicesWithProfit()   // has profit, has_return columns
    : await api.getInvoices();            // basic invoice list
  setInvoices(data);

  const toCollect = data
  .filter(inv => inv.payment_status === "pending" || inv.payment_status === "partial")
  .reduce((sum, inv) => {
    const balance = Number(inv.total || 0) - Number(inv.paid_amount || 0) - Number(inv.return_total || 0);
    return sum + Math.max(0, balance); 
  }, 0);

  setStats({ toCollect, toPay: 0 });
};

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
      const matchesSearch =
        dateStr.includes(search.toLowerCase()) ||
        (inv.party_name || "").toLowerCase().includes(search.toLowerCase()) ||
        inv.id.toString().includes(search);

      if (filterType === "toCollect")
        return matchesSearch && (inv.payment_status === "pending" || inv.payment_status === "partial");
      if (filterType === "dueDate") return matchesSearch && isDueDateNear(inv);
      if (filterType === "toPay") return matchesSearch && inv.payment_status === "pending";
if (filterType === "returned") return matchesSearch && inv.has_return === 1;
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

  useEffect(() => {
    loadInvoices();

    window.addEventListener("invoice-updated", loadInvoices);
    return () => window.removeEventListener("invoice-updated", loadInvoices);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpenDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedId) {
    return (
      <InvoiceDetails
        invoiceId={selectedId}
        onBack={() => {
          setSelectedId(null);
          loadInvoices();
        }}
      />
    );
  }

  return (
    <div style={{ marginTop: "30px" }}>

      {/* ── Search + Sort ── */}
      <div style={{ width: "100%", borderBottom: "1px solid #ddd", padding: "12px 0", marginBottom: "20px", display: "flex", alignItems: "center" }}>
        <input
          type="text"
          placeholder="🔍 Search by invoice no, party or date..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          style={{ width: "300px", padding: "10px 12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px" }}
        />

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setOpenDropdown(!openDropdown)}
            style={{ marginLeft: "15px", height: "38px", padding: "0 14px", borderRadius: "8px", border: "1px solid #ccc", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: "160px", color: "#333", fontSize: "14px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", position: "relative", top: "-6px" }}
          >
            {sortOrder === "latest" ? "Latest First" : "Oldest First"}
            <span style={{ transition: "transform 0.2s ease", transform: openDropdown ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
          </button>

          {openDropdown && (
            <div style={{ position: "absolute", top: "110%", left: 0, background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 6px 15px rgba(0,0,0,0.1)", width: "160px", overflow: "hidden", zIndex: 100 }}>
              {["latest", "oldest"].map((order) => (
                <div
                  key={order}
                  onClick={() => { setSortOrder(order); setCurrentPage(1); setOpenDropdown(false); }}
                  style={{ padding: "10px", cursor: "pointer", background: sortOrder === order ? "#f0f7f0" : "#fff", fontWeight: sortOrder === order ? "bold" : "normal" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"}
                  onMouseLeave={(e) => e.currentTarget.style.background = sortOrder === order ? "#f0f7f0" : "#fff"}
                >
                  {order === "latest" ? "Latest First" : "Oldest First"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
<div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: 24 }}>

  {/* All Invoices */}
  {[
    {
      key: "all", label: "All invoices", value: invoices.length, sub: "total records",
      accent: "#7F77DD", bg: "#EEEDFE", textDark: "#3C3489", textMid: "#534AB7",
      icon: "🗂", spark: [40,55,45,70,60,80,100]
    },
    {
      key: "toCollect", label: "To collect", value: `₹${Math.max(0,stats.toCollect).toLocaleString("en-IN")}`,
      sub: "pending & partial", accent: "#1D9E75", bg: "#E1F5EE", textDark: "#085041", textMid: "#0F6E56",
      icon: "💰", spark: [60,45,75,50,80,65,90]
    },
    {
      key: "dueDate", label: "Due soon", value: invoices.filter(isDueDateNear).length,
      sub: "within 10 days", accent: "#BA7517", bg: "#FAEEDA", textDark: "#633806", textMid: "#854F0B",
      icon: "📅", spark: [30,50,40,65,55,75,100]
    },
    {
      key: "returned", label: "Returned", value: invoices.filter(inv => inv.has_return === 1).length,
      sub: "with returns", accent: "#D4537E", bg: "#FBEAF0", textDark: "#72243E", textMid: "#993556",
      icon: "↩", spark: [50,35,60,45,70,80,95]
    }
  ].map(({ key, label, value, sub, accent, bg, textDark, textMid, icon, spark }) => {
    const isActive = filterType === key || (key === "toCollect" && filterType === "toCollect");
    return (
      <div
        key={key}
        onClick={() => { setFilterType(filterType === key && key !== "all" ? "all" : key); setCurrentPage(1); }}
        style={{
          background: isActive ? bg : "#fff",
          border: isActive ? `1.5px solid ${accent}` : "0.5px solid #e5e7eb",
          borderRadius: 14, padding: "18px 16px 14px",
          cursor: "pointer", transition: "all 0.15s", position: "relative", overflow: "hidden"
        }}
      >
        {/* top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "14px 14px 0 0" }} />

        {/* icon */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, fontSize: 18 }}>
          {icon}
        </div>

        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.4px", textTransform: "uppercase", color: textMid, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 500, color: textDark, lineHeight: 1, marginBottom: 6 }}>{value}</div>

        {/* pill */}
        <div style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 20, background: bg, color: textMid }}>{sub}</div>

        {/* sparkline */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, marginTop: 10, height: 20 }}>
          {spark.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 2, background: i >= 5 ? accent : bg === "#fff" ? "#e5e7eb" : bg }} />
          ))}
        </div>
      </div>
    );
  })}
</div>

      {/* ── Table ── */}
      <h2 ref={listTopRef} style={{ marginBottom: "14px" }}>
        {filterType === "all" && "All Invoices"}
        {filterType === "toCollect" && "Invoices to Collect"}
        {filterType === "dueDate" && "Invoices Due Soon"}
        {filterType === "returned" && "Invoices with Returns"}
      </h2>

      {filteredInvoices.length === 0 && <p>No invoices found</p>}

      {filteredInvoices.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "720px" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
                {["Invoice #", "Party Name", "Total Amount", "Payment Mode", "Date & Time", "Status"].map((col) => (
                  <th
                    key={col}
                    style={{ padding: "12px 16px", textAlign: col === "Total Amount" ? "right" : "left", fontWeight: "600", fontSize: "13px", color: "#555", whiteSpace: "nowrap" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginatedInvoices.map((inv, idx) => {
                const dueBadge = filterType === "dueDate" ? getDueDaysBadge(inv) : null;

                return (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f0f7f0"}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa"}
                  >
                    {/* Invoice # */}
                    <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1565c0", whiteSpace: "nowrap" }}>
                      #{inv.id}
                    </td>

                    {/* Party Name */}
                    <td style={{ padding: "12px 16px", color: "#333" }}>
                      {inv.party_name || "N/A"}
                    </td>

                    {/* Total Amount */}
                    <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: "600" }}>₹{Number(inv.total).toLocaleString("en-IN")}</div>
                      {Number(inv.return_total || 0) > 0 && (
                        <div style={{ fontSize: "11px", color: "#880e4f", marginTop: "2px" }}>
                          − ₹{Number(inv.return_total).toLocaleString("en-IN")} returned
                        </div>
                      )}
                    </td>

                    {/* Payment Mode */}
                    <td style={{ padding: "12px 16px", color: "#555", textTransform: "capitalize" }}>
                      {inv.payment_mode || "—"}
                    </td>

                    {/* Date & Time */}
                    <td style={{ padding: "12px 16px", color: "#666", whiteSpace: "nowrap", fontSize: "13px" }}>
                      {new Date(inv.created_at + " UTC").toLocaleString()}
                    </td>

                    {/* Status badges */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>

                        {inv.has_return === 1 && (
                          <span style={{ background: "#fce4ec", color: "#880e4f", padding: "3px 9px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", border: "1px solid #f48fb1", whiteSpace: "nowrap" }}>
                            ↩ Return
                          </span>
                        )}

                        {dueBadge && (
                          <span style={{ background: dueBadge.bg, color: dueBadge.color, padding: "3px 9px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", border: `1px solid ${dueBadge.color}`, whiteSpace: "nowrap" }}>
                            {dueBadge.label}
                          </span>
                        )}

                        <span style={{ background: inv.payment_status === "paid" ? "#2e7d32" : inv.payment_status === "partial" ? "#f57c00" : "#d32f2f", color: "#fff", padding: "3px 9px", borderRadius: "12px", fontSize: "11px", textTransform: "capitalize", whiteSpace: "nowrap" }}>
                          {inv.payment_status}
                        </span>

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
            style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #ccc", background: currentPage === 1 ? "#eee" : "#4CAF50", color: currentPage === 1 ? "#777" : "#fff", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span style={{ fontWeight: "600" }}>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => goToPage(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #ccc", background: currentPage === totalPages ? "#eee" : "#4CAF50", color: currentPage === totalPages ? "#777" : "#fff", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
}

export default InvoiceList;
