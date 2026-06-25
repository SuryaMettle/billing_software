import { useEffect, useState, useRef } from "react";
import { applyOffers } from "../utils/offerEngine.js";
import api from "../services/api.js";

// ── Light Pastel Theme (Notion/Airtable style) — inline, independent of theme.js ──
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
  successBorder: "#B7DFC8",
  warning: "#C98A2B",
  warningBg: "#FBF1DD",
  warningBorder: "#F0DBA8",
  danger: "#D8635A",
  dangerBg: "#FBEAE8",
  dangerBorder: "#F3CBC6",
  cyan: "#0E9DBF",
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

function isProductExpired(product) {
  if (!product?.expiry_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${product.expiry_date}T00:00:00`);
  return !Number.isNaN(expiry.getTime()) && expiry < today;
}

function createCartItemId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function Billing({ products, onInvoiceSaved }) {
  const [selected, setSelected] = useState("");
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [offers, setOffers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState([{ mode: "cash", amount: 0 }]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const partyRef = useRef(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyPhone, setNewPartyPhone] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyState, setPartyState] = useState("");
  const [partyPincode, setPartyPincode] = useState("");
  const [partyCity, setPartyCity] = useState("");
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [errors, setErrors] = useState({});
  const [partyType, setPartyType] = useState("customer");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltySettings, setLoyaltySettings] = useState({
    loyalty_earn_rate: 0.01,
    loyalty_redeem_value: 1
  });
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [useRedemption, setUseRedemption] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState("immediate");
  const [dueDate, setDueDate] = useState("");
  const [offerConflicts, setOfferConflicts] = useState({});
  const [resolvedConflicts, setResolvedConflicts] = useState({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setbarcodeError] = useState("");
  const [partyStep, setPartyStep] = useState(1);
  const barcodeRef = useRef(null);

  const recalculateCart = (nextCart, clearResolved = false) => {
    const resolved = clearResolved ? {} : resolvedConflicts;
    if (clearResolved) {
      setResolvedConflicts({});
      setOfferConflicts({});
    }
    const { cart: newCart, conflicts } = applyOffers(nextCart, offers, resolved);
    const unresolvedConflicts = Object.fromEntries(
      Object.entries(conflicts).filter(([key]) => !(key in resolved))
    );
    if (Object.keys(unresolvedConflicts).length > 0) {
      setOfferConflicts(unresolvedConflicts);
    } else {
      setOfferConflicts({});
    }
    return newCart;
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleBarcodeSearch = async (barcode) => {
    if (!barcode.trim()) {
      barcodeRef.current?.focus();
      return;
    }
    const product = await api.getProductByBarcode(barcode.trim());
    if (!product) {
      setbarcodeError(`No product found for barcode: ${barcode}`);
      setTimeout(() => setbarcodeError(""), 3000);
      setBarcodeInput("");
      barcodeRef.current?.focus();
      return;
    }
    if (isProductExpired(product)) {
      setbarcodeError(`${product.name} is expired and cannot be billed`);
      setTimeout(() => setbarcodeError(""), 3000);
      setBarcodeInput("");
      barcodeRef.current?.focus();
      return;
    }
    setbarcodeError("");
    setBarcodeInput("");
    const addQty = 1;
    const existing = cart.find((item) => item.id === product.id && !item.isFreeItem);
    const currentProductQty = cart
      .filter((item) => item.id === product.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (currentProductQty + addQty > Number(product.stock || 0)) {
      alert(`Only ${product.stock} items available`);
      setBarcodeInput("");
      barcodeRef.current?.focus();
      return;
    }
    if (existing) {
      const updatedCart = cart.map((item) => {
        if (item.cartItemId === existing.cartItemId) {
          const newQty = Number(item.quantity || 0) + addQty;
          const baseTotal = newQty * Number(item.price || 0);
          const manualDiscountAmount = Number(item.manualDiscountAmount ?? 0);
          return { ...item, quantity: newQty, paidQuantity: newQty, total: Math.max(0, baseTotal - manualDiscountAmount) };
        }
        return item;
      });
      setCart(recalculateCart(updatedCart, false));
    } else {
      const item = {
        ...product,
        cartItemId: createCartItemId(),
        quantity: addQty,
        paidQuantity: addQty,
        freeQuantity: 0,
        total: Number(product.price || 0) * addQty,
        discountPercent: 0,
        discountAmount: 0,
        manualDiscountPercent: 0,
        manualDiscountAmount: 0,
        offerDiscountAmount: 0,
        hsn_code: product.hsn_code || "",
        tax_rate: product.tax_rate || 0,
        isFreeItem: false,
        isOfferItem: false,
        isCartDiscountItem: false,
        appliedOfferId: null,
        appliedOfferType: null,
        appliedOfferName: null,
        parentCartItemId: null,
        parentProductId: null
      };
      setCart(recalculateCart([...cart, item], false));
    }
    setTimeout(() => { barcodeRef.current?.focus(); }, 0);
  };

  const addToCart = () => {
    const product = products.find((p) => p.id == selected);
    if (!product) return;
    if (isProductExpired(product)) {
      alert(`${product.name} is expired and cannot be billed`);
      return;
    }
    const addQty = Number(qty || 1);
    if (addQty <= 0) return;
    const existing = cart.find((item) => item.id == product.id && !item.isFreeItem);
    const currentProductQty = cart
      .filter((item) => item.id == product.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (currentProductQty + addQty > Number(product.stock || 0)) {
      alert(`Only ${product.stock} items available`);
      return;
    }
    if (existing) {
      const updatedCart = cart.map((item) => {
        if (item.cartItemId === existing.cartItemId) {
          const newQty = Number(item.quantity || 0) + addQty;
          const baseTotal = newQty * Number(item.price || 0);
          const manualDiscountAmount = Number(item.manualDiscountAmount ?? item.discountAmount ?? 0);
          return { ...item, quantity: newQty, paidQuantity: newQty, total: Math.max(0, baseTotal - manualDiscountAmount) };
        }
        return item;
      });
      setCart(recalculateCart(updatedCart, false));
    } else {
      const item = {
        ...product,
        cartItemId: createCartItemId(),
        quantity: addQty,
        paidQuantity: addQty,
        freeQuantity: 0,
        total: Number(product.price || 0) * addQty,
        discountPercent: 0,
        discountAmount: 0,
        manualDiscountPercent: 0,
        manualDiscountAmount: 0,
        offerDiscountAmount: 0,
        hsn_code: product.hsn_code || "",
        tax_rate: product.tax_rate || 0,
        isFreeItem: false,
        isOfferItem: false,
        isCartDiscountItem: false,
        appliedOfferId: null,
        appliedOfferType: null,
        appliedOfferName: null,
        parentCartItemId: null,
        parentProductId: null
      };
      setCart(recalculateCart([...cart, item], false));
    }
    setQty(1);
    setSelected("");
    setSearch("");
  };

  const removeItem = (cartItemId) => {
    const itemToRemove = cart.find((item) => item.cartItemId === cartItemId);
    if (itemToRemove?.isFreeItem) {
      alert("Free offer items are managed automatically. Change or remove the paid item instead.");
      return;
    }
    const updated = cart.filter(
      (item) => item.cartItemId !== cartItemId && item.parentCartItemId !== cartItemId
    );
    const removedProductId = itemToRemove?.id;
    const newResolved = Object.fromEntries(
      Object.entries(resolvedConflicts).filter(([key]) =>
        !key.includes(`product_${removedProductId}`) && !key.includes(`bxgy_${removedProductId}`)
      )
    );
    setResolvedConflicts(newResolved);
    const { cart: newCart, conflicts } = applyOffers(updated, offers, newResolved);
    const unresolvedConflicts = Object.fromEntries(
      Object.entries(conflicts).filter(([key]) => !(key in newResolved))
    );
    setOfferConflicts(unresolvedConflicts);
    setCart(newCart);
  };

  const getTotal = () => cart.reduce((sum, item) => sum + Number(item.total || 0), 0);

  const hasSelectedParty = Boolean(selectedParty?.id);
  const pointsDiscount = hasSelectedParty && useRedemption
    ? Math.min(redeemPoints, loyaltyPoints) * loyaltySettings.loyalty_redeem_value
    : 0;
  const getFinalTotal = () => Math.max(0, getTotal() - pointsDiscount);
  const pointsToEarn = Math.floor(getFinalTotal() * loyaltySettings.loyalty_earn_rate);

  const paymentOptions = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "net_banking", label: "Net Banking" }
  ];

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balance = getFinalTotal() - totalPaid;

  const updatePayment = (index, field, value) => {
    setPayments((prev) =>
      prev.map((payment, i) =>
        i === index ? { ...payment, [field]: field === "amount" ? Number(value) : value } : payment
      )
    );
  };

  const addPaymentRow = () => setPayments((prev) => [...prev, { mode: "cash", amount: 0 }]);
  const removePaymentRow = (index) => setPayments((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));

  const saveInvoice = async () => {
    if (cart.length === 0) { alert("Please add at least one item"); return; }
    const { cart: invoiceItems } = applyOffers(cart, offers, resolvedConflicts);
    if (invoiceItems.some((item) => Number(item.quantity || 0) <= 0)) { alert("Invalid item quantity"); return; }
    if (payments.some((p) => Number(p.amount || 0) < 0)) { alert("Payment amount cannot be negative"); return; }
    const validPayments = payments.map((p) => ({ mode: p.mode, amount: Number(p.amount || 0) })).filter((p) => p.amount > 0);
    if (validPayments.some((p) => !["cash", "upi", "card", "net_banking"].includes(p.mode))) { alert("Invalid payment mode"); return; }
    try {
      const total = Math.max(0, invoiceItems.reduce((sum, item) => sum + Number(item.total || 0), 0) - pointsDiscount);
      const paidTotal = validPayments.reduce((sum, p) => sum + p.amount, 0);
      const invoiceBalance = total - paidTotal;
      let paymentStatus = "pending";
      if (invoiceBalance <= 0) paymentStatus = "paid";
      else if (paidTotal > 0) paymentStatus = "partial";
      const res = await api.createInvoice({
        party_id: selectedParty?.id || null,
        items: invoiceItems,
        total,
        payments: validPayments,
        payment_status: paymentStatus,
        payment_terms: paymentTerms,
        due_date: dueDate,
        loyalty_redeem: selectedParty?.id && useRedemption ? Math.min(redeemPoints, loyaltyPoints) : 0
      });
      if (res.success) {
        setCart([]);
        setPayments([{ mode: "cash", amount: 0 }]);
        setSelectedParty(null);
        setSearch("");
        setSelected("");
        setRedeemPoints(0);
        setUseRedemption(false);
        onInvoiceSaved();
        window.dispatchEvent(new Event("invoice-updated"));
        api.getParties().then(setParties);
        api.getOffers?.().then((data) => setOffers(Array.isArray(data) ? data : []));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDiscountPercent = (cartItemId, percent) => {
    const safePercent = Math.max(0, Number(percent) || 0);
    const updatedCart = cart.map((item) => {
      if (item.cartItemId !== cartItemId || item.isFreeItem) return item;
      const totalPrice = Number(item.price || 0) * Number(item.quantity || 0);
      const discountAmount = (totalPrice * safePercent) / 100;
      return { ...item, manualDiscountPercent: safePercent, manualDiscountAmount: discountAmount, discountPercent: safePercent, discountAmount, total: Math.max(0, totalPrice - discountAmount) };
    });
    setCart(recalculateCart(updatedCart, false));
  };

  const handleDiscountAmount = (cartItemId, amount) => {
    const safeAmount = Math.max(0, Number(amount) || 0);
    const updatedCart = cart.map((item) => {
      if (item.cartItemId !== cartItemId || item.isFreeItem) return item;
      const totalPrice = Number(item.price || 0) * Number(item.quantity || 0);
      const cappedAmount = Math.min(safeAmount, totalPrice);
      const percent = totalPrice > 0 ? (cappedAmount / totalPrice) * 100 : 0;
      return { ...item, manualDiscountAmount: cappedAmount, manualDiscountPercent: percent, discountAmount: cappedAmount, discountPercent: percent, total: Math.max(0, totalPrice - cappedAmount) };
    });
    setCart(recalculateCart(updatedCart, false));
  };

  const resolveConflict = (key, offerId) => {
    const newResolved = { ...resolvedConflicts, [key]: offerId };
    setResolvedConflicts(newResolved);
    setOfferConflicts({});
    setCart((prev) => {
      const { cart: newCart, conflicts } = applyOffers(prev, offers, newResolved);
      setOfferConflicts(conflicts);
      return newCart;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter" && selected) addToCart();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, qty, cart, offers]);

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) setShowPartyDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadParties = () => api.getParties().then(setParties);
    const loadOffers = () => api.getOffers?.().then((data) => setOffers(Array.isArray(data) ? data : []));
    loadParties();
    api.getLoyaltySettings().then((data) => { if (data) setLoyaltySettings(data); });
    loadOffers();
    window.addEventListener("customer-updated", loadParties);
    window.addEventListener("offers-updated", loadOffers);
    return () => {
      window.removeEventListener("customer-updated", loadParties);
      window.removeEventListener("offers-updated", loadOffers);
    };
  }, []);

  useEffect(() => {
    if (!cart || cart.length === 0) return;
    setCart((prev) => {
      const { cart: newCart, conflicts } = applyOffers(prev, offers, resolvedConflicts);
      setOfferConflicts(conflicts);
      return newCart;
    });
  }, [offers]);

  useEffect(() => {
    if (selectedParty?.id) {
      api.getPartyLoyaltyPoints(selectedParty.id).then((data) => setLoyaltyPoints(data?.loyalty_points ?? 0));
    } else {
      setLoyaltyPoints(0);
      setRedeemPoints(0);
      setUseRedemption(false);
    }
  }, [selectedParty]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") setShowPartyModal(false); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const today = new Date();
    if (paymentTerms === "custom") { setDueDate(""); return; }
    const daysMap = { immediate: 0, "7_days": 7, "15_days": 15, "30_days": 30 };
    const daysToAdd = daysMap[paymentTerms] || 0;
    const date = new Date(today);
    date.setDate(today.getDate() + daysToAdd);
    setDueDate(date.toISOString().split("T")[0]);
  }, [paymentTerms]);

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  const saveParty = async () => {
    let newErrors = {};
    if (!newPartyName.trim()) newErrors.name = true;
    if (!newPartyPhone.trim()) newErrors.phone = true;
    else if (newPartyPhone.length !== 10) { alert("Mobile number must be exactly 10 digits"); newErrors.phone = true; }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) { alert("Please fill all required fields"); return; }
    await api.createParty({ name: newPartyName, phone: newPartyPhone, address: partyAddress, state: partyState, pincode: partyPincode, city: partyCity, type: partyType, balance: 0 });
    const updatedParties = await api.getParties();
    setParties(updatedParties);
    const createdParty = updatedParties[updatedParties.length - 1];
    setSelectedParty(createdParty);
    setShowPartyModal(false);
    setNewPartyName("");
    setNewPartyPhone("");
    setPartyAddress("");
    setPartyState("");
    setPartyPincode("");
    setPartyCity("");
  };

  const isFormValid = newPartyName.trim() && newPartyPhone.length === 10;
  const filteredParties = parties.filter(
    (p) => (p.type === "customer" || p.type === "both") && p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  /* ─── shared sub-styles ─────────────────────────────────────────────────── */
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
    top: 0, left: 0,
    width: "100%", height: "100%",
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
    padding: "28px 24px",
    boxShadow: "0 24px 64px rgba(60,55,70,0.18)",
    border: `1px solid ${lightTheme.borderStrong}`,
  };

  return (
    <div style={{
      marginTop: "10px",
      background: lightTheme.bg,
      padding: "20px",
      borderRadius: "16px",
      minHeight: "calc(100vh - 40px)"
    }}>

      {/* ── Page Title ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "22px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          background: lightTheme.accentGradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", boxShadow: lightTheme.accentGlow
        }}>🧾</div>
        <h2 style={{ margin: 0, fontWeight: "800", fontSize: "20px", color: lightTheme.textPrimary }}>
          Billing
        </h2>
        <div style={{
          marginLeft: "auto", fontSize: "13px", fontWeight: "700", color: "#3A3A6E",
          background: lightTheme.accentGradient, padding: "6px 16px",
          borderRadius: "20px", boxShadow: lightTheme.accentGlow,
          letterSpacing: "0.3px"
        }}>
          📅 {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      {/* ── Top Row: Party + Payment Details ──────────────────────────────── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>

        {/* Party Card */}
        <div ref={partyRef} style={{ flex: 2, ...cardStyle, position: "relative", zIndex: 10 }}>
          <div style={sectionHeader}>👤 Customer / Party</div>

          <div
            onClick={() => setShowPartyDropdown((prev) => !prev)}
            style={{
              border: `2px dashed ${lightTheme.accent}`,
              borderRadius: "10px",
              padding: "18px",
              textAlign: "center",
              cursor: "pointer",
              color: lightTheme.accentLight,
              fontWeight: "600",
              fontSize: "14px",
              background: "rgba(124,156,246,0.05)",
              transition: "all 0.2s",
              letterSpacing: "0.3px",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(124,156,246,0.12)";
              e.currentTarget.style.borderColor = lightTheme.accentLight;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(124,156,246,0.05)";
              e.currentTarget.style.borderColor = lightTheme.accent;
            }}
          >
            + Add Party
          </div>

          {showPartyDropdown && (
            <div style={{
              position: "absolute",
              top: "100%", left: "16px", right: "16px",
              background: lightTheme.cardBgSolid,
              borderRadius: "12px",
              boxShadow: "0 16px 48px rgba(60,55,70,0.15)",
              marginTop: "8px",
              zIndex: 1000,
              padding: "12px",
              border: `1px solid ${lightTheme.borderStrong}`,
            }}>
              <input
                type="text"
                placeholder="Search party..."
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
                style={{ ...inputStyle, width: "100%", marginBottom: "10px", boxSizing: "border-box", color: lightTheme.textPrimary }}
              />
              <div style={{
                display: "flex", justifyContent: "space-between",
                padding: "6px 10px",
                fontSize: "11px", fontWeight: "700", letterSpacing: "0.6px",
                textTransform: "uppercase", color: lightTheme.textMuted,
                borderBottom: `1px solid ${lightTheme.border}`, marginBottom: "4px",
              }}>
                <span>Party Name</span>
                <span>Balance</span>
              </div>
              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {filteredParties.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedParty(p); setShowPartyDropdown(false); }}
                    style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "10px", cursor: "pointer", borderRadius: "8px",
                      color: lightTheme.textPrimary, fontSize: "14px", transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = lightTheme.surfaceRaised}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span>{p.name}</span>
                    <span style={{ color: p.balance > 0 ? lightTheme.danger : lightTheme.success }}>
                      ₹{p.balance || 0}
                    </span>
                  </div>
                ))}
              </div>
              <div
                onClick={() => { setShowPartyModal(true); setShowPartyDropdown(false); }}
                style={{
                  padding: "10px", marginTop: "6px",
                  borderTop: `1px solid ${lightTheme.border}`,
                  cursor: "pointer", color: lightTheme.accentLight,
                  fontWeight: "600", textAlign: "center", fontSize: "13px",
                  borderRadius: "0 0 8px 8px", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(124,156,246,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                + Create New Party
              </div>
            </div>
          )}
        </div>

        {/* Payment Terms Card */}
        <div style={{ flex: 1, ...cardStyle }}>
          <div style={sectionHeader}>🗓 Payment Terms</div>
          <div style={{ marginBottom: "12px" }}>
            <label style={fieldLabel}>Terms</label>
            <div style={{ position: "relative" }}>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                style={{ ...selectStyle, width: "100%", color: lightTheme.textPrimary, paddingRight: "30px" }}
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
                color: lightTheme.textMuted, fontSize: "10px"
              }}>▼</span>
            </div>
          </div>
          <div>
            <label style={fieldLabel}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary, colorScheme: "light" }}
            />
          </div>
        </div>
      </div>

      {/* ── Selected Party Banner ──────────────────────────────────────────── */}
      {selectedParty && (
        <div style={{
          marginBottom: "14px",
          background: "rgba(124,156,246,0.08)",
          borderRadius: "12px",
          padding: "14px 18px",
          border: `1px solid rgba(124,156,246,0.25)`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: lightTheme.accentGradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: "700", color: "#3A3A6E",
              boxShadow: lightTheme.accentGlow,
            }}>
              {selectedParty.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "15px", color: lightTheme.textPrimary }}>
                {selectedParty.name}
              </div>
              <div style={{ fontSize: "12px", color: lightTheme.textSecondary }}>
                {selectedParty.phone}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedParty(null)}
            style={{
              background: lightTheme.dangerBg,
              border: `1px solid ${lightTheme.dangerBorder}`,
              borderRadius: "8px", padding: "6px 14px",
              cursor: "pointer", color: lightTheme.danger,
              fontWeight: "600", fontSize: "13px",
            }}
          >
            Change
          </button>
        </div>
      )}

      {/* ── Loyalty Points Banner ──────────────────────────────────────────── */}
      {selectedParty && (
        <div style={{
          marginBottom: "16px",
          background: lightTheme.warningBg,
          borderRadius: "12px",
          padding: "14px 18px",
          border: `1px solid ${lightTheme.warningBorder}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontWeight: "700", color: lightTheme.warning, fontSize: "14px" }}>
              ⭐ Loyalty Points: {loyaltyPoints} pts
            </div>
            <div style={{ fontSize: "12px", color: lightTheme.textSecondary, marginTop: "3px" }}>
              Will earn <strong style={{ color: lightTheme.textPrimary }}>{pointsToEarn} pts</strong> on this bill
              &nbsp;·&nbsp; 1 pt = ₹{loyaltySettings.loyalty_redeem_value}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: lightTheme.textPrimary, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={useRedemption}
                onChange={(e) => { setUseRedemption(e.target.checked); if (!e.target.checked) setRedeemPoints(0); }}
                style={{ marginRight: "6px", accentColor: lightTheme.accent }}
              />
              Redeem Points
            </label>
            {useRedemption && (
              <input
                type="number"
                min={0} max={loyaltyPoints}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(Math.min(Number(e.target.value), loyaltyPoints))}
                placeholder="Points to redeem"
                style={{ ...inputStyle, width: "130px", color: lightTheme.textPrimary, borderColor: lightTheme.warning }}
              />
            )}
            {useRedemption && redeemPoints > 0 && (
              <span style={{ color: lightTheme.success, fontWeight: "700", fontSize: "15px" }}>
                − ₹{pointsDiscount.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Main Two-Column Layout ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>

        {/* Left Column — Add Products */}
        <div style={{ flex: "0 0 300px" }}>
          <div style={cardStyle}>
            <div style={sectionHeader}>🔍 Add Products</div>

            {/* Barcode Scanner */}
            <div style={{
              marginBottom: "16px", padding: "14px",
              background: lightTheme.surfaceBase,
              borderRadius: "10px",
              border: `1px solid rgba(14,157,191,0.2)`,
            }}>
              <div style={{
                fontSize: "11px", fontWeight: "700", letterSpacing: "0.7px",
                textTransform: "uppercase", color: lightTheme.cyan, marginBottom: "8px"
              }}>
                🔖 Scan Barcode
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Scan or type barcode..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeSearch(barcodeInput); }}
                  style={{ ...inputStyle, flex: 1, color: lightTheme.textPrimary, borderColor: "rgba(14,157,191,0.25)" }}
                />
                <button
                  onClick={() => handleBarcodeSearch(barcodeInput)}
                  style={{
                    padding: "9px 14px", borderRadius: "8px",
                    background: "rgba(14,157,191,0.1)",
                    color: lightTheme.cyan, cursor: "pointer",
                    fontWeight: "700", fontSize: "13px",
                    border: "1px solid rgba(14,157,191,0.3)",
                  }}
                >
                  Add
                </button>
              </div>
              {barcodeError && (
                <div style={{
                  color: lightTheme.danger, fontSize: "12px", marginTop: "8px",
                  background: lightTheme.dangerBg, padding: "6px 10px", borderRadius: "6px",
                  border: `1px solid ${lightTheme.dangerBorder}`,
                }}>
                  ⚠ {barcodeError}
                </div>
              )}
            </div>

            {/* Product Search */}
            <div style={{ marginBottom: "14px" }}>
              <label style={fieldLabel}>Product Search</label>
              <div style={{ position: "relative" }}>
                <input
  type="text"
  placeholder="Search product..."
  value={search}
  onChange={(e) => { setSearch(e.target.value); setSelected(""); setShowDropdown(true); }}
  onFocus={() => setShowDropdown(true)}
  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && selected) {
      addToCart();
    }
  }}
  style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary }}
