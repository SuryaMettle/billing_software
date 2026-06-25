import { useEffect, useState } from "react";
import { TemplateSection } from "./TemplateSettings.jsx";
import api from "../services/api.js";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry"
];

const T = {
  bg: "#f0f4ff",
  card: "#ffffff",
  border: "#e2e8f0",
  borderFocus: "#6366f1",
  text: "#1e293b",
  textMid: "#475569",
  textSoft: "#94a3b8",
  accent: "#6366f1",
  accentLight: "#eef2ff",
  green: "#059669",
  greenLight: "#ecfdf5",
  amber: "#d97706",
  red: "#dc2626",
  redLight: "#fef2f2",
  purple: "#7c3aed",
  radius: 14,
  radiusLg: 20,
  shadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(99,102,241,0.08)",
};

function Settings() {
  const [form, setForm] = useState({
    business_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    loyalty_earn_rate: 0.01,
    loyalty_redeem_value: 1.0,
    invoice_template: "modern-a4",
    logo: "",
  });

  const [activeTab, setActiveTab] = useState("details");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCategories, setResetCategories] = useState([]);
  const [resetReseed, setResetReseed] = useState(true);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [selectiveRestoreLoading, setSelectiveRestoreLoading] = useState(false);
  const [selectiveBackupPath, setSelectiveBackupPath] = useState(null);
  const [selectiveCategories, setSelectiveCategories] = useState([]);
  const [confirmingSelective, setConfirmingSelective] = useState(false);
  const [driveStatus, setDriveStatus] = useState({ connected: false, email: null });
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveBackupLoading, setDriveBackupLoading] = useState(false);
  const [driveBackups, setDriveBackups] = useState([]);
  const [showDriveBackups, setShowDriveBackups] = useState(false);
  const [selectiveFile, setSelectiveFile] = useState(null);
  const [driveRestoreCategories, setDriveRestoreCategories] = useState([]);
  const [confirmingDriveRestore, setConfirmingDriveRestore] = useState(false);
  const [driveRestoreLoading, setDriveRestoreLoading] = useState(false);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const data = await api.backupDatabase();
      showToast(`✅ Backup saved: ${data.path}`);
    } catch (err) {
      showToast(`❌ Backup failed: ${err.message}`, "error");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    const confirmed = window.confirm(
      "Restoring will REPLACE all current data with the selected backup. This cannot be undone. Continue?"
    );
    if (!confirmed) return;
    setRestoreLoading(true);
    try {
      const result = await window.api.restoreBackup();
      if (result.cancelled) { setRestoreLoading(false); return; }
      if (result.success) {
        showToast("✅ Restoring… app will restart.");
      } else {
        showToast(`❌ Restore failed: ${result.error || "Unknown error"}`, "error");
        setRestoreLoading(false);
      }
    } catch (err) {
      showToast(`❌ Restore failed: ${err.message}`, "error");
      setRestoreLoading(false);
    }
  };

  const handlePickBackupFile = async () => {
  const result = await window.api.selectiveRestorePickFile();
  if (result.cancelled) return;
  setSelectiveBackupPath(result.filePath);
  setSelectiveCategories([]);
  setConfirmingSelective(false);
};

const handleSelectiveRestore = async () => {
  setSelectiveRestoreLoading(true);
  try {
    const res = await api.selectiveRestore({
      backupPath: selectiveBackupPath,
      categories: selectiveCategories,
    });
    if (res.success) {
      showToast(`✅ Restored: ${res.restored.join(", ")}`);
      setSelectiveBackupPath(null);
      setSelectiveCategories([]);
      setConfirmingSelective(false);
    } else {
      showToast("❌ Selective restore failed", "error");
    }
  } catch (err) {
    showToast(`❌ ${err.message}`, "error");
  } finally {
    setSelectiveRestoreLoading(false);
  }
};

const toggleSelectiveCategory = (key) =>
  setSelectiveCategories(prev =>
    prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
  );

  const toggleResetCategory = (key) =>
  setResetCategories(prev =>
    prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
  );

