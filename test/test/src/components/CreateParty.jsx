import { useState, useEffect } from "react";
import api from "../services/api.js";

// ─── THEME ────────────────────────────────────────────────────────────────────
const t = {
  bg:               "#F0F2FF",
  cardBg:           "#FFFFFF",
  surfaceBase:      "#FAFBFF",
  surfaceRaised:    "#F4F5F9",

  textPrimary:      "#1C1E2E",
  textSecondary:    "#5A5D74",
  textMuted:        "#9496A8",

  border:           "#E4E6F0",
  borderFocus:      "#7C9CF6",

  accent:           "#7C9CF6",
  accentDeep:       "#5B7EE5",
  accentGradient:   "linear-gradient(135deg, #7C9CF6 0%, #B8A8FB 100%)",
  accentGlow:       "0 4px 18px rgba(124,156,246,0.30)",

  success:          "#059669",
  successBg:        "#ECFDF5",
  successBorder:    "#A7F3D0",

  danger:           "#DC2626",
  dangerBg:         "#FEF2F2",
  dangerBorder:     "#FECACA",

  sectionColors: {
    basic:    { bg: "#EEF2FF", border: "#C7D2FE", icon: "#6366F1", text: "#3730A3" },
    tax:      { bg: "#F0FDF4", border: "#BBF7D0", icon: "#059669", text: "#065F46" },
    balance:  { bg: "#FFFBEB", border: "#FDE68A", icon: "#D97706", text: "#92400E" },
    address:  { bg: "#FDF4FF", border: "#E9D5FF", icon: "#9333EA", text: "#581C87" },
  },
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const inputStyle = {
  background: t.surfaceBase,
  border: `1.5px solid ${t.border}`,
  borderRadius: "10px",
  padding: "10px 14px",
  fontSize: "14px",
  color: t.textPrimary,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.18s, box-shadow 0.18s",
  fontFamily: "inherit",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  paddingRight: "32px",
  cursor: "pointer",
};

const fieldLabel = {
  display: "block",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: t.textSecondary,
  marginBottom: "7px",
};

const modalOverlay = {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  background: "rgba(15,17,40,0.45)",
  backdropFilter: "blur(6px)",
  display: "flex", justifyContent: "center", alignItems: "center",
  zIndex: 2000,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function FocusInput({ style, ...props }) {
  return (
    <input
      {...props}
      style={style || inputStyle}
      onFocus={(e) => {
        e.target.style.borderColor = t.borderFocus;
        e.target.style.boxShadow = "0 0 0 3px rgba(124,156,246,0.15)";
        e.target.style.background = "#fff";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = t.border;
        e.target.style.boxShadow = "none";
        e.target.style.background = t.surfaceBase;
      }}
    />
  );
}

function SelectWithArrow({ value, onChange, children }) {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <select
        value={value}
        onChange={onChange}
        style={selectStyle}
        onFocus={(e) => { e.target.style.borderColor = t.borderFocus; e.target.style.boxShadow = "0 0 0 3px rgba(124,156,246,0.15)"; }}
        onBlur={(e) => { e.target.style.borderColor = t.border; e.target.style.boxShadow = "none"; }}
      >
        {children}
      </select>
      <span style={{
        position: "absolute", right: "12px", top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none",
        color: t.textMuted, fontSize: "10px",
      }}>▼</span>
    </div>
  );
}

function SectionBlock({ color, icon, title, children }) {
  const c = t.sectionColors[color] || t.sectionColors.basic;
  return (
    <div style={{
      background: c.bg,
      border: `1.5px solid ${c.border}`,
      borderRadius: "16px",
      padding: "20px 22px",
      marginBottom: "18px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        marginBottom: "18px",
        paddingBottom: "14px",
        borderBottom: `1px solid ${c.border}`,
      }}>
        <div style={{
          width: "30px", height: "30px", borderRadius: "8px",
          background: "#fff", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "15px",
          boxShadow: `0 2px 8px ${c.border}`,
        }}>{icon}</div>
        <span style={{ fontSize: "13px", fontWeight: "800", color: c.text, letterSpacing: "0.4px", textTransform: "uppercase" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function AddressClickBox({ label, text, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: "100%", minHeight: "64px",
        border: `1.5px dashed ${disabled ? t.border : t.borderFocus}`,
        borderRadius: "10px", padding: "13px 16px",
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? t.surfaceRaised : "#fff",
        color: text ? t.textPrimary : t.textMuted,
        fontSize: "13px",
        transition: "all 0.18s",
        boxSizing: "border-box",
        opacity: disabled ? 0.55 : 1,
        display: "flex", alignItems: "center", gap: "10px",
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "#F0F4FF"; e.currentTarget.style.borderColor = t.accent; } }}
      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = t.borderFocus; } }}
    >
      <span style={{ fontSize: "18px" }}>{text ? "📍" : "➕"}</span>
      <span>{text || label}</span>
    </div>
  );
}