/>
                {showDropdown && search && (
                  <div style={{
                    position: "absolute", width: "100%",
                    background: lightTheme.cardBgSolid,
                    borderRadius: "10px",
                    boxShadow: "0 12px 40px rgba(60,55,70,0.15)",
                    maxHeight: "220px", overflowY: "auto",
                    marginTop: "6px", zIndex: 1000,
                    border: `1px solid ${lightTheme.borderStrong}`,
                  }}>
                    {filteredProducts.length === 0 && (
                      <div style={{ padding: "14px", color: lightTheme.textMuted, fontSize: "13px", textAlign: "center" }}>
                        No products found
                      </div>
                    )}
                    {filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (isProductExpired(p)) { alert(`${p.name} is expired and cannot be billed`); return; }
                          setSelected(p.id);
                          setSearch(p.name);
                          setShowDropdown(false);
                        }}
                        style={{
                          padding: "10px 14px", cursor: "pointer",
                          borderBottom: `1px solid ${lightTheme.border}`, transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = lightTheme.surfaceRaised}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: "600", color: lightTheme.textPrimary, fontSize: "14px" }}>
                            {p.name}
                          </span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {isProductExpired(p) && (
                              <span style={{
                                fontSize: "10px", padding: "2px 8px", borderRadius: "20px",
                                fontWeight: "700", background: lightTheme.dangerBg, color: lightTheme.danger,
                                border: `1px solid ${lightTheme.dangerBorder}`,
                              }}>Expired</span>
                            )}
                            {p.unit_type && (
                              <span style={{
                                fontSize: "10px", padding: "2px 8px", borderRadius: "20px",
                                fontWeight: "600", textTransform: "capitalize",
                                background: p.unit_type === "bulk" ? lightTheme.warningBg : "rgba(124,156,246,0.12)",
                                color: p.unit_type === "bulk" ? lightTheme.warning : lightTheme.accentLight,
                                border: `1px solid ${p.unit_type === "bulk" ? lightTheme.warningBorder : "rgba(124,156,246,0.25)"}`,
                              }}>
                                {p.unit_type}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ marginTop: "3px", fontSize: "13px", color: lightTheme.accentLight, fontWeight: "600" }}>
                          ₹{p.price}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div style={{ marginBottom: "16px" }}>
              <label style={fieldLabel}>Quantity</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={() => setQty(qty > 1 ? qty - 1 : 1)}
                  style={{
                    width: "34px", height: "34px", borderRadius: "8px",
                    border: `1px solid ${lightTheme.border}`,
                    background: lightTheme.surfaceRaised,
                    color: lightTheme.textPrimary, cursor: "pointer",
                    fontSize: "18px", fontWeight: "700",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", lineHeight: "1",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = lightTheme.dangerBg; e.currentTarget.style.borderColor = lightTheme.dangerBorder; e.currentTarget.style.color = lightTheme.danger; }}
                  onMouseLeave={e => { e.currentTarget.style.background = lightTheme.surfaceRaised; e.currentTarget.style.borderColor = lightTheme.border; e.currentTarget.style.color = lightTheme.textPrimary; }}
                >−</button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  min="1"
                  style={{ ...inputStyle, width: "64px", textAlign: "center", color: lightTheme.textPrimary, fontWeight: "700", fontSize: "16px" }}
                />
                <button
                  onClick={() => setQty(qty + 1)}
                  style={{
                    width: "34px", height: "34px", borderRadius: "8px",
                    border: `1px solid ${lightTheme.border}`,
                    background: lightTheme.surfaceRaised,
                    color: lightTheme.textPrimary, cursor: "pointer",
                    fontSize: "18px", fontWeight: "700",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", lineHeight: "1",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = lightTheme.successBg; e.currentTarget.style.borderColor = lightTheme.successBorder; e.currentTarget.style.color = lightTheme.success; }}
                  onMouseLeave={e => { e.currentTarget.style.background = lightTheme.surfaceRaised; e.currentTarget.style.borderColor = lightTheme.border; e.currentTarget.style.color = lightTheme.textPrimary; }}
                >+</button>
              </div>
            </div>

            <button onClick={addToCart} style={{ ...primaryButtonStyle, width: "100%" }}>
              + Add Item
            </button>
          </div>
        </div>

        {/* Right Column — Order Summary + Payments */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Order Summary Header */}
          <div style={{
            ...cardStyle, marginBottom: "12px",
            background: cart.length > 0 ? "rgba(124,156,246,0.08)" : lightTheme.cardBg,
            border: cart.length > 0 ? `1px solid rgba(124,156,246,0.3)` : `1px solid ${lightTheme.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: lightTheme.textPrimary, fontSize: "16px", fontWeight: "700" }}>
                Order Summary
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  background: cart.length > 0 ? lightTheme.accentGradient : lightTheme.surfaceBase,
                  color: cart.length > 0 ? "#3A3A6E" : lightTheme.textMuted,
                  padding: "5px 14px", borderRadius: "20px",
                  fontSize: "13px", fontWeight: "700",
                  boxShadow: cart.length > 0 ? lightTheme.accentGlow : "none",
                }}>
                  {cart.length === 0 ? "Empty" : `${cart.length} Items`}
                </div>
                <div style={{
                  fontSize: "20px", fontWeight: "800",
                  color: cart.length > 0 ? lightTheme.accentLight : lightTheme.textMuted,
                  letterSpacing: "-0.5px",
                }}>
                  ₹{getTotal().toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Cart Table */}
          <div style={{
            maxHeight: "300px", overflowY: "auto",
            marginBottom: "14px",
            border: `1px solid ${lightTheme.border}`,
            borderRadius: "12px",
            background: lightTheme.surfaceBase,
          }}>
            {/* Table Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 0.7fr 0.7fr 0.8fr 1fr 1.4fr 1fr",
              gap: "6px", padding: "10px 14px",
              fontWeight: "700", fontSize: "11px",
              letterSpacing: "0.6px", textTransform: "uppercase",
              color: lightTheme.textMuted,
              background: lightTheme.surfaceRaised,
              borderBottom: `1px solid ${lightTheme.border}`,
              borderRadius: "12px 12px 0 0",
              position: "sticky", top: 0, zIndex: 1,
            }}>
              <div>Product</div>
              <div style={{ textAlign: "center" }}>HSN</div>
              <div style={{ textAlign: "center" }}>GST%</div>
              <div style={{ textAlign: "center" }}>Qty</div>
              <div style={{ textAlign: "right" }}>Price</div>
              <div style={{ textAlign: "center" }}>Discount</div>
              <div style={{ textAlign: "right", paddingRight: "30px" }}>Total</div>
            </div>

            {cart.length === 0 && (
              <div style={{ padding: "32px", textAlign: "center", color: lightTheme.textMuted, fontSize: "14px" }}>
                No items added yet
              </div>
            )}

            {cart.map((item) => (
              <div
                key={item.cartItemId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 0.7fr 0.7fr 0.8fr 1fr 1.4fr 1fr",
                  alignItems: "center", gap: "6px",
                  padding: "10px 14px",
                  borderBottom: `1px solid ${lightTheme.border}`,
                  position: "relative", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(124,156,246,0.04)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {/* Product Name + Badges */}
                <div style={{ textAlign: "left" }}>
                  <span style={{ color: lightTheme.textPrimary, fontWeight: "500", fontSize: "13px" }}>
                    {item.name}
                  </span>
                  {item.isFreeItem && (
                    <span style={{
                      marginLeft: "7px", background: lightTheme.successBg,
                      color: lightTheme.success, padding: "2px 7px", borderRadius: "6px",
                      fontSize: "10px", fontWeight: "700", border: `1px solid ${lightTheme.successBorder}`,
                    }}>FREE</span>
                  )}
                  {item.isCartDiscountItem && (
                    <span style={{
                      marginLeft: "7px", background: "rgba(124,156,246,0.12)",
                      color: lightTheme.accentLight, padding: "2px 7px", borderRadius: "6px",
                      fontSize: "10px", fontWeight: "700", border: "1px solid rgba(124,156,246,0.25)",
                    }}>OFFER</span>
                  )}
                  {item.appliedOfferId && !item.isFreeItem && !item.isCartDiscountItem && (
                    <span
                      style={{
                        marginLeft: "7px", background: lightTheme.warningBg,
                        color: lightTheme.warning, padding: "2px 7px", borderRadius: "6px",
                        fontSize: "10px", fontWeight: "700", cursor: "pointer",
                        border: `1px solid ${lightTheme.warningBorder}`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const offerType = item.appliedOfferType;
                        const appliedOffer = offers.find((o) => Number(o.id) === Number(item.appliedOfferId));
                        let conflictKey = null;
                        if (offerType === "FLAT_DISCOUNT") conflictKey = "cart_flat";
                        else if (offerType === "BXGY") conflictKey = `bxgy_${item.parentProductId ?? item.id}`;
                        else if (offerType === "CATEGORY_DISCOUNT") conflictKey = `category_${item.category || item.category_id || item.categoryId}`;
                        else if (offerType === "HAPPY_HOURS") {
                          const categoryId = appliedOffer?.categoryId ?? appliedOffer?.category_id;
                          conflictKey = categoryId ? `happy_hours_${categoryId}` : "happy_hours_all";
                        } else conflictKey = `product_${item.id}`;
                        const newResolved = { ...resolvedConflicts, [conflictKey]: null };
                        setResolvedConflicts(newResolved);
                        const updatedCart = cart
                          .map((c) => {
                            if (c.cartItemId === item.cartItemId) {
                              const baseTotal = Number(c.quantity || 0) * Number(c.price || 0);
                              const manualDisc = Number(c.manualDiscountAmount ?? 0);
                              return { ...c, offerDiscountAmount: 0, appliedOfferId: null, appliedOfferType: null, appliedOfferName: null, total: Math.max(0, baseTotal - manualDisc) };
                            }
                            return c;
                          })
                          .filter((c) => c.parentCartItemId !== item.cartItemId);
                        const { cart: newCart, conflicts } = applyOffers(updatedCart, offers, newResolved);
                        const unresolvedConflicts = Object.fromEntries(
                          Object.entries(conflicts).filter(([key]) => !(key in newResolved))
                        );
                        setOfferConflicts(unresolvedConflicts);
                        setCart(newCart);
                      }}
                    >
                      ✕ offer
                    </span>
                  )}
                </div>

                <div style={{ textAlign: "center", fontSize: "12px", color: lightTheme.textMuted }}>
                  {item.hsn_code || "—"}
                </div>
                <div style={{ textAlign: "center", fontSize: "12px", color: lightTheme.textMuted }}>
                  {item.tax_rate || 0}%
                </div>

                <div style={{ textAlign: "center" }}>
                  <input
                    type="number"
                    value={item.quantity}
                    disabled={item.isFreeItem || item.isCartDiscountItem}
                    min="1"
                    onChange={(e) => {
                      let newQty = Number(e.target.value);
                      if (newQty < 1) newQty = 1;
                      const otherSameProductQty = cart
                        .filter((p) => p.id === item.id && p.cartItemId !== item.cartItemId)
                        .reduce((sum, p) => sum + Number(p.quantity || 0), 0);
                      const maxQty = Math.max(1, Number(item.stock || 0) - otherSameProductQty);
                      if (newQty > maxQty) { alert(`Only ${item.stock} items available`); newQty = maxQty; }
                      const updatedCart = cart.map((p) => {
                        if (p.cartItemId === item.cartItemId && !p.isFreeItem) {
                          const totalPrice = newQty * Number(p.price || 0) - Number(p.manualDiscountAmount ?? p.discountAmount ?? 0);
                          return { ...p, quantity: newQty, paidQuantity: newQty, total: Math.max(0, totalPrice) };
                        }
                        return p;
                      });
                      setCart(recalculateCart(updatedCart, false));
                    }}
                    style={{
                      width: "50px", padding: "5px", textAlign: "center",
                      borderRadius: "6px", border: `1px solid ${lightTheme.border}`,
                      background: lightTheme.surfaceBase, color: lightTheme.textPrimary, fontSize: "13px",
                    }}
                  />
                </div>

                <div style={{ textAlign: "right", color: lightTheme.textSecondary, fontSize: "13px" }}>
                  ₹{item.price}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                  <input
                    type="number"
                    value={item.discountPercent || ""}
                    placeholder="%"
                    disabled={item.isFreeItem || item.isCartDiscountItem}
                    onChange={(e) => handleDiscountPercent(item.cartItemId, Number(e.target.value) || 0)}
                    style={{
                      width: "52px", padding: "4px 6px",
                      border: `1px solid ${lightTheme.border}`, borderRadius: "5px",
                      textAlign: "center", background: lightTheme.surfaceBase,
                      color: lightTheme.textPrimary, fontSize: "12px",
                    }}
                  />
                  <input
                    type="number"
                    value={item.discountAmount || ""}
                    placeholder="₹"
                    disabled={item.isFreeItem || item.isCartDiscountItem}
                    onChange={(e) => handleDiscountAmount(item.cartItemId, Number(e.target.value) || 0)}
                    style={{
                      width: "52px", padding: "4px 6px",
                      border: `1px solid ${lightTheme.border}`, borderRadius: "5px",
                      textAlign: "center", background: lightTheme.surfaceBase,
                      color: lightTheme.textPrimary, fontSize: "12px",
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", paddingRight: "10px" }}>
                  <span style={{ fontWeight: "700", color: lightTheme.textPrimary, fontSize: "13px" }}>
                    ₹{Number(item.total || 0).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    style={{
                      border: "none", background: "transparent",
                      color: item.isFreeItem || item.isCartDiscountItem ? lightTheme.textMuted : lightTheme.danger,
                      cursor: item.isFreeItem || item.isCartDiscountItem ? "not-allowed" : "pointer",
                      fontSize: "15px", padding: "2px", lineHeight: "1",
                      opacity: item.isFreeItem || item.isCartDiscountItem ? 0.4 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >✖</button>
                </div>
              </div>
            ))}
          </div>

          {/* GST Breakdown */}
          {(() => {
            const subtotal = cart.reduce((sum, item) => {
              const total = Number(item.total || 0);
              if (item.isCartDiscountItem) return sum + total;
              const base = total / (1 + (Number(item.tax_rate || 0) / 100));
              return sum + base;
            }, 0);
            const gstAmount = getTotal() - subtotal;
            return (
              <div style={{
                marginBottom: "12px", padding: "10px 14px",
                background: lightTheme.surfaceBase, borderRadius: "8px",
                border: `1px solid ${lightTheme.border}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: lightTheme.textSecondary, marginBottom: "4px" }}>
                  <span>Subtotal (before GST)</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: lightTheme.textSecondary }}>
                  <span>GST</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}

          {/* Total Row */}
          <div style={{
            fontSize: "18px", fontWeight: "800", marginBottom: "14px",
            padding: "12px 16px",
            background: "rgba(124,156,246,0.06)",
            borderRadius: "10px",
            border: `1px solid rgba(124,156,246,0.2)`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            color: lightTheme.textPrimary,
          }}>
            <span style={{ fontSize: "14px", fontWeight: "700", color: lightTheme.textSecondary }}>
              TOTAL AMOUNT
            </span>
            <span>
              ₹{getTotal().toFixed(2)}
              {pointsDiscount > 0 && (
                <>
                  <span style={{ color: lightTheme.success, fontSize: "13px", marginLeft: "10px", fontWeight: "600" }}>
                    − ₹{pointsDiscount.toFixed(2)} pts
                  </span>
                  <span style={{ marginLeft: "8px", color: lightTheme.accentLight }}>
                    = ₹{getFinalTotal().toFixed(2)}
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Payments Section */}
          <div style={{ marginBottom: "14px" }}>
            <div style={sectionHeader}>💳 Payments</div>
            {payments.map((payment, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ position: "relative", flex: "0 0 160px" }}>
                  <select
                    value={payment.mode}
                    onChange={(e) => updatePayment(index, "mode", e.target.value)}
                    style={{ ...selectStyle, width: "100%", color: lightTheme.textPrimary, paddingRight: "28px" }}
                  >
                    {paymentOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <span style={{
                    position: "absolute", right: "10px", top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                    color: lightTheme.textMuted, fontSize: "10px",
                  }}>▼</span>
                </div>
                <input
                  type="number" min="0"
                  value={payment.amount}
                  onChange={(e) => updatePayment(index, "amount", e.target.value)}
                  style={{ ...inputStyle, flex: 1, textAlign: "right", color: lightTheme.textPrimary, fontWeight: "700", fontSize: "15px" }}
                />
                <button
                  onClick={() => removePaymentRow(index)}
                  disabled={payments.length === 1}
                  style={{
                    border: "none", background: "transparent",
                    color: payments.length === 1 ? lightTheme.textMuted : lightTheme.danger,
                    cursor: payments.length === 1 ? "not-allowed" : "pointer",
                    fontSize: "16px", padding: "4px",
                    opacity: payments.length === 1 ? 0.35 : 1,
                  }}
                >✖</button>
              </div>
            ))}
            <button onClick={addPaymentRow} style={ghostButtonStyle}>
              + Add Payment Method
            </button>
          </div>

          {/* Balance Summary */}
          <div style={{
            marginBottom: "16px", padding: "12px 16px",
            background: lightTheme.surfaceBase, borderRadius: "10px",
            border: `1px solid ${lightTheme.border}`,
            display: "flex", justifyContent: "space-between",
          }}>
            <div style={{ fontWeight: "700", color: lightTheme.success, fontSize: "14px" }}>
              ✓ Paid: ₹{totalPaid.toLocaleString("en-IN")}
            </div>
            <div style={{ fontWeight: "700", fontSize: "14px", color: balance > 0 ? lightTheme.danger : lightTheme.success }}>
              {balance > 0 ? "⚠ Balance:" : "✓ Change:"} ₹{Math.abs(balance).toLocaleString("en-IN")}
            </div>
          </div>

          {/* Save Bill Button */}
          <button
            onClick={saveInvoice}
            style={{
              ...primaryButtonStyle,
              width: "100%", padding: "14px 24px",
              fontSize: "16px", letterSpacing: "0.5px", borderRadius: "12px",
              boxShadow: lightTheme.accentGlow,
            }}
          >
            💾 Save Bill
          </button>
        </div>
      </div>

      {/* ── Create Party Modal ─────────────────────────────────────────────── */}
      {showPartyModal && (
  <div
    onClick={() => { setShowPartyModal(false); setPartyStep(1); }}
    style={{
      position: "fixed", top: 0, left: 0,
      width: "100%", height: "100%",
      background: "rgba(47,47,46,0.40)",
      backdropFilter: "blur(6px)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 2000,
      padding: "16px",
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: lightTheme.cardBgSolid,
        borderRadius: "20px",
        width: "100%",
        maxWidth: "520px",
        border: `1px solid ${lightTheme.borderStrong}`,
        boxShadow: "0 32px 80px rgba(47,47,46,0.20)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
 
      {/* ── Modal Header ─────────────────────────────────────────────── */}
      <div style={{
        padding: "24px 28px 0",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "12px",
            background: "rgba(124,156,246,0.12)",
            border: "1px solid rgba(124,156,246,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", flexShrink: 0,
          }}>👤</div>
          <div>
            <div style={{ fontWeight: "700", fontSize: "17px", color: lightTheme.textPrimary }}>
              Add new party
            </div>
            <div style={{ fontSize: "12px", color: lightTheme.textSecondary, marginTop: "2px" }}>
              Customer, supplier, or both
            </div>
          </div>
        </div>
        <button
          onClick={() => { setShowPartyModal(false); setPartyStep(1); }}
          style={{
            width: "32px", height: "32px", borderRadius: "8px",
            border: `1px solid ${lightTheme.border}`,
            background: "transparent", cursor: "pointer",
            color: lightTheme.textSecondary, fontSize: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>
      </div>
 
      {/* ── Step Indicator ────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "20px 28px 0", gap: "0",
      }}>
        {[
          { n: 1, label: "Basic info" },
          { n: 2, label: "Address" },
          { n: 3, label: "Review" },
        ].map(({ n, label }, i, arr) => (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: n < arr.length ? "1" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "26px", height: "26px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: "700", flexShrink: 0,
                background: partyStep > n
                  ? lightTheme.successBg
                  : partyStep === n
                  ? lightTheme.accentGradient
                  : lightTheme.surfaceBase,
                color: partyStep > n
                  ? lightTheme.success
                  : partyStep === n
                  ? "#3A3A6E"
                  : lightTheme.textMuted,
                border: partyStep > n
                  ? `1px solid ${lightTheme.successBorder}`
                  : partyStep === n
                  ? "none"
                  : `1px solid ${lightTheme.border}`,
              }}>
                {partyStep > n ? "✓" : n}
              </div>
              <span style={{
                fontSize: "12px", fontWeight: "600",
                color: partyStep === n
                  ? lightTheme.textPrimary
                  : partyStep > n
                  ? lightTheme.success
                  : lightTheme.textMuted,
              }}>
                {label}
              </span>
            </div>
            {n < arr.length && (
              <div style={{
                flex: 1, height: "1px", margin: "0 8px",
                background: partyStep > n ? lightTheme.successBorder : lightTheme.border,
              }} />
            )}
          </div>
        ))}
      </div>
 
      {/* ── Modal Body ────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 28px" }}>
 
        {/* ── Step 1: Basic Info ─────────────────────────────────────── */}
        {partyStep === 1 && (
          <div>
            <div style={{ ...sectionHeader, marginBottom: "16px" }}>Party identity</div>
 
            <div style={{ marginBottom: "16px" }}>
              <label style={fieldLabel}>
                Full name <span style={{ color: lightTheme.danger }}>*</span>
              </label>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="e.g. Rajesh Kumar / Krishna Traders"
                autoFocus
                style={{
                  ...inputStyle, width: "100%", boxSizing: "border-box",
                  color: lightTheme.textPrimary,
                  borderColor: errors.name ? lightTheme.danger : lightTheme.border,
                }}
              />
              {errors.name && (
                <div style={{ color: lightTheme.danger, fontSize: "11px", marginTop: "4px" }}>
                  Name is required
                </div>
              )}
            </div>
 
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={fieldLabel}>
                  Mobile <span style={{ color: lightTheme.danger }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={newPartyPhone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    if (v.length <= 10) setNewPartyPhone(v);
                  }}
                  style={{
                    ...inputStyle, width: "100%", boxSizing: "border-box",
                    color: lightTheme.textPrimary,
                    borderColor: errors.phone ? lightTheme.danger : lightTheme.border,
                  }}
                />
                {newPartyPhone && newPartyPhone.length !== 10 && (
                  <div style={{ color: lightTheme.danger, fontSize: "11px", marginTop: "4px" }}>
                    Must be exactly 10 digits
                  </div>
                )}
              </div>
              <div>
                <label style={fieldLabel}>
                  GSTIN <span style={{ fontSize: "11px", color: lightTheme.textMuted, textTransform: "none", fontWeight: "400" }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AABCD…"
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary }}
                />
              </div>
            </div>
 
            <div>
              <label style={fieldLabel}>Party type</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {[
                  { value: "customer", label: "Customer", icon: "🛒" },
                  { value: "supplier", label: "Supplier", icon: "🚚" },
                  { value: "both", label: "Both", icon: "🔄" },
                ].map(({ value, label, icon }) => (
                  <div
                    key={value}
                    onClick={() => setPartyType(value)}
                    style={{
                      border: partyType === value
                        ? `2px solid ${lightTheme.accent}`
                        : `1px solid ${lightTheme.border}`,
                      borderRadius: "10px",
                      padding: "12px 10px",
                      cursor: "pointer",
                      textAlign: "center",
                      background: partyType === value
                        ? "rgba(124,156,246,0.10)"
                        : lightTheme.surfaceBase,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: "22px", marginBottom: "5px" }}>{icon}</div>
                    <div style={{
                      fontSize: "12px", fontWeight: "600",
                      color: partyType === value ? lightTheme.accentLight : lightTheme.textSecondary,
                    }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
 
        {/* ── Step 2: Address ────────────────────────────────────────── */}
        {partyStep === 2 && (
          <div>
            <div style={{ ...sectionHeader, marginBottom: "16px" }}>Billing address</div>
 
            <div style={{ marginBottom: "14px" }}>
              <label style={fieldLabel}>Street / locality</label>
              <textarea
                placeholder="Building, street, area…"
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
                rows={2}
                style={{
                  ...inputStyle, width: "100%", boxSizing: "border-box",
                  color: lightTheme.textPrimary, resize: "none", lineHeight: "1.5",
                }}
              />
            </div>
 
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={fieldLabel}>State</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={partyState}
                    onChange={(e) => setPartyState(e.target.value)}
                    style={{
                      ...selectStyle, width: "100%", boxSizing: "border-box",
                      color: partyState ? lightTheme.textPrimary : lightTheme.textMuted,
                      paddingRight: "28px",
                    }}
                  >
                    <option value="">Select state</option>
                    {indianStates.map((s, i) => <option key={i} value={s}>{s}</option>)}
                  </select>
                  <span style={{
                    position: "absolute", right: "10px", top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                    color: lightTheme.textMuted, fontSize: "10px",
                  }}>▼</span>
                </div>
              </div>
              <div>
                <label style={fieldLabel}>Pincode</label>
                <input
                  type="number"
                  placeholder="600001"
                  value={partyPincode}
                  onChange={(e) => setPartyPincode(e.target.value)}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary }}
                />
              </div>
            </div>
 
            <div style={{ marginBottom: "16px" }}>
              <label style={fieldLabel}>City</label>
              <input
                type="text"
                placeholder="e.g. Chennai"
                value={partyCity}
                onChange={(e) => setPartyCity(e.target.value)}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box", color: lightTheme.textPrimary }}
              />
            </div>
 
            <label style={{
              display: "flex", alignItems: "center", gap: "10px",
              cursor: "pointer", padding: "10px 14px",
              background: lightTheme.surfaceBase,
              borderRadius: "10px",
              border: `1px solid ${lightTheme.border}`,
            }}>
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                style={{ accentColor: lightTheme.accent, width: "15px", height: "15px", cursor: "pointer" }}
              />
              <span style={{ fontSize: "13px", color: lightTheme.textSecondary }}>
                Shipping address same as billing
              </span>
            </label>
          </div>
        )}
 
        {/* ── Step 3: Review ─────────────────────────────────────────── */}
        {partyStep === 3 && (
          <div>
            <div style={{ ...sectionHeader, marginBottom: "16px" }}>Confirm details</div>
 
            {/* Party avatar + name */}
            <div style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "16px 18px",
              background: "rgba(124,156,246,0.07)",
              borderRadius: "12px",
              border: "1px solid rgba(124,156,246,0.2)",
              marginBottom: "16px",
            }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: lightTheme.accentGradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "700", fontSize: "18px", color: "#3A3A6E",
                boxShadow: lightTheme.accentGlow, flexShrink: 0,
              }}>
                {newPartyName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "15px", color: lightTheme.textPrimary }}>
                  {newPartyName || "—"}
                </div>
                <div style={{ fontSize: "13px", color: lightTheme.textSecondary, marginTop: "2px" }}>
                  {newPartyPhone || "—"}
                  &nbsp;·&nbsp;
                  <span style={{
                    fontWeight: "600", fontSize: "11px",
                    textTransform: "capitalize",
                    color: lightTheme.accentLight,
                  }}>{partyType}</span>
                </div>
              </div>
            </div>
 
            {/* Address summary */}
            {(partyAddress || partyCity || partyState) && (
              <div style={{
                padding: "12px 16px",
                background: lightTheme.surfaceBase,
                borderRadius: "10px",
                border: `1px solid ${lightTheme.border}`,
                fontSize: "13px", color: lightTheme.textSecondary, lineHeight: "1.7",
              }}>
                <div style={{ fontWeight: "600", color: lightTheme.textPrimary, marginBottom: "4px", fontSize: "12px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Billing address
                </div>
                {partyAddress && <div>{partyAddress}</div>}
                {(partyCity || partyState || partyPincode) && (
                  <div>
                    {[partyCity, partyState, partyPincode].filter(Boolean).join(", ")}
                  </div>
                )}
                {sameAsBilling && (
                  <div style={{ marginTop: "6px", color: lightTheme.textMuted, fontSize: "12px" }}>
                    ✓ Shipping same as billing
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
 
      {/* ── Modal Footer ──────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 28px 22px",
        borderTop: `1px solid ${lightTheme.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: "11px", color: lightTheme.textMuted }}>
          <span style={{ color: lightTheme.danger }}>*</span> required fields
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          {/* Back / Cancel */}
          <button
            onClick={() => {
              if (partyStep === 1) {
                setShowPartyModal(false);
                setNewPartyName(""); setNewPartyPhone("");
                setPartyStep(1);
              } else {
                setPartyStep((s) => s - 1);
              }
            }}
            style={ghostButtonStyle}
          >
            {partyStep === 1 ? "Cancel" : "← Back"}
          </button>
 
          {/* Next / Save */}
          {partyStep < 3 ? (
            <button
              onClick={() => {
                if (partyStep === 1) {
                  const errs = {};
                  if (!newPartyName.trim()) errs.name = true;
                  if (!newPartyPhone.trim() || newPartyPhone.length !== 10) errs.phone = true;
                  setErrors(errs);
                  if (Object.keys(errs).length > 0) return;
                }
                setPartyStep((s) => s + 1);
              }}
              style={{ ...primaryButtonStyle, padding: "10px 22px" }}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={saveParty}
              disabled={!isFormValid}
              style={{
                ...primaryButtonStyle,
                padding: "10px 22px",
                opacity: isFormValid ? 1 : 0.45,
                cursor: isFormValid ? "pointer" : "not-allowed",
              }}
            >
              ✓ Save party
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}

      {/* ── Offer Conflict Modal ───────────────────────────────────────────── */}
      {Object.keys(offerConflicts).length > 0 && (
        <div style={{ ...modalOverlay, zIndex: 3000 }}>
          <div style={{ ...modalCard, width: "480px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px",
                background: lightTheme.warningBg, border: `1px solid ${lightTheme.warningBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
              }}>🎁</div>
              <h3 style={{ margin: 0, color: lightTheme.textPrimary, fontSize: "17px", fontWeight: "800" }}>
                Multiple Offers Available
              </h3>
            </div>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: lightTheme.textSecondary }}>
              More than one offer applies here. Choose which one to use:
            </p>

            {Object.entries(offerConflicts).map(([key, conflictOffers]) => (
              <div key={key} style={{ marginBottom: "20px" }}>
                <div style={{
                  fontWeight: "700", fontSize: "12px", letterSpacing: "0.6px",
                  textTransform: "uppercase", color: lightTheme.textSecondary, marginBottom: "10px",
                }}>
                  {conflictOffers[0].type === "FLAT_DISCOUNT" ? "Cart Offers" : `Offers for: ${conflictOffers[0].name.split(" ")[0]}`}
                </div>
                {conflictOffers.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => resolveConflict(key, offer.id)}
                    style={{
                      padding: "14px 16px", marginBottom: "8px",
                      border: `1px solid ${lightTheme.border}`, borderRadius: "10px",
                      cursor: "pointer", transition: "all 0.15s",
                      background: lightTheme.surfaceBase,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = lightTheme.accent; e.currentTarget.style.background = "rgba(124,156,246,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = lightTheme.border; e.currentTarget.style.background = lightTheme.surfaceBase; }}
                  >
                    <div style={{ fontWeight: "700", color: lightTheme.textPrimary, marginBottom: "3px", fontSize: "14px" }}>
                      {offer.name}
                    </div>
                    <div style={{ fontSize: "13px", color: lightTheme.accentLight }}>
                      {offer.type === "PERCENT_DISCOUNT" && `${offer.discountPercent}% off`}
                      {offer.type === "TIERED_DISCOUNT" && `${offer.discountPercent}% off per set of ${offer.buyQty}`}
                      {offer.type === "BXGY" && `Buy ${offer.buyQty} get ${offer.freeQty} free`}
                      {offer.type === "FLAT_DISCOUNT" && `₹${offer.flatAmount} off on ₹${offer.minCartValue}+ cart`}
                    </div>
                  </div>
                ))}
                <div
                  onClick={() => resolveConflict(key, null)}
                  style={{
                    padding: "10px 16px",
                    border: `1px dashed ${lightTheme.border}`,
                    borderRadius: "8px", cursor: "pointer",
                    textAlign: "center", fontSize: "13px",
                    color: lightTheme.textMuted, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = lightTheme.surfaceRaised; e.currentTarget.style.color = lightTheme.textSecondary; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = lightTheme.textMuted; }}
                >
                  Skip — don't apply any offer
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;