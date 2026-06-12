import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

import api from "../services/api.js";

function getExpiryStatus(expiryDate) {
  if (!expiryDate) {
    return { label: "No expiry", color: "#64748b", background: "#f1f5f9" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);

  if (Number.isNaN(expiry.getTime())) {
    return { label: "Invalid expiry", color: "#b45309", background: "#fef3c7" };
  }

  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { label: "Expired", color: "#b91c1c", background: "#fee2e2" };
  }

  if (daysLeft <= 30) {
    return {
      label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
      color: "#92400e",
      background: "#fef3c7"
    };
  }

  return { label: expiryDate, color: "#166534", background: "#dcfce7" };
}

function BarcodeModal({ product, onClose }) {
  const svgRef = useRef(null);

  useEffect(() => {
  console.log("BarcodeModal product:", product);
  console.log("Barcode value:", product.barcode);
  console.log("SVG ref:", svgRef.current);

  if (svgRef.current && product.barcode) {
    JsBarcode(svgRef.current, product.barcode, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 12,
      margin: 8,
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
               justify-content: center; height: 100vh; margin: 0; font-family: Arial; }
        .label { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <div class="label">${product.name}</div>
        ${svgData}
        <br/>
        <button onclick="window.print()">🖨 Print</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 3000
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "28px",
        width: "380px",
        textAlign: "center",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)"
      }}
    >
        <h3 style={{ margin: "0 0 6px 0" }}>🔖 Barcode</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#666" }}>
          {product.name}
        </p>

        {product.barcode ? (
          <>
            <svg ref={svgRef} />
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={handlePrint}
                style={{ padding: "8px 20px", borderRadius: "8px", border: "none",
                         background: "#1976d2", color: "#fff", cursor: "pointer", fontWeight: "600" }}>
                🖨 Print
              </button>
              <button onClick={onClose}
  style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #f5783e",
           background: "#fd692f", cursor: "pointer" }}>
  Close
</button>
            </div>
          </>
        ) : (
          <div style={{ color: "#999", padding: "20px" }}>
            No barcode generated yet.
            <br />
            <small>Edit and save the product to generate one.</small>
          </div>
        )}
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
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [convertProduct, setConvertProduct] = useState(null);
const [bagsToConvert, setBagsToConvert] = useState("1");
const itemsPerPage = 10;


  const handleEdit = (product) => {
  setEditingProduct(product);
};

const handleChange = (field, value) => {
  setEditingProduct({
    ...editingProduct,
    [field]: value
  });
};

const generateBarcode = () => {
  const barcode = `PRD${String(editingProduct.id).padStart(8, "0")}`;
  handleChange("barcode", barcode);
};

const handleSave = async () => {
  await api.updateProduct({
    ...editingProduct,
    cost_price: Number(editingProduct.cost_price),
    barcode: editingProduct.barcode || "",
    expiry_date: editingProduct.expiry_date || ""
  });

  setEditingProduct(null);
  onProductAdded();
};

const handleView = (product) => {
  setViewProduct(product);
};

const categories = [
  ...new Set(products.map((p) => p.category).filter(Boolean))
];

const filteredProducts = products.filter((p) => {
  const matchesSearch = p.name
    .toLowerCase()
    .includes(search.toLowerCase());

  const matchesCategory =
    categoryFilter === "" || p.category === categoryFilter;

  const matchesUnitType =
    unitTypeFilter === "" || p.unit_type === unitTypeFilter;

  return matchesSearch && matchesCategory && matchesUnitType;
});



const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = startIndex + itemsPerPage;

const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

useEffect(() => {
  const handleInventoryUpdated = () => {
    onProductAdded(); // re-fetches products from parent
  };

  window.addEventListener("invoice-updated", handleInventoryUpdated);
  window.addEventListener("purchase-updated", handleInventoryUpdated);
  window.addEventListener("stock-updated", handleInventoryUpdated);
  window.addEventListener("product-updated", handleInventoryUpdated);

  return () => {
    window.removeEventListener("invoice-updated", handleInventoryUpdated);
    window.removeEventListener("purchase-updated", handleInventoryUpdated);
    window.removeEventListener("stock-updated", handleInventoryUpdated);
    window.removeEventListener("product-updated", handleInventoryUpdated);
  };
}, []);