function AddressModal({ title, fields, onClose, form, handleChange }) {
  const indianStates = [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
    "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
    "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
    "Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
    "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
    "Uttar Pradesh","Uttarakhand","West Bengal",
    "Andaman and Nicobar Islands","Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
  ];

  return (
    <div onClick={onClose} style={modalOverlay}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "28px 28px 24px",
          width: "440px",
          boxShadow: "0 24px 64px rgba(15,17,40,0.22)",
          border: `1.5px solid ${t.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "9px",
            background: t.sectionColors.address.bg,
            border: `1px solid ${t.sectionColors.address.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
          }}>📍</div>
          <span style={{ fontSize: "15px", fontWeight: "800", color: t.textPrimary }}>{title}</span>
        </div>

        {fields.map(({ label, field, placeholder, type: ftype, inputMode, maxLen }) => (
          <div key={field} style={{ marginBottom: "14px" }}>
            <label style={fieldLabel}>{label}</label>
            {ftype === "select" ? (
              <SelectWithArrow
                value={form[field]}
                onChange={(e) => handleChange(field, e.target.value)}
              >
                <option value="">Select State</option>
                {indianStates.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </SelectWithArrow>
            ) : (
              <FocusInput
                placeholder={placeholder}
                value={form[field]}
                inputMode={inputMode}
                onChange={(e) => {
                  let v = e.target.value;
                  if (inputMode === "numeric") v = v.replace(/\D/g, "");
                  if (maxLen && v.length > maxLen) return;
                  handleChange(field, v);
                }}
              />
            )}
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px", borderRadius: "10px",
              border: `1.5px solid ${t.border}`,
              background: t.surfaceRaised, color: t.textSecondary,
              fontSize: "13px", fontWeight: "600", cursor: "pointer",
            }}
          >Cancel</button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 22px", borderRadius: "10px",
              background: t.accentGradient, color: "#fff",
              border: "none", fontSize: "13px", fontWeight: "700",
              cursor: "pointer", boxShadow: t.accentGlow,
            }}
          >Save Address</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function CreateParty({ onBack, editingParty }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", type: "customer",
    address: "", city: "", state: "", pincode: "",
    shippingAddress: "", shippingCity: "", shippingState: "", shippingPincode: "",
    openingBalance: "", balanceType: "collect", gstin: "", pan: "",
  });

  const [showAddressModal, setShowAddressModal]   = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [sameAsBilling, setSameAsBilling]         = useState(false);
  const [toast, setToast]                         = useState(null);
  const [showExitConfirm, setShowExitConfirm]     = useState(false);

  const indianStates = [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
    "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
    "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
    "Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
    "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
    "Uttar Pradesh","Uttarakhand","West Bengal",
    "Andaman and Nicobar Islands","Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
  ];

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    try {
      if (!form.name || !form.phone) { showToast("Name & Phone required", "error"); return; }
      if (form.phone.length !== 10)  { showToast("Phone must be 10 digits", "error"); return; }

      let balance = Number(form.openingBalance || 0);
      if (form.balanceType === "pay") balance = -balance;

      if (editingParty) {
        await api.updateParty({
          id: editingParty.id, name: form.name, phone: form.phone,
          email: form.email, type: form.type, address: form.address,
          city: form.city, state: form.state, pincode: form.pincode,
          gstin: form.gstin,
          shipping_address: sameAsBilling ? form.address : form.shippingAddress,
          shipping_city:    sameAsBilling ? form.city    : form.shippingCity,
          shipping_state:   sameAsBilling ? form.state   : form.shippingState,
          shipping_pincode: sameAsBilling ? form.pincode : form.shippingPincode,
          balance,
        });
        showToast("Party updated ✅");
      } else {
        await api.createParty({
          name: form.name, phone: form.phone, type: form.type,
          address: form.address, city: form.city, state: form.state,
          pincode: form.pincode, gstin: form.gstin,
          shipping_address: sameAsBilling ? form.address : form.shippingAddress,
          shipping_city:    sameAsBilling ? form.city    : form.shippingCity,
          shipping_state:   sameAsBilling ? form.state   : form.shippingState,
          shipping_pincode: sameAsBilling ? form.pincode : form.shippingPincode,
          balance,
        });
        showToast("Party created ✅");
      }

      setSameAsBilling(false);
      setShowAddressModal(false);
      setShowShippingModal(false);
      setTimeout(() => onBack(), 800);
    } catch (err) {
      console.error(err);
      showToast("Something went wrong", "error");
    }
  };

  const handleSaveAndNew = async () => {
    try {
      if (editingParty) { showToast("Cannot use Save & New while editing", "error"); return; }
      if (!form.name || !form.phone) { showToast("Name & Phone required", "error"); return; }
      if (form.phone.length !== 10)  { showToast("Phone must be 10 digits", "error"); return; }

      let balance = Number(form.openingBalance || 0);
      if (form.balanceType === "pay") balance = -balance;

      await api.createParty({
        name: form.name, phone: form.phone, type: form.type,
        address: form.address, city: form.city, state: form.state,
        pincode: form.pincode, gstin: form.gstin, balance,
      });

      setForm({
        name: "", phone: "", email: "", type: "customer",
        address: "", city: "", state: "", pincode: "",
        shippingAddress: "", shippingCity: "", shippingState: "", shippingPincode: "",
        openingBalance: "", balanceType: "collect", gstin: "", pan: "",
      });
      setSameAsBilling(false);
      setShowAddressModal(false);
      setShowShippingModal(false);
      showToast("Saved! Add next party 👉");
    } catch (err) {
      console.error(err);
      showToast("Something went wrong", "error");
    }
  };

  useEffect(() => {
    if (editingParty) {
      setForm({
        name:            editingParty.name             || "",
        phone:           editingParty.phone            || "",
        email:           editingParty.email            || "",
        type:            editingParty.type             || "customer",
        address:         editingParty.address          || "",
        city:            editingParty.city             || "",
        state:           editingParty.state            || "",
        pincode:         editingParty.pincode          || "",
        gstin:           editingParty.gstin            || "",
        pan:             editingParty.pan              || "",
        shippingAddress: editingParty.shipping_address || "",
        shippingCity:    editingParty.shipping_city    || "",
        shippingState:   editingParty.shipping_state   || "",
        shippingPincode: editingParty.shipping_pincode || "",
        openingBalance:  Math.abs(editingParty.balance || 0),
        balanceType:     editingParty.balance >= 0 ? "collect" : "pay",
      });
    } else {
      setForm({
        name: "", phone: "", email: "", type: "customer",
        address: "", city: "", state: "", pincode: "",
        gstin: "", pan: "",
        shippingAddress: "", shippingCity: "", shippingState: "", shippingPincode: "",
        openingBalance: "", balanceType: "collect",
      });
    }
  }, [editingParty]);

  return (
    <>
      <style>{`
        .cp-input:focus { border-color: ${t.borderFocus} !important; box-shadow: 0 0 0 3px rgba(124,156,246,0.15) !important; background: #fff !important; }
        .cp-btn-ghost:hover { background: #eef2ff !important; border-color: ${t.accent} !important; color: ${t.accentDeep} !important; }
        .cp-btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(124,156,246,0.40) !important; }
        .cp-btn-savenew:hover { background: #d1fae5 !important; }
        .cp-type-pill { transition: all 0.18s ease; }
        .cp-type-pill:hover { transform: translateY(-1px); }
      `}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? t.dangerBg : t.successBg,
          border: `1px solid ${toast.type === "error" ? t.dangerBorder : t.successBorder}`,
          color: toast.type === "error" ? t.danger : t.success,
          padding: "12px 28px", borderRadius: "12px", fontSize: "14px",
          fontWeight: "700", zIndex: 9999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          display: "flex", alignItems: "center", gap: "8px",
          pointerEvents: "none",
        }}>
          {toast.type === "error" ? "⚠️" : "✅"} {toast.message}
        </div>
      )}

      {/* ── PAGE ── */}
      <div style={{ background: t.bg, padding: "24px", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>

          {/* HEADER */}
          <div style={{
            display: "flex", alignItems: "center", gap: "14px",
            marginBottom: "24px",
          }}>
            <button
  className="cp-btn-ghost"
  onClick={() => {
    const hasData = form.name || form.phone || form.email ||
      form.address || form.gstin || form.pan || form.openingBalance;
    if (hasData) setShowExitConfirm(true);
    else onBack();
  }}
  style={{
    padding: "9px 16px", borderRadius: "10px",
    border: `1.5px solid ${t.border}`,
    background: "#fff", color: t.textSecondary,
    fontSize: "13px", fontWeight: "600", cursor: "pointer",
    transition: "all 0.18s",
  }}
>
  ← Back
</button>

            <div style={{
              width: "40px", height: "40px", borderRadius: "12px",
              background: t.accentGradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", boxShadow: t.accentGlow, flexShrink: 0,
            }}>
              {editingParty ? "✏️" : "🤝"}
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: "21px", fontWeight: "800", color: t.textPrimary }}>
                {editingParty ? `Edit Party` : "Create Party"}
              </h2>
              {editingParty && (
                <div style={{ fontSize: "13px", color: t.textMuted, marginTop: "2px" }}>
                  Editing: <span style={{ color: t.accent, fontWeight: "700" }}>{editingParty.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 1: Basic Details ── */}
          <SectionBlock color="basic" icon="👤" title="Basic Details">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={fieldLabel}>Party Name <span style={{ color: t.danger }}>*</span></label>
                <FocusInput placeholder="Enter party name" value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)} />
              </div>
              <div>
                <label style={fieldLabel}>Phone Number <span style={{ color: t.danger }}>*</span></label>
                <FocusInput
                  placeholder="10-digit mobile"
                  value={form.phone}
                  inputMode="numeric"
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length <= 10) handleChange("phone", v);
                  }}
                />
              </div>
              <div>
                <label style={fieldLabel}>Email</label>
                <FocusInput placeholder="Email address" value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)} />
              </div>
            </div>

            {/* Party Type pills */}
            <div>
              <label style={fieldLabel}>Party Type</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  { value: "customer", label: "👤 Customer", activeBg: "#EEF2FF", activeColor: "#3730A3", activeBorder: "#C7D2FE" },
                  { value: "supplier", label: "🏭 Supplier", activeBg: "#ECFDF5", activeColor: "#065F46", activeBorder: "#A7F3D0" },
                ].map((opt) => {
                  const active = form.type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      className="cp-type-pill"
                      onClick={() => handleChange("type", opt.value)}
                      style={{
                        padding: "9px 22px", borderRadius: "10px", cursor: "pointer",
                        fontSize: "13px", fontWeight: "700",
                        background:   active ? opt.activeBg    : "#fff",
                        color:        active ? opt.activeColor : t.textSecondary,
                        border:       active ? `2px solid ${opt.activeBorder}` : `1.5px solid ${t.border}`,
                        boxShadow:    active ? `0 2px 8px ${opt.activeBorder}` : "none",
                        transition:   "all 0.18s",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionBlock>

          {/* ── SECTION 2: Tax Info ── */}
          <SectionBlock color="tax" icon="🧾" title="Tax Information">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
              <div>
                <label style={fieldLabel}>GSTIN</label>
                <FocusInput placeholder="22AAAAA0000A1Z5" value={form.gstin}
                  onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())} />
              </div>
              <div>
                <label style={fieldLabel}>PAN</label>
                <FocusInput placeholder="AAAAA0000A" value={form.pan}
                  onChange={(e) => handleChange("pan", e.target.value.toUpperCase())} />
              </div>
              <div>
                <label style={fieldLabel}>State</label>
                <SelectWithArrow value={form.state} onChange={(e) => handleChange("state", e.target.value)}>
                  <option value="">Select State</option>
                  {indianStates.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </SelectWithArrow>
              </div>
            </div>
          </SectionBlock>

          {/* ── SECTION 3: Opening Balance ── */}
          <SectionBlock color="balance" icon="💰" title="Opening Balance">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={fieldLabel}>Amount</label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
                    fontSize: "14px", fontWeight: "700", color: t.textMuted,
                  }}>₹</span>
                  <FocusInput
                    placeholder="0.00"
                    value={form.openingBalance}
                    style={{ ...inputStyle, paddingLeft: "28px" }}
                    onChange={(e) => handleChange("openingBalance", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={fieldLabel}>Balance Type</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[
                    { value: "collect", label: "📥 To Collect", activeBg: "#ECFDF5", activeColor: "#065F46", activeBorder: "#A7F3D0" },
                    { value: "pay",     label: "📤 To Pay",     activeBg: "#FEF2F2", activeColor: "#991B1B", activeBorder: "#FECACA" },
                  ].map((opt) => {
                    const active = form.balanceType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        className="cp-type-pill"
                        onClick={() => handleChange("balanceType", opt.value)}
                        style={{
                          flex: 1, padding: "9px 14px", borderRadius: "10px", cursor: "pointer",
                          fontSize: "13px", fontWeight: "700",
                          background:   active ? opt.activeBg    : "#fff",
                          color:        active ? opt.activeColor : t.textSecondary,
                          border:       active ? `2px solid ${opt.activeBorder}` : `1.5px solid ${t.border}`,
                          boxShadow:    active ? `0 2px 8px ${opt.activeBorder}` : "none",
                          transition:   "all 0.18s",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionBlock>

          {/* ── SECTION 4: Address ── */}
          <SectionBlock color="address" icon="📍" title="Address">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={fieldLabel}>Billing Address</label>
                <AddressClickBox
                  label="Click to enter billing address"
                  text={form.address ? `${form.address}, ${form.city}, ${form.state} - ${form.pincode}` : ""}
                  onClick={() => setShowAddressModal(true)}
                  disabled={false}
                />
              </div>
              <div>
                <label style={fieldLabel}>Shipping Address</label>
                <AddressClickBox
                  label="Click to enter shipping address"
                  text={form.shippingAddress ? `${form.shippingAddress}, ${form.shippingCity}, ${form.shippingState} - ${form.shippingPincode}` : ""}
                  onClick={() => setShowShippingModal(true)}
                  disabled={sameAsBilling}
                />
                <label style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  marginTop: "10px", cursor: "pointer",
                  fontSize: "13px", color: t.textSecondary, userSelect: "none",
                  justifyContent: "flex-end",
                }}>
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAsBilling(checked);
                      if (checked) setForm(prev => ({
                        ...prev,
                        shippingAddress: prev.address, shippingCity: prev.city,
                        shippingState: prev.state, shippingPincode: prev.pincode,
                      }));
                    }}
                    style={{ accentColor: t.accent, width: "15px", height: "15px" }}
                  />
                  <span style={{ fontWeight: "600" }}>Same as Billing Address</span>
                </label>
              </div>
            </div>
          </SectionBlock>

          {/* ── ACTION BUTTONS ── */}
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: "12px",
            paddingTop: "4px", paddingBottom: "12px",
          }}>
            {!editingParty && (
              <button
                className="cp-btn-savenew"
                onClick={handleSaveAndNew}
                style={{
                  padding: "11px 22px", borderRadius: "11px",
                  border: `1.5px solid ${t.successBorder}`,
                  background: t.successBg, color: t.success,
                  fontSize: "13px", fontWeight: "700", cursor: "pointer",
                  transition: "all 0.18s",
                }}
              >
                Save & New
              </button>
            )}
            <button
              className="cp-btn-save"
              onClick={handleSave}
              style={{
                padding: "11px 28px", borderRadius: "11px",
                background: t.accentGradient, color: "#fff",
                border: "none", fontSize: "13px", fontWeight: "700",
                cursor: "pointer", boxShadow: t.accentGlow,
                transition: "all 0.18s",
                letterSpacing: "0.3px",
              }}
            >
              {editingParty ? "Update Party" : "Save Party"}
            </button>
          </div>
        </div>
      </div>

      {/* ── BILLING ADDRESS MODAL ── */}
      {showAddressModal && (
  <AddressModal
    title="Billing Address"
    onClose={() => setShowAddressModal(false)}
    form={form}
    handleChange={handleChange}
    fields={[
      { label: "Street / Area", field: "address",  placeholder: "Enter street or area" },
      { label: "City",          field: "city",     placeholder: "Enter city" },
      { label: "State",         field: "state",    type: "select" },
      { label: "Pincode",       field: "pincode",  placeholder: "6-digit pincode", inputMode: "numeric", maxLen: 6 },
    ]}
  />
)}

{showShippingModal && (
  <AddressModal
    title="Shipping Address"
    onClose={() => setShowShippingModal(false)}
    form={form}
    handleChange={handleChange}
    fields={[
      { label: "Street / Area", field: "shippingAddress", placeholder: "Enter street or area" },
      { label: "City",          field: "shippingCity",    placeholder: "Enter city" },
      { label: "State",         field: "shippingState",   type: "select" },
      { label: "Pincode",       field: "shippingPincode", placeholder: "6-digit pincode", inputMode: "numeric", maxLen: 6 },
    ]}
  />
)}

{showExitConfirm && (
  <div
    onClick={() => setShowExitConfirm(false)}
    style={{
      position: "fixed", top: 0, left: 0,
      width: "100%", height: "100%",
      background: "rgba(15,17,40,0.45)",
      backdropFilter: "blur(6px)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 3000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        borderRadius: "20px",
        padding: "32px 28px",
        width: "100%", maxWidth: "400px",
        border: `1.5px solid ${t.border}`,
        boxShadow: "0 32px 80px rgba(15,17,40,0.20)",
      }}
    >
      {/* Icon */}
      <div style={{
        width: "52px", height: "52px", borderRadius: "14px",
        background: "#FFFBEB", border: "1px solid #FDE68A",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "24px", marginBottom: "18px",
      }}>⚠️</div>

      {/* Title */}
      <div style={{ fontWeight: "800", fontSize: "18px", color: t.textPrimary, marginBottom: "8px" }}>
        Discard changes?
      </div>

      {/* Body */}
      <div style={{ fontSize: "14px", color: t.textSecondary, lineHeight: "1.6", marginBottom: "10px" }}>
        You have unsaved information in this form.
      </div>
      <div style={{
        fontSize: "13px", color: "#D97706",
        background: "#FFFBEB", border: "1px solid #FDE68A",
        borderRadius: "10px", padding: "10px 14px",
        marginBottom: "24px", lineHeight: "1.5",
      }}>
        ⚠ Going back will discard everything you've entered. This cannot be undone.
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => setShowExitConfirm(false)}
          style={{
            flex: 1, padding: "11px", borderRadius: "10px",
            border: `1.5px solid ${t.border}`,
            background: t.surfaceRaised, color: t.textSecondary,
            fontWeight: "600", fontSize: "14px", cursor: "pointer",
          }}
        >
          Keep editing
        </button>
        <button
          onClick={() => { setShowExitConfirm(false); onBack(); }}
          style={{
            flex: 1, padding: "11px", borderRadius: "10px",
            border: "none", background: "#D97706", color: "#fff",
            fontWeight: "700", fontSize: "14px", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(217,119,6,0.35)",
          }}
        >
          Yes, discard
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}

export default CreateParty;