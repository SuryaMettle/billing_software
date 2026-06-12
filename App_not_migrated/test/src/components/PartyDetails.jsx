import { useEffect, useState } from "react";

function PartyDetails({ partyId, onBack, initialTab = "transactions" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [party, setParty] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loyaltyLedger, setLoyaltyLedger] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemNote, setRedeemNote] = useState("");

  useEffect(() => {
    loadPartyDetails();
  }, [partyId]);

  const loadPartyDetails = async () => {
    const data = await window.api.getPartyDetails(partyId);
    setParty(data.party);

    if (data.party.type === "supplier" &&
      (initialTab === "loyalty" || initialTab === "credits")) {
      setActiveTab("transactions");
    }

    setTransactions(data.transactions);
    const ledger = await window.api.getLoyaltyLedger(partyId);
    setLoyaltyLedger(ledger);
    const credits = await window.api.getPartyCreditNotes(partyId);
    setCreditNotes(credits || []);
  };

  const isCustomer = (p) =>
    p?.type?.trim() === "customer" || p?.type?.trim() === "both";

  const getBalanceStyle = (balance) => {
    if (balance > 0) return { color: "#d32f2f", fontWeight: "bold" };
    return { color: "#4caf50", fontWeight: "bold" };
  };

  if (!party) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <button onClick={onBack}>← Back</button>

      <h2 style={{ marginTop: "15px" }}>{party.name}</h2>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("transactions")}
          style={{
            padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer",
            background: activeTab === "transactions" ? "#1976d2" : "#eee",
            color: activeTab === "transactions" ? "#fff" : "#333"
          }}
        >
          Transactions
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          style={{
            padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer",
            background: activeTab === "profile" ? "#1976d2" : "#eee",
            color: activeTab === "profile" ? "#fff" : "#333"
          }}
        >
          Profile
        </button>

        {isCustomer(party) && (
          <button
            onClick={() => setActiveTab("loyalty")}
            style={{
              padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer",
              background: activeTab === "loyalty" ? "#f57f17" : "#eee",
              color: activeTab === "loyalty" ? "#fff" : "#333"
            }}
          >
            ⭐ Loyalty Points
          </button>
        )}

        {isCustomer(party) && (
          <button
            onClick={() => setActiveTab("credits")}
            style={{
              padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer",
              background: activeTab === "credits" ? "#2e7d32" : "#eee",
              color: activeTab === "credits" ? "#fff" : "#333",
              position: "relative"
            }}
          >
            🎫 Credit Notes
            {creditNotes.length > 0 && (
              <span style={{
                position: "absolute", top: "-6px", right: "-6px",
                background: "#d32f2f", color: "#fff",
                borderRadius: "50%", width: "18px", height: "18px",
                fontSize: "11px", fontWeight: "700",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {creditNotes.length}
              </span>
            )}
          </button>
        )}
      </div>

      {activeTab === "transactions" && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={th}>Date</th>
              <th style={th}>Type</th>
              <th style={th}>Ref No</th>
              <th style={th}>Total</th>
              <th style={th}>Paid</th>
              <th style={th}>Balance</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan="7" style={{ ...td, textAlign: "center", color: "#999" }}>
                  No transactions found
                </td>
              </tr>
            )}
            {transactions.map((t, i) => (
              <tr key={i}>
                <td style={td}>{new Date(t.created_at + " UTC").toLocaleString()}</td>
                <td style={td}>{t.type}</td>
                <td style={td}>#{t.id}</td>
                <td style={td}>₹{t.total}</td>
                <td style={td}>₹{t.paid_amount || 0}</td>
                <td style={td}>
                  <span style={getBalanceStyle(Number(t.total || 0) - Number(t.paid_amount || 0))}>
                    ₹{Number(t.total || 0) - Number(t.paid_amount || 0)}
                  </span>
                </td>
                <td style={td}>{t.payment_status || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeTab === "profile" && (
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "30px", borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          maxWidth: "700px", color: "#fff",
          position: "relative", overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", top: "-50px", right: "-50px",
            width: "100px", height: "100px",
            background: "rgba(255,255,255,0.1)", borderRadius: "50%", filter: "blur(20px)"
          }} />
          <div style={{
            position: "absolute", bottom: "-30px", left: "-30px",
            width: "80px", height: "80px",
            background: "rgba(255,255,255,0.05)", borderRadius: "50%", filter: "blur(15px)"
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "30px" }}>
              <div style={{
                width: "70px", height: "70px",
                background: "rgba(255,255,255,0.2)", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", fontWeight: "bold", backdropFilter: "blur(10px)"
              }}>
                {party.name?.charAt(0)?.toUpperCase() || "P"}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>
                  {party.name}
                </h2>
                <p style={{ margin: "5px 0 0 0", opacity: 0.9, fontSize: "16px" }}>
                  {party.type || "Customer"}
                </p>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px", marginBottom: "30px"
            }}>
              <div style={{
                background: "rgba(255,255,255,0.15)", padding: "20px", borderRadius: "16px",
                backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)",
                textAlign: "center", cursor: "pointer", transition: "all 0.3s ease"
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
              >
                <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "5px" }}>
                  <span style={getBalanceStyle(party.balance || 0)}>₹{party.balance || 0}</span>
                </div>
                <div style={{ fontSize: "14px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Balance
                </div>
              </div>

              <div style={{
                background: "rgba(255,255,255,0.15)", padding: "20px", borderRadius: "16px",
                backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)",
                textAlign: "center", cursor: "pointer", transition: "all 0.3s ease"
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
              >
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#4ade80", marginBottom: "5px" }}>
                  {transactions.length}
                </div>
                <div style={{ fontSize: "14px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Transactions
                </div>
              </div>

              {isCustomer(party) && (
                <div style={{
                  background: "rgba(255,255,255,0.15)", padding: "20px", borderRadius: "16px",
                  backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#ffd54f", marginBottom: "5px" }}>
                    ⭐ {party.loyalty_points || 0}
                  </div>
                  <div style={{ fontSize: "14px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Loyalty Points
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
              <div>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600", opacity: 0.95 }}>
                  Contact Info
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
                  <div style={{
                    width: "40px", height: "40px",
                    background: "rgba(255,255,255,0.2)", borderRadius: "12px",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px"
                  }}>📱</div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "500" }}>Phone</div>
                    <div style={{ fontSize: "16px", marginTop: "2px" }}>{party.phone || "-"}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600", opacity: 0.95 }}>
                  Address
                </h3>
                <div style={{ lineHeight: "1.6" }}>
                  <div style={{ fontSize: "15px", marginBottom: "8px" }}>{party.address || "-"}</div>
                  <div style={{ fontSize: "15px", marginBottom: "8px" }}>
                    {party.city || "-"}, {party.state || "-"} {party.pincode || ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "loyalty" && isCustomer(party) && (
        <div>
          <div style={{
            background: "#fffde7", border: "1px solid #ffd54f",
            borderRadius: "10px", padding: "16px 20px", marginBottom: "20px",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <div style={{ fontWeight: "700", fontSize: "18px", color: "#f57f17" }}>
                ⭐ {party.loyalty_points || 0} Points Available
              </div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
                Full history of earned and redeemed points
              </div>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={th}>Date</th>
                <th style={th}>Type</th>
                <th style={th}>Invoice #</th>
                <th style={th}>Invoice Total</th>
                <th style={th}>Points</th>
              </tr>
            </thead>
            <tbody>
              {loyaltyLedger.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ ...td, textAlign: "center", color: "#999" }}>
                    No loyalty activity yet
                  </td>
                </tr>
              )}
              {loyaltyLedger.map((entry, i) => (
                <tr key={i}>
                  <td style={td}>{new Date(entry.created_at).toLocaleString()}</td>
                  <td style={td}>
                    <span style={{
                      padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "600",
                      background: entry.type === "earned" ? "#e8f5e9" : "#fff3e0",
                      color: entry.type === "earned" ? "#2e7d32" : "#e65100"
                    }}>
                      {entry.type === "earned" ? "✅ Earned" : "🔁 Redeemed"}
                    </span>
                  </td>
                  <td style={td}>#{entry.invoice_id}</td>
                  <td style={td}>₹{Number(entry.invoice_total || 0).toLocaleString("en-IN")}</td>
                  <td style={{ ...td, fontWeight: "700", color: entry.type === "earned" ? "#2e7d32" : "#e65100" }}>
                    {entry.type === "earned" ? "+" : ""}{entry.points_change} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "credits" && isCustomer(party) && (
        <div>
          <div style={{
            background: "#e8f5e9", border: "1px solid #a5d6a7",
            borderRadius: "10px", padding: "16px 20px", marginBottom: "20px",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <div style={{ fontWeight: "700", fontSize: "18px", color: "#2e7d32" }}>
                🎫 Total Credit Available: ₹{creditNotes.reduce((s, c) => s + Number(c.remaining || 0), 0).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
                Customer can redeem these credits on future purchases
              </div>
            </div>
          </div>

          {creditNotes.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: "40px" }}>
              No active credit notes for this party
            </div>
          ) : (
            creditNotes.map((cn) => (
              <div key={cn.id} style={{
                border: "1px solid #a5d6a7", borderRadius: "12px",
                padding: "16px 20px", marginBottom: "12px",
                background: "#fff", display: "flex",
                justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "4px" }}>
                    Credit Note #{cn.id}
                  </div>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    Invoice #{cn.invoice_id} • Created {new Date(cn.created_at).toLocaleDateString("en-IN")}
                  </div>
                  <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
                    Original: ₹{Number(cn.amount).toLocaleString("en-IN")} •
                    Redeemed: ₹{Number(cn.redeemed || 0).toLocaleString("en-IN")} •
                    <span style={{ color: "#2e7d32", fontWeight: "600" }}>
                      {" "}Remaining: ₹{Number(cn.remaining).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCredit(cn);
                    setRedeemAmount(cn.remaining.toString());
                    setShowRedeemModal(true);
                  }}
                  style={{
                    padding: "8px 16px", borderRadius: "8px", border: "none",
                    background: "#2e7d32", color: "#fff", cursor: "pointer",
                    fontWeight: "600", fontSize: "13px"
                  }}
                >
                  Redeem
                </button>
              </div>
            ))
          )}

          {showRedeemModal && selectedCredit && (
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
                  Available: <strong>₹{Number(selectedCredit.remaining).toLocaleString("en-IN")}</strong>
                </p>

                <label style={{ fontWeight: "600", fontSize: "13px" }}>Redeem Amount</label>
                <input type="number" value={redeemAmount}
                  onChange={e => setRedeemAmount(e.target.value)}
                  max={selectedCredit.remaining}
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
                        credit_note_id: selectedCredit.id,
                        party_id: partyId,
                        amount: Number(redeemAmount),
                        note: redeemNote,
                      });
                      setShowRedeemModal(false);
                      setRedeemAmount("");
                      setRedeemNote("");
                      setSelectedCredit(null);
                      loadPartyDetails();
                    }}
                    style={{
                      padding: "8px 16px", borderRadius: "6px", border: "none",
                      background: "#2e7d32", color: "#fff", cursor: "pointer", fontWeight: "600"
                    }}>
                    Confirm Redeem
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const th = { padding: "10px", border: "1px solid #ddd", textAlign: "left" };
const td = { padding: "10px", border: "1px solid #eee" };

export default PartyDetails;