const handleResetData = async () => {
  setResetLoading(true);
  try {
    const res = await api.resetData({ categories: resetCategories, reseed: resetReseed });
    if (res.success) {
      showToast(`✅ Reset complete: ${res.cleared.join(", ")}`);
      setResetCategories([]);
      setConfirmingReset(false);
    } else {
      showToast("❌ Reset failed", "error");
    }
  } catch (err) {
    showToast(`❌ ${err.message}`, "error");
  } finally {
    setResetLoading(false);
  }
};

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      await api.exportExcel();
      showToast("✅ Excel export downloaded!");
    } catch (err) {
      showToast(`❌ Export failed: ${err.message}`, "error");
    } finally {
      setExportLoading(false);
    }
  };

  // Load Drive status on mount
useEffect(() => {
  api.getDriveStatus().then(setDriveStatus).catch(() => {});
}, []);

const handleConnectDrive = async () => {
  setDriveLoading(true);
  try {
    const result = await window.api.googleAuthStart();
    if (result.success) {
      await api.saveDriveToken({ 
        refreshToken: result.refreshToken, 
        email: result.email 
      });
      setDriveStatus({ connected: true, email: result.email });
      showToast(`✅ Connected to Google Drive: ${result.email}`);
    } else {
      showToast(`❌ ${result.error}`, "error");
    }
  } catch (e) {
    showToast(`❌ ${e.message}`, "error");
  } finally {
    setDriveLoading(false);
  }
};

const handleDisconnectDrive = async () => {
  const confirmed = window.confirm("Disconnect Google Drive? Cloud backups will stop.");
  if (!confirmed) return;
  await api.disconnectDrive();
  setDriveStatus({ connected: false, email: null });
  setDriveBackups([]);
  setShowDriveBackups(false);
  showToast("✅ Google Drive disconnected");
};

const handleDriveBackup = async () => {
  setDriveBackupLoading(true);
  try {
    const res = await api.driveBackup();
    showToast(`✅ Backed up to Drive: ${res.fileName}`);
  } catch (e) {
    showToast(`❌ ${e.message}`, "error");
  } finally {
    setDriveBackupLoading(false);
  }
};

const handleListDriveBackups = async () => {
  setDriveLoading(true);
  try {
    const files = await api.getDriveBackups();
    setDriveBackups(files);
    setShowDriveBackups(true);
  } catch (e) {
    showToast(`❌ ${e.message}`, "error");
  } finally {
    setDriveLoading(false);
  }
};

const handleDriveDownloadAndRestore = async (fileId) => {
  setDriveRestoreLoading(true);
  try {
    const res = await api.downloadDriveBackup(fileId);
    setSelectiveFile(res.localPath);
    setDriveRestoreCategories([]);
    setConfirmingDriveRestore(false);
    showToast("✅ File downloaded — select what to restore below");
  } catch (e) {
    showToast(`❌ ${e.message}`, "error");
  } finally {
    setDriveRestoreLoading(false);
  }
};

