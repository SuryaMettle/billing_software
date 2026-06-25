import { useEffect, useState, useRef } from "react";

import api from "../services/api.js";

// ─── Soft Pastel Light Theme (local to this file) ─────────────────────────
const lt = {
  bg: "#f7f6f3",
  card: "#ffffff",
  cardBorder: "#ece9e3",
  surface: "#faf9f6",
  surfaceBorder: "#e8e5de",
  rowHover: "#f6f4ff",

  textPrimary: "#2d2a26",
  textSecondary: "#6b6661",
  textMuted: "#a8a29b",

  accent: "#7c6df2",
  accentSoft: "#efebff",
  accentBorder: "#ddd6ff",
  accentGradient: "linear-gradient(135deg, #8b7cf6 0%, #6d5cf0 100%)",

  yellow: "#e0a72a",
  yellowSoft: "#fef6e0",
  yellowBorder: "#fbe5ae",

  green: "#3f9d72",
  greenSoft: "#e6f6ee",
  greenBorder: "#bfe8d5",

  red: "#e0667a",
  redSoft: "#fdeaef",
  redBorder: "#f8c9d4",

  blue: "#5b9fd6",
  blueSoft: "#e9f3fb",
  blueBorder: "#c9e3f7",
};

const inputStyle = {
  background: lt.surface,
  border: `1.5px solid ${lt.surfaceBorder}`,
  borderRadius: "10px",
  color: lt.textPrimary,
  padding: "10px 13px",
  fontSize: "14px",
  outline: "none",
  transition: "all 0.15s ease",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

const cardStyle = {
  background: lt.card,
  border: `1px solid ${lt.cardBorder}`,
  borderRadius: "18px",
  padding: "24px",
  boxShadow: "0 2px 12px rgba(45,42,38,0.04)",
};

const primaryButtonStyle = {
  padding: "11px 24px",
  background: lt.accentGradient,
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "14px",
  letterSpacing: "0.2px",
  boxShadow: "0 4px 14px rgba(124,109,242,0.3)",
  transition: "all 0.2s ease",
};

const ghostButtonStyle = {
  padding: "10px 18px",
  background: lt.accentSoft,
  color: lt.accent,
  border: `1px solid ${lt.accentBorder}`,
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
  transition: "all 0.2s ease",
};

const fieldLabel = {
  display: "block",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: lt.textSecondary,
  marginBottom: "7px",
};

const sectionHeader = {
  fontSize: "13px",
  fontWeight: "800",
  letterSpacing: "0.4px",
  color: lt.textPrimary,
  marginBottom: "14px",
  paddingBottom: "10px",
  borderBottom: `1px solid ${lt.cardBorder}`,
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(45,42,38,0.35)",
  backdropFilter: "blur(3px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 2000,
};

const modalCard = {
  background: "#fff",
  borderRadius: "20px",
  padding: "26px",
  boxShadow: "0 24px 64px rgba(45,42,38,0.18)",
  border: `1px solid ${lt.cardBorder}`,
};

const onFocusStyle = (e) => {
  e.target.style.borderColor = lt.accent;
  e.target.style.boxShadow = "0 0 0 3px rgba(124,109,242,0.12)";
  e.target.style.background = "#fff";
};
const onBlurStyle = (e) => {
  e.target.style.borderColor = lt.surfaceBorder;
  e.target.style.boxShadow = "none";
  e.target.style.background = lt.surface;
};

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
    const loadSuppliers = () => {
      api.getParties().then(data => {
        const supplierList = data.filter(p =>
          p.type === "supplier" || p.type === "both"
        );
        setSuppliers(supplierList);
      });
    };

    loadProducts();
    loadSuppliers();

    window.addEventListener("product-updated", loadProducts);
    window.addEventListener("stock-updated", loadProducts);
    window.addEventListener("customer-updated", loadSuppliers);

    return () => {
      window.removeEventListener("product-updated", loadProducts);
      window.removeEventListener("stock-updated", loadProducts);
      window.removeEventListener("customer-updated", loadSuppliers);
    };
  }, []);

  const loadProducts = async () => {
    const data = await api.getProducts();
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
        hsn_code: product.hsn_code || "",
        tax_rate: product.tax_rate || 0
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

      const res = await api.createPurchaseInvoice({
  party_id: selectedSupplier.id,
  items: cart,
  total,
  paid_amount: totalPaidAmount,   
  payment_mode: validPayments.length === 1
    ? validPayments[0].mode
    : validPayments.length > 1 ? "split" : "",  
  payments: validPayments,
  payment_status: paymentStatus,
  payment_terms: paymentTerms,
  due_date: dueDate
});

      if (res.success) {
        for (const item of cart) {
          if (item.unit_type === 'bulk') {
            await api.convertStock({
              parentId: item.id,
              qtyToDeduct: item.quantity,
              purchaseId: res.id
            });
          }
        }

        showToast("Purchase invoice saved & Stock updated! ✅");

        setCart([]);
        setPayments([{ mode: "cash", amount: 0 }]);
        setSelectedSupplier(null);
        setPaymentTerms("immediate");
        setDueDate("");
        loadProducts();

        const updated = await api.getParties();
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

    await api.createParty({
      name: newSupplierName,
      phone: newSupplierPhone,
      address: supplierAddress,
      state: supplierState,
      pincode: supplierPincode,
      city: supplierCity,
      type: "supplier",
      balance: 0
    });

    const updatedParties = await api.getParties();
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

  return (
    <div style={{
      marginTop: "10px",
      background: lt.bg,
      padding: "20px",
      borderRadius: "16px",
      minHeight: "calc(100vh - 40px)",
    }}>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          background: toast.type === "error" ? lt.redSoft : lt.greenSoft,
          border: `1px solid ${toast.type === "error" ? lt.redBorder : lt.greenBorder}`,
          color: toast.type === "error" ? lt.red : lt.green,
          padding: "12px 28px",
          borderRadius: "14px",
          fontSize: "14px",
          fontWeight: "700",
          zIndex: 9999,
          boxShadow: "0 12px 32px rgba(45,42,38,0.15)",
          pointerEvents: "none"
        }}>
          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "12px",
          background: lt.accentGradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "19px", boxShadow: "0 4px 14px rgba(124,109,242,0.3)",
        }}>🧾</div>
        <h2 style={{ margin: 0, fontWeight: "800", fontSize: "21px", color: lt.textPrimary, letterSpacing: "0.2px" }}>
          Purchase Bill
        </h2>
        <div style={{
          marginLeft: "auto", fontSize: "13px", fontWeight: "700", color: "#fff",
          background: lt.accentGradient, padding: "6px 16px",
          borderRadius: "20px", boxShadow: "0 4px 14px rgba(124,109,242,0.3)",
          letterSpacing: "0.3px"
        }}>
          📅 {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      {/* TOP ROW: SUPPLIER + PAYMENT DETAILS */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>

        {/* SUPPLIER SECTION */}
        <div
          ref={supplierRef}
          style={{
            flex: 2,
            ...cardStyle,
            position: "relative",
            zIndex: 10,
          }}
        >
          <div style={sectionHeader}>🏢 Select Supplier</div>

          <div
            onClick={() => setShowSupplierDropdown(prev => !prev)}
            style={{
              border: `2px dashed ${lt.accent}`,
              borderRadius: "12px",
              padding: "18px",
              textAlign: "center",
              cursor: "pointer",
              color: lt.accent,
              fontWeight: "700",
              fontSize: "14px",
              background: lt.accentSoft,
              transition: "all 0.2s",
              letterSpacing: "0.3px",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#e3ddff";
              e.currentTarget.style.borderColor = "#6d5cf0";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = lt.accentSoft;
              e.currentTarget.style.borderColor = lt.accent;
            }}
          >
            + Add Supplier
          </div>

          {/* DROPDOWN */}
          {showSupplierDropdown && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: "16px",
              right: "16px",
              background: "#fff",
              borderRadius: "14px",
              boxShadow: "0 16px 48px rgba(45,42,38,0.18)",
              marginTop: "8px",
              zIndex: 1000,
              padding: "12px",
              border: `1px solid ${lt.cardBorder}`,
            }}>
              <input
                type="text"
                placeholder="Search supplier..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                style={{ ...inputStyle, width: "100%", marginBottom: "10px", boxSizing: "border-box" }}
                onFocus={onFocusStyle}
                onBlur={onBlurStyle}
              />

              <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "6px 10px", fontSize: "11px", fontWeight: "700",
                letterSpacing: "0.6px", textTransform: "uppercase",
                color: lt.textMuted, borderBottom: `1px solid ${lt.cardBorder}`,
                marginBottom: "4px",
              }}>
                <span>Supplier Name</span>
                <span>Balance</span>
              </div>

              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {filteredSuppliers.length === 0 && (
                  <div style={{ padding: "14px", textAlign: "center", color: lt.textMuted, fontSize: "13px" }}>
                    No suppliers found
                  </div>
                )}

                {filteredSuppliers.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedSupplier(p); setShowSupplierDropdown(false); }}
                    style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "10px 10px", cursor: "pointer", borderRadius: "8px",
                      color: lt.textPrimary, fontSize: "14px", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = lt.rowHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>{p.name}</span>
                    <span style={{ color: p.balance < 0 ? lt.red : lt.green, fontWeight: "700" }}>
                      ₹{Math.abs(p.balance || 0)}
                    </span>
                  </div>
                ))}
              </div>

              <div
                onClick={() => { setShowSupplierModal(true); setShowSupplierDropdown(false); }}
                style={{
                  padding: "10px", marginTop: "6px", borderTop: `1px solid ${lt.cardBorder}`,
                  cursor: "pointer", color: lt.accent, fontWeight: "700", textAlign: "center",
                  fontSize: "13px", borderRadius: "0 0 8px 8px", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = lt.accentSoft}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                + Create New Supplier
              </div>
            </div>
          )}
        </div>

        {/* PAYMENT DETAILS */}
        <div style={{ flex: 1, ...cardStyle }}>
          <div style={sectionHeader}>🗓 Payment Terms</div>

          <div style={{ marginBottom: "12px" }}>
            <label style={fieldLabel}>Terms</label>
            <div style={{ position: "relative" }}>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                style={{ ...selectStyle, width: "100%", paddingRight: "30px" }}
                onFocus={onFocusStyle}
                onBlur={onBlurStyle}
              >
                <option value="immediate">Immediate</option>
                <option value="7_days">7 Days</option>
                <option value="15_days">15 Days</option>
                <option value="30_days">30 Days</option>
                <option value="custom">Custom</option>
              </select>
              <span style={{
                position: "absolute", right: "10px", top: "50%",
                transform: "translateY(-50%)", pointerEvents: "none",
                color: lt.textMuted, fontSize: "10px",
              }}>▼</span>
            </div>
          </div>

          <div>
            <label style={fieldLabel}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            />
          </div>
        </div>
      </div>

      {/* SELECTED SUPPLIER BANNER */}
      {selectedSupplier && (
        <div style={{
          marginBottom: "16px",
          background: lt.accentSoft,
          borderRadius: "14px",
          padding: "14px 18px",
          border: `1px solid ${lt.accentBorder}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: lt.accentGradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: "800", color: "#fff",
              boxShadow: "0 4px 14px rgba(124,109,242,0.3)",
            }}>
              {selectedSupplier.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: "800", fontSize: "15px", color: lt.textPrimary }}>
                {selectedSupplier.name}
              </div>
              <div style={{ fontSize: "12px", color: lt.textSecondary }}>
                {selectedSupplier.phone}
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedSupplier(null)}
            style={{
              background: lt.redSoft,
              border: `1px solid ${lt.redBorder}`,
              borderRadius: "10px",
              padding: "7px 16px",
              cursor: "pointer",
              color: lt.red,
              fontWeight: "700",
              fontSize: "13px",
            }}
          >
            Change
          </button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

        {/* LEFT — ADD PRODUCTS */}
        <div style={{ flex: "0 0 300px" }}>
          <div style={cardStyle}>
            <div style={sectionHeader}>🔍 Add Products</div>

            {/* SEARCH */}
            <div style={{ marginBottom: "16px" }}>
              <label style={fieldLabel}>Product Search</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search product..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelected(""); setShowDropdown(true); }}
                  onFocus={(e) => { setShowDropdown(true); onFocusStyle(e); }}
                  onBlur={(e) => { setTimeout(() => setShowDropdown(false), 150); onBlurStyle(e); }}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />

                {showDropdown && search && (
                  <div style={{
                    position: "absolute", width: "100%", background: "#fff",
                    borderRadius: "12px", boxShadow: "0 12px 40px rgba(45,42,38,0.15)",
                    maxHeight: "220px", overflowY: "auto", marginTop: "6px", zIndex: 1000,
                    border: `1px solid ${lt.cardBorder}`,
                  }}>
                    {filteredProducts.length === 0 && (
                      <div style={{ padding: "14px", color: lt.textMuted, fontSize: "13px", textAlign: "center" }}>
                        No products found
                      </div>
                    )}

                    {filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelected(p.id);
                          setSearch(p.name);
                          setShowDropdown(false);
                        }}
                        style={{
                          padding: "10px 14px", cursor: "pointer",
                          borderBottom: `1px solid ${lt.cardBorder}`,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = lt.rowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: "700", color: lt.textPrimary, fontSize: "14px" }}>
                            {p.name}
                          </span>
                          <span style={{
                            fontSize: "10px",
                            background: p.unit_type === 'bulk' ? lt.yellowSoft : lt.blueSoft,
                            color: p.unit_type === 'bulk' ? lt.yellow : lt.blue,
                            padding: "2px 8px", borderRadius: "8px",
                            fontWeight: "700", textTransform: "uppercase",
                            border: `1px solid ${p.unit_type === 'bulk' ? lt.yellowBorder : lt.blueBorder}`,
                          }}>
                            {p.unit_type || 'unit'}
                          </span>
                        </div>
                        <div style={{ marginTop: "3px", fontSize: "13px", color: lt.accent, fontWeight: "700" }}>
                          ₹{p.price}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* QUANTITY */}
            <div style={{ marginBottom: "16px" }}>
              <label style={fieldLabel}>Quantity</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => setQty(qty > 1 ? qty - 1 : 1)}
                  style={{
                    width: "34px", height: "34px", borderRadius: "10px",
                    border: `1px solid ${lt.surfaceBorder}`, background: lt.surface,
                    color: lt.textPrimary, cursor: "pointer", fontSize: "18px",
                    fontWeight: "800", display: "flex", alignItems: "center",
                    justifyContent: "center", transition: "all 0.15s", lineHeight: "1",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = lt.redSoft;
                    e.currentTarget.style.borderColor = lt.redBorder;
                    e.currentTarget.style.color = lt.red;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = lt.surface;
                    e.currentTarget.style.borderColor = lt.surfaceBorder;
                    e.currentTarget.style.color = lt.textPrimary;
                  }}
                >
                  −
                </button>

                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  min="1"
                  style={{
                    ...inputStyle, width: "64px", textAlign: "center",
                    fontWeight: "800", fontSize: "16px",
                  }}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle}
                />

                <button
                  onClick={() => setQty(qty + 1)}
                  style={{
                    width: "34px", height: "34px", borderRadius: "10px",
                    border: `1px solid ${lt.surfaceBorder}`, background: lt.surface,
                    color: lt.textPrimary, cursor: "pointer", fontSize: "18px",
                    fontWeight: "800", display: "flex", alignItems: "center",
                    justifyContent: "center", transition: "all 0.15s", lineHeight: "1",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = lt.greenSoft;
                    e.currentTarget.style.borderColor = lt.greenBorder;
                    e.currentTarget.style.color = lt.green;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = lt.surface;
                    e.currentTarget.style.borderColor = lt.surfaceBorder;
                    e.currentTarget.style.color = lt.textPrimary;
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <button onClick={addToCart} style={{ ...primaryButtonStyle, width: "100%" }}>
              + Add Item
            </button>
          </div>
        </div>

        {/* RIGHT — CART + PAYMENT */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ORDER SUMMARY */}
          <div style={{
            ...cardStyle,
            marginBottom: "12px",
            background: cart.length > 0 ? lt.accentSoft : lt.card,
            border: cart.length > 0 ? `1px solid ${lt.accentBorder}` : `1px solid ${lt.cardBorder}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: lt.textPrimary, fontSize: "16px", fontWeight: "800" }}>
                Order Summary
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  background: cart.length > 0 ? lt.accentGradient : lt.surface,
                  color: cart.length > 0 ? "#fff" : lt.textMuted,
                  padding: "5px 14px", borderRadius: "20px",
                  fontSize: "13px", fontWeight: "700",
                  boxShadow: cart.length > 0 ? "0 4px 14px rgba(124,109,242,0.3)" : "none",
                }}>
                  {cart.length === 0 ? "Empty" : `${cart.length} Items`}
                </div>
                <div style={{
                  fontSize: "20px", fontWeight: "800",
                  color: cart.length > 0 ? lt.accent : lt.textMuted,
                  letterSpacing: "-0.5px",
                }}>
                  ₹{getTotal().toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* CART TABLE */}
          <div style={{
            maxHeight: "300px", overflowY: "auto", marginBottom: "14px",
            border: `1px solid ${lt.cardBorder}`, borderRadius: "14px",
            background: lt.surface,
          }}>
            {/* HEADER */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr 1fr",
              gap: "8px", padding: "12px 14px",
              fontWeight: "800", fontSize: "11px", letterSpacing: "0.6px",
              textTransform: "uppercase", color: lt.textMuted,
              background: lt.card, borderBottom: `1px solid ${lt.cardBorder}`,
              borderRadius: "14px 14px 0 0", position: "sticky", top: 0, zIndex: 1,
            }}>
              <div>Product</div>
              <div style={{ textAlign: "center" }}>Unit</div>
              <div style={{ textAlign: "center" }}>HSN</div>
              <div style={{ textAlign: "center" }}>GST%</div>
              <div style={{ textAlign: "center" }}>Qty</div>
              <div style={{ textAlign: "right" }}>Price</div>
              <div style={{ textAlign: "center" }}>Discount</div>
              <div style={{ textAlign: "right", paddingRight: "12px" }}>Total</div>
            </div>

            {cart.length === 0 && (
              <div style={{ padding: "32px", textAlign: "center", color: lt.textMuted, fontSize: "14px" }}>
                No items added yet
              </div>
            )}

            {cart.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr 1fr",
                  alignItems: "center", gap: "8px", padding: "10px 14px",
                  borderBottom: `1px solid ${lt.cardBorder}`,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = lt.rowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ textAlign: "left", color: lt.textPrimary, fontWeight: "600", fontSize: "13px" }}>
                  {item.name}
                </div>

                <div style={{
                  textAlign: "center", fontSize: "11px", fontWeight: "700",
                  color: lt.accent, textTransform: "capitalize",
                }}>
                  {item.unit_type || "unit"}
                </div>

                <div style={{ textAlign: "center", fontSize: "12px", color: lt.textMuted }}>
                  {item.hsn_code || "-"}
                </div>

                <div style={{ textAlign: "center", fontSize: "12px", color: lt.textMuted }}>
                  {item.tax_rate || 0}%
                </div>

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
                      width: "50px", padding: "5px", textAlign: "center",
                      borderRadius: "6px", border: `1px solid ${lt.surfaceBorder}`,
                      background: "#fff", color: lt.textPrimary, fontSize: "13px",
                    }}
                  />
                </div>

                <div style={{ textAlign: "right", color: lt.textSecondary, fontSize: "13px", fontWeight: "600" }}>
                  ₹{item.price}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                  <input
                    type="number"
                    value={item.discountPercent || ""}
                    placeholder="%"
                    onChange={(e) => handleDiscountPercent(i, Number(e.target.value) || 0)}
                    style={{
                      width: "52px", padding: "4px 6px", border: `1px solid ${lt.surfaceBorder}`,
                      borderRadius: "6px", textAlign: "center", background: "#fff",
                      color: lt.textPrimary, fontSize: "12px",
                    }}
                  />
                  <input
                    type="number"
                    value={item.discountAmount || ""}
                    placeholder="₹"
                    onChange={(e) => handleDiscountAmount(i, Number(e.target.value) || 0)}
                    style={{
                      width: "52px", padding: "4px 6px", border: `1px solid ${lt.surfaceBorder}`,
                      borderRadius: "6px", textAlign: "center", background: "#fff",
                      color: lt.textPrimary, fontSize: "12px",
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", paddingRight: "10px" }}>
                  <span style={{ fontWeight: "700", color: lt.textPrimary, fontSize: "13px" }}>
                    ₹{item.total}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      border: "none", background: "transparent", color: lt.red,
                      cursor: "pointer", fontSize: "15px", padding: "2px", lineHeight: "1",
                    }}
                  >
                    ✖
                  </button>
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
              <div style={{
                marginBottom: "12px", padding: "10px 14px",
                background: lt.surface, borderRadius: "10px",
                border: `1px solid ${lt.surfaceBorder}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: lt.textSecondary, marginBottom: "4px" }}>
                  <span>Subtotal (before GST)</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: lt.textSecondary }}>
                  <span>GST</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}

          {/* TOTAL */}
          <div style={{
            fontSize: "18px", fontWeight: "800", marginBottom: "14px",
            padding: "12px 16px", background: lt.accentSoft, borderRadius: "12px",
            border: `1px solid ${lt.accentBorder}`, display: "flex",
            alignItems: "center", justifyContent: "space-between", color: lt.textPrimary,
          }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: lt.textSecondary }}>
              TOTAL AMOUNT
            </span>
            <span style={{ color: lt.accent }}>₹{getTotal().toFixed(2)}</span>
          </div>

          {/* PAYMENTS */}
          <div style={{ marginBottom: "14px" }}>
            <div style={sectionHeader}>💳 Payments</div>

            {payments.map((payment, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ position: "relative", flex: "0 0 160px" }}>
                  <select
                    value={payment.mode}
                    onChange={(e) => updatePayment(index, "mode", e.target.value)}
                    style={{ ...selectStyle, width: "100%", paddingRight: "28px" }}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle}
                  >
                    {paymentOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span style={{
                    position: "absolute", right: "10px", top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                    color: lt.textMuted, fontSize: "10px",
                  }}>▼</span>
                </div>

                <input
                  type="number"
                  min="0"
                  value={payment.amount}
                  onChange={(e) => updatePayment(index, "amount", e.target.value)}
                  style={{
                    ...inputStyle, flex: 1, textAlign: "right",
                    fontWeight: "700", fontSize: "15px",
                  }}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle}
                />

                <button
                  onClick={() => removePaymentRow(index)}
                  disabled={payments.length === 1}
                  style={{
                    border: "none", background: "transparent",
                    color: payments.length === 1 ? lt.textMuted : lt.red,
                    cursor: payments.length === 1 ? "not-allowed" : "pointer",
                    fontSize: "16px", padding: "4px",
                    opacity: payments.length === 1 ? 0.4 : 1,
                  }}
                >
                  ✖
                </button>
              </div>
            ))}

            <button onClick={addPaymentRow} style={ghostButtonStyle}>
              + Add Payment Method
            </button>
          </div>

          {/* PAID & BALANCE */}
          <div style={{
            marginBottom: "16px", padding: "12px 16px",
            background: lt.surface, borderRadius: "12px",
            border: `1px solid ${lt.surfaceBorder}`,
            display: "flex", justifyContent: "space-between",
          }}>
            <div style={{ fontWeight: "800", color: lt.green, fontSize: "14px" }}>
              ✓ Paid: ₹{totalPaid.toLocaleString("en-IN")}
            </div>
            <div style={{
              fontWeight: "800", fontSize: "14px",
              color: balance > 0 ? lt.red : lt.green,
            }}>
              {balance > 0 ? "⚠ Balance:" : "✓ Settled:"} ₹{Math.abs(balance).toLocaleString("en-IN")}
            </div>
          </div>

          {/* SAVE */}
          <button
            onClick={savePurchase}
            style={{
              ...primaryButtonStyle, width: "100%", padding: "14px 24px",
              fontSize: "16px", letterSpacing: "0.5px", borderRadius: "14px",
              boxShadow: "0 8px 24px rgba(124,109,242,0.4)",
            }}
          >
            💾 Save Purchase
          </button>
        </div>
      </div>

      {/* CREATE SUPPLIER MODAL */}
      {showSupplierModal && (
        <div onClick={() => setShowSupplierModal(false)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalCard, width: "440px" }}>

            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "10px",
                background: lt.accentGradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
              }}>🏢</div>
              <h3 style={{ margin: 0, color: lt.textPrimary, fontWeight: "800", fontSize: "17px" }}>
                Create New Supplier
              </h3>
            </div>

            {/* NAME */}
            <div style={{ marginBottom: "14px" }}>
              <label style={fieldLabel}>Supplier Name *</label>
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Enter name"
                style={{
                  ...inputStyle, width: "100%", boxSizing: "border-box",
                  borderColor: errors.name ? lt.red : lt.surfaceBorder,
                }}
                onFocus={onFocusStyle}
                onBlur={onBlurStyle}
              />
            </div>

            {/* PHONE */}
            <div style={{ marginBottom: "14px" }}>
              <label style={fieldLabel}>Mobile Number *</label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={newSupplierPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) setNewSupplierPhone(value);
                }}
                style={{
                  ...inputStyle, width: "100%", boxSizing: "border-box",
                  borderColor: errors.phone ? lt.red : lt.surfaceBorder,
                }}
                onFocus={onFocusStyle}
                onBlur={onBlurStyle}
              />
              {newSupplierPhone && newSupplierPhone.length !== 10 && (
                <div style={{ color: lt.red, fontSize: "12px", marginTop: "5px" }}>
                  Enter 10-digit mobile number
                </div>
              )}
            </div>

            {/* ADDRESS */}
            <div style={{
              marginTop: "16px", padding: "14px",
              background: lt.surface, borderRadius: "12px",
              border: `1px solid ${lt.surfaceBorder}`,
            }}>
              <div style={{ ...sectionHeader, marginBottom: "12px" }}>📍 Billing Address</div>

              <textarea
                placeholder="Enter billing address"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                style={{
                  ...inputStyle, width: "100%", boxSizing: "border-box",
                  resize: "none", minHeight: "60px", marginBottom: "10px",
                }}
                onFocus={onFocusStyle}
                onBlur={onBlurStyle}
              />

              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <div style={{ position: "relative", flex: "0 0 60%" }}>
                  <select
                    value={supplierState}
                    onChange={(e) => setSupplierState(e.target.value)}
                    style={{ ...selectStyle, width: "100%", paddingRight: "28px" }}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle}
                  >
                    <option value="">Select State</option>
                    {indianStates.map((state, i) => (
                      <option key={i} value={state}>{state}</option>
                    ))}
                  </select>
                  <span style={{
                    position: "absolute", right: "10px", top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                    color: lt.textMuted, fontSize: "10px",
                  }}>▼</span>
                </div>

                <input
                  type="number"
                  placeholder="Pincode"
                  value={supplierPincode}
                  onChange={(e) => setSupplierPincode(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle}
                />
              </div>

              <input
                type="text"
                placeholder="City"
                value={supplierCity}
                onChange={(e) => setSupplierCity(e.target.value)}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                onFocus={onFocusStyle}
                onBlur={onBlurStyle}
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
                style={ghostButtonStyle}
              >
                Cancel
              </button>

              <button
                onClick={saveSupplier}
                disabled={!isFormValid}
                style={{
                  ...primaryButtonStyle,
                  opacity: isFormValid ? 1 : 0.45,
                  cursor: isFormValid ? "pointer" : "not-allowed",
                }}
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseBilling;