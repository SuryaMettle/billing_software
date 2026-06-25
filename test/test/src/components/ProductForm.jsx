import React, { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

import api from "../services/api.js";

// ── Light Pastel Theme (Notion/Airtable style) — inline, independent of theme.js ──
const lightTheme = {
  bg: "#FAFAF8",
  cardBg: "#FFFFFF",
  surfaceBase: "#F6F5F2",
  surfaceRaised: "#FBFAF8",
  border: "#E8E6E1",
  borderStrong: "#DEDBD4",
  textPrimary: "#2F2F2E",
  textSecondary: "#6F6E69",
  textMuted: "#9B9A94",
  accent: "#7C9CF6",
  accentLight: "#A5B9F9",
  accentGradient: "linear-gradient(135deg, #B8C6FB 0%, #C9B8FB 100%)",
  accentGlow: "0 4px 14px rgba(124,156,246,0.25)",
  success: "#5DAE7E",
  successBg: "#E6F4EA",
  warning: "#D9A23B",
  warningBg: "#FBF1DD",
  warningBorder: "#F0DBA8",
  danger: "#E0746B",
  dangerBg: "#FBEAE8",
  dangerBorder: "#F3CBC6",
};

const cardStyle = {
  background: lightTheme.cardBg,
  border: `1px solid ${lightTheme.border}`,
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const primaryButtonStyle = {
  background: lightTheme.accentGradient,
  color: "#3A3A6E",
  border: "none",
  borderRadius: "10px",
  padding: "10px 18px",
  fontWeight: "700",
  fontSize: "13px",
  cursor: "pointer",
  boxShadow: lightTheme.accentGlow,
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
};

const ghostButtonStyle = {
  background: lightTheme.surfaceBase,
  color: lightTheme.textSecondary,
  border: `1px solid ${lightTheme.border}`,
  borderRadius: "10px",
  padding: "10px 18px",
  fontWeight: "600",
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const inputStyle = {
  background: lightTheme.surfaceRaised,
  border: `1px solid ${lightTheme.border}`,
  borderRadius: "10px",
  padding: "10px 14px",
  fontSize: "14px",
  outline: "none",
  transition: "all 0.15s ease",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

function generateBarcode(productId) {
  const base = `200${String(productId).padStart(8, "0")}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

const fieldLabel = {
  display: "block",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.7px",
  textTransform: "uppercase",
  color: lightTheme.textSecondary,
  marginBottom: "6px",
};

const sectionHeader = {
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: lightTheme.textSecondary,
  marginBottom: "14px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${lightTheme.border}`,
};

function BarcodeDisplay({ barcode, productName }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && barcode) {
      JsBarcode(svgRef.current, barcode, {
        format: "EAN13",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        margin: 8,
        background: "transparent",
        lineColor: lightTheme.textPrimary,
      });
    }
  }, [barcode]);

  const handlePrint = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Barcode - ${productName}</title>
      <style>
        body { display: flex; flex-direction: column; align-items: center;
               justify-content: center; height: 100vh; margin: 0; font-family: Arial; background: #fff; }
        .label { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <div class="label">${productName}</div>
        ${svgData}
        <br/>
        <button onclick="window.print()">🖨 Print</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div style={{
      marginTop: "16px",
      padding: "16px",
      background: lightTheme.surfaceBase,
      borderRadius: "10px",
      border: `1px solid ${lightTheme.border}`,
      textAlign: "center",
    }}>
      <div style={{ ...fieldLabel, marginBottom: "8px" }}>
        Generated Barcode
      </div>
      <div style={{ background: "#fff", borderRadius: "8px", padding: "10px", display: "inline-block", border: `1px solid ${lightTheme.border}` }}>
        <svg ref={svgRef} />
      </div>
      <div style={{ marginTop: "12px" }}>
        <button type="button" onClick={handlePrint} style={primaryButtonStyle}>
          🖨 Print Barcode
        </button>
      </div>
    </div>
  );
}

function ProductForm({ onProductAdded, products = [], onBack }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [unitType, setUnitType] = useState("unit");
  const [parentId, setParentId] = useState("");
  const [conversionFactor, setConversionFactor] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedBarcode, setGeneratedBarcode] = useState(null);
  const [savedProductName, setSavedProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (unitType === "retail") {
      const cf = parseInt(conversionFactor);
      if (!cf || cf < 2) {
        alert("Conversion factor must be 2 or more. It represents how many retail packets come from 1 bulk bag.");
        setIsSubmitting(false);
        return;
      }
    }

    const product = {
      name,
      price: parseFloat(price),
      cost_price: parseFloat(costPrice) || 0,
      tax_rate: parseFloat(taxRate) || 0,
      hsn_code: hsnCode,
      category,
      stock: Number(stock) || 0,
      min_stock: Number(minStock) || 0,
      unit_type: unitType,
      parent_id: unitType === "retail" ? parseInt(parentId) : null,
      conversion_factor: unitType === "retail" ? (parseInt(conversionFactor) || 1) : 1,
      barcode: barcode.trim(),
      expiry_date: expiryDate,
    };

    const res = await api.addProduct(product);

    if (res.success) {
      const finalBarcode = barcode.trim() || generateBarcode(res.id);

      await api.saveProductBarcode({
        id: res.id,
        barcode: finalBarcode,
      });

      setGeneratedBarcode(finalBarcode);
      setSavedProductName(name);

      setName("");
      setPrice("");
      setTaxRate("");
      setHsnCode("");
      setCategory("");
      setStock("");
      setMinStock("");
      setCostPrice("");
      setBarcode("");
      setExpiryDate("");
      setUnitType("unit");
      setParentId("");
      setConversionFactor(1);
      onProductAdded();
    }

    setIsSubmitting(false);
  };

  const focusHandlers = {
    onFocus: (e) => {
      e.target.style.borderColor = lightTheme.accent;
      e.target.style.boxShadow = `0 0 0 3px rgba(124,156,246,0.15)`;
      e.target.style.background = "#fff";
    },
    onBlur: (e) => {
      e.target.style.borderColor = lightTheme.border;
      e.target.style.boxShadow = "none";
      e.target.style.background = lightTheme.surfaceRaised;
    },
  };

  const labeledInput = (label, props) => (
    <div>
      <label style={fieldLabel}>{label}</label>
      <input
        {...props}
        {...focusHandlers}
        style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary }}
      />
    </div>
  );

  const labeledSelect = (label, props, children) => (
    <div>
      <label style={fieldLabel}>{label}</label>
      <div style={{ position: "relative" }}>
        <select
          {...props}
          {...focusHandlers}
          style={{ ...selectStyle, width: "100%", color: lightTheme.textPrimary, paddingRight: "28px" }}
        >
          {children}
        </select>
        <span style={{
          position: "absolute", right: "10px", top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none",
          color: lightTheme.textMuted, fontSize: "10px",
        }}>▼</span>
      </div>
    </div>
  );

  return (
    <div style={{
      marginTop: "10px",
      background: lightTheme.bg,
      padding: "20px",
      borderRadius: "16px",
      minHeight: "calc(100vh - 40px)",
    }}>
      {onBack && (
        <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <button type="button" onClick={onBack} style={ghostButtonStyle}>
            ← Back
          </button>
        </div>
      )}

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <form onSubmit={handleSubmit} style={cardStyle}>
          {/* Header */}
          <div style={{ marginBottom: "22px", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: lightTheme.accentGradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", boxShadow: lightTheme.accentGlow,
            }}>📦</div>
            <h2 style={{ margin: 0, fontWeight: "800", fontSize: "20px", color: lightTheme.textPrimary, letterSpacing: "0.3px" }}>
              Add New Product
            </h2>
          </div>

          {/* ROW 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "18px" }}>
            {labeledInput("Product Name", {
              type: "text", placeholder: "Enter product name",
              value: name, onChange: (e) => setName(e.target.value), required: true,
            })}
            {labeledInput("Selling Price", {
              type: "number", placeholder: "₹ 0.00",
              value: price, onChange: (e) => setPrice(e.target.value), required: true,
            })}
            {labeledSelect("Category", {
              value: category, onChange: (e) => setCategory(e.target.value),
            }, <>
              <option value="">Select Category</option>
              <option value="Grocery">🛒 Grocery</option>
              <option value="Dairy">🥛 Dairy</option>
              <option value="Snacks & Packed">🍫 Snacks & Packed</option>
              <option value="Household">🏠 Household</option>
              <option value="Electronics">🔌 Electronics</option>
            </>)}
          </div>

          {/* ROW 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "18px" }}>
            {labeledInput("HSN/SAC Code", {
              type: "text", placeholder: "Enter HSN/SAC code",
              value: hsnCode, onChange: (e) => setHsnCode(e.target.value),
            })}
            {labeledSelect("GST Rate", {
              value: taxRate, onChange: (e) => setTaxRate(e.target.value),
            }, <>
              <option value="">Select GST</option>
              <option value="0">❌ 0% — Exempt</option>
              <option value="5">💰 5%</option>
              <option value="12">💰 12%</option>
              <option value="18">💰 18%</option>
              <option value="28">💰 28%</option>
            </>)}
            {labeledInput("Cost Price", {
              type: "number", placeholder: "₹ 0.00",
              value: costPrice, onChange: (e) => setCostPrice(e.target.value),
            })}
          </div>

          {/* ROW 3 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "18px" }}>
            {labeledInput("Current Stock", {
              type: "number", placeholder: "0",
              value: stock, onChange: (e) => setStock(e.target.value),
            })}
            {labeledInput("Min Stock Alert", {
              type: "number", placeholder: "10",
              value: minStock, onChange: (e) => setMinStock(e.target.value),
            })}
            {labeledInput("Barcode", {
              type: "text", placeholder: "Scan or type barcode",
              value: barcode, onChange: (e) => setBarcode(e.target.value),
            })}
            <div>
              <label style={fieldLabel}>Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                {...focusHandlers}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary, colorScheme: "light" }}
              />
            </div>
          </div>

          {/* Unit Configuration */}
          <div style={{
            background: lightTheme.surfaceBase,
            border: `1px solid ${lightTheme.border}`,
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}>
            <div style={sectionHeader}>📏 Unit Configuration</div>
            <div style={{ display: "grid", gridTemplateColumns: unitType === "retail" ? "repeat(3, 1fr)" : "1fr", gap: "16px" }}>
              {labeledSelect("Unit Type", {
                value: unitType, onChange: (e) => setUnitType(e.target.value),
              }, <>
                <option value="unit">📦 Standard Unit</option>
                <option value="bulk">🛍️ Bulk Item</option>
                <option value="retail">📱 Retail Packet</option>
              </>)}

              {unitType === "retail" && (
                <>
                  {labeledSelect("Link to Bulk Parent", {
                    value: parentId, onChange: (e) => setParentId(e.target.value), required: true,
                  }, <>
                    <option value="">Select Bulk Product</option>
                    {products.filter(p => p.unit_type === "bulk").map(bulk => (
                      <option key={bulk.id} value={bulk.id}>{bulk.name} ({bulk.unit_type})</option>
                    ))}
                  </>)}

                  <div>
                    <label style={fieldLabel}>Conversion Factor</label>
                    <input
                      type="number"
                      value={conversionFactor}
                      onChange={(e) => {
                        const v = Math.floor(Number(e.target.value));
                        setConversionFactor(v > 0 ? v : "");
                      }}
                      placeholder="e.g. 50"
                      min="2"
                      step="1"
                      {...focusHandlers}
                      style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary }}
                    />
                    <div style={{ fontSize: "11px", color: lightTheme.textMuted, marginTop: "5px" }}>
                      How many packets in 1 bulk bag?
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                ...primaryButtonStyle,
                padding: "14px 40px",
                fontSize: "15px",
                borderRadius: "50px",
                minWidth: "220px",
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Adding Product..." : "✨ Add Product"}
            </button>
          </div>
        </form>

        {generatedBarcode && (
          <div style={{ maxWidth: "500px", margin: "20px auto 0" }}>
            <BarcodeDisplay barcode={generatedBarcode} productName={savedProductName} />
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <button onClick={() => setGeneratedBarcode(null)} style={ghostButtonStyle}>
                ✕ Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductForm;