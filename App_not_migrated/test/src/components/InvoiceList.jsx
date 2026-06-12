import { useEffect, useState, useRef } from "react";
import InvoiceDetails from "./InvoiceDetails";

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
    const data = await window.api.getInvoicesWithProfit();
    setInvoices(data);

    const toCollect = data
      .filter(
        (inv) =>
          inv.payment_status === "pending" || inv.payment_status === "partial"
      )
      .reduce(
        (sum, inv) =>
          sum +
          Number(inv.total || 0) -
          Number(inv.paid_amount || 0) -
          Number(inv.return_total || 0),
        0
      );

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
      <div style={{ display: "flex", gap: "14px", marginBottom: "20px", alignItems: "stretch" }}>

        {/* All Invoices — reset card */}
        <div
          onClick={() => { setFilterType("all"); setCurrentPage(1); }}
          style={{
            background: filterType === "all" ? "#e8eaf6" : "#f5f5f5",
            padding: "18px",
            borderRadius: "12px",
            cursor: "pointer",
            border: filterType === "all" ? "2px solid #3949ab" : "1px solid #e0e0e0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            minWidth: "110px",
            transition: "all 0.15s",
          }}
        >
          <div style={{ fontSize: "20px", marginBottom: "4px" }}>📋</div>
          <div style={{ fontSize: "12px", fontWeight: "600", color: filterType === "all" ? "#3949ab" : "#555", textAlign: "center", lineHeight: "1.3" }}>
            All Invoices
          </div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: filterType === "all" ? "#3949ab" : "#333", marginTop: "4px" }}>
            {invoices.length}
          </div>
        </div>

        {/* To Collect */}
        <div
          onClick={() => { setFilterType(filterType === "toCollect" ? "all" : "toCollect"); setCurrentPage(1); }}
          style={{ flex: 1, background: "#e8f5e9", padding: "18px", borderRadius: "12px", cursor: "pointer", border: filterType === "toCollect" ? "2px solid #2e7d32" : "1px solid #eee", transition: "all 0.15s" }}
        >
          <div style={{ fontSize: "13px", color: "#555" }}>To Collect</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#2e7d32" }}>
            ₹{Number(stats.toCollect).toLocaleString("en-IN")}
          </div>
        </div>

        {/* Due Date */}
        <div
          onClick={() => { setFilterType(filterType === "dueDate" ? "all" : "dueDate"); setCurrentPage(1); }}
          style={{ flex: 1, background: "#ffebee", padding: "18px", borderRadius: "12px", cursor: "pointer", border: filterType === "dueDate" ? "2px solid #d32f2f" : "1px solid #eee", transition: "all 0.15s" }}
        >
          <div style={{ fontSize: "13px", color: "#555" }}>Due Date</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#d32f2f" }}>
            {invoices.filter((inv) => isDueDateNear(inv)).length}
          </div>
        </div>

        {/* Returned */}
        <div
  onClick={() => { setFilterType(filterType === "returned" ? "all" : "returned"); setCurrentPage(1); }}
  style={{ flex: 1, background: "#fce4ec", padding: "18px", borderRadius: "12px", cursor: "pointer", border: filterType === "returned" ? "2px solid #880e4f" : "1px solid #eee", transition: "all 0.15s" }}
>
  <div style={{ fontSize: "13px", color: "#555" }}>Returned</div>
  <div style={{ fontSize: "22px", fontWeight: "700", color: "#880e4f" }}>
    {invoices.filter((inv) => inv.has_return === 1).length}
  </div>
</div>

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