const handleConvertFromBulk = async () => {
  if (!convertProduct) return;

  const retailProduct = convertProduct;
  const bags = Number(bagsToConvert);

  if (!bags || bags <= 0) {
    alert("Please enter a valid number.");
    return;
  }

  const bulkProduct = products.find(
    (p) => Number(p.id) === Number(retailProduct.parent_id)
  );

  if (!bulkProduct) {
    alert("Parent bulk product not found.");
    return;
  }

  const currentBulkStock = Number(bulkProduct.stock || 0);
  const currentRetailStock = Number(retailProduct.stock || 0);
  const conversionFactor = Number(retailProduct.conversion_factor || 1);

  if (currentBulkStock < bags) {
    alert("Not enough bulk stock.");
    return;
  }

  const newBulkStock = currentBulkStock - bags;
  const newRetailStock = currentRetailStock + bags * conversionFactor;

  const bulkRes = await api.updateProduct({
    ...bulkProduct,
    stock: newBulkStock,
  });

  const retailRes = await api.updateProduct({
    ...retailProduct,
    stock: newRetailStock,
  });

  console.log("bulkRes:", bulkRes);
  console.log("retailRes:", retailRes);

  setConvertProduct(null);
  setBagsToConvert("1");

  await onProductAdded();

  alert(
    `Converted ${bags} bulk bag(s).\n\n` +
    `${bulkProduct.name}: ${currentBulkStock} → ${newBulkStock}\n` +
    `${retailProduct.name}: ${currentRetailStock} → ${newRetailStock}`
  );
};

  return (
  <div
    style={{
      width: "100%",
      minHeight: "100vh",
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      padding: "20px 32px",
      boxSizing: "border-box"
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: "none"
      }}
    >

      <div
  style={{
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 10
  }}
></div>
      <div
  style={{
    width: "100%",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px 20px",
    marginBottom: "30px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    transition: "all 0.3s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = "0 12px 35px rgba(0,0,0,0.12)";
    e.currentTarget.style.transform = "translateY(-2px)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.08)";
    e.currentTarget.style.transform = "translateY(0)";
  }}
>
  {/* Search Input */}
  <div style={{ flex: 1, maxWidth: "320px", position: "relative" }}>
    <div style={{
      position: "absolute",
      left: "14px",
      top: "50%",
      transform: "translateY(-50%)",
      fontSize: "18px",
      color: "#6b7280",
      zIndex: 2,
      pointerEvents: "none"
    }}>
      🔍
    </div>
    <input
      type="text"
      placeholder="Search products..."
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
      }}
      style={{
        width: "100%",
        padding: "14px 16px 14px 48px",
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        fontSize: "16px",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        transition: "all 0.3s ease",
        outline: "none"
      }}
      onFocus={(e) => {
        e.target.style.border = "2px solid #4f46e5";
        e.target.style.boxShadow = "0 0 0 4px rgba(79,70,229,0.15), 0 8px 20px rgba(79,70,229,0.2)";
        e.target.style.transform = "translateY(-2px)";
      }}
      onBlur={(e) => {
        e.target.style.border = "2px solid #e5e7eb";
        e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        e.target.style.transform = "translateY(0)";
      }}
    />
  </div>

  {/* Category Filter */}
  <div style={{ position: "relative", minWidth: "200px" }}>
    <select
      value={categoryFilter}
      onChange={(e) => {
        setCategoryFilter(e.target.value);
        setCurrentPage(1);
      }}
      style={{
        width: "100%",
        padding: "14px 40px 14px 16px",
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        fontSize: "16px",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        outline: "none",
        appearance: "none",
        backgroundImage: "url('data:image/svg+xml,%3csvg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 20 20\"%3e%3cpath stroke=\"%236b7280\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"m6 8 4 4 4-4\"/%3e%3c/svg%3e')",
        backgroundPosition: "right 14px center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "18px"
      }}
      onMouseEnter={(e) => {
        e.target.style.border = "2px solid #d1d5db";
        e.target.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        if (e.target.value === categoryFilter) {
          e.target.style.border = "2px solid #e5e7eb";
          e.target.style.transform = "translateY(0)";
        }
      }}
      onFocus={(e) => {
        e.target.style.border = "2px solid #4f46e5";
        e.target.style.boxShadow = "0 0 0 4px rgba(79,70,229,0.15)";
      }}
    >
      <option value="">🛒 All Categories</option>
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  </div>

  {/* Unit Type Filter */}
  <div style={{ position: "relative", minWidth: "180px" }}>
    <select
      value={unitTypeFilter}
      onChange={(e) => {
        setUnitTypeFilter(e.target.value);
        setCurrentPage(1);
      }}
      style={{
        width: "100%",
        padding: "14px 40px 14px 16px",
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        fontSize: "16px",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transition: "all 0.3s ease",
        outline: "none",
        appearance: "none",
        backgroundImage: "url('data:image/svg+xml,%3csvg xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 20 20\"%3e%3cpath stroke=\"%236b7280\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"1.5\" d=\"m6 8 4 4 4-4\"/%3e%3c/svg%3e')",
        backgroundPosition: "right 14px center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "18px"
      }}
      onMouseEnter={(e) => {
        e.target.style.border = "2px solid #d1d5db";
        e.target.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        if (e.target.value === unitTypeFilter) {
          e.target.style.border = "2px solid #e5e7eb";
          e.target.style.transform = "translateY(0)";
        }
      }}
      onFocus={(e) => {
        e.target.style.border = "2px solid #4f46e5";
        e.target.style.boxShadow = "0 0 0 4px rgba(79,70,229,0.15)";
      }}
    >
      <option value="">📦 All Types</option>
      <option value="bulk">🛍️ Bulk Products</option>
      <option value="retail">📱 Retail Products</option>
      <option value="unit">📏 Standard Products</option>
    </select>
  </div>

  {/* Clear Button */}
  <button
    onClick={() => {
      setSearch("");
      setCategoryFilter("");
      setUnitTypeFilter("");
      setCurrentPage(1);
    }}
    style={{
      padding: "14px 24px",
      border: "2px solid #e5e7eb",
      borderRadius: "12px",
      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      color: "#6b7280",
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      whiteSpace: "nowrap",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
    }}
    onMouseEnter={(e) => {
      e.target.style.background = "#f3f4f6";
      e.target.style.transform = "translateY(-2px)";
      e.target.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
    }}
    onMouseLeave={(e) => {
      e.target.style.background = "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)";
      e.target.style.transform = "translateY(0)";
      e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
    }}
  >
    🧹 Clear
  </button>