const handleDriveSelectiveRestore = async () => {
  setDriveRestoreLoading(true);
  try {
    const res = await api.selectiveRestore({
      backupPath: selectiveFile,
      categories: driveRestoreCategories,
    });
    if (res.success) {
      showToast(`✅ Restored from Drive: ${res.restored.join(", ")}`);
      setSelectiveFile(null);
      setDriveRestoreCategories([]);
      setConfirmingDriveRestore(false);
      setShowDriveBackups(false);
    }
  } catch (e) {
    showToast(`❌ ${e.message}`, "error");
  } finally {
    setDriveRestoreLoading(false);
  }
};

  useEffect(() => {
    const loadSettings = () => api.getSettings().then((data) => {
      if (data) setForm(data);
    });
    loadSettings();
    window.addEventListener("settings-updated", loadSettings);
    return () => window.removeEventListener("settings-updated", loadSettings);
  }, []);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.saveSettings(form);
      if (res.success) showToast("✅ Settings saved successfully!");
      else showToast("❌ Failed to save settings", "error");
    } catch {
      showToast("❌ Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "details", label: "🏢 Business Details", grad: `linear-gradient(135deg, ${T.accent}, ${T.purple})` },
    { key: "address", label: "📍 Business Address", grad: `linear-gradient(135deg, ${T.green}, #10b981)` },
  ];

  return (
    <div style={{
      padding: "28px 32px",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: T.bg,
      minHeight: "100vh",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .settings-input:focus {
          border-color: ${T.borderFocus} !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
          outline: none;
        }
        .settings-input { transition: border-color 0.18s, box-shadow 0.18s; }
        .action-btn:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
        .action-btn { transition: filter 0.15s, transform 0.15s; }
        .save-btn:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(99,102,241,0.38) !important; transform: translateY(-1px); }
        .save-btn { transition: box-shadow 0.18s, transform 0.15s; }
        .tab-btn { transition: all 0.18s ease; }
        .tab-btn:hover { transform: translateY(-1px); }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%",
          transform: "translateX(-50%)",
          background: toast.type === "error" ? T.red : T.green,
          color: "#fff", padding: "13px 28px", borderRadius: 40,
          fontSize: 14, fontWeight: 600, zIndex: 9999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          animation: "slideDown 0.25s ease", whiteSpace: "nowrap",
        }}>
          {toast.message}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24, maxWidth: 820, margin: "0 auto 24px" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>
          Settings
        </h1>
        <p style={{ margin: "4px 0 0", color: T.textSoft, fontSize: 14 }}>
          Manage your business profile and preferences
        </p>
      </div>

      {/* ── Tab buttons ── */}
      <div style={{ display: "flex", gap: 12, maxWidth: 820, margin: "0 auto 20px" }}>
        {tabs.map(({ key, label, grad }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              className="tab-btn"
              onClick={() => setActiveTab(key)}
              style={{
                padding: "13px 28px",
                borderRadius: 40,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "inherit",
                background: active ? grad : "#fff",
                color: active ? "#fff" : T.textMid,
                boxShadow: active
                  ? "0 4px 16px rgba(0,0,0,0.15)"
                  : `0 1px 3px rgba(0,0,0,0.07), inset 0 0 0 1.5px ${T.border}`,
                transform: active ? "translateY(-1px)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820, margin: "0 auto" }}>

        {/* ── Business Details tab ── */}
        {activeTab === "details" && (
          <Card icon="🏢" iconBg={`linear-gradient(135deg, ${T.accent}, ${T.purple})`} title="Business Details" subtitle="Your store's identity on invoices">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <Field label="Business Name" icon="🏪" placeholder="e.g. Sri Murugan Stores"
                value={form.business_name} onChange={v => handleChange("business_name", v)} />
              <Field label="Phone Number" icon="📱" placeholder="e.g. 9876543210" type="tel"
                value={form.phone}
                onChange={v => { const n = v.replace(/\D/g, ""); if (n.length <= 10) handleChange("phone", n); }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
              <Field label="Email" icon="✉️" placeholder="e.g. shop@gmail.com" type="email"
                value={form.email} onChange={v => handleChange("email", v)} />
              <Field label="GSTIN" icon="🆔" placeholder="e.g. 33AABCU9603R1ZX"
                value={form.gstin}
                onChange={v => { const u = v.toUpperCase(); if (u.length <= 15) handleChange("gstin", u); }} />
            </div>
            {/* ── Business Logo ── */}
<div style={{ marginTop: 18 }}>
  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 8, letterSpacing: 0.3 }}>
    🖼️ Business Logo
  </label>
  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

    {/* Preview */}
    {form.logo ? (
      <div style={{ position: "relative" }}>
        <img
          src={form.logo}
          alt="Business Logo"
          style={{
            height: 72, maxWidth: 180, objectFit: "contain",
            border: "1.5px solid #e2e8f0", borderRadius: 10,
            padding: 6, background: "#fff",
          }}
        />
        <button
          onClick={() => handleChange("logo", "")}
          style={{
            position: "absolute", top: -8, right: -8,
            width: 22, height: 22, borderRadius: "50%",
            background: "#dc2626", color: "#fff", border: "none",
            cursor: "pointer", fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Remove logo"
        >✕</button>
      </div>
    ) : (
      <div style={{
        width: 100, height: 72, border: "2px dashed #cbd5e1",
        borderRadius: 10, display: "flex", alignItems: "center",
        justifyContent: "center", color: "#94a3b8", fontSize: 12,
        background: "#f8fafc",
      }}>
        No logo
      </div>
    )}

    {/* Upload button */}
    <label style={{
      padding: "10px 18px", background: "#eef2ff", color: "#6366f1",
      border: "1.5px solid #6366f1", borderRadius: 40,
      cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit",
    }}>
      📁 {form.logo ? "Change Logo" : "Upload Logo"}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 300 * 1024) {
            showToast("❌ Logo must be under 300KB", "error");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => handleChange("logo", reader.result);
          reader.readAsDataURL(file);
        }}
      />
    </label>

    <span style={{ fontSize: 12, color: "#94a3b8" }}>
      PNG / JPG / SVG · max 300 KB
    </span>
  </div>
</div>
          </Card>
        )}

        {/* ── Business Address tab ── */}
        {activeTab === "address" && (
          <Card icon="📍" iconBg={`linear-gradient(135deg, ${T.green}, #10b981)`} title="Business Address" subtitle="Printed on every invoice">
            <Field label="Street Address" icon="🏠" placeholder="e.g. 12, Main Street, Near Market"
              value={form.address} onChange={v => handleChange("address", v)} multiline />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 130px", gap: 18, marginTop: 18 }}>
              <Field label="City" icon="🏙️" placeholder="e.g. Nagercoil"
                value={form.city} onChange={v => handleChange("city", v)} />
              <SelectField label="State" icon="📌" value={form.state}
                onChange={v => handleChange("state", v)}
                options={[{ value: "", label: "Select State" }, ...indianStates.map(s => ({ value: s, label: s }))]} />
              <Field label="Pincode" icon="📮" placeholder="629001"
                value={form.pincode} onChange={v => handleChange("pincode", v.replace(/\D/g, ""))} />
            </div>
          </Card>
        )}

        {/* ── Loyalty Points (always visible) ── */}
        <Card icon="⭐" iconBg={`linear-gradient(135deg, ${T.amber}, #fbbf24)`} title="Loyalty Points" subtitle="How customers earn and spend points">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <NumberBlock
              label="Earn Rate" hint="Points earned per ₹1 spent"
              example="0.01 = 1 point per ₹100"
              step="0.001" min="0"
              value={form.loyalty_earn_rate ?? 0.01}
              onChange={v => handleChange("loyalty_earn_rate", parseFloat(v) || 0)}
            />
            <NumberBlock
              label="Redemption Value" hint="Rupee value of one point"
              example="1.0 = ₹1 discount per point"
              step="0.5" min="0"
              value={form.loyalty_redeem_value ?? 1.0}
              onChange={v => handleChange("loyalty_redeem_value", parseFloat(v) || 0)}
            />
          </div>
        </Card>

        {/* ── Data & Backup (always visible) ── */}
        <Card icon="💾" iconBg={`linear-gradient(135deg, #0ea5e9, #2563eb)`} title="Data & Backup" subtitle="Keep your data safe">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <ActionButton onClick={handleBackup} loading={backupLoading}
              label="Backup Now" loadingLabel="Backing up…"
              icon="📥" color="#2563eb" lightColor="#eff6ff" />
            <ActionButton onClick={handleRestore} loading={restoreLoading}
              label="Restore Backup" loadingLabel="Restoring…"
              icon="♻️" color={T.red} lightColor={T.redLight} />
            <ActionButton onClick={handleExportExcel} loading={exportLoading}
              label="Export to Excel" loadingLabel="Exporting…"
              icon="📊" color={T.green} lightColor={T.greenLight} />
          </div>
        </Card>

        {/* ── Selective Restore ── */}
<Card icon="🔁" iconBg={`linear-gradient(135deg, #7c3aed, #a78bfa)`} title="Selective Restore (Local File)" subtitle="Pick a local backup file and restore only specific data from it">
  
  {/* Step 1: Pick file */}
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>
      Step 1 — Choose a backup file
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <ActionButton
        onClick={handlePickBackupFile}
        loading={false}
        label="Browse Backup File"
        loadingLabel=""
        icon="📂"
        color={T.purple}
        lightColor="#f5f3ff"
      />
      {selectiveBackupPath && (
        <span style={{ fontSize: 12, color: T.textMid, wordBreak: "break-all" }}>
          ✅ {selectiveBackupPath.split("\\").pop()}
        </span>
      )}
    </div>
  </div>

  {/* Step 2: Pick what to restore (only shown after file picked) */}
  {selectiveBackupPath && (
    <>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>
        Step 2 — Choose what to restore from that backup
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {[
          { key: "offers",       label: "Offers & Offer Conditions" },
          { key: "products",     label: "Products" },
          { key: "customers",    label: "Customers & Suppliers" },
          { key: "transactions", label: "Bills, Invoices & Returns" },
        ].map(c => (
          <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: T.text, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectiveCategories.includes(c.key)}
              onChange={() => toggleSelectiveCategory(c.key)}
            />
            {c.label}
          </label>
        ))}
      </div>

      <div style={{ fontSize: 12, color: T.amber, marginBottom: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 12px" }}>
        ⚠️ The selected categories in the live database will be <strong>replaced</strong> with the backup's data. Everything else stays untouched.
      </div>

      {!confirmingSelective ? (
        <ActionButton
          onClick={() => setConfirmingSelective(true)}
          loading={false}
          label="Restore Selected Data"
          loadingLabel=""
          icon="🔁"
          color={T.purple}
          lightColor="#f5f3ff"
          disabled={selectiveCategories.length === 0}
        />
      ) : (
        <div style={{ background: "#f5f3ff", border: `1.5px solid ${T.purple}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.purple, marginBottom: 10 }}>
            This will overwrite [{selectiveCategories.join(", ")}] in the live database. Proceed?
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <ActionButton
              onClick={handleSelectiveRestore}
              loading={selectiveRestoreLoading}
              label="Yes, Restore Now"
              loadingLabel="Restoring…"
              icon="✅"
              color={T.purple}
              lightColor="#fff"
            />
            <button
              onClick={() => setConfirmingSelective(false)}
              disabled={selectiveRestoreLoading}
              style={{
                padding: "11px 22px", background: "#fff", color: T.textMid,
                border: `1.5px solid ${T.border}`, borderRadius: 40,
                cursor: "pointer", fontWeight: 700, fontSize: 13.5, fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )}
</Card>


        {/* ── Cloud Backup (Google Drive) ── */}
<Card icon="☁️" iconBg={`linear-gradient(135deg, #4285f4, #34a853)`} title="Cloud Backup" subtitle="Auto-save backups to Google Drive — survive any hardware failure">

  {!driveStatus.connected ? (
    <div>
      <p style={{ fontSize: 13, color: T.textMid, marginTop: 0, marginBottom: 14 }}>
        Connect your Google account to automatically upload backups to your Drive.
      </p>
      <ActionButton
        onClick={handleConnectDrive}
        loading={driveLoading}
        label="Connect Google Drive"
        loadingLabel="Waiting for Google login…"
        icon="🔗"
        color="#4285f4"
        lightColor="#eff6ff"
      />
    </div>
  ) : (
    <>
      {/* Connected state */}
      <div style={{
        background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12,
        padding: "12px 16px", marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>✅ Connected</div>
          <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>{driveStatus.email}</div>
        </div>
        <button
          onClick={handleDisconnectDrive}
          style={{
            padding: "7px 14px", background: "#fff", color: T.red,
            border: `1.5px solid ${T.red}`, borderRadius: 20,
            cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit",
          }}
        >
          Disconnect
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <ActionButton
          onClick={handleDriveBackup}
          loading={driveBackupLoading}
          label="Backup to Drive Now"
          loadingLabel="Uploading…"
          icon="☁️"
          color="#4285f4"
          lightColor="#eff6ff"
        />
        <ActionButton
          onClick={handleListDriveBackups}
          loading={driveLoading}
          label="Browse Drive Backups"
          loadingLabel="Loading…"
          icon="📂"
          color={T.purple}
          lightColor="#f5f3ff"
        />
      </div>

      {/* Drive backup list */}
      {showDriveBackups && driveBackups.length > 0 && (
        <div style={{ border: `1.5px solid ${T.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ background: "#f8fafc", padding: "10px 16px", fontSize: 12, fontWeight: 700, color: T.textMid, borderBottom: `1px solid ${T.border}` }}>
            Drive Backups — click one to restore from it
          </div>
          {driveBackups.map(file => (
            <div key={file.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderBottom: `1px solid ${T.border}`,
              background: "#fff",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{file.name}</div>
                <div style={{ fontSize: 11, color: T.textSoft, marginTop: 2 }}>
                  {new Date(file.createdTime).toLocaleString("en-IN")}
                  {file.size ? ` • ${(file.size / 1024).toFixed(1)} KB` : ""}
                </div>
              </div>
              <ActionButton
                onClick={() => handleDriveDownloadAndRestore(file.id)}
                loading={driveRestoreLoading}
                label="Select"
                loadingLabel="Downloading…"
                icon="⬇️"
                color={T.purple}
                lightColor="#f5f3ff"
              />
            </div>
          ))}
        </div>
      )}

      {/* Selective restore from Drive */}
      {selectiveFile && (
        <div style={{ border: `1.5px solid ${T.purple}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.purple, marginBottom: 10 }}>
            Choose what to restore from this Drive backup:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {[
              { key: "offers", label: "Offers & Offer Conditions" },
              { key: "products", label: "Products" },
              { key: "customers", label: "Customers & Suppliers" },
              { key: "transactions", label: "Bills, Invoices & Returns" },
            ].map(c => (
              <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: T.text, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={driveRestoreCategories.includes(c.key)}
                  onChange={() => setDriveRestoreCategories(prev =>
                    prev.includes(c.key) ? prev.filter(x => x !== c.key) : [...prev, c.key]
                  )}
                />
                {c.label}
              </label>
            ))}
          </div>

          {!confirmingDriveRestore ? (
            <ActionButton
              onClick={() => setConfirmingDriveRestore(true)}
              loading={false}
              label="Restore Selected"
              loadingLabel=""
              icon="🔁"
              color={T.purple}
              lightColor="#f5f3ff"
            />
          ) : (
            <div style={{ background: "#f5f3ff", border: `1.5px solid ${T.purple}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.purple, marginBottom: 10 }}>
                This will overwrite [{driveRestoreCategories.join(", ")}] in the live database. Proceed?
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <ActionButton
                  onClick={handleDriveSelectiveRestore}
                  loading={driveRestoreLoading}
                  label="Yes, Restore Now"
                  loadingLabel="Restoring…"
                  icon="✅"
                  color={T.purple}
                  lightColor="#fff"
                />
                <button
                  onClick={() => setConfirmingDriveRestore(false)}
                  style={{
                    padding: "11px 22px", background: "#fff", color: T.textMid,
                    border: `1.5px solid ${T.border}`, borderRadius: 40,
                    cursor: "pointer", fontWeight: 700, fontSize: 13.5, fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => { setSelectiveFile(null); setDriveRestoreCategories([]); setConfirmingDriveRestore(false); }}
            style={{
              marginTop: 10, padding: "8px 16px", background: "transparent",
              color: T.textSoft, border: "none", cursor: "pointer", fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            ✕ Cancel selection
          </button>
        </div>
      )}
    </>
  )}
</Card>

        {/* ── Danger Zone: Reset Data ── */}
<Card icon="⚠️" iconBg={`linear-gradient(135deg, ${T.red}, #f87171)`} title="Reset Data" subtitle="Clear data before a fresh start — cannot be undone">
  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
    {[
      { key: "transactions", label: "Bills, Invoices & Returns" },
      { key: "products", label: "Products" },
      { key: "customers", label: "Customers & Suppliers" },
      { key: "offers", label: "Offers" },
    ].map(c => (
      <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: T.text, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={resetCategories.includes(c.key)}
          onChange={() => toggleResetCategory(c.key)}
        />
        {c.label}
      </label>
    ))}
    <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: T.textMid, marginTop: 6 }}>
      <input
        type="checkbox"
        checked={resetReseed}
        onChange={() => setResetReseed(r => !r)}
      />
      Add back sample product & customer after clearing
    </label>
  </div>

  {!confirmingReset ? (
    <ActionButton
      onClick={() => setConfirmingReset(true)}
      loading={false}
      label="Reset Selected Data"
      loadingLabel=""
      icon="🗑️"
      color={T.red}
      lightColor={T.redLight}
    />
  ) : (
    <div style={{ background: T.redLight, border: `1.5px solid ${T.red}`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.red, marginBottom: 10 }}>
        This permanently deletes the selected data. Are you sure?
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <ActionButton
          onClick={handleResetData}
          loading={resetLoading}
          label="Yes, Reset Now"
          loadingLabel="Resetting…"
          icon="✅"
          color={T.red}
          lightColor="#fff"
        />
        <button
          onClick={() => setConfirmingReset(false)}
          disabled={resetLoading}
          style={{
            padding: "11px 22px", background: "#fff", color: T.textMid,
            border: `1.5px solid ${T.border}`, borderRadius: 40,
            cursor: "pointer", fontWeight: 700, fontSize: 13.5, fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )}
</Card>

        {/* Template section */}
        <Card icon="🧾" iconBg={`linear-gradient(135deg, #7c3aed, #4c1d95)`} title="Invoice Template" subtitle="Choose how your invoices look when printed">
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ fontSize: 13, color: T.textMid }}>
      Current: <strong style={{ color: T.text }}>{form.invoice_template || "Not selected"}</strong>
    </div>
    <button
      onClick={() => setShowTemplatePanel(p => !p)}
      style={{
        padding: "10px 22px", borderRadius: 40, border: "none",
        background: showTemplatePanel ? `linear-gradient(135deg, #7c3aed, #4c1d95)` : T.accentLight,
        color: showTemplatePanel ? "#fff" : T.purple,
        fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        fontFamily: "inherit", transition: "all 0.2s",
      }}
    >
      {showTemplatePanel ? "✕ Close" : "🧾 Choose Template"}
    </button>
  </div>

  {showTemplatePanel && (
    <div style={{ marginTop: 20 }}>
      <TemplateSection
        selectedTemplate={form.invoice_template}
        onChange={(val) => {
          handleChange("invoice_template", val);
          setShowTemplatePanel(false);
        }}
      />
    </div>
  )}
</Card>

        {/* ── Save ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 32 }}>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "13px 36px",
              background: saving ? "#c7d2fe" : `linear-gradient(135deg, ${T.accent}, ${T.purple})`,
              color: "#fff", border: "none", borderRadius: 40,
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: 15,
              boxShadow: saving ? "none" : "0 4px 16px rgba(99,102,241,0.28)",
              display: "flex", alignItems: "center", gap: 10, letterSpacing: 0.2,
              fontFamily: "inherit",
            }}
          >
            {saving ? (
              <>
                <span style={{
                  display: "inline-block", width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.35)",
                  borderTop: "2px solid #fff", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                Saving…
              </>
            ) : "💾 Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Card({ icon, iconBg, title, subtitle, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 20,
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(99,102,241,0.08)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "18px 24px", borderBottom: "1px solid #e2e8f0", background: "#fafbff",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: "22px 24px" }}>{children}</div>
    </div>
  );
}

function Field({ label, icon, placeholder, value, onChange, multiline = false, type = "text" }) {
  const inputStyle = {
    width: "100%",
    padding: multiline ? "12px 14px 12px 42px" : "11px 14px 11px 42px",
    borderRadius: 14, border: "1.5px solid #e2e8f0",
    background: "#fff", fontSize: 14, fontWeight: 500, color: "#1e293b",
    boxSizing: "border-box",
    minHeight: multiline ? 76 : undefined,
    resize: multiline ? "vertical" : undefined,
    fontFamily: "inherit",
  };
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6, letterSpacing: 0.3 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 13,
          top: multiline ? 13 : "50%",
          transform: multiline ? "none" : "translateY(-50%)",
          fontSize: 15, pointerEvents: "none", lineHeight: 1,
        }}>{icon}</span>
        {multiline
          ? <textarea className="settings-input" style={inputStyle} placeholder={placeholder}
              value={value} onChange={e => onChange(e.target.value)} />
          : <input className="settings-input" type={type} style={inputStyle} placeholder={placeholder}
              value={value} onChange={e => onChange(e.target.value)} />
        }
      </div>
    </div>
  );
}

function SelectField({ label, icon, value, onChange, options }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6, letterSpacing: 0.3 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 13, top: "50%",
          transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none",
        }}>{icon}</span>
        <select className="settings-input" style={{
          width: "100%", padding: "11px 32px 11px 42px",
          borderRadius: 14, border: "1.5px solid #e2e8f0",
          background: "#fff", fontSize: 14, fontWeight: 500, color: "#1e293b",
          appearance: "none", boxSizing: "border-box", cursor: "pointer", fontFamily: "inherit",
        }} value={value} onChange={e => onChange(e.target.value)}>
          {options.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{
          position: "absolute", right: 12, top: "50%",
          transform: "translateY(-50%)", fontSize: 11, color: "#94a3b8", pointerEvents: "none",
        }}>▼</span>
      </div>
    </div>
  );
}

function NumberBlock({ label, hint, example, value, onChange, step, min }) {
  return (
    <div style={{
      background: "#f0f4ff", borderRadius: 14,
      border: "1.5px solid #e2e8f0", padding: "16px 18px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>{hint}</div>
      <input className="settings-input" type="number" step={step} min={min} value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10,
          border: "1.5px solid #e2e8f0", background: "#fff",
          fontSize: 15, fontWeight: 600, color: "#1e293b",
          boxSizing: "border-box", fontFamily: "inherit",
        }}
      />
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>e.g. {example}</div>
    </div>
  );
}

function ActionButton({ onClick, loading, label, loadingLabel, icon, color, lightColor }) {
  return (
    <button className="action-btn" onClick={onClick} disabled={loading} style={{
      padding: "11px 22px", background: lightColor,
      color: loading ? "#94a3b8" : color,
      border: `1.5px solid ${loading ? "#e2e8f0" : color}`,
      borderRadius: 40, cursor: loading ? "not-allowed" : "pointer",
      fontWeight: 700, fontSize: 13.5,
      display: "flex", alignItems: "center", gap: 7,
      opacity: loading ? 0.7 : 1, fontFamily: "inherit",
    }}>
      {loading
        ? <><span style={{
            display: "inline-block", width: 13, height: 13,
            border: `2px solid #e2e8f0`, borderTop: `2px solid ${color}`,
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />{loadingLabel}</>
        : <>{icon} {label}</>
      }
    </button>
  );
}

export default Settings;