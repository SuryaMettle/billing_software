import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

import api from "../services/api.js";

const lightTheme = {
  bg: "#FAFAF8",
  cardBg: "#FFFFFF",
  cardBgSolid: "#FFFFFF",
  surfaceBase: "#F6F5F2",
  surfaceRaised: "#FBFAF8",
  surfaceHighlight: "#FFFFFF",
  border: "#E8E6E1",
  borderStrong: "#DEDBD4",
  textPrimary: "#2F2F2E",
  textSecondary: "#6F6E69",
  textMuted: "#9B9A94",
  accent: "#7C9CF6",
  accentLight: "#7C9CF6",
  accentGradient: "linear-gradient(135deg, #B8C6FB 0%, #C9B8FB 100%)",
  accentGlow: "0 4px 14px rgba(124,156,246,0.25)",
  success: "#4F9D6E",
  successBg: "#E6F4EA",
  warning: "#C98A2B",
  warningBg: "#FBF1DD",
  warningBorder: "#F0DBA8",
  danger: "#D8635A",
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

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(60,55,70,0.25)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
};

const modalCard = {
  background: lightTheme.cardBgSolid,
  borderRadius: "16px",
  padding: "24px",
  width: "360px",
  boxShadow: "0 24px 64px rgba(60,55,70,0.18)",
  border: `1px solid ${lightTheme.borderStrong}`,
};

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return { label: "No expiry", color: lightTheme.textMuted, background: lightTheme.surfaceBase };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return { label: "Invalid expiry", color: lightTheme.warning, background: lightTheme.warningBg };
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Expired", color: lightTheme.danger, background: lightTheme.dangerBg };
  if (daysLeft <= 30) return { label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, color: lightTheme.warning, background: lightTheme.warningBg };
  return { label: expiryDate, color: lightTheme.success, background: lightTheme.successBg };
}

function BarcodeModal({ product, onClose }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && product.barcode) {
      JsBarcode(svgRef.current, product.barcode, {
        format: "CODE128", width: 2, height: 60,
        displayValue: true, fontSize: 12, margin: 8,
      });
    }
  }, [product.barcode]);

  const handlePrint = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Barcode - ${product.name}</title>
      <style>
        body { display: flex; flex-direction: column; align-items: center;
               justify-content: center; height: 100vh; margin: 0; font-family: Arial; background: #fff; }
        .label { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <div class="label">${product.name}</div>
        ${svgData}<br/>
        <button onclick="window.print()">🖨 Print</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div onClick={onClose} style={{ ...modalOverlay, zIndex: 3000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, width: "380px", textAlign: "center" }}>
        <h3 style={{ margin: "0 0 6px 0", color: lightTheme.textPrimary, fontWeight: "800" }}>🔖 Barcode</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: lightTheme.textSecondary }}>{product.name}</p>
        {product.barcode ? (
          <>
            <div style={{ background: "#fff", borderRadius: "8px", padding: "10px", display: "inline-block", border: `1px solid ${lightTheme.border}` }}>
              <svg ref={svgRef} />
            </div>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={handlePrint} style={primaryButtonStyle}>🖨 Print</button>
              <button onClick={onClose} style={ghostButtonStyle}>Close</button>
            </div>
          </>
        ) : (
          <div style={{ color: lightTheme.textMuted, padding: "20px", fontSize: "13px" }}>
            No barcode generated yet.<br /><small>Edit and save the product to generate one.</small>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const labeledInput = (label, props, extra = {}) => (
  <div>
    <label style={fieldLabel}>{label}</label>
    <input
      {...props}
      style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary, ...extra }}
    />
  </div>
);