</div>

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  }}
>
  <h2 style={{ margin: 0 }}>Product List</h2>

  <button
    type="button"
    onClick={onCreateProduct}
    style={{
      padding: "10px 18px",
      borderRadius: "8px",
      border: "none",
      background: "#1976d2",
      color: "#fff",
      fontWeight: "600",
      cursor: "pointer"
    }}
  >
    Create Product
  </button>
</div>
<div
  style={{
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    borderRadius: "10px",
    overflow: "hidden",
    border: "1px solid #e5e5e5"
  }}
>

  {/* Line 131: Update gridTemplateColumns */}
<div style={{
  display: "grid",
  gridTemplateColumns: "0.5fr 3fr 1fr 1fr 1.2fr 1.5fr 2fr",
  padding: "10px 10px",
  fontWeight: "600",     
  fontSize: "18px",      
  color: "#222",         
  borderBottom: "2px solid #ddd" ,
  textAlign: "left"
}}>
  <div>ID</div> {/* Add this line */}
  <div>Product</div>
  <div>Price</div>
  <div>Stock</div>
  <div>Category</div>
  <div>Expiry</div>
  <div>Actions</div>
</div>

      {filteredProducts.length === 0 && <p>No products found</p>}


      <div
  style={{
    maxHeight: "calc(100vh - 330px)",
    overflowY: "auto",
    scrollBehavior: "smooth"
  }}
>

        {paginatedProducts.map((p) => (

 <div
    key={p.id}
    style={{
      display: "grid",
      gridTemplateColumns: "0.5fr 3fr 1fr 1fr 1.2fr 1.5fr 2fr",
      padding: "10px 10px",
      borderBottom: "1px solid #eee",
      alignItems: "center",
      transition: "background 0.2s ease",
      textAlign: "left"
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "#d4f7df";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
    }}
  >
  {/* Product */}
  <div style={{ color: "#888", fontSize: "14px" }}>#{p.id}</div>
  <div style={{ display: "flex", flexDirection: "column" }}>
      <div>
        <strong>{p.name}</strong>
        {(p.stock ?? 0) <= (p.min_stock ?? 0) && p.stock > 0 && (
          <span style={{ color: "red", marginLeft: "8px", fontSize: "12px" }}>⚠ Low</span>
        )}
      </div>

    {p.unit_type === "retail" && p.parent_name && (
        <div style={{ 
          fontSize: "11px", color: "#4f46e5", background: "#eef2ff", 
          padding: "2px 6px", borderRadius: "4px", marginTop: "4px",
          width: "fit-content", border: "1px solid #c7d2fe"
        }}>
          📦 Derived from: {p.parent_name}
        </div>
      )}

      {p.unit_type === "bulk" && (
        <span style={{ fontSize: "10px", color: "#059669", fontWeight: "bold", marginTop: "2px" }}>
          [BULK SOURCE]
        </span>
      )}
    </div>

  {/* Price */}
  <div>₹{p.price}</div>

  {/* Stock */}
  <div>{p.stock ?? 0}</div>

  {/* Category */}
  <div>{p.category || "-"}</div>

  {/* Expiry */}
  <div>
    {(() => {
      const expiry = getExpiryStatus(p.expiry_date);
      return (
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: expiry.color,
            background: expiry.background,
            padding: "4px 8px",
            borderRadius: "999px"
          }}
        >
          {expiry.label}
        </span>
      );
    })()}
  </div>

  {/* Actions */}
<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
  <button onClick={() => handleView(p)}>View</button>
  <button onClick={() => handleEdit(p)}>Edit</button>

  {p.unit_type === "retail" && (
  <button
    type="button"
    onClick={() => {
      setConvertProduct(p);
      setBagsToConvert("1");
    }}
  >
    Convert Stock
  </button>
)}

  <button onClick={() => onDelete(p.id)}>Delete</button>
</div>
</div>

))}

</div>

{filteredProducts.length > 0 && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "12px",
      padding: "14px",
      borderTop: "1px solid #eee"
    }}
  >
    <button
      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
      disabled={currentPage === 1}
      style={{
        padding: "8px 14px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        background: currentPage === 1 ? "#eee" : "#4CAF50",
        color: currentPage === 1 ? "#777" : "#fff",
        cursor: currentPage === 1 ? "not-allowed" : "pointer"
      }}
    >
      Previous
    </button>

    <span style={{ fontWeight: "600" }}>
      Page {currentPage} of {totalPages}
    </span>

    <button
      onClick={() =>
        setCurrentPage((p) => Math.min(p + 1, totalPages))
      }
      disabled={currentPage === totalPages}
      style={{
        padding: "8px 14px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        background: currentPage === totalPages ? "#eee" : "#4CAF50",
        color: currentPage === totalPages ? "#777" : "#fff",
        cursor: currentPage === totalPages ? "not-allowed" : "pointer"
      }}
    >
      Next
    </button>
  </div>
)}


