import { useEffect, useState, useRef } from "react";
import { applyOffers } from "../utils/offerEngine.js";

import api from "../services/api.js";

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
const barcodeRef = useRef(null);

 const recalculateCart = (nextCart, clearResolved = false) => {
  const resolved = clearResolved ? {} : resolvedConflicts;
  if (clearResolved) {
    setResolvedConflicts({});
    setOfferConflicts({});
  }

  const { cart: newCart, conflicts } = applyOffers(nextCart, offers, resolved);

  // Only show conflict popup if there are NEW conflicts not yet resolved
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

        return {
          ...item,
          quantity: newQty,
          paidQuantity: newQty,
          total: Math.max(0, baseTotal - manualDiscountAmount)
        };
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

  setTimeout(() => {
    barcodeRef.current?.focus();
  }, 0);
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

          return {
            ...item,
            quantity: newQty,
            paidQuantity: newQty,
            total: Math.max(0, baseTotal - manualDiscountAmount)
          };
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
    (item) =>
      item.cartItemId !== cartItemId &&
      item.parentCartItemId !== cartItemId
  );

  // Only clear resolved conflicts for the removed item, not everything
  const removedProductId = itemToRemove?.id;
  const newResolved = Object.fromEntries(
    Object.entries(resolvedConflicts).filter(([key]) =>
      !key.includes(`product_${removedProductId}`) &&
      !key.includes(`bxgy_${removedProductId}`)
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

  const getTotal = () => {
    return cart.reduce((sum, item) => {
      return sum + Number(item.total || 0);
    }, 0);
  };

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

  const totalPaid = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

  const balance = getFinalTotal() - totalPaid;

  const updatePayment = (index, field, value) => {
    setPayments((prev) =>
      prev.map((payment, i) =>
        i === index
          ? {
              ...payment,
              [field]: field === "amount" ? Number(value) : value
            }
          : payment
      )
    );
  };

  const addPaymentRow = () => {
    setPayments((prev) => [
      ...prev,
      {
        mode: "cash",
        amount: 0
      }
    ]);
  };

  const removePaymentRow = (index) => {
    setPayments((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const saveInvoice = async () => {

    if (cart.length === 0) {
      alert("Please add at least one item");
      return;
    }

    const { cart: invoiceItems } = applyOffers(cart, offers, resolvedConflicts);

    if (invoiceItems.some((item) => Number(item.quantity || 0) <= 0)) {
      alert("Invalid item quantity");
      return;
    }

    if (payments.some((p) => Number(p.amount || 0) < 0)) {
      alert("Payment amount cannot be negative");
      return;
    }

    const validPayments = payments
      .map((p) => ({
        mode: p.mode,
        amount: Number(p.amount || 0)
      }))
      .filter((p) => p.amount > 0);

    if (
      validPayments.some(
        (p) => !["cash", "upi", "card", "net_banking"].includes(p.mode)
      )
    ) {
      alert("Invalid payment mode");
      return;
    }

    try {
      const total = Math.max(
        0,
        invoiceItems.reduce((sum, item) => sum + Number(item.total || 0), 0) - pointsDiscount
      );
      const paidTotal = validPayments.reduce((sum, p) => sum + p.amount, 0);
      const invoiceBalance = total - paidTotal;

      let paymentStatus = "pending";

      if (invoiceBalance <= 0) {
        paymentStatus = "paid";
      } else if (paidTotal > 0) {
        paymentStatus = "partial";
      }

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Enter" && selected) {
        addToCart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected, qty, cart, offers]);

  useEffect(() => {
  barcodeRef.current?.focus();
}, []);

  const handleDiscountPercent = (cartItemId, percent) => {
  const safePercent = Math.max(0, Number(percent) || 0);

  const updatedCart = cart.map((item) => {
    if (item.cartItemId !== cartItemId || item.isFreeItem) return item;

    const totalPrice = Number(item.price || 0) * Number(item.quantity || 0);
    const discountAmount = (totalPrice * safePercent) / 100;

    return {
      ...item,
      manualDiscountPercent: safePercent,
      manualDiscountAmount: discountAmount,
      discountPercent: safePercent,
      discountAmount,
      total: Math.max(0, totalPrice - discountAmount),
    };
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

    return {
      ...item,
      manualDiscountAmount: cappedAmount,
      manualDiscountPercent: percent,
      discountAmount: cappedAmount,
      discountPercent: percent,
      total: Math.max(0, totalPrice - cappedAmount),
    };
  });

  setCart(recalculateCart(updatedCart, false));
};
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setShowPartyDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadParties = () => api.getParties().then(setParties);
    const loadOffers = () => api.getOffers?.().then((data) => {
      setOffers(Array.isArray(data) ? data : []);
    });

    loadParties();
    api.getLoyaltySettings().then((data) => {
      if (data) setLoyaltySettings(data);
    });
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
      api.getPartyLoyaltyPoints(selectedParty.id).then((data) => {
        setLoyaltyPoints(data?.loyalty_points ?? 0);
      });
    } else {
      setLoyaltyPoints(0);
      setRedeemPoints(0);
      setUseRedemption(false);
    }
  }, [selectedParty]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowPartyModal(false);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

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

  const saveParty = async () => {
    let newErrors = {};

    if (!newPartyName.trim()) newErrors.name = true;
    if (!newPartyPhone.trim()) newErrors.phone = true;

    if (!newPartyPhone.trim()) {
      newErrors.phone = true;
    } else if (newPartyPhone.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      newErrors.phone = true;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      alert("Please fill all required fields");
      return;
    }

    await api.createParty({
      name: newPartyName,
      phone: newPartyPhone,
      address: partyAddress,
      state: partyState,
      pincode: partyPincode,
      city: partyCity,
      type: partyType,
      balance: 0
    });

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
    (p) =>
      (p.type === "customer" || p.type === "both") &&
      p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

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

  return (
    <div style={{ marginTop: "10px" }}>
      <h2
        style={{
          marginBottom: "25px",
          fontWeight: "700",
          color: "#111",
          textAlign: "center",
          letterSpacing: "0.5px"
        }}
      >
        Billing
      </h2>

      <div style={{ display: "flex", gap: "20px", alignItems: "stretch" }}>
        <div
          ref={partyRef}
          style={{
            width: "62%",
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
            position: "relative",
            marginBottom: "20px"
          }}
        >
          <h3 style={{ marginBottom: "15px" }}>Add Party</h3>

          <div
            onClick={() => setShowPartyDropdown((prev) => !prev)}
            style={{
              border: "2px dashed #90caf9",
              borderRadius: "10px",
              padding: "25px",
              textAlign: "center",
              cursor: "pointer",
              color: "#1976d2",
              fontWeight: "500",
              background: "#f9fbff"
            }}
          >
            + Add Party
          </div>

          {showPartyDropdown && (
            <div
              style={{
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
              }}
            >
              <input
                type="text"
                placeholder="Search party..."
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  marginBottom: "8px",
                  boxSizing: "border-box"
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#666",
                  borderBottom: "1px solid #eee"
                }}
              >
                <span>Party Name</span>
                <span>Balance</span>
              </div>

              {filteredParties.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedParty(p);
                    setShowPartyDropdown(false);
                  }}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f5f5f5")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span>{p.name}</span>

                  <span
                    style={{
                      color: p.balance > 0 ? "#d32f2f" : "#2e7d32"
                    }}
                  >
                    ₹{p.balance || 0}
                  </span>
                </div>
              ))}

              <div
                onClick={() => {
                  setShowPartyModal(true);
                  setShowPartyDropdown(false);
                }}
                style={{
                  padding: "10px",
                  marginTop: "8px",
                  borderTop: "1px solid #eee",
                  cursor: "pointer",
                  color: "#1976d2",
                  fontWeight: "500",
                  textAlign: "center"
                }}
              >
                + Create New Party
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            width: "28%",
            minHeight: "150px",
            background: "#fff",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 8px 25px rgba(0,0,0,0.08)",
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

      {selectedParty && (
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto 20px auto",
            background: "#e3f2fd",
            borderRadius: "10px",
            padding: "15px 20px",
            border: "1px solid #90caf9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontWeight: "600", fontSize: "16px" }}>
              {selectedParty.name}
            </div>
            <div style={{ fontSize: "13px", color: "#555" }}>
              {selectedParty.phone}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setSelectedParty(null)}
              style={{
                background: "#a33636",
                border: "1px solid #ccc",
                borderRadius: "6px",
                padding: "6px 10px",
                cursor: "pointer"
              }}
            >
              Change
            </button>
          </div>
        </div>
      )}

      {selectedParty && (
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto 20px auto",
            background: "#fffde7",
            borderRadius: "10px",
            padding: "15px 20px",
            border: "1px solid #ffd54f",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontWeight: "600", color: "#f57f17" }}>
              ⭐ Loyalty Points: {loyaltyPoints} pts
            </div>
            <div style={{ fontSize: "12px", color: "#888", marginTop: "3px" }}>
              Will earn <strong>{pointsToEarn} pts</strong> on this bill •
              1 pt = ₹{loyaltySettings.loyalty_redeem_value}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ fontSize: "13px", fontWeight: "500" }}>
              <input
                type="checkbox"
                checked={useRedemption}
                onChange={(e) => {
                  setUseRedemption(e.target.checked);
                  if (!e.target.checked) setRedeemPoints(0);
                }}
                style={{ marginRight: "6px" }}
              />
              Redeem Points
            </label>
            {useRedemption && (
              <input
                type="number"
                min={0}
                max={loyaltyPoints}
                value={redeemPoints}
                onChange={(e) =>
                  setRedeemPoints(Math.min(Number(e.target.value), loyaltyPoints))
                }
                placeholder="Points to redeem"
                style={{
                  width: "130px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #ffd54f"
                }}
              />
            )}
            {useRedemption && redeemPoints > 0 && (
              <span style={{ color: "#2e7d32", fontWeight: "600" }}>
                − ₹{pointsDiscount.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "30px",
          alignItems: "flex-start"
        }}
      >
        <div style={{ flex: 0.6 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
            }}
          >
            <h3 style={{ marginBottom: "15px" }}>Add Products</h3>

            {/* Barcode Scanner Input */}
<div style={{ marginBottom: "16px", padding: "12px", background: "#f0f7ff",
              borderRadius: "10px", border: "1px solid #90caf9" }}>
  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1565c0", marginBottom: "6px" }}>
    🔖 Scan Barcode
  </div>
  <div style={{ display: "flex", gap: "8px" }}>
    <input
      ref={barcodeRef}
      type="text"
      placeholder="Scan or type barcode..."
      value={barcodeInput}
      onChange={(e) => setBarcodeInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleBarcodeSearch(barcodeInput);
        }
      }}
      style={{
        flex: 1, padding: "8px 12px", borderRadius: "6px",
        border: "1px solid #90caf9", fontSize: "14px"
      }}
    />
    <button
      onClick={() => handleBarcodeSearch(barcodeInput)}
      style={{
        padding: "8px 14px", borderRadius: "6px", border: "none",
        background: "#1976d2", color: "#fff", cursor: "pointer", fontWeight: "600"
      }}
    >
      Add
    </button>
  </div>
  {barcodeError && (
    <div style={{ color: "#d32f2f", fontSize: "12px", marginTop: "6px" }}>
      ⚠ {barcodeError}
    </div>
  )}
