import { useEffect, useState } from "react";
import PurchaseInvoicePrint from "./PurchaseInvoicePrint";

function PurchaseInvoiceDetails({ invoiceId, onBack }) {
  const [data, setData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [note, setNote] = useState("");
  const [showPrint, setShowPrint] = useState(false);

  // ── REFUND / CREDIT STATE ──
  const [refundInfo, setRefundInfo] = useState(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMode, setCollectMode] = useState("cash");
  const [collectNote, setCollectNote] = useState("");
  const [creditAmount, setCreditAmount] = useState("");

  useEffect(() => {
    loadDetails();
  }, [invoiceId]);

  const loadDetails = async () => {
    const res = await window.api.getPurchaseInvoiceDetails(invoiceId);
    setData(res);

    // Calculate refund info from purchase returns
    if (res?.returns?.length > 0) {
      const totalReturned = res.returns.reduce((sum, ret) => {
        return sum + ret.items?.reduce((s, item) => {
          const qty = item.returnQty || item.return_qty || item.quantity || 0;
          const price = item.price || item.rate || 0;
          return s + qty * price;
        }, 0) ?? ret.total ?? 0;
      }, 0);

      const paid = Number(res.invoice.paid_amount || 0);
      const total = Number(res.invoice.total || 0);

      // Amount supplier owes us back = what we returned
      // But only if we already paid more than what remains
      const netInvoice = total - totalReturned;
      const collectDue = Math.max(0, paid - netInvoice);

      setRefundInfo({
        totalReturned,
        collectDue,
        remainingCollect: collectDue // can be extended later with actual collect records
      });
    } else {
      setRefundInfo(null);
    }
  };

  if (!data) return <p>Loading...</p>;

  if (showPrint) {
    return <PurchaseInvoicePrint invoiceId={invoiceId} onBack={() => setShowPrint(false)} />;
  }

  const total = Number(data.invoice.total || 0);
  const paid = Number(data.invoice.paid_amount || 0);

  const totalReturned = data.returns?.reduce((sum, ret) => {
    const retTotal = ret.items?.reduce((itemSum, item) => {
      const qty = item.returnQty || item.return_qty || item.quantity || 0;
      const price = item.price || item.rate || 0;
      return itemSum + qty * price;
    }, 0) ?? ret.total ?? 0;
    return sum + retTotal;
  }, 0) ?? 0;

  const balance = total - paid - totalReturned;

  let statusColor = "#d32f2f";
  if (data.invoice.payment_status === "paid") statusColor = "#2e7d32";
  else if (data.invoice.payment_status === "partial") statusColor = "#f57c00";

  return (
    <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
      <div style={{
        width: "600px",
        background: "#fff",
        padding: "25px",
        borderRadius: "10px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
      }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Purchase #{data.invoice.id}</h2>

            {data.returns?.length > 0 && (
              <>
                <span style={{
                  background: "#fce4ec", color: "#880e4f",
                  padding: "4px 12px", borderRadius: "20px",
                  fontSize: "12px", fontWeight: "600",
                  border: "1px solid #f48fb1",
                  display: "flex", alignItems: "center", gap: "4px"
                }}>
                  ↩ {data.returns.length} Return{data.returns.length > 1 ? "s" : ""}
                </span>

                {refundInfo?.remainingCollect > 0 && (
                  <>
                    {/* TO COLLECT button — supplier owes us money back */}
                    <button
                      onClick={() => {
                        setCollectAmount(refundInfo.remainingCollect.toString());
                        setShowCollectModal(true);
                      }}
                      style={{
                        padding: "4px 12px", borderRadius: "20px",
                        fontSize: "12px", fontWeight: "600",
                        background: "#e8f5e9", color: "#2e7d32",
                        border: "1px solid #a5d6a7", cursor: "pointer"
                      }}
                    >
                      💰 To Collect ₹{refundInfo.remainingCollect.toLocaleString("en-IN")}
                    </button>

                    {/* CREDIT button — adjust it as credit against future purchases */}
                    <button
                      onClick={() => {
                        setCreditAmount(refundInfo.remainingCollect.toString());
                        setShowCreditModal(true);
                      }}
                      style={{
                        padding: "4px 12px", borderRadius: "20px",
                        fontSize: "12px", fontWeight: "600",
                        background: "#e3f2fd", color: "#1565c0",
                        border: "1px solid #90caf9", cursor: "pointer"
                      }}
                    >
                      🎫 Adjust as Credit
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <button onClick={onBack}>← Back</button>
        </div>

        <hr style={{ margin: "15px 0" }} />

        {/* INFO GRID */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "20px"
        }}>
          <div><strong>Date:</strong></div>
          <div style={{ textAlign: "right" }}>{data.invoice.created_at}</div>

          <div><strong>Supplier:</strong></div>
          <div style={{ textAlign: "right" }}>{data.invoice.party_name || "N/A"}</div>

          <div><strong>Total:</strong></div>
          <div style={{ textAlign: "right" }}>₹{total.toLocaleString("en-IN")}</div>

          <div><strong>Paid:</strong></div>
          <div style={{ textAlign: "right" }}>₹{paid.toLocaleString("en-IN")}</div>

          {totalReturned > 0 && (
            <>
              <div><strong>Returned:</strong></div>
              <div style={{ textAlign: "right", color: "#880e4f", fontWeight: "600" }}>
                ₹{Number(totalReturned).toLocaleString("en-IN")}
              </div>
            </>
          )}

          <div><strong>Balance:</strong></div>
          <div style={{ textAlign: "right", color: balance > 0 ? "red" : "green" }}>
            ₹{Number(balance).toLocaleString("en-IN")}
          </div>

          <div><strong>Payment Mode:</strong></div>
          <div style={{ textAlign: "right" }}>{data.invoice.payment_mode || "-"}</div>

          <div><strong>Status:</strong></div>
          <div style={{ textAlign: "right" }}>
            <span style={{
              background: statusColor, color: "#fff",
              padding: "4px 10px", borderRadius: "12px",
              fontSize: "12px", textTransform: "capitalize"
            }}>
              {data.invoice.payment_status}
            </span>
          </div>
        </div>

        {/* ITEMS */}
        <h3 style={{ marginBottom: "10px" }}>Items</h3>
        <div style={{ borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>
          {data.items.map((item, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px 0", borderBottom: "1px solid #f5f5f5"
            }}>
              <span>{item.name} × {item.quantity}</span>
              <span>₹{Number(item.price * item.quantity).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>

        {/* RETURN HISTORY */}
        {data.returns?.length > 0 && (
          <>
            <h3 style={{ marginTop: "25px", marginBottom: "10px", color: "#880e4f" }}>
              ↩ Purchase Return History
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.returns.map((ret, ri) => {
                const retTotal = ret.items?.reduce((sum, item) => {
                  const qty = item.returnQty || item.return_qty || item.quantity || 0;
                  const price = item.price || item.rate || 0;
                  return sum + qty * price;
                }, 0) ?? ret.total ?? 0;

                return (
                  <div key={ret.id || ri} style={{
                    border: "1px solid #f48fb1", borderRadius: "10px",
                    overflow: "hidden", background: "#fff9fb"
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", background: "#fce4ec",
                      borderBottom: "1px solid #f48fb1"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          background: "#880e4f", color: "#fff",
                          padding: "2px 8px", borderRadius: "10px",
                          fontSize: "11px", fontWeight: "600"
                        }}>
                          Return #{ri + 1}
                        </span>
                        {ret.created_at && (
                          <span style={{ fontSize: "12px", color: "#666" }}>
                            {new Date(ret.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: "700", color: "#880e4f", fontSize: "14px" }}>
                        − ₹{Number(retTotal).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {ret.items?.length > 0 && (
                      <div style={{ padding: "8px 14px" }}>
                        {ret.items.map((item, ii) => {
                          const qty = item.returnQty || item.return_qty || item.quantity || 0;
                          const price = item.price || item.rate || 0;
                          return (
                            <div key={item.id || ii} style={{
                              display: "flex", justifyContent: "space-between",
                              padding: "6px 0",
                              borderBottom: ii < ret.items.length - 1 ? "1px solid #fce4ec" : "none",
                              fontSize: "13px"
                            }}>
                              <span style={{ color: "#444" }}>{item.name} × {qty}</span>
                              <span style={{ color: "#880e4f", fontWeight: "500" }}>
                                − ₹{Number(qty * price).toLocaleString("en-IN")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* PAYMENT HISTORY */}
        <h3 style={{ marginTop: "25px" }}>Payment History</h3>
        <div style={{ marginTop: "10px" }}>
          {data.payments?.length === 0 && <p style={{ color: "#999" }}>No payments yet</p>}
          {data.payments?.map((p, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px", border: "1px solid #eee",
              borderRadius: "8px", marginBottom: "8px", background: "#fafafa"
            }}>
              <div>
                <div style={{ fontWeight: "500" }}>₹{Number(p.amount).toLocaleString("en-IN")}</div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {p.mode} • {p.note || "No note"}
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* GRAND TOTAL */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: "15px", fontWeight: "bold", fontSize: "16px"
        }}>
          <span>Net Total</span>
          <span>₹{Number(total - totalReturned).toLocaleString("en-IN")}</span>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          {data.invoice.payment_status !== "paid" && (
            <button
              onClick={() => setShowPaymentModal(true)}
              style={{
                padding: "8px 12px", background: "#7c3aed",
                color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer"
              }}
            >
              + Add Payment
            </button>
          )}

          <button
            onClick={() => setShowPrint(true)}
            style={{
              padding: "8px 12px", background: "#2e7d32",
              color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer"
            }}
          >
            🖨️ View Invoice
          </button>
        </div>

      </div>

      {/* ── PAYMENT MODAL ── */}
      {showPaymentModal && (
        <div onClick={() => setShowPaymentModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "380px", background: "#fff", borderRadius: "12px",
            padding: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ marginBottom: "15px" }}>Add Payment</h3>

            <label>Amount</label>
            <input type="number" value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount"
              style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
            />

            <label>Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
              style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ddd" }}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank">Bank Transfer</option>
            </select>

            <label>Note (optional)</label>
            <input type="text" value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. advance payment"
              style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "15px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setShowPaymentModal(false)}
                style={{ padding: "8px 12px", border: "1px solid #ccc", background: "#f5f5f5", borderRadius: "6px", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  await window.api.addPurchasePayment({
                    invoice_id: data.invoice.id,
                    amount: Number(paymentAmount),
                    mode: paymentMode,
                    note
                  });
                  setShowPaymentModal(false);
                  setPaymentAmount("");
                  setNote("");
                  loadDetails();
                }}
                style={{ padding: "8px 12px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TO COLLECT MODAL ── */}
      {showCollectModal && (
        <div onClick={() => setShowCollectModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "400px", background: "#fff", borderRadius: "16px",
            padding: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
          }}>
            <h3 style={{ margin: "0 0 6px 0" }}>💰 Collect from Supplier</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#666" }}>
              Amount supplier owes you back: <strong>₹{refundInfo?.remainingCollect?.toLocaleString("en-IN")}</strong>
            </p>

            <label style={{ fontWeight: "600", fontSize: "13px" }}>Amount</label>
            <input type="number" value={collectAmount}
              onChange={e => setCollectAmount(e.target.value)}
              max={refundInfo?.remainingCollect}
              style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
            />

            <label style={{ fontWeight: "600", fontSize: "13px" }}>Payment Mode</label>
            <select value={collectMode} onChange={e => setCollectMode(e.target.value)}
              style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ddd" }}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
            </select>

            <label style={{ fontWeight: "600", fontSize: "13px" }}>Note (optional)</label>
            <input type="text" value={collectNote}
              onChange={e => setCollectNote(e.target.value)}
              placeholder="e.g. Collected refund for returned goods"
              style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "16px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowCollectModal(false)}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={!collectAmount || Number(collectAmount) <= 0}
                onClick={async () => {
                  // Record as a purchase payment from supplier (reduces balance)
                  await window.api.addPurchasePayment({
                    invoice_id: data.invoice.id,
                    amount: Number(collectAmount),
                    mode: collectMode,
                    note: collectNote || "Collected refund from supplier for returned goods"
                  });
                  setShowCollectModal(false);
                  setCollectAmount("");
                  setCollectNote("");
                  loadDetails();
                }}
                style={{
                  padding: "8px 16px", borderRadius: "6px", border: "none",
                  background: "#2e7d32", color: "#fff", cursor: "pointer", fontWeight: "600"
                }}
              >
                Confirm Collected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREDIT MODAL ── */}
      {showCreditModal && (
        <div onClick={() => setShowCreditModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "400px", background: "#fff", borderRadius: "16px",
            padding: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
          }}>
            <h3 style={{ margin: "0 0 6px 0" }}>🎫 Adjust as Credit</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#666" }}>
              Supplier will adjust <strong>₹{refundInfo?.remainingCollect?.toLocaleString("en-IN")}</strong> against your future purchases instead of paying back.
            </p>

            <label style={{ fontWeight: "600", fontSize: "13px" }}>Credit Amount</label>
            <input type="number" value={creditAmount}
              onChange={e => setCreditAmount(e.target.value)}
              max={refundInfo?.remainingCollect}
              style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "16px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
            />

            <div style={{
              background: "#e3f2fd", padding: "12px", borderRadius: "8px",
              marginBottom: "16px", fontSize: "13px", color: "#1565c0"
            }}>
              ✅ This amount will be deducted from your next purchase with this supplier
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreditModal(false)}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={!creditAmount || Number(creditAmount) <= 0}
                onClick={async () => {
                  // Record as a purchase payment (credit adjustment reduces what we owe)
                  await window.api.addPurchasePayment({
                    invoice_id: data.invoice.id,
                    amount: Number(creditAmount),
                    mode: "credit_adjustment",
                    note: "Supplier credit adjustment for returned goods"
                  });
                  setShowCreditModal(false);
                  setCreditAmount("");
                  loadDetails();
                }}
                style={{
                  padding: "8px 16px", borderRadius: "6px", border: "none",
                  background: "#1565c0", color: "#fff", cursor: "pointer", fontWeight: "600"
                }}
              >
                Confirm Credit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PurchaseInvoiceDetails;