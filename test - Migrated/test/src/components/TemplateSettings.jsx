// ── Template & Paper Size Settings Section ──
// Drop this inside your Settings.jsx component

import { TEMPLATES } from "./templates/index.js";

export function TemplateSection({ selectedTemplate, onChange }) {
  return (
    <div style={{ marginTop: "36px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: "24px", paddingBottom: "16px",
        borderBottom: "2px solid rgba(103,58,183,0.1)"
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 18
        }}>🧾</div>
        <div>
          <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#1a1a1a" }}>Invoice Template</h3>
          <div style={{ fontSize: 13, color: "#666" }}>Choose how your invoices look when printed</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {Object.values(TEMPLATES).map((tmpl) => {
          const isSelected = selectedTemplate === tmpl.id;
          return (
            <div
              key={tmpl.id}
              onClick={() => onChange(tmpl.id)}
              style={{
                border: isSelected ? "2px solid #7c3aed" : "2px solid rgba(0,0,0,0.08)",
                borderRadius: 16,
                padding: "16px 20px",
                cursor: "pointer",
                background: isSelected ? "rgba(124,58,237,0.05)" : "#fff",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: isSelected ? "0 0 0 4px rgba(124,58,237,0.1)" : "none",
              }}
            >
              <div style={{ fontSize: 28 }}>{tmpl.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: isSelected ? "#4c1d95" : "#111" }}>
                  {tmpl.name}
                </div>
                <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{tmpl.description}</div>
                <div style={{
                  display: "inline-block", marginTop: 6,
                  padding: "2px 8px", borderRadius: 6,
                  background: isSelected ? "#ede9fe" : "#f3f4f6",
                  color: isSelected ? "#5b21b6" : "#666",
                  fontSize: 11, fontWeight: 600,
                }}>
                  {tmpl.paperSize}
                </div>
              </div>
              {isSelected && (
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, padding: "12px 16px", background: "#f3f4f6", borderRadius: 10, fontSize: 12, color: "#666" }}>
        💡 <strong>Tip:</strong> Thermal 80mm is for POS receipt printers. A4 templates work for regular printers and PDF sharing.
      </div>
    </div>
  );
}