</div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
            >
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search product..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelected("");
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  style={{
                    width: "260px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd"
                  }}
                />

                {showDropdown && search && (
                  <div
                    style={{
                      position: "absolute",
                      width: "260px",
                      background: "#fff",
                      borderRadius: "8px",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                      maxHeight: "200px",
                      overflowY: "auto",
                      marginTop: "6px",
                      zIndex: 1000
                    }}
                  >
                    {filteredProducts.length === 0 && (
                      <div style={{ padding: "10px", color: "#999" }}>
                        No products found
                      </div>
                    )}

                    {filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (isProductExpired(p)) {
                            alert(`${p.name} is expired and cannot be billed`);
                            return;
                          }
                          setSelected(p.id);
                          setSearch(p.name);
                          setShowDropdown(false);
                        }}
                        style={{
                          padding: "10px 12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f1f1"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <span style={{ fontWeight: "500" }}>{p.name}</span>

                          {isProductExpired(p) && (
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "3px 8px",
                                borderRadius: "20px",
                                fontWeight: "700",
                                background: "#fee2e2",
                                color: "#b91c1c"
                              }}
                            >
                              Expired
                            </span>
                          )}

                          {p.unit_type && (
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "3px 8px",
                                borderRadius: "20px",
                                fontWeight: "600",
                                textTransform: "capitalize",
                                background:
                                  p.unit_type === "bulk" ? "#fff3cd" : "#e3f2fd",
                                color:
                                  p.unit_type === "bulk" ? "#856404" : "#1565c0"
                              }}
                            >
                              {p.unit_type}
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "13px",
                            color: "#666"
                          }}
                        >
                          ₹{p.price}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
              >
                <label
                  style={{
                    fontSize: "16px",
                    color: "#333",
                    fontWeight: "600",
                    minWidth: "70px"
                  }}
                >
                  Quantity
                </label>

                <button
                  onClick={() => setQty(qty > 1 ? qty - 1 : 1)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    background: "#bb2727",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dbeafe";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#bb2727";
                    e.currentTarget.style.transform = "scale(1)";
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
                    width: "60px",
                    textAlign: "center",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    appearance: "textfield",
                    marginTop: "8px"
                  }}
                />

                <button
                  onClick={() => setQty(qty + 1)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    background: "#bb2727",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#d6e2f3";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#bb2727";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  +
                </button>
              </div>

              <button
                onClick={addToCart}
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  width: "150px",
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1.8 }}>
          <div
            style={{
              maxWidth: "90%",
              width: "100%",
              position: "relative",
              background: "#f8fafc",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "15px",
              border: "2px solid",
              borderColor: cart.length > 0 ? "#1976d2" : "#e2e8f0",
              boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px"
              }}
            >
              <h3 style={{ margin: 0, color: "#1e293b" }}>Order Summary</h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: cart.length > 0 ? "#1976d2" : "transparent",
                  color: cart.length > 0 ? "white" : "#64748b",
                  padding: cart.length > 0 ? "6px 12px" : "6px 8px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "600"
                }}
              >
                {cart.length === 0 ? "Empty" : `${cart.length} Items`}
                {cart.length > 0 && (
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      background: "#10b981",
                      borderRadius: "50%"
                    }}
                  />
                )}
              </div>
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: cart.length > 0 ? "#1976d2" : "#94a3b8",
                textAlign: "right"
              }}
            >
              ₹{getTotal().toFixed(2)}
            </div>
          </div>

          <div
            style={{
              maxHeight: "260px",
              overflowY: "auto",
              marginBottom: "15px",
              border: "1px solid #eee",
              borderRadius: "8px"
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr 1fr",
                gap: "8px",
                padding: "10px 12px",
                fontWeight: "600",
                background: "#f9f9f9",
                borderBottom: "1px solid #eee"
              }}
            >
              <div style={{ textAlign: "left" }}>Product</div>
              <div style={{ textAlign: "center" }}>HSN</div>
              <div style={{ textAlign: "center" }}>GST%</div>
              <div style={{ textAlign: "center" }}>Quantity</div>
              <div style={{ textAlign: "right" }}>Price</div>
              <div style={{ textAlign: "center" }}>Discount</div>
              <div style={{ textAlign: "right", paddingRight: "35px" }}>Total</div>
            </div>

            {cart.length === 0 && (
              <div
                style={{
                  padding: "15px",
                  textAlign: "center",
                  color: "#999"
                }}
              >
                No items added
              </div>
            )}

            {cart.map((item) => (
              <div
                key={item.cartItemId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr 1fr",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 12px",
                  borderBottom: "1px solid #f0f0f0",
                  position: "relative"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ textAlign: "left" }}>
  {item.name}
  {item.isFreeItem && (
    <span style={{ marginLeft: "8px", background: "#e8f5e9", color: "#2e7d32",
      padding: "2px 6px", borderRadius: "6px", fontSize: "11px", fontWeight: "600" }}>
      FREE
    </span>
  )}
  {item.isCartDiscountItem && (
    <span style={{ marginLeft: "8px", background: "#e3f2fd", color: "#1565c0",
      padding: "2px 6px", borderRadius: "6px", fontSize: "11px", fontWeight: "600" }}>
      OFFER
    </span>
  )}
  {item.appliedOfferId && !item.isFreeItem && !item.isCartDiscountItem && (
  <span
    style={{
      marginLeft: "8px",
      background: "#fff3e0",
      color: "#e65100",
      padding: "2px 6px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: "600",
      cursor: "pointer",
    }}
    onClick={(e) => {
      e.stopPropagation();

      const offerType = item.appliedOfferType;
      const appliedOffer = offers.find((o) => Number(o.id) === Number(item.appliedOfferId));

      let conflictKey = null;

      if (offerType === "FLAT_DISCOUNT") {
        conflictKey = "cart_flat";
      } else if (offerType === "BXGY") {
        conflictKey = `bxgy_${item.parentProductId ?? item.id}`;
      } else if (offerType === "CATEGORY_DISCOUNT") {
        conflictKey = `category_${item.category || item.category_id || item.categoryId}`;
      } else if (offerType === "HAPPY_HOURS") {
        const categoryId = appliedOffer?.categoryId ?? appliedOffer?.category_id;
        conflictKey = categoryId ? `happy_hours_${categoryId}` : "happy_hours_all";
      } else {
        conflictKey = `product_${item.id}`;
      }

      // Mark this offer conflict as resolved (so it won't be re-applied)
      const newResolved = { ...resolvedConflicts, [conflictKey]: null };
      setResolvedConflicts(newResolved);

      // Remove offer effects from the clicked cart item
      const updatedCart = cart
        .map((c) => {
          if (c.cartItemId === item.cartItemId) {
            const baseTotal = Number(c.quantity || 0) * Number(c.price || 0);
            const manualDisc = Number(c.manualDiscountAmount ?? 0);

            return {
              ...c,
              offerDiscountAmount: 0,
              appliedOfferId: null,
              appliedOfferType: null,
              appliedOfferName: null,
              total: Math.max(0, baseTotal - manualDisc),
            };
          }
          return c;
        })
        // Also remove any child items created due to the offer (BXGY, etc.)
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

                <div style={{ textAlign: "center", fontSize: "13px", color: "#666" }}>
                  {item.hsn_code || "-"}
                </div>

                <div style={{ textAlign: "center", fontSize: "13px", color: "#666" }}>
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

                      if (newQty > maxQty) {
                        alert(`Only ${item.stock} items available`);
                        newQty = maxQty;
                      }

                      const updatedCart = cart.map((p) => {
                        if (p.cartItemId === item.cartItemId && !p.isFreeItem) {
                          const totalPrice =
                            newQty * Number(p.price || 0) -
                            Number(p.manualDiscountAmount ?? p.discountAmount ?? 0);

                          return {
                            ...p,
                            quantity: newQty,
                            paidQuantity: newQty,
                            total: Math.max(0, totalPrice)
                          };
                        }

                        return p;
                      });

                      setCart(recalculateCart(updatedCart, false));
                    }}
                    style={{
                      width: "50px",
                      padding: "4px",
                      textAlign: "center",
                      borderRadius: "6px",
                      border: "1px solid #ddd"
                    }}
                  />
                </div>

                <div style={{ textAlign: "right" }}>₹{item.price}</div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    alignItems: "center"
                  }}
                >
                  <input
                    type="number"
                    value={item.discountPercent || ""}
                    placeholder="%"
                    disabled={item.isFreeItem || item.isCartDiscountItem}
                    onChange={(e) =>
                      handleDiscountPercent(item.cartItemId, Number(e.target.value) || 0)
                    }
                    style={{
                      width: "55px",
                      padding: "4px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      textAlign: "center"
                    }}
                  />
                  <input
                    type="number"
                    value={item.discountAmount || ""}
                    placeholder="₹"
                    disabled={item.isFreeItem || item.isCartDiscountItem}
                    onChange={(e) =>
                      handleDiscountAmount(item.cartItemId, Number(e.target.value) || 0)
                    }
                    style={{
                      width: "55px",
                      padding: "4px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      textAlign: "center"
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "8px",
                    paddingRight: "12px"
                  }}
                >
                  <span style={{ fontWeight: "500" }}>₹{Number(item.total || 0).toFixed(2)}</span>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: item.isFreeItem || item.isCartDiscountItem ? "#bbb" : "#e53935",
                      cursor: item.isFreeItem || item.isCartDiscountItem ? "not-allowed" : "pointer",
                      fontSize: "16px",
                      padding: "0",
                      lineHeight: "1"
                    }}
                  >
                    ✖
                  </button>
                </div>
              </div>
            ))}
          </div>

          {(() => {
            const subtotal = cart.reduce((sum, item) => {
              const total = Number(item.total || 0);
              if (item.isCartDiscountItem) return sum + total;
              const base = total / (1 + (Number(item.tax_rate || 0) / 100));
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

          <div style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px" }}>
            Total: ₹{getTotal().toFixed(2)}
            {pointsDiscount > 0 && (
              <>
                <span style={{ color: "#2e7d32", fontSize: "14px", marginLeft: "10px" }}>
                  − ₹{pointsDiscount.toFixed(2)} (points)
                </span>
                <span style={{ marginLeft: "10px", color: "#1976d2" }}>
                  = ₹{getFinalTotal().toFixed(2)}
                </span>
              </>
            )}
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontWeight: "600", color: "#333", marginBottom: "8px" }}>
              Payments
            </div>

            {payments.map((payment, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px"
                }}
              >
                <div style={{ position: "relative", display: "inline-block" }}>
                  <select
                    value={payment.mode}
                    onChange={(e) => updatePayment(index, "mode", e.target.value)}
                    style={{
                      width: "160px",
                      padding: "10px 30px 10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      appearance: "none",
                      background: "#fff"
                    }}
                  >
                    {paymentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <span
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      fontSize: "10px"
                    }}
                  >
                    ▼
                  </span>
                </div>

                <input
                  type="number"
                  min="0"
                  value={payment.amount}
                  onChange={(e) => updatePayment(index, "amount", e.target.value)}
                  style={{
                    width: "120px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    textAlign: "right",
                    marginTop: "4px"
                  }}
                />

                <button
                  onClick={() => removePaymentRow(index)}
                  disabled={payments.length === 1}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: payments.length === 1 ? "#bbb" : "#e53935",
                    cursor: payments.length === 1 ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    padding: "4px",
                    lineHeight: "1"
                  }}
                >
                  ✖
                </button>
              </div>
            ))}

            <button
              onClick={addPaymentRow}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #1976d2",
                background: "#fff",
                color: "#1976d2",
                cursor: "pointer",
                fontWeight: "500",
                marginTop: "2px"
              }}
            >
              + Add Payment Method
            </button>
          </div>

          <div
            style={{
              marginBottom: "15px",
              fontWeight: "600"
            }}
          >
            <div style={{ color: "#2e7d32", marginBottom: "4px" }}>
              Paid: ₹{totalPaid.toLocaleString("en-IN")}
            </div>

            <div style={{ color: balance > 0 ? "#d32f2f" : "#2e7d32" }}>
              Balance: ₹{balance.toLocaleString("en-IN")}
            </div>
          </div>

          <button
            onClick={saveInvoice}
            style={{
              width: "100%",
              padding: "12px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Save Bill
          </button>
        </div>
      </div>

      {showPartyModal && (
        <div
          onClick={() => setShowPartyModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "400px",
              background: "#fff",
              borderRadius: "12px",
              padding: "25px 20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
            }}
          >
            <h3 style={{ marginBottom: "15px" }}>Create New Party</h3>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: "500" }}>Party Name *</label>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="Enter name"
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                  border: errors.name ? "1px solid red" : "1px solid #ddd"
                }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontWeight: "500" }}>Mobile Number *</label>
              <input
                type="tel"
                placeholder="Mobile Number"
                value={newPartyPhone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 10) {
                    setNewPartyPhone(value);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                  border: errors.phone ? "1px solid red" : "1px solid #ddd"
                }}
              />

              {newPartyPhone && newPartyPhone.length !== 10 && (
                <div style={{ color: "red", fontSize: "12px", marginTop: "4px" }}>
                  Enter 10 digit mobile number
                </div>
              )}
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: "500" }}>Party Type</label>

              <select
                value={partyType}
                onChange={(e) => setPartyType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "5px",
                  borderRadius: "6px",
                  border: "1px solid #ddd"
                }}
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div style={{ marginTop: "15px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "5px"
                }}
              >
                BILLING ADDRESS
              </div>

              <textarea
                placeholder="Enter billing address"
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  resize: "none",
                  boxSizing: "border-box"
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "10px",
                  width: "100%"
                }}
              >
                <select
                  value={partyState}
                  onChange={(e) => setPartyState(e.target.value)}
                  style={{
                    flex: "0 0 60%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    minWidth: "0"
                  }}
                >
                  <option value="">Select State</option>
                  {indianStates.map((state, i) => (
                    <option key={i} value={state}>
                      {state}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Pincode"
                  value={partyPincode}
                  onChange={(e) => setPartyPincode(e.target.value)}
                  style={{
                    width: "120px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ddd"
                  }}
                />
              </div>

              <input
                type="text"
                placeholder="City"
                value={partyCity}
                onChange={(e) => setPartyCity(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  marginTop: "10px",
                  boxSizing: "border-box"
                }}
              />

              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                />
                <span style={{ fontSize: "13px", color: "#555" }}>
                  Shipping address same as billing address
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px"
              }}
            >
              <button
                onClick={() => {
                  setShowPartyModal(false);
                  setNewPartyName("");
                  setNewPartyPhone("");
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  background: "#f5f5f5",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>

              <button
                onClick={saveParty}
                disabled={!isFormValid}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "none",
                  background: isFormValid ? "#1976d2" : "#ccc",
                  color: "#fff",
                  cursor: isFormValid ? "pointer" : "not-allowed"
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(offerConflicts).length > 0 && (
  <div
    style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.5)", display: "flex",
      justifyContent: "center", alignItems: "center", zIndex: 3000
    }}
  >
    <div
      style={{
        background: "#fff", borderRadius: "14px", padding: "28px",
        width: "460px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
      }}
    >
      <h3 style={{ margin: "0 0 6px 0", color: "#111" }}>Multiple Offers Available</h3>
      <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#666" }}>
        More than one offer applies here. Choose which one to use:
      </p>

      {Object.entries(offerConflicts).map(([key, conflictOffers]) => (
        <div key={key} style={{ marginBottom: "20px" }}>
          <div style={{ fontWeight: "600", fontSize: "13px", color: "#374151", marginBottom: "10px" }}>
            {conflictOffers[0].type === "FLAT_DISCOUNT"
              ? "Cart Offers"
              : `Offers for: ${conflictOffers[0].name.split(" ")[0]}`}
          </div>

          {conflictOffers.map((offer) => (
            <div
              key={offer.id}
              onClick={() => resolveConflict(key, offer.id)}
              style={{
                padding: "14px 16px", marginBottom: "8px",
                border: "2px solid #e5e7eb", borderRadius: "10px",
                cursor: "pointer", transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#1976d2";
                e.currentTarget.style.background = "#f0f7ff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.background = "#fff";
              }}
            >
              <div style={{ fontWeight: "600", color: "#111", marginBottom: "3px" }}>
                {offer.name}
              </div>
              <div style={{ fontSize: "13px", color: "#666" }}>
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
              padding: "10px 16px", border: "1px dashed #ccc",
              borderRadius: "8px", cursor: "pointer",
              textAlign: "center", fontSize: "13px", color: "#888"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
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
