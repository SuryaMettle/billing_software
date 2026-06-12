import { useEffect, useState, useRef } from "react";

function PurchaseBilling() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState("");
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState([{ mode: "cash", amount: 0 }]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const supplierRef = useRef(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierState, setSupplierState] = useState("");
  const [supplierPincode, setSupplierPincode] = useState("");
  const [supplierCity, setSupplierCity] = useState("");
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState("immediate");
const [dueDate, setDueDate] = useState("");


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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(p =>
    p.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const paymentOptions = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "net_banking", label: "Net Banking" }
];

const updatePayment = (index, field, value) => {
  setPayments(prev =>
    prev.map((payment, i) =>
      i === index
        ? { ...payment, [field]: field === "amount" ? Number(value) : value }
        : payment
    )
  );
};

const addPaymentRow = () => {
  setPayments(prev => [...prev, { mode: "cash", amount: 0 }]);
};

const removePaymentRow = (index) => {
  setPayments(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
};

  useEffect(() => {
    loadProducts();
    window.api.getParties().then(data => {
      const supplierList = data.filter(p =>
        p.type === "supplier" || p.type === "both"
      );
      setSuppliers(supplierList);
    });
  }, []);

  const loadProducts = async () => {
    const data = await window.api.getProducts();
    setProducts(data);
  };

  const addToCart = () => {
    const product = products.find(p => p.id == selected);
    if (!product) return;

    const existing = cart.find(item => item.id == product.id);

    if (existing) {
      const updatedCart = cart.map(item =>
        item.id == product.id
          ? { ...item, quantity: item.quantity + qty, total: (item.quantity + qty) * item.price }
          : item
      );
      setCart(updatedCart);
    } else {
      const item = {
        ...product,
        quantity: qty,
        total: product.price * qty,
        discountPercent: 0,
        discountAmount: 0,
        hsn_code: product.hsn_code || "",  // ✅
        tax_rate: product.tax_rate || 0     // ✅
      };
      setCart([...cart, item]);
    }

    setQty(1);
    setSelected("");
    setSearch("");
  };

  const removeItem = (id) => setCart(cart.filter(item => item.id !== id));

  const getTotal = () => cart.reduce((sum, item) => sum + item.total, 0);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
const balance = getTotal() - totalPaid;

  const savePurchase = async () => {
    if (!selectedSupplier || !selectedSupplier.id) {
      showToast("Please select a valid supplier", "error");
      return;
    }
    if (cart.length === 0) {
      showToast("Add at least one product", "error");
      return;
    }

    try {
      const totalPaidAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
const total = getTotal();

let paymentStatus = "pending";
if (totalPaidAmount >= total) paymentStatus = "paid";
else if (totalPaidAmount > 0) paymentStatus = "partial";

const validPayments = payments
  .map(p => ({ mode: p.mode, amount: Number(p.amount || 0) }))
  .filter(p => p.amount > 0);

const res = await window.api.createPurchaseInvoice({
  party_id: selectedSupplier.id,
  items: cart,
  total,
  payments: validPayments,
  payment_status: paymentStatus,
  payment_terms: paymentTerms,
  due_date: dueDate
});


      if (res.success) {

        // --- NEW: AUTOMATIC STOCK CONVERSION ---
      // We check every item in the cart to see if it's a 'bulk' item
      for (const item of cart) {
        if (item.unit_type === 'bulk') {
          // If it's bulk, trigger the conversion logic in the background
          await window.api.convertStock({
            parentId: item.id,
            qtyToDeduct: item.quantity, 
            purchaseId: res.id // Use the ID returned from the created invoice
          });
        }
      }
      // --- END CONVERSION LOGIC ---

        showToast("Purchase invoice saved & Stock updated! ✅");
        
        setCart([]);
        setPayments([{ mode: "cash", amount: 0 }]);
        setSelectedSupplier(null);
        setPaymentTerms("immediate");
        setDueDate("");
        loadProducts();


        const updated = await window.api.getParties();
        setSuppliers(updated.filter(p => p.type === "supplier" || p.type === "both"));
        window.dispatchEvent(new Event("purchase-updated"));
      }
    } catch (err) {
      showToast(err.message || "Something went wrong", "error");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter" && selected) addToCart();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, qty, cart]);

  const handleDiscountPercent = (index, percent) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];
    const discountAmount = (item.price * item.quantity * percent) / 100;
    item.discountPercent = percent;
    item.discountAmount = discountAmount;
    item.total = (item.price * item.quantity) - discountAmount;
    setCart(updatedCart);
  };

  const handleDiscountAmount = (index, amount) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];
    const totalPrice = item.price * item.quantity;
    item.discountAmount = amount;
    item.discountPercent = (amount / totalPrice) * 100;
    item.total = totalPrice - amount;
    setCart(updatedCart);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setShowSupplierModal(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
  const today = new Date();

  if (paymentTerms === "custom") {
    setDueDate("");
    return;
  }

  const daysMap = {
    immediate: 0,
    "7_days": 7,
    "15_days": 15,
    "30_days": 30
  };

  const daysToAdd = daysMap[paymentTerms] || 0;
  const date = new Date(today);
  date.setDate(today.getDate() + daysToAdd);

  const formattedDate = date.toISOString().split("T")[0];
  setDueDate(formattedDate);
}, [paymentTerms]);


  const isFormValid = newSupplierName.trim() && newSupplierPhone.length === 10;

  const saveSupplier = async () => {
    let newErrors = {};
    if (!newSupplierName.trim()) newErrors.name = true;
    if (!newSupplierPhone.trim() || newSupplierPhone.length !== 10) newErrors.phone = true;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast("Please fill all required fields", "error");
      return;
    }

    await window.api.createParty({
      name: newSupplierName,
      phone: newSupplierPhone,
      address: supplierAddress,
      state: supplierState,
      pincode: supplierPincode,
      city: supplierCity,
      type: "supplier",
      balance: 0
    });

    const updatedParties = await window.api.getParties();
    const supplierList = updatedParties.filter(p => p.type === "supplier" || p.type === "both");
    setSuppliers(supplierList);

    const created = supplierList[supplierList.length - 1];
    setSelectedSupplier(created);

    setShowSupplierModal(false);
    setNewSupplierName("");
    setNewSupplierPhone("");
    setSupplierAddress("");
    setSupplierState("");
    setSupplierPincode("");
    setSupplierCity("");
    showToast("Supplier created ✅");
  };

  const cardStyle = {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
  };

  return (
    <div style={{ marginTop: "10px" }}>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          background: toast.type === "error" ? "#d32f2f" : "#2e7d32",
          color: "#fff",
          padding: "12px 28px",
          borderRadius: "8px",
          fontSize: "15px",
          fontWeight: "500",
          zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          pointerEvents: "none"
        }}>
          {toast.message}
        </div>
      )}

      {/* TITLE */}
      <h2 style={{
        marginBottom: "25px",
        fontWeight: "700",
        color: "#111",
        textAlign: "center",
        letterSpacing: "0.5px"
      }}>
        Purchase
      </h2>

      <div style={{ display: "flex", gap: "20px", alignItems: "stretch" }}>
  {/* SUPPLIER SECTION */}
  <div
    ref={supplierRef}
    style={{
      width: "62%",
      ...cardStyle,
      position: "relative",
      marginBottom: "20px"
    }}
  >

        <h3 style={{ marginBottom: "15px" }}>Select Supplier</h3>

        <div
          onClick={() => setShowSupplierDropdown(prev => !prev)}
          style={{
            border: "2px dashed #c4b5fd",
            borderRadius: "10px",
            padding: "25px",
            textAlign: "center",
            cursor: "pointer",
            color: "#7c3aed",
            fontWeight: "500",
            background: "#faf5ff"
          }}
        >
          + Add Supplier
        </div>

        {/* DROPDOWN */}
        {showSupplierDropdown && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: "20px",
            right: "20px",
            background: "#fff",
            borderRadius: "10px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            marginTop: "8px",
            zIndex: 1000,
            padding: "10px"
          }}>
            <input
              type="text"
              placeholder="Search supplier..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              style={{
                width: "100%", padding: "8px", border: "1px solid #ddd",
                borderRadius: "6px", marginBottom: "8px", boxSizing: "border-box"
              }}
            />

            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "8px 10px", fontSize: "12px", fontWeight: "600",
              color: "#666", borderBottom: "1px solid #eee"
            }}>
              <span>Supplier Name</span>
              <span>Balance</span>
            </div>

            {filteredSuppliers.length === 0 && (
              <div style={{ padding: "12px", textAlign: "center", color: "#999", fontSize: "13px" }}>
                No suppliers found
              </div>
            )}

            {filteredSuppliers.map((p) => (
              <div
                key={p.id}
                onClick={() => { setSelectedSupplier(p); setShowSupplierDropdown(false); }}
                style={{ display: "flex", justifyContent: "space-between", padding: "10px", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>{p.name}</span>
                <span style={{ color: p.balance < 0 ? "#d32f2f" : "#2e7d32" }}>
                  ₹{Math.abs(p.balance || 0)}
                </span>
              </div>
            ))}

            <div
              onClick={() => { setShowSupplierModal(true); setShowSupplierDropdown(false); }}
              style={{
                padding: "10px", marginTop: "8px", borderTop: "1px solid #eee",
                cursor: "pointer", color: "#7c3aed", fontWeight: "500", textAlign: "center"
              }}
            >
              + Create New Supplier
            </div>
          </div>
        )}
      </div>

      <div
  style={{
    width: "28%",
    minHeight: "150px",
    ...cardStyle,
    marginBottom: "20px"
  }}
