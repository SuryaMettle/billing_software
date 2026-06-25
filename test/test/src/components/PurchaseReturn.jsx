import { useEffect, useState } from "react";
import api from "../services/api.js";

const STATUS_COLORS = {
  purchase: { 
    bg: "linear-gradient(135deg, #EAF3DE 0%, #D4E8C2 100%)", 
    color: "#3B6D11", 
    label: "✓ No returns" 
  },
  partial: { 
    bg: "linear-gradient(135deg, #FAEEDA 0%, #F0D4A2 100%)", 
    color: "#854F0B", 
    label: "⚠ Partial return" 
  },
  returned: { 
    bg: "linear-gradient(135deg, #FBEAE8 0%, #F3CBC6 100%)", 
    color: "#991B1B", 
    label: "↩ Fully returned" 
  },
};

function Toast({ message, visible }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: `translateX(-50%) ${visible ? "translateY(0)" : "translateY(100%)"}`,
        background: "linear-gradient(135deg, #2C2C2A 0%, #1A1A18 100%)",
        color: "#F1EFE8",
        padding: "14px 24px",
        borderRadius: 16,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
        opacity: visible ? 1 : 0,
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: "none",
        zIndex: 9999,
        whiteSpace: "nowrap",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {message}
    </div>
  );
}

function MetricCard({ label, value, valueStyle, icon }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(248,248,246,0.8) 100%)",
        backdropFilter: "blur(10px)",
        borderRadius: 12,
        padding: "16px 20px",
        flex: 1,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "1px solid rgba(255,255,255,0.3)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ 
        position: "absolute", 
        top: 12, 
        right: 12, 
        fontSize: 20, 
        opacity: 0.3 
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ 
        fontSize: 22, 
        fontWeight: 600, 
        background: "linear-gradient(135deg, #1a1a1a 0%, #333 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        ...valueStyle 
      }}>
        {value}
      </div>
    </div>
  );
}