const labeledSelect = (label, props, children) => (
  <div>
    <label style={fieldLabel}>{label}</label>
    <div style={{ position: "relative" }}>
      <select
        {...props}
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

function EditModal({ product, onClose, onSave, products }) {
  const [form, setForm] = useState({ ...product });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const generateBarcode = () => {
    handleChange("barcode", `PRD${String(form.id).padStart(8, "0")}`);
  };

  const handleSave = async () => {
    await onSave({ ...form, cost_price: Number(form.cost_price), barcode: form.barcode || "", expiry_date: form.expiry_date || "" });
  };

  return (
    <div onClick={onClose} style={{ ...modalOverlay, alignItems: "center", overflowY: "auto", padding: "20px" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: lightTheme.cardBg,
          borderRadius: "16px",
          padding: "24px",
          width: "780px",
          maxWidth: "95vw",
          boxShadow: "0 24px 64px rgba(60,55,70,0.18)",
          border: `1px solid ${lightTheme.borderStrong}`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: lightTheme.accentGradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", boxShadow: lightTheme.accentGlow,
          }}>✏️</div>
          <h3 style={{ margin: 0, color: lightTheme.textPrimary, fontWeight: "800", fontSize: "18px" }}>Edit Product</h3>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: lightTheme.dangerBg, border: `1px solid ${lightTheme.dangerBorder}`,
              fontSize: "14px", cursor: "pointer", color: lightTheme.danger,
              width: "30px", height: "30px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✖</button>
        </div>

        {/* ROW 1 — Name, Price, Cost Price */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "14px" }}>
          {labeledInput("Product Name", { type: "text", value: form.name, onChange: (e) => handleChange("name", e.target.value) })}
          {labeledInput("Selling Price", { type: "number", value: form.price, onChange: (e) => handleChange("price", e.target.value) })}
          {labeledInput("Cost Price", { type: "number", value: form.cost_price || 0, onChange: (e) => handleChange("cost_price", e.target.value) })}
        </div>

        {/* ROW 2 — Category, HSN, GST */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "14px" }}>
          {labeledInput("Category", { type: "text", value: form.category || "", onChange: (e) => handleChange("category", e.target.value) })}
          {labeledInput("HSN / SAC Code", { type: "text", value: form.hsn_code || "", onChange: (e) => handleChange("hsn_code", e.target.value) })}
          {labeledSelect("GST Rate",
            { value: form.tax_rate ?? "", onChange: (e) => handleChange("tax_rate", e.target.value) },
            <>
              <option value="">Select GST</option>
              <option value="0">0% — Exempt</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </>
          )}
        </div>

        {/* ROW 3 — Stock, Min Stock, Expiry */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "14px" }}>
          {labeledInput("Stock", { type: "number", value: form.stock || 0, onChange: (e) => handleChange("stock", e.target.value) })}
          {labeledInput("Minimum Stock", { type: "number", value: form.min_stock || 0, onChange: (e) => handleChange("min_stock", e.target.value) })}
          <div>
            <label style={fieldLabel}>Expiry Date</label>
            <input
              type="date"
              value={form.expiry_date || ""}
              onChange={(e) => handleChange("expiry_date", e.target.value)}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary, colorScheme: "light" }}
            />
          </div>
        </div>

        {/* ROW 4 — Barcode (full width with generate button) */}
        <div style={{ marginBottom: "14px" }}>
          <label style={fieldLabel}>Barcode</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={form.barcode || ""}
              onChange={(e) => handleChange("barcode", e.target.value)}
              placeholder="Scan or type barcode"
              style={{ ...inputStyle, flex: 1, color: lightTheme.textPrimary }}
            />
            <button type="button" onClick={generateBarcode} style={ghostButtonStyle}>Generate</button>
          </div>
        </div>

        {/* Unit Configuration */}
        <div style={{
          background: lightTheme.surfaceBase,
          border: `1px solid ${lightTheme.border}`,
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "18px",
        }}>
          <div style={sectionHeader}>📏 Unit Configuration</div>
          <div style={{ display: "grid", gridTemplateColumns: form.unit_type === "retail" ? "repeat(3, 1fr)" : "1fr", gap: "14px" }}>
            {labeledSelect("Unit Type",
              { value: form.unit_type || "unit", onChange: (e) => handleChange("unit_type", e.target.value) },
              <>
                <option value="unit">📦 Standard Unit</option>
                <option value="bulk">🛍️ Bulk Item</option>
                <option value="retail">📱 Retail Packet</option>
              </>
            )}
            {form.unit_type === "retail" && (
              <>
                {labeledInput("Parent Product ID", {
                  type: "number",
                  value: form.parent_id || "",
                  onChange: (e) => handleChange("parent_id", e.target.value),
                })}
                {labeledInput("Conversion Factor", {
                  type: "number", min: "2", step: "1",
                  value: form.conversion_factor || 1,
                  onChange: (e) => {
                    const v = Math.floor(Number(e.target.value));
                    handleChange("conversion_factor", v > 0 ? v : "");
                  },
                })}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose} style={ghostButtonStyle}>Cancel</button>
          <button onClick={handleSave} style={primaryButtonStyle}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function ProductList({ products, onDelete, onProductAdded, onCreateProduct }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitTypeFilter, setUnitTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [convertProduct, setConvertProduct] = useState(null);
  const [bagsToConvert, setBagsToConvert] = useState("1");
  const [catOpen, setCatOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const catRef = useRef(null);
  const typeRef = useRef(null);
  const itemsPerPage = 10;
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection("asc"); }
    setCurrentPage(1);
  };

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "" || p.category === categoryFilter;
    const matchesUnitType = unitTypeFilter === "" || p.unit_type === unitTypeFilter;
    const matchesLowStock = !lowStockOnly || ((p.stock ?? 0) <= (p.min_stock ?? 0) && p.stock > 0);
    return matchesSearch && matchesCategory && matchesUnitType && matchesLowStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;
    let valA = a[sortField], valB = b[sortField];
    if (sortField === "price" || sortField === "stock") {
      valA = Number(valA) || 0; valB = Number(valB) || 0;
      return sortDirection === "asc" ? valA - valB : valB - valA;
    }
    valA = String(valA || "").toLowerCase(); valB = String(valB || "").toLowerCase();
    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    const handler = () => onProductAdded();
    ["invoice-updated", "purchase-updated", "stock-updated", "product-updated"].forEach(ev => window.addEventListener(ev, handler));
    return () => ["invoice-updated", "purchase-updated", "stock-updated", "product-updated"].forEach(ev => window.removeEventListener(ev, handler));
  }, []);

  useEffect(() => {
  const handler = (e) => {
    if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
    if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false);
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, []);

  const handleConvertFromBulk = async () => {
    if (!convertProduct) return;
    const bags = Number(bagsToConvert);
    if (!bags || bags <= 0) { alert("Please enter a valid number."); return; }
    const bulkProduct = products.find((p) => Number(p.id) === Number(convertProduct.parent_id));
    if (!bulkProduct) { alert("Parent bulk product not found."); return; }
    const currentBulkStock = Number(bulkProduct.stock || 0);
    const currentRetailStock = Number(convertProduct.stock || 0);
    const conversionFactor = Number(convertProduct.conversion_factor || 1);
    if (currentBulkStock < bags) { alert("Not enough bulk stock."); return; }
    const newBulkStock = currentBulkStock - bags;
    const newRetailStock = currentRetailStock + bags * conversionFactor;
    await api.updateProduct({ ...bulkProduct, stock: newBulkStock });
    await api.updateProduct({ ...convertProduct, stock: newRetailStock });
    setConvertProduct(null); setBagsToConvert("1");
    await onProductAdded();
    alert(`Converted ${bags} bulk bag(s).\n\n${bulkProduct.name}: ${currentBulkStock} → ${newBulkStock}\n${convertProduct.name}: ${currentRetailStock} → ${newRetailStock}`);
  };

  const actionBtnStyle = {
    padding: "6px 12px", borderRadius: "7px", border: `1px solid ${lightTheme.border}`,
    background: lightTheme.surfaceRaised, color: lightTheme.textPrimary,
    cursor: "pointer", fontWeight: "600", fontSize: "12px", transition: "all 0.15s",
  };

  const dangerBtnStyle = {
    ...actionBtnStyle, border: `1px solid ${lightTheme.dangerBorder}`,
    background: lightTheme.dangerBg, color: lightTheme.danger,
  };

  const selectFilterStyle = { ...selectStyle, color: lightTheme.textPrimary, paddingRight: "32px" };

  return (
    <>
      <style>{`
  .product-search-input::placeholder { color: ${lightTheme.textMuted}; opacity: 1; }
  .fb-select-wrap { position: relative; display: inline-flex; align-items: center; }
  .fb-select-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 15px; color: ${lightTheme.textSecondary}; pointer-events: none; z-index: 1; }
  .fb-caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 10px; color: ${lightTheme.textMuted}; pointer-events: none; }
  .fb-divider { width: 1px; height: 26px; background: ${lightTheme.border}; flex-shrink: 0; }
  .fb-clear-btn { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); background: none; border: none; color: ${lightTheme.textMuted}; cursor: pointer; font-size: 12px; padding: 2px 4px; border-radius: 4px; line-height: 1; }
  .fb-clear-btn:hover { color: ${lightTheme.danger}; }
  .fb-reset-btn:hover { background: ${lightTheme.surfaceBase} !important; color: ${lightTheme.textPrimary} !important; border-color: ${lightTheme.borderStrong} !important; }
`}</style>
      <div style={{
        width: "100%", minHeight: "100vh", background: lightTheme.bg,
        textAlign: "left", display: "flex", flexDirection: "column",
        padding: "20px", boxSizing: "border-box", borderRadius: "16px",
      }}>
        <div style={{ width: "100%", maxWidth: "none" }}>

          {/* Filter Bar */}
<div style={{ background: lightTheme.cardBg, border: `0.5px solid ${lightTheme.border}`, borderRadius: "999px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>

  {/* Search pill */}
  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 14px", borderRadius: "999px", border: `0.5px solid ${lightTheme.borderStrong}`, background: lightTheme.surfaceRaised, flex: 1, minWidth: "200px", maxWidth: "300px" }}
    onFocus={(e) => { e.currentTarget.style.borderColor = lightTheme.accent; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,156,246,0.12)"; e.currentTarget.style.background = lightTheme.cardBg; }}
    onBlur={(e) => { e.currentTarget.style.borderColor = lightTheme.borderStrong; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = lightTheme.surfaceRaised; }}
  >
    <i className="ti ti-search" style={{ fontSize: "15px", color: lightTheme.textMuted, flexShrink: 0 }} aria-hidden="true" />
    <input
      type="text"
      placeholder="Search products..."
      value={search}
      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
      style={{ border: "none", background: "transparent", fontSize: "13px", color: lightTheme.textPrimary, outline: "none", width: "100%", lineHeight: "normal" }}
    />
    {search && (
      <button onClick={() => { setSearch(""); setCurrentPage(1); }} style={{ background: "none", border: "none", color: lightTheme.textMuted, cursor: "pointer", fontSize: "12px", padding: 0, lineHeight: 1 }}>✕</button>
    )}
  </div>

  {/* Separator */}
  <div style={{ width: "1px", height: "22px", background: lightTheme.border, flexShrink: 0, margin: "0 2px" }} />

  {/* Category pill */}
  <div ref={catRef} style={{ position: "relative" }}>
  <div
    onClick={() => { setCatOpen(v => !v); setTypeOpen(false); }}
    style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 13px", borderRadius: "999px", border: categoryFilter ? `0.5px solid ${lightTheme.accent}` : `0.5px solid ${lightTheme.borderStrong}`, background: categoryFilter ? "rgba(124,156,246,0.10)" : lightTheme.surfaceRaised, fontSize: "13px", color: categoryFilter ? "#3A3A6E" : lightTheme.textSecondary, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", transition: "all 0.15s" }}
  >
    <i className="ti ti-tag" style={{ fontSize: "15px" }} aria-hidden="true" />
    {categoryFilter || "All categories"}
    <i className="ti ti-chevron-down" style={{ fontSize: "11px", opacity: 0.5, transform: catOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} aria-hidden="true" />
  </div>
  {catOpen && (
    <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: lightTheme.cardBg, border: `1px solid ${lightTheme.border}`, borderRadius: "14px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 200, minWidth: "180px", overflow: "hidden", padding: "6px" }}>
      {["", ...categories].map((c) => (
        <div
          key={c}
          onClick={() => { setCategoryFilter(c); setCatOpen(false); setCurrentPage(1); }}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", background: categoryFilter === c ? "rgba(124,156,246,0.12)" : "transparent", color: categoryFilter === c ? "#3A3A6E" : lightTheme.textPrimary, fontWeight: categoryFilter === c ? "600" : "400", transition: "background 0.1s" }}
          onMouseEnter={(e) => { if (categoryFilter !== c) e.currentTarget.style.background = lightTheme.surfaceBase; }}
          onMouseLeave={(e) => { if (categoryFilter !== c) e.currentTarget.style.background = "transparent"; }}
        >
          {categoryFilter === c && <i className="ti ti-check" style={{ fontSize: "13px", color: lightTheme.accent }} aria-hidden="true" />}
          {categoryFilter !== c && <span style={{ width: "13px" }} />}
          {c === "" ? "All categories" : c}
        </div>
      ))}
    </div>
  )}
</div>

  {/* Type pill */}
  <div ref={typeRef} style={{ position: "relative" }}>
  <div
    onClick={() => { setTypeOpen(v => !v); setCatOpen(false); }}
    style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 13px", borderRadius: "999px", border: unitTypeFilter ? `0.5px solid ${lightTheme.accent}` : `0.5px solid ${lightTheme.borderStrong}`, background: unitTypeFilter ? "rgba(124,156,246,0.10)" : lightTheme.surfaceRaised, fontSize: "13px", color: unitTypeFilter ? "#3A3A6E" : lightTheme.textSecondary, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", transition: "all 0.15s" }}
  >
    <i className="ti ti-package" style={{ fontSize: "15px" }} aria-hidden="true" />
    {unitTypeFilter === "" ? "All types" : unitTypeFilter === "bulk" ? "Bulk items" : unitTypeFilter === "retail" ? "Retail packets" : "Standard units"}
    <i className="ti ti-chevron-down" style={{ fontSize: "11px", opacity: 0.5, transform: typeOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} aria-hidden="true" />
  </div>
  {typeOpen && (
    <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: lightTheme.cardBg, border: `1px solid ${lightTheme.border}`, borderRadius: "14px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 200, minWidth: "180px", overflow: "hidden", padding: "6px" }}>
      {[
        { value: "", label: "All types", icon: "ti-layout-grid" },
        { value: "bulk", label: "Bulk items", icon: "ti-archive" },
        { value: "retail", label: "Retail packets", icon: "ti-shopping-bag" },
        { value: "unit", label: "Standard units", icon: "ti-box" },
      ].map(({ value, label, icon }) => (
        <div
          key={value}
          onClick={() => { setUnitTypeFilter(value); setTypeOpen(false); setCurrentPage(1); }}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", background: unitTypeFilter === value ? "rgba(124,156,246,0.12)" : "transparent", color: unitTypeFilter === value ? "#3A3A6E" : lightTheme.textPrimary, fontWeight: unitTypeFilter === value ? "600" : "400", transition: "background 0.1s" }}
          onMouseEnter={(e) => { if (unitTypeFilter !== value) e.currentTarget.style.background = lightTheme.surfaceBase; }}
          onMouseLeave={(e) => { if (unitTypeFilter !== value) e.currentTarget.style.background = "transparent"; }}
        >
          <i className={`ti ${icon}`} style={{ fontSize: "14px", color: unitTypeFilter === value ? lightTheme.accent : lightTheme.textMuted }} aria-hidden="true" />
          {label}
          {unitTypeFilter === value && <i className="ti ti-check" style={{ fontSize: "13px", color: lightTheme.accent, marginLeft: "auto" }} aria-hidden="true" />}
        </div>
      ))}
    </div>
  )}
</div>

  {/* Separator */}
  <div style={{ width: "1px", height: "22px", background: lightTheme.border, flexShrink: 0, margin: "0 2px" }} />

  {/* Low Stock */}
  <button onClick={() => { setLowStockOnly((v) => !v); setCurrentPage(1); }}
    style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 13px", borderRadius: "999px", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s", border: lowStockOnly ? "none" : `0.5px solid ${lightTheme.warningBorder}`, background: lowStockOnly ? lightTheme.warning : lightTheme.warningBg, color: lowStockOnly ? "#FAEEDA" : "#854F0B" }}>
    <i className="ti ti-alert-triangle" style={{ fontSize: "14px" }} aria-hidden="true" />
    Low stock
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", padding: "0 5px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", background: "rgba(0,0,0,0.12)", color: "inherit", lineHeight: 1 }}>
      {products.filter(p => (p.stock ?? 0) <= (p.min_stock ?? 0) && p.stock > 0).length}
    </span>
  </button>

  {/* Reset */}
  <button onClick={() => { setSearch(""); setCategoryFilter(""); setUnitTypeFilter(""); setLowStockOnly(false); setCurrentPage(1); }}
    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "999px", border: `0.5px solid ${lightTheme.borderStrong}`, background: "transparent", fontSize: "13px", color: lightTheme.textMuted, cursor: "pointer", transition: "all 0.15s" }}
    onMouseEnter={(e) => { e.currentTarget.style.color = lightTheme.danger; e.currentTarget.style.borderColor = lightTheme.dangerBorder; e.currentTarget.style.background = lightTheme.dangerBg; }}
    onMouseLeave={(e) => { e.currentTarget.style.color = lightTheme.textMuted; e.currentTarget.style.borderColor = lightTheme.borderStrong; e.currentTarget.style.background = "transparent"; }}>
    <i className="ti ti-filter-off" style={{ fontSize: "14px" }} aria-hidden="true" />
    Reset
  </button>

</div>

          {/* Title + Create */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: lightTheme.accentGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: lightTheme.accentGlow }}>📋</div>
              <h2 style={{ margin: 0, color: lightTheme.textPrimary, fontWeight: "800", fontSize: "20px" }}>Product List</h2>
            </div>
            <button type="button" onClick={onCreateProduct} style={primaryButtonStyle}>+ Create Product</button>
          </div>

          {/* Table */}
          <div style={{ ...cardStyle, padding: 0, width: "100%", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{
  display: "grid",
  gridTemplateColumns: "0.5fr 3fr 1fr 1fr 1.2fr 1.5fr 2fr",
  padding: "10px 16px",
  background: "linear-gradient(135deg, #B8C6FB 0%, #C9B8FB 100%)",
  borderBottom: `1px solid ${lightTheme.border}`,
}}>
  {[
  { label: "ID",       icon: "ti-hash" },
  { label: "Product",  icon: "ti-box",            field: "name" },
  { label: "Price",    icon: "ti-currency-rupee", field: "price" },
  { label: "Stock",    icon: "ti-stack",           field: "stock" },
  { label: "Category", icon: "ti-tag",             field: "category" },
  { label: "Expiry",   icon: "ti-calendar" },
  { label: "Actions",  icon: "ti-settings" },
].map(({ label, icon, field }) => {
  const isActive = sortField === field;
  const isSortable = !!field;
  return (
    <div
      key={label}
      onClick={() => isSortable && handleSort(field)}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        cursor: isSortable ? "pointer" : "default",
        userSelect: "none",
        fontSize: "11px", fontWeight: "700",
        letterSpacing: "0.5px", textTransform: "uppercase",
        color: isActive ? "#26215C" : "#534AB7",
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: "13px", opacity: 0.85 }} aria-hidden="true" />
      {label}
      {isSortable && (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "16px", height: "16px", borderRadius: "4px", fontSize: "10px",
          background: isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)",
          color: isActive ? "#26215C" : "#534AB7",
          fontWeight: "900",
        }}>
          {isActive ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      )}
    </div>
  );
})}
</div>

            {filteredProducts.length === 0 && <p style={{ padding: "24px", color: lightTheme.textMuted, margin: 0, textAlign: "center" }}>No products found</p>}

            <div style={{ maxHeight: "calc(100vh - 330px)", overflowY: "auto", scrollBehavior: "smooth" }}>
              {paginatedProducts.map((p) => (
                <div key={p.id}
                  style={{ display: "grid", gridTemplateColumns: "0.5fr 3fr 1fr 1fr 1.2fr 1.5fr 2fr", padding: "12px 16px", borderBottom: `1px solid ${lightTheme.border}`, alignItems: "center", transition: "background 0.15s ease", textAlign: "left" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,156,246,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ color: lightTheme.textMuted, fontSize: "13px" }}>#{p.id}</div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div>
                      <span style={{ color: lightTheme.textPrimary, fontWeight: "500", fontSize: "17px" }}>{p.name}</span>
                      {(p.stock ?? 0) <= (p.min_stock ?? 0) && p.stock > 0 && (
                        <span style={{ color: lightTheme.warning, marginLeft: "8px", fontSize: "11px", fontWeight: "700", background: lightTheme.warningBg, padding: "2px 7px", borderRadius: "6px", border: `1px solid ${lightTheme.warningBorder}` }}>⚠ Low</span>
                      )}
                    </div>
                    {p.unit_type === "retail" && p.parent_name && (
                      <div style={{ fontSize: "11px", color: lightTheme.accentLight, background: "rgba(124,156,246,0.1)", padding: "2px 7px", borderRadius: "6px", marginTop: "4px", width: "fit-content", border: "1px solid rgba(124,156,246,0.25)" }}>📦 Derived from: {p.parent_name}</div>
                    )}
                    {p.unit_type === "bulk" && <span style={{ fontSize: "10px", color: lightTheme.success, fontWeight: "700", marginTop: "4px", letterSpacing: "0.5px" }}>BULK SOURCE</span>}
                  </div>
                  <div style={{ color: lightTheme.textSecondary, fontSize: "13px" }}>₹{p.price}</div>
                  <div style={{ color: lightTheme.textSecondary, fontSize: "13px" }}>{p.stock ?? 0}</div>
                  <div style={{ color: lightTheme.textSecondary, fontSize: "13px" }}>{p.category || "-"}</div>
                  <div>
                    {(() => {
                      const expiry = getExpiryStatus(p.expiry_date);
                      return <span style={{ fontSize: "12px", fontWeight: "700", color: expiry.color, background: expiry.background, padding: "4px 10px", borderRadius: "999px", border: `1px solid ${expiry.color}33` }}>{expiry.label}</span>;
                    })()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
  
  {/* Top row — always View, Edit, Delete */}
  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
    <button
      onClick={() => setViewProduct(p)}
      style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: "#E6F1FB", color: "#0C447C", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#B5D4F4"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#E6F1FB"; }}
    >View</button>

    <button
      onClick={() => setEditingProduct(p)}
      style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: "#EAF3DE", color: "#27500A", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#C0DD97"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#EAF3DE"; }}
    >Edit</button>

    <div style={{ width: "1px", height: "18px", background: "#e0e0e0", margin: "0 2px" }} />

    <button
  onClick={() => setDeleteConfirm(p)}
  style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: "#FCEBEB", color: "#791F1F", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s" }}
  onMouseEnter={(e) => { e.currentTarget.style.background = "#F7C1C1"; }}
  onMouseLeave={(e) => { e.currentTarget.style.background = "#FCEBEB"; }}
>Delete</button>
  </div>

  {/* Second row — Convert only if retail */}
  {p.unit_type === "retail" && (
    <button
      type="button"
      onClick={() => { setConvertProduct(p); setBagsToConvert("1"); }}
      style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: "#FAEEDA", color: "#633806", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#FAC775"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#FAEEDA"; }}
    >Convert</button>
  )}

</div>
                </div>
              ))}
            </div>

            {filteredProducts.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", padding: "14px", borderTop: `1px solid ${lightTheme.border}` }}>
                <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ ...ghostButtonStyle, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Previous</button>
                <span style={{ fontWeight: "700", color: lightTheme.textPrimary, fontSize: "13px" }}>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ ...ghostButtonStyle, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next</button>
              </div>
            )}
          </div>

          {/* Edit Modal — wide, no scroll */}
          {editingProduct && (
            <EditModal
              product={editingProduct}
              products={products}
              onClose={() => setEditingProduct(null)}
              onSave={async (updated) => {
                await api.updateProduct(updated);
                setEditingProduct(null);
                onProductAdded();
              }}
            />
          )}

          {/* View Modal */}
          {viewProduct && (() => {
            const price = Number(viewProduct.price || 0);
            const cost = Number(viewProduct.cost_price || 0);
            const profit = price - cost;
            const profitPercent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : 0;
            const row = (label, value, valueStyle = {}) => (
              <>
                <strong style={{ color: lightTheme.textSecondary, fontSize: "13px", fontWeight: "600" }}>{label}</strong>
                <span style={{ textAlign: "right", color: lightTheme.textPrimary, fontSize: "13px", ...valueStyle }}>{value}</span>
              </>
            );
            return (
              <div onClick={() => setViewProduct(null)} style={modalOverlay}>
                <div onClick={(e) => e.stopPropagation()} style={modalCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h3 style={{ margin: 0, color: lightTheme.textPrimary, fontWeight: "800" }}>Product Details</h3>
                    <button onClick={() => setViewProduct(null)} style={{ background: lightTheme.dangerBg, border: `1px solid ${lightTheme.dangerBorder}`, fontSize: "14px", cursor: "pointer", color: lightTheme.danger, width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✖</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "10px", columnGap: "20px", alignItems: "center" }}>
                    {row("Name", viewProduct.name)}
                    {row("Price", `₹${price}`)}
                    {row("Cost Price", `₹${cost}`)}
                    {row("Profit / Unit", `₹${profit}`, { fontWeight: "800", color: profit > 0 ? lightTheme.success : lightTheme.danger })}
                    {row("Profit %", `${profit > 0 ? "+" : ""}${profitPercent}%`, { fontWeight: "800", color: profit > 0 ? lightTheme.success : lightTheme.danger })}
                    {row("Category", viewProduct.category || "-")}
                    {row("Stock", viewProduct.stock ?? 0)}
                    {row("Min Stock", viewProduct.min_stock ?? 0)}
                    {row("HSN / SAC", viewProduct.hsn_code || "-")}
                    {row("GST Rate", `${viewProduct.tax_rate ?? 0}%`)}
                    {row("Expiry", viewProduct.expiry_date || "No expiry")}
                    {row("Unit Type", viewProduct.unit_type || "Standard", { textTransform: "capitalize" })}
                    {viewProduct.unit_type === "retail" && viewProduct.parent_name && (
                      <>{row("Parent Bulk", viewProduct.parent_name, { color: lightTheme.accentLight, fontWeight: "700" })}{row("Conv. Factor", `1 Bag = ${viewProduct.conversion_factor} units`)}</>
                    )}
                    <div style={{ gridColumn: "1 / -1", marginTop: "10px", textAlign: "center" }}>
                      <button onClick={() => { setViewProduct(null); setBarcodeProduct(viewProduct); }} style={primaryButtonStyle}>🔖 View Barcode</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Convert Modal */}
          {convertProduct && (
            <div onClick={() => setConvertProduct(null)} style={{ ...modalOverlay, zIndex: 2500 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, width: "340px" }}>
                <h3 style={{ marginTop: 0, color: lightTheme.textPrimary, fontWeight: "800" }}>Convert Stock</h3>
                <p style={{ fontSize: "13px", color: lightTheme.textSecondary }}>Convert bulk stock into retail units for <strong style={{ color: lightTheme.textPrimary }}>{convertProduct.name}</strong>.</p>
                <label style={fieldLabel}>Bulk bags to convert</label>
                <input type="number" min="1" value={bagsToConvert} onChange={(e) => setBagsToConvert(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: "16px", color: lightTheme.textPrimary }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" onClick={() => setConvertProduct(null)} style={ghostButtonStyle}>Cancel</button>
                  <button type="button" onClick={handleConvertFromBulk} style={primaryButtonStyle}>Convert</button>
                </div>
              </div>
            </div>
          )}

          {barcodeProduct && <BarcodeModal product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />}

          {deleteConfirm && (
  <div
    onClick={() => setDeleteConfirm(null)}
    style={{
      position: "fixed", top: 0, left: 0,
      width: "100%", height: "100%",
      background: "rgba(47,47,46,0.40)",
      backdropFilter: "blur(6px)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 2000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        borderRadius: "20px",
        padding: "32px 28px",
        width: "100%",
        maxWidth: "400px",
        border: "1px solid #DEDBD4",
        boxShadow: "0 32px 80px rgba(47,47,46,0.18)",
      }}
    >
      {/* Icon */}
      <div style={{
        width: "52px", height: "52px", borderRadius: "14px",
        background: "#FBEAE8", border: "1px solid #F3CBC6",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "24px", marginBottom: "18px",
      }}>🗑️</div>

      {/* Title */}
      <div style={{ fontWeight: "800", fontSize: "18px", color: "#2F2F2E", marginBottom: "8px" }}>
        Delete product?
      </div>

      {/* Body */}
      <div style={{ fontSize: "14px", color: "#6F6E69", lineHeight: "1.6", marginBottom: "6px" }}>
        You're about to delete{" "}
        <span style={{ fontWeight: "700", color: "#2F2F2E" }}>
          {deleteConfirm.name}
        </span>.
      </div>

      {/* Stock warning — only shown if stock > 0 */}
      {Number(deleteConfirm.stock ?? 0) > 0 && (
        <div style={{
          fontSize: "13px", color: "#C98A2B",
          background: "#FBF1DD", border: "1px solid #F0DBA8",
          borderRadius: "10px", padding: "10px 14px",
          marginBottom: "10px", lineHeight: "1.5",
        }}>
          📦 This product still has{" "}
          <strong>{deleteConfirm.stock} unit{deleteConfirm.stock !== 1 ? "s" : ""}</strong>{" "}
          in stock.
        </div>
      )}

      {/* Permanent warning */}
      <div style={{
        fontSize: "13px", color: "#D8635A",
        background: "#FBEAE8", border: "1px solid #F3CBC6",
        borderRadius: "10px", padding: "10px 14px",
        marginBottom: "24px", lineHeight: "1.5",
      }}>
        ⚠ This will permanently remove the product and its history. This action cannot be undone.
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => setDeleteConfirm(null)}
          style={{
            flex: 1, padding: "11px", borderRadius: "10px",
            border: "1px solid #E8E6E1", background: "#F6F5F2",
            color: "#6F6E69", fontWeight: "600", fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onDelete(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          style={{
            flex: 1, padding: "11px", borderRadius: "10px",
            border: "none", background: "#D8635A", color: "#fff",
            fontWeight: "700", fontSize: "14px", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(216,99,90,0.35)",
          }}
        >
          Yes, delete
        </button>
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </>
  );
}

export default ProductList;