import { useEffect, useState } from "react";
import InvoicePrint from "./InvoicePrint";

function InvoiceDetails({ invoiceId, onBack }) {
  const [data, setData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [note, setNote] = useState("");
  const [showPrint, setShowPrint] = useState(false);
  const [showDeliveryCopy, setShowDeliveryCopy] = useState(false);
  const [loyaltyRedemption, setLoyaltyRedemption] = useState(null);

  const [refundInfo, setRefundInfo] = useState(null);
const [showRefundModal, setShowRefundModal] = useState(false);
const [showCreditModal, setShowCreditModal] = useState(false);
const [refundAmount, setRefundAmount] = useState("");
const [refundMode, setRefundMode] = useState("cash");
const [refundNote, setRefundNote] = useState("");
const [creditAmount, setCreditAmount] = useState("");
const [showRedeemModal, setShowRedeemModal] = useState(false);
const [redeemAmount, setRedeemAmount] = useState("");
const [redeemNote, setRedeemNote] = useState("");

  useEffect(() => {
    loadDetails();
  }, [invoiceId]);

  const loadDetails = async () => {
  const res = await window.api.getInvoiceDetails(invoiceId);
  setData(res);

  const refInfo = await window.api.getReturnRefundInfo(invoiceId);
  setRefundInfo(refInfo);

  const ledger = await window.api.getLoyaltyLedger(res.invoice.party_id);
  const redemption = ledger.find(
    e => e.invoice_id === invoiceId && e.type === "redeemed"
  );
  setLoyaltyRedemption(redemption || null);
};

  if (!data) return <p>Loading...</p>;

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

  if (showPrint) {
  return <InvoicePrint invoiceId={invoiceId} onBack={() => setShowPrint(false)} />;
}
if (showDeliveryCopy) {
  return <InvoicePrint invoiceId={invoiceId} onBack={() => setShowDeliveryCopy(false)} deliveryCopy={true} />;
}

  return (
    <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "600px",
          background: "#fff",
          padding: "25px",
          borderRadius: "10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ margin: 0 }}>Invoice #{data.invoice.id}</h2>

            {data.returns?.length > 0 && (
  <>
    <span style={{
      background: "#fce4ec", color: "#880e4f",
      padding: "4px 12px", borderRadius: "20px",
      fontSize: "12px", fontWeight: "600",
      border: "1px solid #f48fb1",
      display: "flex", alignItems: "center", gap: "4px",
    }}>
      ↩ {data.returns.length} Return{data.returns.length > 1 ? "s" : ""}
    </span>

    {refundInfo?.remainingRefund > 0 && (
      <>
        <button
          onClick={() => {
            setRefundAmount(refundInfo.remainingRefund.toString());
            setShowRefundModal(true);
          }}
          style={{
            padding: "4px 12px", borderRadius: "20px",
            fontSize: "12px", fontWeight: "600",
            background: "#fff3e0", color: "#e65100",
            border: "1px solid #ffcc02", cursor: "pointer",
          }}
        >
          💸 To Pay ₹{refundInfo.remainingRefund.toLocaleString("en-IN")}
        </button>

        <button
          onClick={() => {
            setCreditAmount(refundInfo.remainingRefund.toString());
            setShowCreditModal(true);
          }}
          style={{
            padding: "4px 12px", borderRadius: "20px",
            fontSize: "12px", fontWeight: "600",
            background: "#e8f5e9", color: "#2e7d32",
            border: "1px solid #a5d6a7", cursor: "pointer",
          }}
        >
          🎫 Credit Note
        </button>
      </>
    )}

    {refundInfo?.creditNote && refundInfo.creditNote.remaining > 0 && (
      <button
        onClick={() => {
          setRedeemAmount(refundInfo.creditNote.remaining.toString());
          setShowRedeemModal(true);
        }}
        style={{
          padding: "4px 12px", borderRadius: "20px",
          fontSize: "12px", fontWeight: "600",
          background: "#e3f2fd", color: "#1565c0",
          border: "1px solid #90caf9", cursor: "pointer",
        }}
      >
        🎟 Redeem Credit ₹{refundInfo.creditNote.remaining.toLocaleString("en-IN")}
      </button>
    )}
  </>
)}
          </div>

          <button onClick={onBack}>← Back</button>
        </div>

        <hr style={{ margin: "15px 0" }} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <div><strong>Date:</strong></div>
          <div style={{ textAlign: "right" }}>{data.invoice.created_at}</div>

          <div><strong>Party Name:</strong></div>
          <div style={{ textAlign: "right" }}>{data.invoice.party_name || "N/A"}</div>

          <div><strong>Total:</strong></div>
          <div style={{ textAlign: "right" }}>₹{total.toLocaleString("en-IN")}</div>

          <div><strong>Paid:</strong></div>
<div style={{ textAlign: "right" }}>
  ₹{paid.toLocaleString("en-IN")}
  {loyaltyRedemption && (
    <div style={{
      fontSize: "12px", color: "#f57f17", marginTop: "4px",
      background: "#fffde7", padding: "4px 8px", borderRadius: "6px",
      border: "1px solid #ffd54f"
    }}>
      ⭐ Includes {Math.abs(loyaltyRedemption.points_change)} pts redeemed
      (₹{(Math.abs(loyaltyRedemption.points_change)).toLocaleString("en-IN")} discount)
    </div>
  )}
</div>

          {totalReturned > 0 && (
            <>
              <div><strong>Returned:</strong></div>
              <div style={{ textAlign: "right", color: "#880e4f", fontWeight: "600" }}>
                ₹{totalReturned.toLocaleString("en-IN")}
              </div>
            </>
          )}

          <div><strong>Balance:</strong></div>
          <div style={{ textAlign: "right", color: balance > 0 ? "red" : "green" }}>
            ₹{balance.toLocaleString("en-IN")}
          </div>

          <div><strong>Payment Mode:</strong></div>
          <div style={{ textAlign: "right" }}>{data.invoice.payment_mode || "-"}</div>

          <div><strong>Status:</strong></div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                background: statusColor,
                color: "#fff",
                padding: "4px 10px",
                borderRadius: "12px",
                fontSize: "12px",
                textTransform: "capitalize",
              }}
            >
              {data.invoice.payment_status}
            </span>
          </div>
        </div>

        <h3 style={{ marginBottom: "10px" }}>Items</h3>
        <div style={{ borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>
          {data.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #f5f5f5",
              }}
            >
              <span>{item.name} × {item.quantity}</span>
              <span>₹{Number(item.price * item.quantity).toLocaleString("en-IN")}</span>
            </div>
          ))}
        </div>

        {data.returns?.length > 0 && (
          <>
            <h3 style={{ marginTop: "25px", marginBottom: "10px", color: "#880e4f" }}>
              ↩ Return History
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.returns.map((ret, ri) => {
                const retTotal = ret.items?.reduce((sum, item) => {
                  const qty = item.returnQty || item.return_qty || item.quantity || 0;
                  const price = item.price || item.rate || 0;
                  return sum + qty * price;
                }, 0) ?? ret.total ?? 0;

                return (
                  <div
                    key={ret.id || ri}
                    style={{
                      border: "1px solid #f48fb1",
                      borderRadius: "10px",
                      overflow: "hidden",
                      background: "#fff9fb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        background: "#fce4ec",
                        borderBottom: "1px solid #f48fb1",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            background: "#880e4f",
                            color: "#fff",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
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
                            <div
                              key={item.id || ii}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "6px 0",
                                borderBottom: ii < ret.items.length - 1 ? "1px solid #fce4ec" : "none",
                                fontSize: "13px",
                              }}
                            >
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

        <h3 style={{ marginTop: "25px" }}>Payment History</h3>
        <div style={{ marginTop: "10px" }}>
          {data.payments?.length === 0 && <p style={{ color: "#999" }}>No payments yet</p>}

          {data.payments?.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px",
                border: "1px solid #eee",
                borderRadius: "8px",
                marginBottom: "8px",
                background: "#fafafa",
              }}
            >
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "15px",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          <span>Net Total</span>
          <span>₹{Number(total - totalReturned).toLocaleString("en-IN")}</span>
        </div>

        <button
          onClick={() => setShowPaymentModal(true)}
          style={{
            marginTop: "15px",
            padding: "8px 12px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          + Add Payment
        </button>

        <button
          onClick={() => setShowPrint(true)}
          style={{
            marginTop: "15px",
            marginLeft: "10px",
            padding: "8px 12px",
            background: "#2e7d32",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🖨️ View Invoice
        </button>

        {(data.invoice.payment_status === "partial" || data.invoice.payment_status === "pending") && (
  <button
    onClick={() => setShowDeliveryCopy(true)}
    style={{
      marginTop: "15px",
      marginLeft: "10px",
      padding: "8px 12px",
      background: "#f57c00",
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    }}
  >
    📋 Delivery Copy
  </button>
)}

        {showPaymentModal && (
          <div
            onClick={() => setShowPaymentModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 2000,
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "420px",
                background: "#fff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Add Payment</h3>

              <div
                style={{
                  background: "#fce4ec",
                  color: "#880e4f",
                  padding: "14px",
                  borderRadius: "12px",
                  textAlign: "center",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontSize: "12px", marginBottom: "4px" }}>Outstanding Balance</div>
                <div style={{ fontSize: "24px", fontWeight: "700" }}>
                  ₹{balance.toLocaleString("en-IN")}
                </div>
              </div>

              <label>Amount</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                max={balance}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                  marginBottom: "12px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  boxSizing: "border-box",
                }}
              />

              <label>Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                  marginBottom: "12px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank">Bank Transfer</option>
              </select>

              <label>Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Advance payment"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                  marginBottom: "15px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    await window.api.addInvoicePayment({
                      invoice_id: data.invoice.id,
                      amount: Number(paymentAmount),
                      mode: paymentMode,
                      note,
                    });

                    setShowPaymentModal(false);
                    setPaymentAmount("");
                    setNote("");
                    loadDetails();
                  }}
                  disabled={!paymentAmount || Number(paymentAmount) <= 0}
                >
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TO PAY MODAL ── */}
{showRefundModal && (
  <div onClick={() => setShowRefundModal(false)} style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: "400px", background: "#fff", borderRadius: "16px",
      padding: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
    }}>
      <h3 style={{ margin: "0 0 6px 0" }}>💸 Pay Refund to Customer</h3>
      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#666" }}>
        Refund due: <strong>₹{refundInfo?.remainingRefund?.toLocaleString("en-IN")}</strong>
      </p>

      <label style={{ fontWeight: "600", fontSize: "13px" }}>Amount</label>
      <input type="number" value={refundAmount}
        onChange={e => setRefundAmount(e.target.value)}
        max={refundInfo?.remainingRefund}
        style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
      />

      <label style={{ fontWeight: "600", fontSize: "13px" }}>Payment Mode</label>
      <select value={refundMode} onChange={e => setRefundMode(e.target.value)}
        style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ddd" }}>
        <option value="cash">Cash</option>
        <option value="upi">UPI</option>
        <option value="bank">Bank Transfer</option>
      </select>

      <label style={{ fontWeight: "600", fontSize: "13px" }}>Note (optional)</label>
      <input type="text" value={refundNote}
        onChange={e => setRefundNote(e.target.value)}
        placeholder="e.g. Refund for returned goods"
        style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "16px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
      />

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => setShowRefundModal(false)}
          style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer" }}>
          Cancel
        </button>
        <button
          disabled={!refundAmount || Number(refundAmount) <= 0}
          onClick={async () => {
            await window.api.processReturnRefund({
              invoice_id: data.invoice.id,
              party_id: data.invoice.party_id,
              return_id: data.returns?.[0]?.id || null,
              amount: Number(refundAmount),
              mode: refundMode,
              note: refundNote,
            });
            setShowRefundModal(false);
            setRefundAmount("");
            setRefundNote("");
            loadDetails();
          }}
          style={{
            padding: "8px 16px", borderRadius: "6px", border: "none",
            background: "#e65100", color: "#fff", cursor: "pointer", fontWeight: "600"
          }}>
          Confirm Payment
        </button>
      </div>
    </div>
  </div>
)}

{/* ── CREDIT NOTE MODAL ── */}
{showCreditModal && (
  <div onClick={() => setShowCreditModal(false)} style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: "400px", background: "#fff", borderRadius: "16px",
      padding: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
    }}>
      <h3 style={{ margin: "0 0 6px 0" }}>🎫 Create Credit Note</h3>
      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#666" }}>
        Credit amount will be saved for <strong>{data.invoice.party_name}</strong> to redeem later.
      </p>

      <label style={{ fontWeight: "600", fontSize: "13px" }}>Credit Amount</label>
      <input type="number" value={creditAmount}
        onChange={e => setCreditAmount(e.target.value)}
        max={refundInfo?.remainingRefund}
        style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "16px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
      />

      <div style={{ background: "#e8f5e9", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "#2e7d32" }}>
        ✅ Customer can redeem this credit on any future purchase
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => setShowCreditModal(false)}
          style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer" }}>
          Cancel
        </button>
        <button
          disabled={!creditAmount || Number(creditAmount) <= 0}
          onClick={async () => {
            await window.api.createCreditNote({
              invoice_id: data.invoice.id,
              party_id: data.invoice.party_id,
              return_id: data.returns?.[0]?.id || null,
              amount: Number(creditAmount),
            });
            setShowCreditModal(false);
            setCreditAmount("");
            loadDetails();
          }}
          style={{
            padding: "8px 16px", borderRadius: "6px", border: "none",
            background: "#2e7d32", color: "#fff", cursor: "pointer", fontWeight: "600"
          }}>
          Create Credit Note
        </button>
      </div>
    </div>
  </div>
)}

{/* ── REDEEM CREDIT MODAL ── */}
{showRedeemModal && (
  <div onClick={() => setShowRedeemModal(false)} style={{
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: "400px", background: "#fff", borderRadius: "16px",
      padding: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
    }}>
      <h3 style={{ margin: "0 0 6px 0" }}>🎟 Redeem Credit Note</h3>
      <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#666" }}>
        Available credit: <strong>₹{refundInfo?.creditNote?.remaining?.toLocaleString("en-IN")}</strong>
      </p>

      <label style={{ fontWeight: "600", fontSize: "13px" }}>Redeem Amount</label>
      <input type="number" value={redeemAmount}
        onChange={e => setRedeemAmount(e.target.value)}
        max={refundInfo?.creditNote?.remaining}
        style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
      />

      <label style={{ fontWeight: "600", fontSize: "13px" }}>Note (optional)</label>
      <input type="text" value={redeemNote}
        onChange={e => setRedeemNote(e.target.value)}
        placeholder="e.g. Applied to new purchase"
        style={{ width: "100%", padding: "10px", marginTop: "5px", marginBottom: "16px", borderRadius: "6px", border: "1px solid #ddd", boxSizing: "border-box" }}
      />

      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={() => setShowRedeemModal(false)}
          style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer" }}>
          Cancel
        </button>
        <button
          disabled={!redeemAmount || Number(redeemAmount) <= 0}
          onClick={async () => {
            await window.api.redeemCreditNote({
              credit_note_id: refundInfo.creditNote.id,
              party_id: data.invoice.party_id,
              amount: Number(redeemAmount),
              note: redeemNote,
            });
            setShowRedeemModal(false);
            setRedeemAmount("");
            setRedeemNote("");
            loadDetails();
          }}
          style={{
            padding: "8px 16px", borderRadius: "6px", border: "none",
            background: "#1565c0", color: "#fff", cursor: "pointer", fontWeight: "600"
          }}>
          Redeem
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

export default InvoiceDetails;