function PurchaseReturn({ onReturnSaved }) {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadInvoices();

    window.addEventListener("purchase-updated", loadInvoices);
    return () => window.removeEventListener("purchase-updated", loadInvoices);
  }, []);

  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 4000);
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseInvoices();
      setInvoices(data);
    } catch (err) {
      showToast("Failed to load purchase invoices");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const supplier = inv.party_name || "";
    return (
      inv.id.toString().includes(search) ||
      supplier.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Calculate pages based on filtered results
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE) || 1;
  const displayedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const selectInvoice = async (invoiceId) => {
    if (selectedInvoice?.id === invoiceId) return;

    setLoading(true);
    try {
      const data = await api.getPurchaseInvoiceDetails(invoiceId);
      setSelectedInvoice(data.invoice);
      setInvoiceItems(data.items.map((item) => ({ ...item, returnQty: 0 })));
    } catch (err) {
      showToast("Failed to load purchase invoice details");
    } finally {
      setLoading(false);
    }
  };

  const updateReturnQty = (index, value) => {
    setInvoiceItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const numericValue = Number(value);
        const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
        const clamped = Math.min(Math.max(0, safeValue), item.quantity);

        return { ...item, returnQty: clamped };
      })
    );
  };

  const clearAll = () => {
    setInvoiceItems((prev) => prev.map((item) => ({ ...item, returnQty: 0 })));
  };

  const totalReturn = invoiceItems.reduce(
    (sum, item) => sum + item.returnQty * (item.price || item.rate || 0),
    0
  );

  const selectedItemsCount = invoiceItems.filter((i) => i.returnQty > 0).length;

  const handleReturn = async () => {
    const returnedItems = invoiceItems.filter((item) => item.returnQty > 0);

    if (returnedItems.length === 0) {
      showToast("Enter return quantity for at least one item");
      return;
    }

    setSubmitting(true);

    try {
      await api.processPurchaseReturn({
        purchase_invoice_id: selectedInvoice.id,
        items: returnedItems,
      });

      showToast(
        `✅ Purchase return processed — ₹${totalReturn.toLocaleString("en-IN")}`
      );

      setSelectedInvoice(null);
      setInvoiceItems([]);
      await loadInvoices();
      onReturnSaved?.();
    } catch (err) {
      showToast("❌ Failed to process purchase return");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ 
      padding: "2rem", 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", 
      color: "#1a1a1a",
      background: "linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%)",
      minHeight: "100vh"
    }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        marginBottom: "2rem",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(20px)",
        padding: "20px 24px",
        borderRadius: 20,
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        border: "1px solid rgba(255,255,255,0.3)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            margin: 0,
            background: "linear-gradient(135deg, #1a1a1a 0%, #333 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Purchase Return</h1>
          <span style={{ 
            fontSize: 13, 
            padding: "6px 12px", 
            borderRadius: 20, 
            background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)", 
            color: "#1976d2", 
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.2)"
          }}>
            {invoices.length} purchase invoices available
          </span>
        </div>
        <div style={{ 
          fontSize: 14, 
          color: "#666", 
          fontWeight: 500,
          textAlign: "right"
        }}>
          {new Date().toLocaleDateString("en-IN", { 
            weekday: "long", 
            day: "2-digit", 
            month: "long", 
            year: "numeric" 
          })}
        </div>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>

        {/* Left: Purchase Invoice List Box */}
        <div style={{ 
          borderRadius: 20, 
          overflow: "hidden", 
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.3)"
        }}>
          <div style={{ 
            padding: "20px 24px", 
            background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
            color: "white"
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 12,
              fontSize: 16,
              fontWeight: 700
            }}>
              🛒 Purchase Invoices
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
              Select invoice to process return
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <div style={{ position: "relative" }}>
              <span style={{ 
                position: "absolute", 
                left: 16, 
                top: "50%", 
                transform: "translateY(-50%)", 
                color: "#999", 
                fontSize: 18 
              }}>🔍</span>
              <input
                type="text"
                placeholder="Search by ID or supplier..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // Reset page on user search query
                }}
                style={{
                  width: "100%",
                  fontSize: 15,
                  padding: "12px 16px 12px 48px",
                  borderRadius: 16,
                  border: "2px solid transparent",
                  background: "rgba(248,250,252,0.8)",
                  outline: "none",
                  boxSizing: "border-box",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  fontWeight: 500,
                }}
                onFocus={(e) => e.target.style.borderColor = "#4caf50"}
                onBlur={(e) => e.target.style.borderColor = "transparent"}
              />
            </div>
          </div>

          {/* Invoice items container */}
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {loading && !selectedInvoice && (
              <div style={{ 
                padding: "3rem 2rem", 
                textAlign: "center", 
                color: "#999", 
                fontSize: 15 
              }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>⏳</div>
                Loading purchase invoices…
              </div>
            )}
            {!loading && displayedInvoices.length === 0 && (
              <div style={{ 
                padding: "3rem 2rem", 
                textAlign: "center", 
                color: "#999", 
                fontSize: 15 
              }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📭</div>
                No purchase invoices found
              </div>
            )}
            {displayedInvoices.map((inv) => {
              const isActive = selectedInvoice?.id === inv.id;
              const returnKey = inv.has_return !== 1
  ? "purchase"
  : Number(inv.return_total || 0) < Number(inv.total || 0)
  ? "partial"
  : "returned";
const statusInfo = STATUS_COLORS[returnKey];

              return (
                <div
                  key={inv.id}
                  onClick={() => selectInvoice(inv.id)}
                  style={{
                    padding: "20px 24px",
                    cursor: "pointer",
                    background: isActive 
                      ? "linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)" 
                      : "transparent",
                    borderLeft: isActive 
                      ? "4px solid #4caf50" 
                      : "4px solid transparent",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isActive ? "scale(1.02)" : "scale(1)",
                    margin: "2px 4px",
                    borderRadius: "0 16px 16px 0",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(76, 175, 80, 0.05)";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateX(0)";
                    }
                  }}
                >
                  <div style={{ 
                    fontSize: 15, 
                    fontWeight: 700, 
                    color: "#4caf50",
                    marginBottom: 4
                  }}>
                    #{inv.id}
                  </div>
                  <div style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    marginBottom: 8,
                    color: "#1a1a1a"
                  }}>
                    {inv.party_name}
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: "#888", 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: 12
                  }}>
                    <span>{inv.created_at || inv.date}</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: "#1a1a1a",
                      background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}>
                      ₹{Number(inv.total).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: 11, 
                    padding: "6px 12px", 
                    borderRadius: 20, 
                    background: statusInfo.bg, 
                    color: statusInfo.color, 
                    fontWeight: 600,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}>
                    {statusInfo.label}
                    {inv.return_total ? ` ₹${Number(inv.return_total).toLocaleString("en-IN")}` : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer Elements */}
          {filteredInvoices.length > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderTop: "1px solid rgba(0,0,0,0.05)",
              background: "rgba(0,0,0,0.01)"
            }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: currentPage === 1 ? "#f5f5f5" : "#fff",
                  color: currentPage === 1 ? "#aaa" : "#333",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                ◀ Prev
              </button>
              <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: currentPage === totalPages ? "#f5f5f5" : "#fff",
                  color: currentPage === totalPages ? "#aaa" : "#333",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Next ▶
              </button>
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div>
          {!selectedInvoice ? (
            <div style={{ 
              border: "2px dashed #e0e0e0", 
              borderRadius: 24, 
              padding: "4rem 3rem", 
              textAlign: "center", 
              color: "#999",
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
            }}>
              <div style={{ 
                fontSize: 64, 
                marginBottom: 24, 
                opacity: 0.3,
                animation: "float 3s ease-in-out infinite"
              }}>←</div>
              <p style={{ fontSize: 16, margin: 0 }}>
                Select a purchase invoice from the left to begin return
              </p>
            </div>
          ) : (
            <div style={{ 
              borderRadius: 24, 
              overflow: "hidden", 
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 25px 80px rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.3)"
            }}>

              {/* Invoice header */}
              <div style={{ 
                padding: "24px 28px", 
                borderBottom: "1px solid rgba(0,0,0,0.05)",
                background: "linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(69,160,73,0.05) 100%)",
                position: "relative"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ 
                      fontSize: 22, 
                      fontWeight: 700,
                      background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      marginBottom: 8
                    }}>
                      Purchase Invoice #{selectedInvoice.id}
                    </div>
                    {selectedItemsCount > 0 && (
                      <span style={{ 
                        fontSize: 12, 
                        padding: "8px 14px", 
                        borderRadius: 20, 
                        background: "linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)", 
                        color: "#2e7d32", 
                        fontWeight: 600,
                        boxShadow: "0 4px 12px rgba(46,125,50,0.2)"
                      }}>
                        ✨ {selectedItemsCount} item{selectedItemsCount > 1 ? "s" : ""} selected
                      </span>
                    )}
                    <div style={{ 
                      fontSize: 15, 
                      color: "#666", 
                      marginTop: 12,
                      fontWeight: 500
                    }}>
                      {selectedInvoice.party_name}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ 
                      fontSize: 28, 
                      fontWeight: 700, 
                      color: "#1a1a1a",
                      marginBottom: 4
                    }}>
                      ₹{Number(selectedInvoice.total).toLocaleString("en-IN")}
                    </div>
                    <div style={{ 
                      fontSize: 14, 
                      color: "#888" 
                    }}>
                      {selectedInvoice.created_at || selectedInvoice.date}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ 
                display: "flex", 
                gap: 16, 
                padding: "24px 28px", 
                borderBottom: "1px solid rgba(0,0,0,0.05)" 
              }}>
                <MetricCard 
                  label="Total Items" 
                  value={invoiceItems.length} 
                  icon="📦" 
                />
                <MetricCard 
                  label="Purchase Total" 
                  value={`₹${Number(selectedInvoice.total).toLocaleString("en-IN")}`} 
                  icon="💰"
                />
                <MetricCard
                  label="Return Amount"
                  value={`₹${Math.round(totalReturn).toLocaleString("en-IN")}`}
                  valueStyle={{ 
                    color: totalReturn > 0 ? "#d32f2f" : "#999" 
                  }}
                  icon={totalReturn > 0 ? "↩️" : "➡️"}
                />
              </div>

              {/* Items table */}
              <div style={{ padding: "24px 28px", overflowX: "auto" }}>
                {loading ? (
                  <div style={{ 
                    textAlign: "center", 
                    color: "#999", 
                    fontSize: 15, 
                    padding: "3rem" 
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>⚙️</div>
                    Loading items…
                  </div>
                ) : (
                  <table style={{ 
                    width: "100%", 
                    borderCollapse: "collapse", 
                    fontSize: 14, 
                    tableLayout: "fixed" 
                  }}>
                    <thead>
                      <tr>
                        {["Product", "Purchased", "Return Qty", "Amount"].map((h) => (
                          <th key={h} style={{ 
                            textAlign: h === "Amount" ? "right" : "left", 
                            fontSize: 12, 
                            fontWeight: 600, 
                            color: "#666", 
                            padding: "0 12px 16px 0", 
                            borderBottom: "2px solid rgba(0,0,0,0.05)",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, index) => {
                        const amount = item.returnQty * (item.price || item.rate || 0);
                        const hasQty = item.returnQty > 0;
                        return (
                          <tr key={index} style={{ 
                            background: hasQty ? "rgba(76, 175, 80, 0.05)" : "transparent",
                            borderRadius: 12,
                            marginBottom: 4,
                            transition: "all 0.2s ease"
                          }}>
                            <td style={{ 
                              padding: "16px 12px 16px 0", 
                              borderBottom: "none", 
                              verticalAlign: "middle" 
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                {item.name}
                              </div>
                              {item.hsn_code && (
                                <span style={{ 
                                  fontSize: 12, 
                                  color: "#999",
                                  background: "rgba(0,0,0,0.05)",
                                  padding: "4px 8px",
                                  borderRadius: 8
                                }}>
                                  HSN {item.hsn_code}
                                </span>
                              )}
                            </td>
                            <td style={{ 
                              padding: "16px 12px 16px 0", 
                              borderBottom: "none", 
                              color: "#888", 
                              fontWeight: 600,
                              verticalAlign: "middle" 
                            }}>
                              {item.quantity}
                            </td>
                            <td style={{ 
                              padding: "16px 12px 16px 0", 
                              borderBottom: "none", 
                              verticalAlign: "middle" 
                            }}>
                              <input
                                type="number"
                                min={0}
                                max={item.quantity}
                                value={item.returnQty}
                                onChange={(e) => updateReturnQty(index, e.target.value)}
                                style={{
                                  width: 80,
                                  textAlign: "center",
                                  padding: "10px 12px",
                                  fontSize: 15,
                                  fontWeight: 600,
                                  borderRadius: 12,
                                  border: hasQty ? "2px solid #4caf50" : "2px solid rgba(0,0,0,0.1)",
                                  background: hasQty 
                                    ? "linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)" 
                                    : "rgba(255,255,255,0.7)",
                                  outline: "none",
                                  color: hasQty ? "#2e7d32" : "#333",
                                  backdropFilter: "blur(10px)",
                                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  boxShadow: hasQty ? "0 4px 12px rgba(76,175,80,0.3)" : "none"
                                }}
                              />
                            </td>
                            <td style={{ 
                              padding: "16px 0 16px 0", 
                              borderBottom: "none", 
                              textAlign: "right", 
                              fontWeight: hasQty ? 700 : 500, 
                              color: hasQty ? "#4caf50" : "#999", 
                              verticalAlign: "middle",
                              fontSize: 15
                            }}>
                              ₹{Math.round(amount).toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div style={{ 
                padding: "24px 28px", 
                borderTop: "1px solid rgba(0,0,0,0.05)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                background: "rgba(0,0,0,0.02)"
              }}>
                <div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
                    Total return amount
                  </div>
                  <div style={{ 
                    fontSize: 28, 
                    fontWeight: 700, 
                    color: totalReturn > 0 ? "#4caf50" : "#999",
                    background: totalReturn > 0 
                      ? "linear-gradient(135deg, #4caf50 0%, #45a049 100%)" 
                      : "transparent",
                    WebkitBackgroundClip: totalReturn > 0 ? "text" : "none",
                    WebkitTextFillColor: totalReturn > 0 ? "transparent" : "#999"
                  }}>
                    ₹{Math.round(totalReturn).toLocaleString("en-IN")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={clearAll}
                    style={{ 
                      padding: "12px 24px", 
                      borderRadius: 16, 
                      fontSize: 15, 
                      fontWeight: 600, 
                      cursor: "pointer", 
                      border: "2px solid #f44336", 
                      background: "rgba(244,67,54,0.1)", 
                      color: "#d32f2f",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 4px 12px rgba(244,67,54,0.3)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "rgba(244,67,54,0.2)";
                      e.target.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "rgba(244,67,54,0.1)";
                      e.target.style.transform = "translateY(0)";
                    }}
                  >
                    ✕ Clear All
                  </button>
                  <button
                    onClick={handleReturn}
                    disabled={totalReturn === 0 || submitting}
                    style={{
                      padding: "12px 28px",
                      borderRadius: 16,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: totalReturn === 0 || submitting ? "not-allowed" : "pointer",
                      border: "none",
                      background: totalReturn === 0 || submitting 
                        ? "rgba(0,0,0,0.1)" 
                        : "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
                      color: totalReturn === 0 || submitting ? "#999" : "#fff",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: totalReturn === 0 || submitting 
                        ? "none" 
                        : "0 8px 24px rgba(76,175,80,0.4)",
                    }}
                    onMouseEnter={(e) => {
                      if (totalReturn > 0 && !submitting) {
                        e.target.style.transform = "translateY(-2px)";
                        e.target.style.boxShadow = "0 12px 32px rgba(76,175,80,0.5)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (totalReturn > 0 && !submitting) {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "0 8px 24px rgba(76,175,80,0.4)";
                      }
                    }}
                  >
                    {submitting ? (
                      <>
                        <span style={{ marginRight: 8 }}>⏳</span>
                        Processing…
                      </>
                    ) : (
                      <>
                        <span style={{ marginRight: 8 }}>↩</span>
                        Process Purchase Return
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

export default PurchaseReturn;