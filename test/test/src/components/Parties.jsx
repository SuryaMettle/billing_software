import { useState, useEffect } from "react";
import CreateParty from "./CreateParty";
import PartyDetails from "./PartyDetails";

import api from "../services/api.js";

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
    const invoices = await api.getInvoicesWithProfit();

    const toCollect = invoices
      .filter(
        (inv) =>
          inv.payment_status === "pending" ||
          inv.payment_status === "partial"
      )
      .reduce(
        (sum, inv) =>
          sum +
          Number(inv.total || 0) -
          Number(inv.paid_amount || 0) -
          Number(inv.return_total || 0),
        0
      );

    setPartyStats({
      toCollect,
      toPay: 0,
    });
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

  const cardStyle = (bg) => ({
    flex: 1,
    background: bg,
    padding: "18px",
    borderRadius: "12px",
    border: "1px solid #eee",
  });

  const labelStyle = {
    fontSize: "13px",
    color: "#555",
    marginBottom: "5px",
  };

  const valueStyle = {
    fontSize: "20px",
    fontWeight: "700",
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
        <div style={{ padding: "20px" }}>
          <h2 style={{ marginBottom: "20px" }}>Parties</h2>

          <div style={{ display: "flex", gap: "15px", marginBottom: "20px", width: "95%" }}>
            <div
  onClick={() => { setBalanceFilter("all"); setCurrentPage(1); }}
  style={{
    ...cardStyle("#ede7f6"),
    cursor: "pointer",
    border: balanceFilter === "all" ? "2px solid #7e57c2" : "1px solid #eee",
    transition: "all 0.15s"
  }}
>
  <div style={labelStyle}>All Parties</div>
  <div style={valueStyle}>{totalParties}</div>
</div>

<div
  onClick={() => { setBalanceFilter("toCollect"); setCurrentPage(1); }}
  style={{
    ...cardStyle("#e8f5e9"),
    cursor: "pointer",
    border: balanceFilter === "toCollect" ? "2px solid #2e7d32" : "1px solid #eee",
    transition: "all 0.15s"
  }}
>
  <div style={labelStyle}>To Collect</div>
  <div style={{ ...valueStyle, color: "#2e7d32" }}>
    ₹{Number(partyStats.toCollect).toLocaleString("en-IN")}
  </div>
</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <input
              placeholder="Search party..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "10px",
                width: "280px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />

            <div style={{ display: "flex", gap: "8px", marginLeft: "15px" }}>
              {["all", "customer", "supplier"].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter(type);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "1px solid #ccc",
                    background: typeFilter === type ? "#1976d2" : "#fff",
                    color: typeFilter === type ? "#fff" : "#333",
                    cursor: "pointer",
                    fontWeight: typeFilter === type ? "600" : "400",
                    fontSize: "13px",
                    textTransform: "capitalize",
                  }}
                >
                  {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage("create")}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#1976d2",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "500",
                marginRight: "70px",
              }}
            >
              + Create Party
            </button>
          </div>

          <div style={{ display: "flex", gap: "15px", width: "95%", maxWidth: "1200px", margin: "0 auto 20px auto" }}>
            <div style={{ flex: 1, background: "#e3f2fd", padding: "18px", borderRadius: "12px" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>Total Sales</div>
              <div style={{ fontSize: "20px", fontWeight: "700" }}>
                ₹{Number(salesStats.totalSales).toLocaleString("en-IN")}
              </div>
            </div>

            <div style={{ flex: 1, background: "#e8f5e9", padding: "18px", borderRadius: "12px" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>Total Profit</div>
              <div style={{ fontSize: "20px", fontWeight: "700" }}>
                ₹{Number(salesStats.totalProfit).toLocaleString("en-IN")}
              </div>
            </div>

            <div
              onClick={onOpenInvoices}
              style={{
                flex: 1,
                background: "#fff3e0",
                padding: "18px",
                borderRadius: "12px",
                cursor: "pointer",
                border: "1px solid #f5c16c",
              }}
            >
              <div style={{ fontSize: "13px", color: "#555" }}>Invoices</div>
              <div style={{ fontSize: "20px", fontWeight: "700" }}>
                {salesStats.totalInvoices}
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 6px 20px rgba(0,0,0,0.08)", overflow: "hidden", width: "100%" }}>
            {filtered.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", padding: "14px", borderBottom: "1px solid #eee" }}>
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                  Previous
                </button>

                <span style={{ fontWeight: "600" }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                  Next
                </button>
              </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "#f5f7fa", fontWeight: "600", fontSize: "18px", textAlign: "left" }}>
                  <th style={{ padding: "14px 14px 14px 30px", width: "25%" }}>Party Name</th>
                  <th style={{ padding: "14px 14px 14px 30px", width: "20%" }}>Mobile</th>
                  <th style={{ padding: "14px 14px 14px 30px", width: "20%" }}>Party Type</th>
                  <th style={{ padding: "14px 14px 14px 30px", width: "15%" }}>Balance</th>
                  <th style={{ padding: "14px 14px 14px 30px", width: "20%" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                      No parties found
                    </td>
                  </tr>
                )}

                {paginatedParties.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPartyId(p.id)}
                    style={{ borderTop: "1px solid #eee", cursor: "pointer" }}
                  >
                    <td style={{ padding: "14px", fontWeight: "500" }}>
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
      background: "#e8f5e9", color: "#2e7d32",
      padding: "2px 8px", borderRadius: "12px",
      fontSize: "11px", fontWeight: "700",
      border: "1px solid #a5d6a7", cursor: "pointer"
    }}
  >
    🎫 ₹{Number(p.creditBalance).toLocaleString("en-IN")} credit
  </span>
)}
  </div>
</td>
                    <td style={{ padding: "14px", whiteSpace: "nowrap" }}>{p.phone}</td>
                    <td style={{ padding: "14px" }}>{p.type || "-"}</td>
                    <td
  style={{
    padding: "14px",
    textAlign: "right",
    color: p.balance > 0 ? "#d32f2f" : p.balance < 0 ? "#2e7d32" : "#666",
    fontWeight: "600",
  }}
>
  {p.balance > 0
    ? `₹${Number(p.balance).toLocaleString("en-IN")}`
    : p.balance < 0
    ? `−₹${Number(Math.abs(p.balance)).toLocaleString("en-IN")}`
    : "₹0"}
</td>
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(p);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
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
    </>
  );
}

export default Parties;
