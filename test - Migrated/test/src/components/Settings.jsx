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
  });

  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadSettings = () => api.getSettings().then((data) => {
      if (data) setForm(data);
    });

    loadSettings();
    window.addEventListener("settings-updated", loadSettings);
    return () => window.removeEventListener("settings-updated", loadSettings);
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.saveSettings(form);
      if (res.success) {
        showToast("✅ Settings saved successfully!");
      } else {
        showToast("❌ Failed to save settings", "error");
      }
    } catch (err) {
      showToast("❌ Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ 
      padding: "2rem", 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", 
      background: "linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%)",
      minHeight: "100vh"
    }}>
      
      {/* Enhanced Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 32,
            left: "50%",
            transform: `translateX(-50%) ${toast ? "translateY(0)" : "translateY(-100%)"}`,
            background: toast.type === "error" 
              ? "linear-gradient(135deg, #ef5350 0%, #d32f2f 100%)"
              : "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
            color: "#fff",
            padding: "16px 32px",
            borderRadius: 20,
            fontSize: 15,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "none",
            maxWidth: "90vw",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Main Settings Card */}
      <div style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(30px)",
        borderRadius: 28,
        padding: "40px",
        boxShadow: "0 25px 80px rgba(0,0,0,0.15)",
        border: "1px solid rgba(255,255,255,0.3)",
        maxWidth: "800px",
        margin: "0 auto"
      }}>

        {/* Business Details Section */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "2px solid rgba(102,126,234,0.1)"
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 18,
              fontWeight: 600
            }}>
              🏢
            </div>
            <div>
              <h3 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                margin: 0,
                color: "#1a1a1a"
              }}>Business Details</h3>
              <div style={{ fontSize: 13, color: "#666" }}>Core business information</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <InputField
              label="Business Name *"
              placeholder="e.g. Sri Murugan Stores"
              value={form.business_name}
              onChange={(value) => handleChange("business_name", value)}
              icon="🏪"
            />
            <InputField
              label="Phone Number"
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={(value) => {
                const numValue = value.replace(/\D/g, "");
                if (numValue.length <= 10) handleChange("phone", numValue);
              }}
              icon="📱"
              type="tel"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
            <InputField
              label="Email"
              placeholder="e.g. shop@gmail.com"
              value={form.email}
              onChange={(value) => handleChange("email", value)}
              icon="✉️"
              type="email"
            />
            <InputField
              label="GSTIN"
              placeholder="e.g. 33AABCU9603R1ZX"
              value={form.gstin}
              onChange={(value) => {
                const upperValue = value.toUpperCase();
                if (upperValue.length <= 15) handleChange("gstin", upperValue);
              }}
              icon="🆔"
            />
          </div>
        </div>

        {/* Address Section */}
        <div>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "2px solid rgba(76,175,80,0.1)"
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 18,
              fontWeight: 600
            }}>
              📍
            </div>
            <div>
              <h3 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                margin: 0,
                color: "#1a1a1a"
              }}>Business Address</h3>
              <div style={{ fontSize: 13, color: "#666" }}>Complete address details</div>
            </div>
          </div>

          <InputField
            label="Address"
            placeholder="e.g. 12, Main Street, Near Market"
            value={form.address}
            onChange={(value) => handleChange("address", value)}
            icon="🏠"
            multiline
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 140px", gap: "24px", marginTop: "24px" }}>
            <InputField
              label="City"
              placeholder="e.g. Nagercoil"
              value={form.city}
              onChange={(value) => handleChange("city", value)}
              icon="🏙️"
            />
            <SelectField
              label="State *"
              value={form.state}
              onChange={(value) => handleChange("state", value)}
              icon="🌟"
              options={[{ value: "", label: "Select State" }, ...indianStates.map(s => ({ value: s, label: s }))]}
            />
            <InputField
              label="Pincode"
              placeholder="e.g. 629001"
              value={form.pincode}
              onChange={(value) => handleChange("pincode", value.replace(/\D/g, ""))}
              icon="📮"
            />
          </div>
        </div>

        {/* Loyalty Points Section */}
<div style={{ marginTop: "36px" }}>
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    marginBottom: "24px", paddingBottom: "16px",
    borderBottom: "2px solid rgba(245,167,0,0.15)"
  }}>
    <div style={{
      width: 48, height: 48, borderRadius: 16,
      background: "linear-gradient(135deg, #f57f17 0%, #ffca28 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontSize: 18
    }}>⭐</div>
    <div>
      <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1a1a" }}>
        Loyalty Points
      </h3>
      <div style={{ fontSize: 13, color: "#666" }}>
        Configure how customers earn and redeem points
      </div>
    </div>
  </div>

  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 8, display: "block" }}>
        Earn Rate (points per ₹1 spent)
      </label>
      <input
        type="number"
        step="0.001"
        min="0"
        value={form.loyalty_earn_rate ?? 0.01}
        onChange={e => handleChange("loyalty_earn_rate", parseFloat(e.target.value) || 0)}
        style={{
          width: "100%", padding: "16px", borderRadius: 16,
          border: "2px solid rgba(0,0,0,0.08)", fontSize: 15,
          boxSizing: "border-box"
        }}
      />
      <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
        e.g. 0.01 = 1 point per ₹100 spent
      </div>
    </div>

    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 8, display: "block" }}>
        Redemption Value (₹ per point)
      </label>
      <input
        type="number"
        step="0.5"
        min="0"
        value={form.loyalty_redeem_value ?? 1.0}
        onChange={e => handleChange("loyalty_redeem_value", parseFloat(e.target.value) || 0)}
        style={{
          width: "100%", padding: "16px", borderRadius: 16,
          border: "2px solid rgba(0,0,0,0.08)", fontSize: 15,
          boxSizing: "border-box"
        }}
      />
      <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
        e.g. 1.0 = 1 point = ₹1 discount
      </div>
    </div>
  </div>
</div>

<TemplateSection
  selectedTemplate={form.invoice_template}
  onChange={(val) => handleChange("invoice_template", val)}
/>

        {/* Save Button */}
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          marginTop: "40px",
          paddingTop: "24px",
          borderTop: "2px solid rgba(0,0,0,0.05)"
        }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "16px 40px",
              background: saving 
                ? "rgba(102,126,234,0.3)" 
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 20,
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 16,
              boxShadow: saving 
                ? "none" 
                : "0 12px 32px rgba(102,126,234,0.4)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              backdropFilter: "blur(20px)"
            }}
            onMouseEnter={(e) => {
              if (!saving) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 20px 40px rgba(102,126,234,0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!saving) {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 12px 32px rgba(102,126,234,0.4)";
              }
            }}
          >
            {saving ? (
              <>
                <div style={{ 
                  width: 20, 
                  height: 20, 
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid #fff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                Saving...
              </>
            ) : (
              <>
                💾 Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

// Reusable Input Field Component
function InputField({ label, placeholder, value, onChange, icon, multiline = false, type = "text" }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#555",
        marginBottom: 8,
        display: "block"
      }}>
        {label}
      </label>
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center"
      }}>
        <span style={{
          position: "absolute",
          left: 16,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#999",
          fontSize: 18,
          zIndex: 1,
          pointerEvents: "none"
        }}>
          {icon}
        </span>
        {multiline ? (
          <textarea
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "16px 16px 16px 52px",
              borderRadius: 16,
              border: "2px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(10px)",
              outline: "none",
              fontSize: 15,
              fontWeight: 500,
              color: "#1a1a1a",
              resize: "vertical",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxSizing: "border-box"
            }}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type={type}
            style={{
              width: "100%",
              padding: "16px 16px 16px 52px",
              borderRadius: 16,
              border: "2px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(10px)",
              outline: "none",
              fontSize: 15,
              fontWeight: 500,
              color: "#1a1a1a",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxSizing: "border-box"
            }}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = "#667eea"}
            onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.08)"}
          />
        )}
      </div>
    </div>
  );
}

// Reusable Select Field Component
function SelectField({ label, value, onChange, icon, options }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#555",
        marginBottom: 8,
        display: "block"
      }}>
        {label}
      </label>
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center"
      }}>
        <span style={{
          position: "absolute",
          left: 16,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#999",
          fontSize: 18,
          zIndex: 1,
          pointerEvents: "none"
        }}>
          {icon}
        </span>
        <select
          style={{
            width: "100%",
            padding: "16px 16px 16px 52px",
            borderRadius: 16,
            border: "2px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(10px)",
            outline: "none",
            fontSize: 15,
            fontWeight: 500,
            color: "#1a1a1a",
            appearance: "none",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxSizing: "border-box",
            cursor: "pointer"
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.style.borderColor = "#667eea"}
          onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.08)"}
        >
          {options.map((option, i) => (
            <option key={i} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={{
          position: "absolute",
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#999",
          fontSize: 14,
          pointerEvents: "none"
        }}>
          ▼
        </span>
      </div>
    </div>
  );
}

export default Settings;