>
  <h3 style={{ marginBottom: "15px" }}>Payment Details</h3>

  <div style={{ marginBottom: "12px" }}>
    <label style={{ fontWeight: "500" }}>Payment Terms</label>
    <select
      value={paymentTerms}
      onChange={(e) => setPaymentTerms(e.target.value)}
      style={{
        width: "100%",
        padding: "10px",
        marginTop: "6px",
        borderRadius: "6px",
        border: "1px solid #ddd"
      }}
    >
      <option value="immediate">Immediate</option>
      <option value="7_days">7 Days</option>
      <option value="15_days">15 Days</option>
      <option value="30_days">30 Days</option>
      <option value="custom">Custom</option>
    </select>
  </div>

  <div>
    <label style={{ fontWeight: "500" }}>Due Date</label>
    <input
      type="date"
      value={dueDate}
      onChange={(e) => setDueDate(e.target.value)}
      style={{
        width: "100%",
        padding: "10px",
        marginTop: "6px",
        borderRadius: "6px",
        border: "1px solid #ddd",
        boxSizing: "border-box"
      }}
    />
  </div>
</div>
</div>

      {/* SELECTED SUPPLIER CARD */}
      {selectedSupplier && (
        <div style={{
          maxWidth: "900px",
          margin: "0 auto 20px auto",
          background: "#faf5ff",
          borderRadius: "10px",
          padding: "15px 20px",
          border: "1px solid #c4b5fd",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>{selectedSupplier.name}</div>
            <div style={{ fontSize: "13px", color: "#555" }}>{selectedSupplier.phone}</div>
          </div>
          <button
            onClick={() => setSelectedSupplier(null)}
            style={{
              background: "#a33636", border: "none", borderRadius: "6px",
              padding: "6px 10px", cursor: "pointer", color: "#fff", fontSize: "13px"
            }}
          >
            Change
          </button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}>

        {/* LEFT — ADD PRODUCTS (smaller) */}
        <div style={{ flex: 0.6 }}>
          <div style={cardStyle}>
            <h3 style={{ marginBottom: "15px" }}>Add Products</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* SEARCH */}
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search product..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  style={{
                    width: "260px", padding: "10px 12px",
                    borderRadius: "8px", border: "1px solid #ddd"
                  }}
                />
                {showDropdown && search && (
                  <div style={{
                    position: "absolute", width: "260px", background: "#fff",
                    borderRadius: "8px", boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                    maxHeight: "200px", overflowY: "auto", marginTop: "6px", zIndex: 1000
                  }}>
                    {filteredProducts.map((p) => (
  <div
    key={p.id}
    onClick={() => { setSelected(p.id); setSearch(p.name); setShowDropdown(false); }}
    style={{ 
      padding: "10px", 
      cursor: "pointer",
      borderBottom: "1px solid #f0f0f0" // Added for better separation
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{p.name}</span>
      {/* --- Unit Type Badge --- */}
      <span style={{ 
        fontSize: "10px", 
        background: p.unit_type === 'bulk' ? "#fee2e2" : "#e0e7ff", 
        color: p.unit_type === 'bulk' ? "#991b1b" : "#3730a3",
        padding: "2px 6px", 
        borderRadius: "4px",
        fontWeight: "600",
        textTransform: "uppercase"
      }}>
        {p.unit_type || 'unit'}
      </span>
    </div>
    <div style={{ fontSize: "12px", color: "#888" }}>₹{p.price}</div>
  </div>
))}
                  </div>
                )}
              </div>

              {/* QUANTITY */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ fontSize: "16px", color: "#333", fontWeight: "600", minWidth: "70px" }}>
                  Quantity
                </label>

                <button
                  onClick={() => setQty(qty > 1 ? qty - 1 : 1)}
                  style={{
                    width: "32px", height: "32px", borderRadius: "6px",
                    border: "1px solid #ddd", background: "#7c3aed",
                    color: "#fff", cursor: "pointer", fontSize: "16px", fontWeight: "bold"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#6d28d9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#7c3aed")}
                >−</button>

                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  min="1"
                  style={{
                    width: "60px", textAlign: "center", padding: "8px",
                    borderRadius: "6px", border: "1px solid #ddd", marginTop: "8px"
                  }}
                />

                <button
                  onClick={() => setQty(qty + 1)}
                  style={{
                    width: "32px", height: "32px", borderRadius: "6px",
                    border: "1px solid #ddd", background: "#7c3aed",
                    color: "#fff", cursor: "pointer", fontSize: "16px", fontWeight: "bold"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#6d28d9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#7c3aed")}
                >+</button>
              </div>

              <button
                onClick={addToCart}
                style={{
                  marginTop: "10px", padding: "10px", width: "150px",
                  background: "#111", color: "#fff", border: "none",
                  borderRadius: "8px", cursor: "pointer", fontWeight: "500"
                }}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — CART + PAYMENT (bigger) */}
        <div style={{ flex: 1.8 }}>
          <div style={{ maxWidth: "100%", width: "90%", ...cardStyle }}>
            <h3 style={{ marginBottom: "15px" }}>Purchase Invoice</h3>

            {/* ORDER SUMMARY */}
<div style={{
  maxWidth: "100%", width: "100%", position: "relative",
  background: "#f5f3ff", borderRadius: "12px", padding: "20px",
  marginBottom: "15px", border: "2px solid",
  borderColor: cart.length > 0 ? "#7c3aed" : "#e2e8f0",
  boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
}}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
    <h3 style={{ margin: 0, color: "#1e293b" }}>Order Summary</h3>
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      background: cart.length > 0 ? "#7c3aed" : "transparent",
      color: cart.length > 0 ? "white" : "#64748b",
      padding: cart.length > 0 ? "6px 12px" : "6px 8px",
      borderRadius: "20px", fontSize: "14px", fontWeight: "600"
    }}>
      {cart.length === 0 ? "Empty" : `${cart.length} Items`}
      {cart.length > 0 && (
        <div style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }} />
      )}
    </div>
  </div>
  <div style={{ fontSize: "20px", fontWeight: "700",
    color: cart.length > 0 ? "#7c3aed" : "#94a3b8", textAlign: "right" }}>
    ₹{getTotal().toFixed(2)}
  </div>
</div>

            {/* CART TABLE */}
            <div style={{
              maxHeight: "260px", overflowY: "auto", marginBottom: "15px",
              border: "1px solid #eee", borderRadius: "8px"
            }}>
              {/* HEADER */}
              {/* UPDATE gridTemplateColumns to add a 0.8fr column for Unit */}
<div style={{
  display: "grid",
  gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr 1fr", // Added 0.8fr
  gap: "8px", padding: "10px 12px",
  fontWeight: "600", background: "#f9f9f9",
  borderBottom: "1px solid #eee"
}}>
  <div style={{ textAlign: "left" }}>Product</div>
  <div style={{ textAlign: "center" }}>Unit</div> {/* NEW COLUMN */}
  <div style={{ textAlign: "center" }}>HSN</div>
  <div style={{ textAlign: "center" }}>GST%</div>
  <div style={{ textAlign: "center" }}>Qty</div>
  <div style={{ textAlign: "right" }}>Price</div>
  <div style={{ textAlign: "center" }}>Discount</div>
  <div style={{ textAlign: "right", paddingRight: "12px" }}>Total</div>
</div>

              {cart.length === 0 && (
                <div style={{ padding: "15px", textAlign: "center", color: "#999" }}>
                  No items added
                </div>
              )}

              {/* ROWS */}
              {cart.map((item, i) => (
  <div
    key={i}
    style={{
      display: "grid",
      gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr 1fr", // Match the header
      alignItems: "center",
      gap: "8px", padding: "10px 12px",
      borderBottom: "1px solid #f0f0f0"
    }}
  >
    <div style={{ textAlign: "left" }}>{item.name}</div>
    
    {/* --- NEW UNIT DATA --- */}
    <div style={{ textAlign: "center", fontSize: "12px", fontWeight: "500", color: "#6d28d9" }}>
      {item.unit_type || "unit"}
    </div>

                  {/* HSN */}
                  <div style={{ textAlign: "center", fontSize: "13px", color: "#666" }}>
                    {item.hsn_code || "-"}
                  </div>

                  {/* GST% */}
                  <div style={{ textAlign: "center", fontSize: "13px", color: "#666" }}>
                    {item.tax_rate || 0}%
                  </div>

                  {/* QTY */}
                  <div style={{ textAlign: "center" }}>
                    <input
                      type="number"
                      value={item.quantity}
                      min="1"
                      onChange={(e) => {
                        const newQty = Number(e.target.value);
                        setCart(cart.map(p =>
                          p.id === item.id ? { ...p, quantity: newQty, total: newQty * p.price } : p
                        ));
                      }}
                      style={{
                        width: "50px", padding: "4px", textAlign: "center",
                        borderRadius: "6px", border: "1px solid #ddd"
                      }}
                    />
                  </div>

                  {/* PRICE */}
                  <div style={{ textAlign: "right" }}>₹{item.price}</div>

                  {/* DISCOUNT */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                    <input
                      type="number"
                      value={item.discountPercent || ""}
                      placeholder="%"
                      onChange={(e) => handleDiscountPercent(i, Number(e.target.value) || 0)}
                      style={{ width: "55px", padding: "4px", border: "1px solid #ddd", borderRadius: "4px", textAlign: "center" }}
                    />
                    <input
                      type="number"
                      value={item.discountAmount || ""}
                      placeholder="₹"
                      onChange={(e) => handleDiscountAmount(i, Number(e.target.value) || 0)}
                      style={{ width: "55px", padding: "4px", border: "1px solid #ddd", borderRadius: "4px", textAlign: "center" }}
                    />
                  </div>

                  {/* TOTAL + DELETE in same cell */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", paddingRight: "12px" }}>
                    <span style={{ fontWeight: "500" }}>₹{item.total}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{ border: "none", background: "transparent", color: "#e53935", cursor: "pointer", fontSize: "16px", padding: "0" }}
                    >✖</button>
                  </div>

                </div>
              ))}
            </div>

            {/* GST SUMMARY */}
            {(() => {
              const subtotal = cart.reduce((sum, item) => {
                const base = item.total / (1 + (item.tax_rate || 0) / 100);
                return sum + base;
              }, 0);
              const gstAmount = getTotal() - subtotal;
              return (
                <div style={{ marginBottom: "10px", fontSize: "14px", color: "#555" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Subtotal (before GST)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>GST</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* TOTAL */}
            <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}>
              Total: ₹{getTotal()}
            </div>

            {/* PAYMENTS */}
<div style={{ marginBottom: "12px" }}>
  <div style={{ fontWeight: "600", color: "#333", marginBottom: "8px" }}>Payments</div>

  {payments.map((payment, index) => (
    <div key={index} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <div style={{ position: "relative", display: "inline-block" }}>
        <select
          value={payment.mode}
          onChange={(e) => updatePayment(index, "mode", e.target.value)}
          style={{
            width: "160px", padding: "10px 30px 10px 12px",
            borderRadius: "8px", border: "1px solid #ddd",
            appearance: "none", background: "#fff"
          }}
        >
          {paymentOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <span style={{
          position: "absolute", right: "12px", top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none", fontSize: "10px"
        }}>▼</span>
      </div>

      <input
        type="number"
        min="0"
        value={payment.amount}
        onChange={(e) => updatePayment(index, "amount", e.target.value)}
        style={{
          width: "120px", padding: "8px", borderRadius: "6px",
          border: "1px solid #ccc", textAlign: "right", marginTop: "4px"
        }}
      />

      <button
        onClick={() => removePaymentRow(index)}
        disabled={payments.length === 1}
        style={{
          border: "none", background: "transparent",
          color: payments.length === 1 ? "#bbb" : "#e53935",
          cursor: payments.length === 1 ? "not-allowed" : "pointer",
          fontSize: "16px", padding: "4px", lineHeight: "1"
        }}
      >✖</button>
    </div>
  ))}

  <button
    onClick={addPaymentRow}
    style={{
      padding: "8px 12px", borderRadius: "8px",
      border: "1px solid #7c3aed", background: "#fff",
      color: "#7c3aed", cursor: "pointer", fontWeight: "500", marginTop: "2px"
    }}
  >+ Add Payment Method</button>
</div>

{/* PAID & BALANCE */}
<div style={{ marginBottom: "15px", fontWeight: "600" }}>
  <div style={{ color: "#2e7d32", marginBottom: "4px" }}>
    Paid: ₹{totalPaid.toLocaleString("en-IN")}
  </div>
  <div style={{ color: balance > 0 ? "#d32f2f" : "#2e7d32" }}>
    Balance: ₹{balance.toLocaleString("en-IN")}
  </div>
</div>

            {/* SAVE */}
            <button
              onClick={savePurchase}
              style={{
                width: "100%", padding: "12px",
                background: "#7c3aed", color: "#fff",
                border: "none", borderRadius: "8px", cursor: "pointer",
                fontWeight: "600", fontSize: "15px"
              }}
            >
              Save Purchase
            </button>
          </div>
        </div>
      </div>

      {/* CREATE SUPPLIER MODAL */}
      {showSupplierModal && (
        <div
          onClick={() => setShowSupplierModal(false)}
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100%", height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex", justifyContent: "center", alignItems: "center",
            zIndex: 2000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "400px", background: "#fff",
              borderRadius: "12px", padding: "25px 20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
            }}
          >
            <h3 style={{ marginBottom: "15px" }}>Create New Supplier</h3>

            {/* NAME */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: "500" }}>Supplier Name *</label>
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Enter name"
                style={{
                  width: "100%", padding: "10px", marginTop: "5px",
                  borderRadius: "6px", boxSizing: "border-box",
                  border: errors.name ? "1px solid red" : "1px solid #ddd"
                }}
              />
            </div>

            {/* PHONE */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: "500" }}>Mobile Number *</label>
              <input
                type="tel"
                placeholder="Mobile Number"
                value={newSupplierPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) setNewSupplierPhone(value);
                }}
                style={{
                  width: "100%", padding: "10px", borderRadius: "6px",
                  boxSizing: "border-box",
                  border: errors.phone ? "1px solid red" : "1px solid #ddd"
                }}
              />
              {newSupplierPhone && newSupplierPhone.length !== 10 && (
                <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                  Enter 10 digit mobile number
                </div>
              )}
            </div>

            {/* ADDRESS */}
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "5px" }}>
                BILLING ADDRESS
              </div>
              <textarea
                placeholder="Enter billing address"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                style={{
                  width: "100%", padding: "10px", borderRadius: "6px",
                  border: "1px solid #ddd", resize: "none", boxSizing: "border-box"
                }}
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "10px", width: "100%" }}>
                <select
                  value={supplierState}
                  onChange={(e) => setSupplierState(e.target.value)}
                  style={{
                    flex: "0 0 60%", padding: "10px",
                    borderRadius: "6px", border: "1px solid #ddd", minWidth: "0"
                  }}
                >
                  <option value="">Select State</option>
                  {indianStates.map((state, i) => (
                    <option key={i} value={state}>{state}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Pincode"
                  value={supplierPincode}
                  onChange={(e) => setSupplierPincode(e.target.value)}
                  style={{ width: "120px", padding: "10px", borderRadius: "6px", border: "1px solid #ddd" }}
                />
              </div>

              <input
                type="text"
                placeholder="City"
                value={supplierCity}
                onChange={(e) => setSupplierCity(e.target.value)}
                style={{
                  width: "100%", padding: "10px", borderRadius: "6px",
                  border: "1px solid #ddd", marginTop: "10px", boxSizing: "border-box"
                }}
              />
            </div>

            {/* BUTTONS */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={() => {
                  setShowSupplierModal(false);
                  setNewSupplierName("");
                  setNewSupplierPhone("");
                }}
                style={{
                  padding: "8px 14px", borderRadius: "6px",
                  border: "1px solid #ccc", background: "#f5f5f5", cursor: "pointer"
                }}
              >
                Cancel
              </button>

              <button
                onClick={saveSupplier}
                disabled={!isFormValid}
                style={{
                  padding: "8px 14px", borderRadius: "6px", border: "none",
                  background: isFormValid ? "#7c3aed" : "#ccc",
                  color: "#fff", cursor: isFormValid ? "pointer" : "not-allowed"
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseBilling;