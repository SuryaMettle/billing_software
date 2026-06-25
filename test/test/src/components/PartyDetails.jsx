import { useEffect, useState } from "react";

import api from "../services/api.js";

// ── Bright theme tokens ──
const C = {
  bg: "#F3F5FF",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F9FE",
  border: "#E8EAF6",
  text: "#181B34",
  textMuted: "#6B7090",
  textFaint: "#9DA1C2",
  primary: "#5B5FEF",
  primaryDark: "#4347C4",
  primarySoft: "#ECECFD",
  mint: "#00C896",
  mintDark: "#00875A",
  mintSoft: "#E1FBF1",
  amber: "#FFB400",
  amberDark: "#B07800",
  amberSoft: "#FFF5DE",
  coral: "#FF5C5C",
  coralDark: "#D9342B",
  coralSoft: "#FFECEC",
};

const IconBase = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {children}
  </svg>
);
const IconTransactions = () => (
  <IconBase>
    <line x1="4" y1="20" x2="4" y2="12" />
    <line x1="10" y1="20" x2="10" y2="6" />
    <line x1="16" y1="20" x2="16" y2="14" />
    <line x1="20" y1="20" x2="20" y2="9" />
  </IconBase>
);
const IconProfile = () => (
  <IconBase>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
  </IconBase>
);
const IconStar = () => (
  <IconBase>
    <path d="M12 3.5l2.47 5.18 5.53.62-4.1 3.86 1.1 5.62L12 15.9l-4.99 2.88 1.1-5.62-4.1-3.86 5.53-.62L12 3.5z" strokeLinejoin="round" />
  </IconBase>
);
const IconTicket = () => (
  <IconBase>
    <path d="M4 8.3A1.3 1.3 0 0 1 5.3 7h13.4A1.3 1.3 0 0 1 20 8.3v1.9a1.7 1.7 0 0 0 0 3.6v1.9a1.3 1.3 0 0 1-1.3 1.3H5.3A1.3 1.3 0 0 1 4 15.7v-1.9a1.7 1.7 0 0 0 0-3.6V8.3z" />
    <line x1="13" y1="7.6" x2="13" y2="16.4" strokeDasharray="2.2 2.2" />
  </IconBase>
);

const PAGE_SIZE = 10;
const LOYALTY_PAGE_SIZE = 5;

const pill = (bg, color) => ({
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  background: bg,
  color,
  letterSpacing: "0.2px",
  whiteSpace: "nowrap",
});

const statusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "paid" || s === "completed") return pill(C.mintSoft, C.mintDark);
  if (s === "partial" || s === "pending") return pill(C.amberSoft, C.amberDark);
  if (s === "unpaid" || s === "overdue") return pill(C.coralSoft, C.coralDark);
  return pill("#EEF0F7", C.textMuted);
};

const balancePill = (balance) =>
  balance > 0 ? pill(C.coralSoft, C.coralDark) : pill(C.mintSoft, C.mintDark);

const getProfileBalanceStyle = (balance) =>
  balance > 0
    ? { color: "#FFD2C7", fontWeight: "800" }
    : { color: "#B9F9DE", fontWeight: "800" };

// Returns an array of page numbers / "…" gap markers for compact pagination
function getPageNumbers(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const withGaps = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) withGaps.push("…");
    withGaps.push(n);
  });
  return withGaps;
}

const GLOBAL_STYLE = `
  .pd-root * { box-sizing: border-box; }
  .pd-back-circle { transition: all 0.15s ease; }
  .pd-back-circle:hover { background: rgba(255,255,255,0.32) !important; transform: translateX(-2px); }
  .pd-tab-btn { transition: all 0.15s ease; }
  .pd-tab-btn:hover:not(.pd-tab-active) { background: ${C.surfaceAlt}; }
  .pd-row:hover { background: ${C.surfaceAlt}; }
  .pd-page-btn { transition: all 0.15s ease; }
  .pd-page-btn:hover:not(:disabled):not(.pd-page-active) { background: ${C.primarySoft}; border-color: ${C.primary}; }
  .pd-page-btn-loyalty:hover:not(:disabled):not(.pd-page-active) { background: ${C.amberSoft} !important; border-color: ${C.amberDark} !important; }
  .pd-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .pd-redeem-btn { transition: all 0.15s ease; }
  .pd-redeem-btn:hover { background: ${C.mintDark}; transform: translateY(-1px); }
  .pd-upload-label { transition: all 0.15s ease; }
`;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [loyaltyPage, setLoyaltyPage] = useState(1);

  useEffect(() => {
    loadPartyDetails();
  }, [partyId]);

  // Reset to page 1 whenever the underlying transaction set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions.length, partyId]);

  // Reset to page 1 whenever the underlying loyalty ledger changes
  useEffect(() => {
    setLoyaltyPage(1);
  }, [loyaltyLedger.length, partyId]);

  const loadPartyDetails = async () => {
    const data = await api.getPartyDetails(partyId);
    setParty(data.party);

    if (data.party.type === "supplier" &&
      (initialTab === "loyalty" || initialTab === "credits")) {
      setActiveTab("transactions");
    }

    setTransactions(data.transactions);
    const ledger = await api.getLoyaltyLedger(partyId);
    setLoyaltyLedger(ledger);
    const credits = await api.getPartyCreditNotes(partyId);
    setCreditNotes(credits || []);
  };

  const isCustomer = (p) =>
    p?.type?.trim() === "customer" || p?.type?.trim() === "both";

  if (!party) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: C.textMuted, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        Loading...
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pagedTransactions = transactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const loyaltyTotalPages = Math.max(1, Math.ceil(loyaltyLedger.length / LOYALTY_PAGE_SIZE));
  const pagedLoyalty = loyaltyLedger.slice(
    (loyaltyPage - 1) * LOYALTY_PAGE_SIZE,
    loyaltyPage * LOYALTY_PAGE_SIZE
  );
  const loyaltyPageNumbers = getPageNumbers(loyaltyPage, loyaltyTotalPages);

  const tabs = [
    { id: "transactions", label: "Transactions", Icon: IconTransactions, accent: C.primary, accentSoft: C.primarySoft },
    { id: "profile", label: "Profile", Icon: IconProfile, accent: C.primary, accentSoft: C.primarySoft },
    ...(isCustomer(party) ? [
      { id: "loyalty", label: "Loyalty Points", Icon: IconStar, accent: C.amberDark, accentSoft: C.amberSoft },
      { id: "credits", label: "Credit Notes", Icon: IconTicket, accent: C.mintDark, accentSoft: C.mintSoft, badge: creditNotes.length || null },
    ] : []),
  ];

  return (
    <div className="pd-root" style={{ background: C.bg, minHeight: "100vh", padding: "24px 28px", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: C.text }}>
      <style>{GLOBAL_STYLE}</style>

      {/* ── Hero header ── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(120deg, ${C.primaryDark} 0%, ${C.primary} 45%, #8B6CFF 100%)`,
        borderRadius: "22px", padding: "22px 28px",
        marginBottom: "22px", boxShadow: "0 16px 36px rgba(91,95,239,0.28)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "18px",
      }}>
        {/* decorative blur circles — signature element carried through the page */}
        <div style={{ position: "absolute", top: "-60px", right: "-40px", width: "180px", height: "180px", background: "rgba(255,255,255,0.10)", borderRadius: "50%", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", bottom: "-50px", left: "30%", width: "120px", height: "120px", background: "rgba(255,255,255,0.06)", borderRadius: "50%", filter: "blur(10px)" }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "18px" }}>
          <button
            onClick={onBack}
            className="pd-back-circle"
            aria-label="Back"
            style={{
              width: "38px", height: "38px", borderRadius: "50%", border: "none", cursor: "pointer",
              background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: "17px",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            ←
          </button>

          <div style={{
            width: "58px", height: "58px", borderRadius: "18px",
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "22px", fontWeight: 800, flexShrink: 0,
          }}>
            {party.name?.charAt(0)?.toUpperCase() || "P"}
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: "23px", fontWeight: 800, letterSpacing: "-0.3px", color: "#fff" }}>
              {party.name}
            </h2>
            <span style={{
              display: "inline-block", marginTop: "6px",
              padding: "3px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700,
              background: "rgba(255,255,255,0.18)", color: "#fff", letterSpacing: "0.2px",
            }}>
              {party.type || "Customer"}
            </span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div style={heroStat}>
            <div style={heroStatValue}>{transactions.length}</div>
            <div style={heroStatLabel}>Transactions</div>
          </div>
          {isCustomer(party) && (
            <div style={heroStat}>
              <div style={heroStatValue}>⭐ {party.loyalty_points || 0}</div>
              <div style={heroStatLabel}>Points</div>
            </div>
          )}
          <div style={{
            ...heroStat,
            background: (party.balance || 0) > 0 ? "rgba(255,92,92,0.24)" : "rgba(0,200,150,0.24)",
          }}>
            <div style={heroStatValue}>₹{Number(party.balance || 0).toLocaleString("en-IN")}</div>
            <div style={heroStatLabel}>Balance</div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: "inline-flex", gap: "4px", padding: "5px",
        background: C.surface, borderRadius: "14px", border: `1px solid ${C.border}`,
        marginBottom: "20px", flexWrap: "wrap",
      }}>
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pd-tab-btn${active ? " pd-tab-active" : ""}`}
              style={{
                padding: "9px 18px", borderRadius: "10px", border: "none", cursor: "pointer",
                background: active ? t.accentSoft : "transparent",
                color: active ? t.accent : C.textMuted,
                fontWeight: 700, fontSize: "13.5px",
                display: "flex", alignItems: "center", gap: "7px", position: "relative",
              }}
            >
              <t.Icon />{t.label}
              {!!t.badge && (
                <span style={{
                  background: C.coral, color: "#fff", borderRadius: "999px",
                  minWidth: "18px", height: "18px", padding: "0 5px",
                  fontSize: "11px", fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Transactions tab ── */}
      {activeTab === "transactions" && (
        <div style={{ background: C.surface, borderRadius: "18px", border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(91,95,239,0.06)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.primarySoft }}>
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
                    <td colSpan="7" style={{ ...td, textAlign: "center", color: C.textFaint, padding: "32px" }}>
                      No transactions found
                    </td>
                  </tr>
                )}
                {pagedTransactions.map((t, i) => {
                  const balance = Number(t.total || 0) - Number(t.paid_amount || 0);
                  return (
                    <tr key={i} className="pd-row">
                      <td style={td}>{new Date(t.created_at + " UTC").toLocaleString()}</td>
                      <td style={td}>{t.type}</td>
                      <td style={{ ...td, fontWeight: 600 }}>#{t.id}</td>
                      <td style={td}>₹{Number(t.total || 0).toLocaleString("en-IN")}</td>
                      <td style={td}>₹{Number(t.paid_amount || 0).toLocaleString("en-IN")}</td>
                      <td style={td}><span style={balancePill(balance)}>₹{balance.toLocaleString("en-IN")}</span></td>
                      <td style={td}><span style={statusBadge(t.payment_status)}>{t.payment_status || "-"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {transactions.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: "12px", padding: "14px 20px",
              borderTop: `1px solid ${C.border}`, background: C.surfaceAlt,
            }}>
              <span style={{ fontSize: "13px", color: C.textMuted, fontWeight: 600 }}>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, transactions.length)} of {transactions.length}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  className="pd-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={pageBtnStyle(false)}
                >
                  ‹ Prev
                </button>
                {pageNumbers.map((n, i) =>
                  n === "…" ? (
                    <span key={`gap-${i}`} style={{ padding: "0 4px", color: C.textFaint, fontSize: "13px" }}>…</span>
                  ) : (
                    <button
                      key={n}
                      className={`pd-page-btn${n === currentPage ? " pd-page-active" : ""}`}
                      onClick={() => setCurrentPage(n)}
                      style={pageBtnStyle(n === currentPage)}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  className="pd-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={pageBtnStyle(false)}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Profile tab ── */}
      {activeTab === "profile" && (
        <div style={{
          background: `linear-gradient(135deg, ${C.primary} 0%, #7B61FF 55%, #9B6BFF 100%)`,
          padding: "30px", borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(91,95,239,0.25)",
          maxWidth: "700px", color: "#fff",
          position: "relative", overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", top: "-50px", right: "-50px",
            width: "100px", height: "100px",
            background: "rgba(255,255,255,0.12)", borderRadius: "50%", filter: "blur(20px)"
          }} />
          <div style={{
            position: "absolute", bottom: "-30px", left: "-30px",
            width: "80px", height: "80px",
            background: "rgba(255,255,255,0.06)", borderRadius: "50%", filter: "blur(15px)"
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
                  <span style={getProfileBalanceStyle(party.balance || 0)}>₹{party.balance || 0}</span>
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
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#A7FFE8", marginBottom: "5px" }}>
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
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#FFE08A", marginBottom: "5px" }}>
                    ⭐ {party.loyalty_points || 0}
                  </div>
                  <div style={{ fontSize: "14px", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Loyalty Points
                  </div>
                </div>
              )}
            </div>

            {/* Company Logo — shown on B2B invoices */}
            <div style={{
              background: "rgba(255,255,255,0.15)", padding: "16px", borderRadius: "16px",
              backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)",
              marginBottom: "20px"
            }}>
              <div style={{ fontWeight: "600", fontSize: "14px", marginBottom: "10px" }}>
                🏢 Company Logo <span style={{ fontWeight: "400", opacity: 0.7, fontSize: "12px" }}>(shown on B2B invoices when GSTIN is present)</span>
              </div>
              {party.logo && (
                <img src={party.logo} alt="Logo"
                  style={{ maxHeight: "56px", maxWidth: "150px", objectFit: "contain",
                    background: "#fff", borderRadius: "8px", padding: "6px",
                    marginBottom: "10px", display: "block" }}
                />
              )}
              <input type="file" accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const img = new Image();
                    img.onload = async () => {
                      const canvas = document.createElement("canvas");
                      const MAX = 300;
                      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
                      canvas.width = img.width * scale;
                      canvas.height = img.height * scale;
                      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                      const base64 = canvas.toDataURL("image/png");
                      await api.updateParty({ ...party, logo: base64 });
                      loadPartyDetails();
                    };
                    img.src = ev.target.result;
                  };
                  reader.readAsDataURL(file);
                }}
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", cursor: "pointer" }}
              />
              {party.logo && (
                <button onClick={async () => {
                  await api.updateParty({ ...party, logo: "" });
                  loadPartyDetails();
                }} style={{
                  marginTop: "8px", padding: "3px 12px", borderRadius: "6px",
                  border: "none", background: "rgba(255,80,80,0.35)", color: "#fff",
                  cursor: "pointer", fontSize: "12px", display: "block"
                }}>
                  Remove Logo
                </button>
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

      {/* ── Loyalty tab ── */}
      {activeTab === "loyalty" && isCustomer(party) && (
        <div>
          <div style={{
            background: C.amberSoft, border: `1px solid #FFE2A3`,
            borderRadius: "16px", padding: "18px 22px", marginBottom: "20px",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px",
          }}>
            <div>
              <div style={{ fontWeight: "800", fontSize: "19px", color: C.amberDark }}>
                ⭐ {party.loyalty_points || 0} Points Available
              </div>
              <div style={{ fontSize: "13px", color: C.textMuted, marginTop: "4px" }}>
                Full history of earned and redeemed points
              </div>
            </div>
          </div>

          <div style={{ background: C.surface, borderRadius: "18px", border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(91,95,239,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.amberSoft }}>
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
                    <td colSpan="5" style={{ ...td, textAlign: "center", color: C.textFaint, padding: "32px" }}>
                      No loyalty activity yet
                    </td>
                  </tr>
                )}
                {pagedLoyalty.map((entry, i) => (
                  <tr key={i} className="pd-row">
                    <td style={td}>{new Date(entry.created_at).toLocaleString()}</td>
                    <td style={td}>
                      <span style={entry.type === "earned" ? pill(C.mintSoft, C.mintDark) : pill(C.amberSoft, C.amberDark)}>
                        {entry.type === "earned" ? "✅ Earned" : "🔁 Redeemed"}
                      </span>
                    </td>
                    <td style={td}>#{entry.invoice_id}</td>
                    <td style={td}>₹{Number(entry.invoice_total || 0).toLocaleString("en-IN")}</td>
                    <td style={{ ...td, fontWeight: "800", color: entry.type === "earned" ? C.mintDark : C.amberDark }}>
                      {entry.type === "earned" ? "+" : ""}{entry.points_change} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loyaltyLedger.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: "12px", padding: "14px 20px",
                borderTop: `1px solid ${C.border}`, background: C.surfaceAlt,
              }}>
                <span style={{ fontSize: "13px", color: C.textMuted, fontWeight: 600 }}>
                  Showing {(loyaltyPage - 1) * LOYALTY_PAGE_SIZE + 1}–{Math.min(loyaltyPage * LOYALTY_PAGE_SIZE, loyaltyLedger.length)} of {loyaltyLedger.length}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    className="pd-page-btn pd-page-btn-loyalty"
                    disabled={loyaltyPage === 1}
                    onClick={() => setLoyaltyPage((p) => Math.max(1, p - 1))}
                    style={pageBtnStyle(false, C.amberDark)}
                  >
                    ‹ Prev
                  </button>
                  {loyaltyPageNumbers.map((n, i) =>
                    n === "…" ? (
                      <span key={`lgap-${i}`} style={{ padding: "0 4px", color: C.textFaint, fontSize: "13px" }}>…</span>
                    ) : (
                      <button
                        key={n}
                        className={`pd-page-btn pd-page-btn-loyalty${n === loyaltyPage ? " pd-page-active" : ""}`}
                        onClick={() => setLoyaltyPage(n)}
                        style={pageBtnStyle(n === loyaltyPage, C.amberDark)}
                      >
                        {n}
                      </button>
                    )
                  )}
                  <button
                    className="pd-page-btn pd-page-btn-loyalty"
                    disabled={loyaltyPage === loyaltyTotalPages}
                    onClick={() => setLoyaltyPage((p) => Math.min(loyaltyTotalPages, p + 1))}
                    style={pageBtnStyle(false, C.amberDark)}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── Credits tab ── */}
      {activeTab === "credits" && isCustomer(party) && (
        <div>
          <div style={{
            background: C.mintSoft, border: `1px solid #A9F0D8`,
            borderRadius: "16px", padding: "18px 22px", marginBottom: "20px",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px",
          }}>
            <div>
              <div style={{ fontWeight: "800", fontSize: "19px", color: C.mintDark }}>
                🎫 Total Credit Available: ₹{creditNotes.reduce((s, c) => s + Number(c.remaining || 0), 0).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "13px", color: C.textMuted, marginTop: "4px" }}>
                Customer can redeem these credits on future purchases
              </div>
            </div>
          </div>

          {creditNotes.length === 0 ? (
            <div style={{ textAlign: "center", color: C.textFaint, padding: "40px", background: C.surface, borderRadius: "16px", border: `1px solid ${C.border}` }}>
              No active credit notes for this party
            </div>
          ) : (
            creditNotes.map((cn) => (
              <div key={cn.id} style={{
                border: `1px solid ${C.border}`, borderRadius: "16px",
                padding: "18px 22px", marginBottom: "12px",
                background: C.surface, display: "flex",
                justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px",
                boxShadow: "0 2px 10px rgba(91,95,239,0.05)",
              }}>
                <div>
                  <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>
                    Credit Note #{cn.id}
                  </div>
                  <div style={{ fontSize: "13px", color: C.textMuted }}>
                    Invoice #{cn.invoice_id} • Created {new Date(cn.created_at).toLocaleDateString("en-IN")}
                  </div>
                  <div style={{ fontSize: "13px", color: C.textFaint, marginTop: "4px" }}>
                    Original: ₹{Number(cn.amount).toLocaleString("en-IN")} •
                    Redeemed: ₹{Number(cn.redeemed || 0).toLocaleString("en-IN")} •
                    <span style={{ color: C.mintDark, fontWeight: "700" }}>
                      {" "}Remaining: ₹{Number(cn.remaining).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <button
                  className="pd-redeem-btn"
                  onClick={() => {
                    setSelectedCredit(cn);
                    setRedeemAmount(cn.remaining.toString());
                    setShowRedeemModal(true);
                  }}
                  style={{
                    padding: "9px 18px", borderRadius: "10px", border: "none",
                    background: C.mint, color: "#fff", cursor: "pointer",
                    fontWeight: "700", fontSize: "13px",
                  }}
                >
                  Redeem
                </button>
              </div>
            ))
          )}

          {showRedeemModal && selectedCredit && (
            <div onClick={() => setShowRedeemModal(false)} style={{
              position: "fixed", inset: 0, background: "rgba(24,27,52,0.45)",
              display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                width: "400px", background: C.surface, borderRadius: "20px",
                padding: "26px", boxShadow: "0 25px 60px rgba(24,27,52,0.3)"
              }}>
                <h3 style={{ margin: "0 0 6px 0", color: C.text }}>🎟 Redeem Credit Note</h3>
                <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: C.textMuted }}>
                  Available: <strong style={{ color: C.mintDark }}>₹{Number(selectedCredit.remaining).toLocaleString("en-IN")}</strong>
                </p>

                <label style={{ fontWeight: "700", fontSize: "13px", color: C.text }}>Redeem Amount</label>
                <input type="number" value={redeemAmount}
                  onChange={e => setRedeemAmount(e.target.value)}
                  max={selectedCredit.remaining}
                  style={{ width: "100%", padding: "10px 12px", marginTop: "5px", marginBottom: "14px", borderRadius: "10px", border: `1px solid ${C.border}`, boxSizing: "border-box", fontSize: "14px" }}
                />

                <label style={{ fontWeight: "700", fontSize: "13px", color: C.text }}>Note (optional)</label>
                <input type="text" value={redeemNote}
                  onChange={e => setRedeemNote(e.target.value)}
                  placeholder="e.g. Applied to new purchase"
                  style={{ width: "100%", padding: "10px 12px", marginTop: "5px", marginBottom: "18px", borderRadius: "10px", border: `1px solid ${C.border}`, boxSizing: "border-box", fontSize: "14px" }}
                />

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button onClick={() => setShowRedeemModal(false)}
                    style={{ padding: "9px 18px", borderRadius: "10px", border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.textMuted, cursor: "pointer", fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button
                    disabled={!redeemAmount || Number(redeemAmount) <= 0}
                    className="pd-redeem-btn"
                    onClick={async () => {
                      await api.redeemCreditNote({
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
                      padding: "9px 18px", borderRadius: "10px", border: "none",
                      background: C.mint, color: "#fff", cursor: "pointer", fontWeight: "700",
                      opacity: (!redeemAmount || Number(redeemAmount) <= 0) ? 0.5 : 1,
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

const th = { padding: "13px 16px", textAlign: "left", fontSize: "12px", fontWeight: 800, color: C.primaryDark, textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: `1px solid ${C.border}` };
const td = { padding: "13px 16px", fontSize: "13.5px", borderBottom: `1px solid ${C.border}`, color: C.text };

const pageBtnStyle = (active, accent = C.primary) => ({
  minWidth: "32px", height: "32px", padding: "0 8px",
  borderRadius: "8px", border: `1px solid ${active ? accent : C.border}`,
  background: active ? accent : C.surface,
  color: active ? "#fff" : C.textMuted,
  fontWeight: 700, fontSize: "13px", cursor: "pointer",
});

const heroStat = {
  background: "rgba(255,255,255,0.16)", backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.22)", borderRadius: "14px",
  padding: "10px 18px", textAlign: "center", minWidth: "92px",
};
const heroStatValue = { color: "#fff", fontSize: "18px", fontWeight: 800 };
const heroStatLabel = { color: "rgba(255,255,255,0.85)", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginTop: "2px" };

export default PartyDetails;