{editingProduct && (
  <div
    onClick={() => setEditingProduct(null)}
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      overflowY: "auto",
      paddingTop: "40px",
      paddingBottom: "40px",
      boxSizing: "border-box",
      zIndex: 1000
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "8px",
        width: "320px",
        maxHeight: "none",
        flexShrink: 0
      }}
    >
      <h3>Edit Product</h3>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "13px", color: "#555" }}>Name</label><br />
        <input
          type="text"
          value={editingProduct.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "13px", color: "#555" }}>Price</label><br />
        <input
          type="number"
          value={editingProduct.price}
          onChange={(e) => handleChange("price", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "13px", color: "#555" }}>Cost Price</label><br />
        <input
          type="number"
          value={editingProduct.cost_price || 0}
          onChange={(e) => handleChange("cost_price", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "13px", color: "#555" }}>Category</label><br />
        <input
          type="text"
          value={editingProduct.category || ""}
          onChange={(e) => handleChange("category", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
  <label style={{ fontSize: "13px", color: "#555" }}>HSN / SAC Code</label><br />
  <input
    type="text"
    value={editingProduct.hsn_code || ""}
    onChange={(e) => handleChange("hsn_code", e.target.value)}
    style={{ width: "100%", padding: "6px" }}
  />
</div>

<div style={{ marginBottom: "10px" }}>
  <label style={{ fontSize: "13px", color: "#555" }}>Barcode</label><br />

  <div style={{ display: "flex", gap: "6px" }}>
    <input
      type="text"
      value={editingProduct.barcode || ""}
      onChange={(e) => handleChange("barcode", e.target.value)}
      style={{ flex: 1, padding: "6px" }}
      placeholder="Scan or type barcode"
    />

    <button type="button" onClick={generateBarcode}>
      Generate
    </button>
  </div>
</div>

<div style={{ marginBottom: "10px" }}>
  <label style={{ fontSize: "13px", color: "#555" }}>GST Rate</label><br />
  <select
    value={editingProduct.tax_rate ?? ""}
    onChange={(e) => handleChange("tax_rate", e.target.value)}
    style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
  >
    <option value="">Select GST</option>
    <option value="0">0% — Exempt</option>
    <option value="5">5%</option>
    <option value="12">12%</option>
    <option value="18">18%</option>
    <option value="28">28%</option>
  </select>
</div>

<div style={{ marginBottom: "10px" }}>
  <label style={{ fontSize: "13px", color: "#555" }}>Expiry Date</label><br />
  <input
    type="date"
    value={editingProduct.expiry_date || ""}
    onChange={(e) => handleChange("expiry_date", e.target.value)}
    style={{ width: "100%", padding: "6px" }}
  />
</div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "13px", color: "#555" }}>Stock</label><br />
        <input
          type="number"
          value={editingProduct.stock || 0}
          onChange={(e) => handleChange("stock", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "13px", color: "#555" }}>Minimum Stock</label><br />
        <input
          type="number"
          value={editingProduct.min_stock || 0}
          onChange={(e) => handleChange("min_stock", e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
  <label style={{ fontSize: "13px", color: "#555" }}>Unit Type</label><br />
  <select
    value={editingProduct.unit_type || "unit"}
    onChange={(e) => handleChange("unit_type", e.target.value)}
    style={{ width: "100%", padding: "6px" }}
  >
    <option value="unit">Standard</option>
    <option value="bulk">Bulk</option>
    <option value="retail">Retail</option>
  </select>
</div>

{editingProduct.unit_type === "retail" && (
  <>
    <div style={{ marginBottom: "10px" }}>
      <label style={{ fontSize: "13px", color: "#555" }}>Parent Product ID</label><br />
      <input
        type="number"
        value={editingProduct.parent_id || ""}
        onChange={(e) => handleChange("parent_id", e.target.value)}
        style={{ width: "100%", padding: "6px" }}
      />
    </div>
    <div style={{ marginBottom: "10px" }}>
      <label style={{ fontSize: "13px", color: "#555" }}>Conversion Factor</label><br />
      <input
        type="number"
        value={editingProduct.conversion_factor || 1}
        onChange={(e) => handleChange("conversion_factor", e.target.value)}
        style={{ width: "100%", padding: "6px" }}
      />
    </div>
  </>
)}

      <div style={{ marginTop: "15px" }}>
        <button onClick={handleSave} style={{ marginRight: "10px" }}>
          OK
        </button>

        <button onClick={() => setEditingProduct(null)}>
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{viewProduct && (() => {
  const price = Number(viewProduct.price || 0);
  const cost = Number(viewProduct.cost_price || 0);
  const profit = price - cost;

  const profitPercent =
    cost > 0 ? ((profit / cost) * 100).toFixed(1) : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "8px",
          width: "320px"
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px"
          }}
        >
          <h3 style={{ margin: 0 }}>Product Details</h3>

          <button
            onClick={() => setViewProduct(null)}
            style={{
              background: "#e53935",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#fff",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f0f0f0";
              e.target.style.color = "#e53935";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#e53935";
              e.target.style.color = "#fff";
            }}
          >
            ✖
          </button>
        </div>

        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            rowGap: "10px",
            columnGap: "20px",
            alignItems: "center"
          }}
        >
          <strong>Name</strong>
          <span style={{ textAlign: "right" }}>
            {viewProduct.name}
          </span>

          <strong>Price</strong>
          <span style={{ textAlign: "right" }}>
            ₹{price}
          </span>

          <strong>Cost Price</strong>
          <span style={{ textAlign: "right" }}>
            ₹{cost}
          </span>

          <strong>Profit / Unit</strong>
          <span
            style={{
              textAlign: "right",
              fontWeight: "bold",
              color: profit > 0 ? "#24df2d" : "#d32f2f"
            }}
          >
            ₹{profit}
          </span>

          <strong>Profit %</strong>
          <span
            style={{
              textAlign: "right",
              fontWeight: "bold",
              color: profit > 0 ? "#24df2d" : "#d32f2f"
            }}
          >
            {profit > 0 ? "+" : ""}
            {profitPercent}%
          </span>

          <strong>Category</strong>
          <span style={{ textAlign: "right" }}>
            {viewProduct.category || "-"}
          </span>

          <strong>Stock</strong>
          <span style={{ textAlign: "right" }}>
            {viewProduct.stock ?? 0}
          </span>

          <strong>Min Stock</strong>
          <span style={{ textAlign: "right" }}>
            {viewProduct.min_stock ?? 0}
          </span>

          <strong>HSN / SAC</strong>
<span style={{ textAlign: "right" }}>
  {viewProduct.hsn_code || "-"}
</span>

<strong>GST Rate</strong>
<span style={{ textAlign: "right" }}>
  {viewProduct.tax_rate ?? 0}%
</span>

<strong>Expiry</strong>
<span style={{ textAlign: "right" }}>
  {viewProduct.expiry_date || "No expiry"}
</span>

<strong>Unit Type</strong>
<span style={{ textAlign: "right", textTransform: "capitalize" }}>
  {viewProduct.unit_type || "Standard"}
</span>

{viewProduct.unit_type === "retail" && viewProduct.parent_name && (
  <>
    <strong>Parent Bulk</strong>
    <span style={{ textAlign: "right", color: "#4f46e5", fontWeight: "bold" }}>
      {viewProduct.parent_name}
    </span>
    <strong>Conv. Factor</strong>
    <span style={{ textAlign: "right" }}>
      1 Bag = {viewProduct.conversion_factor} units
    </span>
  </>
)}

<div style={{ gridColumn: "1 / -1", marginTop: "10px", textAlign: "center" }}>
  <button
    onClick={() => {
      setViewProduct(null);
      setBarcodeProduct(viewProduct);
    }}
    style={{
      padding: "8px 20px", borderRadius: "8px", border: "none",
      background: "#1976d2", color: "#fff", cursor: "pointer", fontWeight: "600"
    }}
  >
    🔖 View Barcode
  </button>
</div>

        </div>
      </div>
    </div>
  );
})()}

{convertProduct && (
  <div
    onClick={() => setConvertProduct(null)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2500
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        padding: "24px",
        borderRadius: "12px",
        width: "340px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)"
      }}
    >
      <h3 style={{ marginTop: 0 }}>Convert Stock</h3>

      <p style={{ fontSize: "14px", color: "#555" }}>
        Convert bulk stock into retail units for <strong>{convertProduct.name}</strong>.
      </p>

      <label style={{ fontSize: "13px", fontWeight: "600" }}>
        Bulk bags to convert
      </label>

      <input
        type="number"
        min="1"
        value={bagsToConvert}
        onChange={(e) => setBagsToConvert(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "6px",
          marginBottom: "16px",
          borderRadius: "6px",
          border: "1px solid #ccc"
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button type="button" onClick={() => setConvertProduct(null)}>
          Cancel
        </button>

        <button
          type="button"
          onClick={handleConvertFromBulk}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "6px",
            background: "#1976d2",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Convert
        </button>
      </div>
    </div>
  </div>
)}

{barcodeProduct && (
  <BarcodeModal
    product={barcodeProduct}
    onClose={() => setBarcodeProduct(null)}
  />
)}
      
      </div>
      </div>
    </div>
  );
}

export default ProductList;
