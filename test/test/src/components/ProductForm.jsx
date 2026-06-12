import React, { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import "./ProductForm.css";

import api from "../services/api.js";

function generateBarcode(productId) {
  // EAN-13 style: 200 + productId padded + check digit
  const base = `200${String(productId).padStart(8, "0")}`;
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

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
               justify-content: center; height: 100vh; margin: 0; font-family: Arial; }
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
    <div style={{ marginTop: "16px", padding: "16px", background: "#f9f9f9", 
                  borderRadius: "10px", border: "1px solid #e0e0e0", textAlign: "center" }}>
      <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px", fontWeight: "600" }}>
        Generated Barcode
      </div>
      <svg ref={svgRef} />
      <div style={{ marginTop: "10px" }}>
        <button
          type="button"
          onClick={handlePrint}
          style={{
            padding: "8px 20px", borderRadius: "8px", border: "none",
            background: "#1976d2", color: "#fff", cursor: "pointer",
            fontWeight: "600", fontSize: "13px"
          }}
        >
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

  return (
  <>
    {onBack && (
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px"
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "700",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.35)"
          }}
        >
          ← Back
        </button>
      </div>
    )}

    <div className="product-form-container">
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-header">
          <div className="header-icon">📦</div>
          <h2>Add New Product</h2>
          <div className="header-line"></div>
        </div>
        {/* ROW 1 */}
        <div className="form-row">
          <div className="input-group">
            <label>Product Name</label>
            <input type="text" placeholder="Enter product name"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Selling Price</label>
            <input type="number" placeholder="₹ 0.00"
              value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select Category</option>
              <option value="Grocery">🛒 Grocery</option>
              <option value="Dairy">🥛 Dairy</option>
              <option value="Snacks & Packed">🍫 Snacks & Packed</option>
              <option value="Household">🏠 Household</option>
              <option value="Electronics">🔌 Electronics</option>
            </select>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="form-row">
          <div className="input-group">
            <label>HSN/SAC Code</label>
            <input type="text" placeholder="Enter HSN/SAC code"
              value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} />
          </div>
          <div className="input-group">
            <label>GST Rate</label>
            <select value={taxRate} onChange={(e) => setTaxRate(e.target.value)}>
              <option value="">Select GST</option>
              <option value="0">❌ 0% — Exempt</option>
              <option value="5">💰 5%</option>
              <option value="12">💰 12%</option>
              <option value="18">💰 18%</option>
              <option value="28">💰 28%</option>
            </select>
          </div>
          <div className="input-group">
            <label>Cost Price</label>
            <input type="number" placeholder="₹ 0.00"
              value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </div>
        </div>

        {/* ROW 3 */}
        <div className="form-row">
          <div className="input-group">
            <label>Current Stock</label>
            <input type="number" placeholder="0"
              value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>

          <div className="input-group">
            <label>Min Stock Alert</label>
            <input type="number" placeholder="10"
              value={minStock} onChange={(e) => setMinStock(e.target.value)} />
          </div>

          <div className="input-group">
  <label>Barcode</label>
  <input
    type="text"
    placeholder="Scan or type barcode"
    value={barcode}
    onChange={(e) => setBarcode(e.target.value)}
  />
</div>

          <div className="input-group">
            <label>Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        {/* Unit Type */}
        <div className="unit-section">
          <div className="section-header"><span>📏 Unit Configuration</span></div>
          <div className="unit-content">
            <div className="input-group">
              <label>Unit Type</label>
              <select value={unitType} onChange={(e) => setUnitType(e.target.value)}>
                <option value="unit">📦 Standard Unit</option>
                <option value="bulk">🛍️ Bulk Item (50kg Bag)</option>
                <option value="retail">📱 Retail Packet (1kg)</option>
              </select>
            </div>
            {unitType === "retail" && (
              <>
                <div className="input-group">
                  <label>Link to Bulk Parent</label>
                  <select value={parentId} onChange={(e) => setParentId(e.target.value)} required>
                    <option value="">Select Bulk Product</option>
                    {products.filter(p => p.unit_type === "bulk").map(bulk => (
                      <option key={bulk.id} value={bulk.id}>{bulk.name} ({bulk.unit_type})</option>
                    ))}
                  </select>
                </div>
                <div className="input-group full-width">
                  <label>Conversion Factor</label>
                  <div className="input-with-help">
                    <input type="number" value={conversionFactor}
                      onChange={(e) => setConversionFactor(e.target.value)}
                      placeholder="e.g. 50" />
                    <span className="help-text">How many packets in 1 bulk bag?</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting} className="submit-btn">
            {isSubmitting ? <><span className="spinner"></span>Adding Product...</> : <>✨ Add Product</>}
          </button>
        </div>
      </form>

      {/* Show barcode after product is added */}
      {generatedBarcode && (
        <div style={{ maxWidth: "500px", margin: "20px auto" }}>
          <BarcodeDisplay barcode={generatedBarcode} productName={savedProductName} />
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <button
              onClick={() => setGeneratedBarcode(null)}
              style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #ccc",
                       background: "#f5f5f5", cursor: "pointer", fontSize: "13px" }}
            >
              ✕ Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default ProductForm;