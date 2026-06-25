import { useEffect, useState } from "react";

import api from "../services/api.js";

const OFFER_TYPES = [
  { value: "BXGY", label: "Buy X Get Y Free" },
  { value: "PERCENT_DISCOUNT", label: "Percentage Discount" },
  { value: "FLAT_DISCOUNT", label: "Flat Discount on Cart" },
  { value: "TIERED_DISCOUNT", label: "Tiered Discount (% per set)" },
  { value: "CATEGORY_DISCOUNT", label: "Category Discount" },
  { value: "HAPPY_HOURS", label: "Happy Hours" },
];

const defaultForm = {
  name: "",
  type: "BXGY",
  active: true,
  priority: 0,
  stackable: true,
  start_date: "",
  end_date: "",
  start_time: "",
  end_time: "",
  discount_mode: "percent",
  usage_limit: 0,
  buy_product_id: "",
  free_product_id: "",
  buy_qty: 1,
  free_qty: 1,
  product_id: "",
  discount_percent: 0,
  min_cart_value: 0,
  flat_amount: 0,
  min_qty: 0,
  category_id: "",
};

function OfferForm({ products, categories = [], onSubmit, onCancel, loading, error }) {
  const [form, setForm] = useState(defaultForm);

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const TYPE_META = {
    BXGY:             { icon: "🎁", color: "#065f46", bg: "#ecfdf5", border: "#6ee7b7" },
    PERCENT_DISCOUNT: { icon: "％", color: "#1e40af", bg: "#eff6ff", border: "#93c5fd" },
    FLAT_DISCOUNT:    { icon: "₹",  color: "#92400e", bg: "#fefce8", border: "#fcd34d" },
    TIERED_DISCOUNT:  { icon: "📊", color: "#6d28d9", bg: "#f5f3ff", border: "#c4b5fd" },
    CATEGORY_DISCOUNT:{ icon: "🏷", color: "#c2410c", bg: "#fff7ed", border: "#fdba74" },
    HAPPY_HOURS:      { icon: "⏰", color: "#0e7490", bg: "#ecfeff", border: "#67e8f9" },
  };

  const meta = TYPE_META[form.type] || TYPE_META.BXGY;

  const input = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "14px",
    background: "#fff",
    color: "#1e293b",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const label = {
    display: "block",
    fontWeight: "600",
    fontSize: "12px",
    marginBottom: "5px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  };

  const field = { marginBottom: "14px" };
  const row = { display: "flex", gap: "14px" };

  const btn = (bg = "#6366f1", color = "#fff") => ({
    padding: "10px 20px",
    background: bg,
    color,
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "opacity 0.15s",
  });

  return (
    <div style={{
      background: "#fff",
      borderRadius: "16px",
      marginBottom: "20px",
      overflow: "hidden",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 24px rgba(99,102,241,0.10)",
    }}>
      {/* Header bar */}
      <div style={{
        background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
        padding: "18px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ color: "#fff", fontWeight: "700", fontSize: "17px" }}>Create New Offer</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", marginTop: "2px" }}>
            Fill in the details to set up a promotion
          </div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.15)",
          borderRadius: "10px",
          padding: "8px 14px",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "600",
        }}>
          {meta.icon} {OFFER_TYPES.find(t => t.value === form.type)?.label}
        </div>
      </div>

      <div style={{ padding: "24px" }}>
        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px",
            padding: "12px 16px", marginBottom: "18px", color: "#dc2626",
            fontSize: "13px", display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ fontSize: "16px" }}>⚠</span> {error}
          </div>
        )}

        {/* Offer Type selector as visual pills */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ ...label, marginBottom: "10px" }}>Offer Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {OFFER_TYPES.map((t) => {
              const m = TYPE_META[t.value];
              const active = form.type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => handleChange("type", t.value)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "20px",
                    border: `1.5px solid ${active ? m.border : "#e2e8f0"}`,
                    background: active ? m.bg : "#f8fafc",
                    color: active ? m.color : "#64748b",
                    fontWeight: active ? "700" : "500",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {m.icon} {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Offer Name */}
        <div style={{ ...field }}>
          <label style={label}>Offer Name *</label>
          <input
            style={{ ...input, fontSize: "15px", padding: "11px 14px", border: `1.5px solid ${meta.border}` }}
            value={form.name}
            placeholder="e.g. Buy 2 Coke Get 1 Free"
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </div>

        {/* Type-specific fields in a highlighted box */}
        <div style={{
          background: meta.bg,
          border: `1.5px solid ${meta.border}`,
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: meta.color, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {meta.icon} {OFFER_TYPES.find(t => t.value === form.type)?.label} Settings
          </div>

          {form.type === "BXGY" && (
            <div style={row}>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Buy Product *</label>
                <select style={input} value={form.buy_product_id} onChange={(e) => handleChange("buy_product_id", e.target.value)}>
                  <option value="">-- Select --</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ ...field, flex: 0.4 }}>
                <label style={label}>Buy Qty *</label>
                <input style={input} type="number" min="1" value={form.buy_qty} onChange={(e) => handleChange("buy_qty", e.target.value)} />
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Free Product *</label>
                <select style={input} value={form.free_product_id} onChange={(e) => handleChange("free_product_id", e.target.value)}>
                  <option value="">-- Select --</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ ...field, flex: 0.4 }}>
                <label style={label}>Free Qty *</label>
                <input style={input} type="number" min="1" value={form.free_qty} onChange={(e) => handleChange("free_qty", e.target.value)} />
              </div>
            </div>
          )}

          {form.type === "PERCENT_DISCOUNT" && (
            <div style={row}>
              <div style={{ ...field, flex: 2 }}>
                <label style={label}>Product *</label>
                <select style={input} value={form.product_id} onChange={(e) => handleChange("product_id", e.target.value)}>
                  <option value="">-- Select --</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Discount % *</label>
                <input style={input} type="number" min="1" max="100" value={form.discount_percent} onChange={(e) => handleChange("discount_percent", e.target.value)} />
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Min Qty (0 = any)</label>
                <input style={input} type="number" min="0" value={form.min_qty ?? 0} onChange={(e) => handleChange("min_qty", e.target.value)} />
              </div>
            </div>
          )}

          {form.type === "FLAT_DISCOUNT" && (
            <div style={row}>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Min Cart Value (₹)</label>
                <input style={input} type="number" min="0" value={form.min_cart_value} onChange={(e) => handleChange("min_cart_value", e.target.value)} />
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Flat Discount Amount (₹) *</label>
                <input style={input} type="number" min="1" value={form.flat_amount} onChange={(e) => handleChange("flat_amount", e.target.value)} />
              </div>
            </div>
          )}

          {form.type === "TIERED_DISCOUNT" && (
            <div style={row}>
              <div style={{ ...field, flex: 2 }}>
                <label style={label}>Product *</label>
                <select style={input} value={form.product_id} onChange={(e) => handleChange("product_id", e.target.value)}>
                  <option value="">-- Select --</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Set Size (Buy X) *</label>
                <input style={input} type="number" min="1" value={form.buy_qty} onChange={(e) => handleChange("buy_qty", e.target.value)} />
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Discount % per set *</label>
                <input style={input} type="number" min="1" max="100" value={form.discount_percent} onChange={(e) => handleChange("discount_percent", e.target.value)} />
              </div>
            </div>
          )}

          {form.type === "CATEGORY_DISCOUNT" && (
            <div style={row}>
              <div style={{ ...field, flex: 2 }}>
                <label style={label}>Category *</label>
                <select style={input} value={form.category_id} onChange={(e) => handleChange("category_id", e.target.value)}>
                  <option value="">-- Select --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Discount % *</label>
                <input style={input} type="number" min="1" max="100" value={form.discount_percent} onChange={(e) => handleChange("discount_percent", e.target.value)} />
              </div>
            </div>
          )}

          {form.type === "HAPPY_HOURS" && (
            <div style={row}>
              <div style={{ ...field, flex: 2 }}>
                <label style={label}>Category (blank = all)</label>
                <select style={input} value={form.category_id} onChange={(e) => handleChange("category_id", e.target.value)}>
                  <option value="">-- All Categories --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Start Time *</label>
                <input style={input} type="time" value={form.start_time} onChange={(e) => handleChange("start_time", e.target.value)} />
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>End Time *</label>
                <input style={input} type="time" value={form.end_time} onChange={(e) => handleChange("end_time", e.target.value)} />
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>Discount Type</label>
                <select style={input} value={form.discount_mode} onChange={(e) => handleChange("discount_mode", e.target.value)}>
                  <option value="percent">Percentage</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
              <div style={{ ...field, flex: 1 }}>
                <label style={label}>{form.discount_mode === "amount" ? "Discount Amount" : "Discount %"}</label>
                <input
                  style={input}
                  type="number"
                  min="1"
                  max={form.discount_mode === "percent" ? "100" : undefined}
                  value={form.discount_mode === "amount" ? form.flat_amount : form.discount_percent}
                  onChange={(e) => handleChange(form.discount_mode === "amount" ? "flat_amount" : "discount_percent", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Validity & Limits */}
        <div style={{
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: "12px", padding: "16px", marginBottom: "16px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            📅 Validity & Limits
          </div>
          <div style={row}>
            <div style={{ ...field, flex: 1 }}>
              <label style={label}>Start Date</label>
              <input style={input} type="date" value={form.start_date} onChange={(e) => handleChange("start_date", e.target.value)} />
            </div>
            <div style={{ ...field, flex: 1 }}>
              <label style={label}>End Date</label>
              <input style={input} type="date" value={form.end_date} onChange={(e) => handleChange("end_date", e.target.value)} />
            </div>
            <div style={{ ...field, flex: 0.8 }}>
              <label style={label}>Usage Limit (0=∞)</label>
              <input style={input} type="number" min="0" value={form.usage_limit} onChange={(e) => handleChange("usage_limit", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {[
            { field: "stackable", label: "Stackable", desc: "Combine with other offers", icon: "🔗" },
            { field: "active", label: "Active immediately", desc: "Go live right away", icon: "✅" },
          ].map(({ field: f, label: l, desc, icon }) => (
            <label key={f} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 16px", borderRadius: "10px", cursor: "pointer",
              background: form[f] ? "#eff6ff" : "#f8fafc",
              border: `1.5px solid ${form[f] ? "#93c5fd" : "#e2e8f0"}`,
              flex: 1, minWidth: "180px", transition: "all 0.15s",
            }}>
              <input
                type="checkbox"
                checked={form[f]}
                onChange={(e) => handleChange(f, e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#6366f1" }}
              />
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: form[f] ? "#1e40af" : "#374151" }}>
                  {icon} {l}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{desc}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            style={{
              ...btn(),
              background: loading ? "#a5b4fc" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              padding: "11px 28px",
              fontSize: "14px",
              borderRadius: "10px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onClick={() => onSubmit(form)}
            disabled={loading}
          >
            {loading ? "⏳ Saving…" : "✓ Save Offer"}
          </button>
          <button
            style={{ ...btn("#f1f5f9", "#64748b"), borderRadius: "10px", padding: "11px 20px" }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Offers({ products = [], categories: categoriesFromApp = [] }) {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState(categoriesFromApp);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showDeactivated, setShowDeactivated] = useState(false);

  const loadOffers = async () => {
    try {
      const data = await api.getAllOffers?.();
      setOffers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOffers();

    window.addEventListener("offers-updated", loadOffers);
    return () => window.removeEventListener("offers-updated", loadOffers);
  }, []);

  useEffect(() => {
    setCategories(Array.isArray(categoriesFromApp) ? categoriesFromApp : []);
  }, [categoriesFromApp]);

  useEffect(() => {
    if (Array.isArray(categoriesFromApp) && categoriesFromApp.length > 0) return;

    api.getCategories?.().then((data) => {
      setCategories(Array.isArray(data) ? data : []);
    });
  }, [categoriesFromApp]);

  const openForm = () => {
    setError("");
    setLoading(false);
    setFormKey((k) => k + 1);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setError("");
    setLoading(false);
    setFormKey((k) => k + 1);
  };

  const handleSubmit = async (form) => {
    setError("");

    if (!form.name.trim()) {
      setError("Offer name is required");
      return;
    }

    if (!form.type) {
      setError("Offer type is required");
      return;
    }

    if (form.type === "BXGY") {
      if (!form.buy_product_id) {
        setError("Buy product is required");
        return;
      }
      if (!form.free_product_id) {
        setError("Free product is required");
        return;
      }
      if (Number(form.buy_qty) < 1) {
        setError("Buy qty must be ≥ 1");
        return;
      }
      if (Number(form.free_qty) < 1) {
        setError("Free qty must be ≥ 1");
        return;
      }
    }

    if (form.type === "PERCENT_DISCOUNT") {
      if (!form.product_id) {
        setError("Product is required");
        return;
      }
      if (Number(form.discount_percent) <= 0 || Number(form.discount_percent) > 100) {
        setError("Discount % must be between 1 and 100");
        return;
      }
    }

    if (form.type === "FLAT_DISCOUNT") {
      if (Number(form.flat_amount) <= 0) {
        setError("Flat amount must be > 0");
        return;
      }
    }

    if (form.type === "TIERED_DISCOUNT") {
      if (!form.product_id) {
        setError("Product is required");
        return;
      }
      if (Number(form.buy_qty) < 1) {
        setError("Set size must be ≥ 1");
        return;
      }
      if (Number(form.discount_percent) <= 0 || Number(form.discount_percent) > 100) {
        setError("Discount % must be between 1 and 100");
        return;
      }
    }

    if (form.type === "CATEGORY_DISCOUNT") {
  if (!form.category_id) {
    setError("Category is required");
    return;
  }
  if (Number(form.discount_percent) <= 0 || Number(form.discount_percent) > 100) {
    setError("Discount % must be between 1 and 100");
    return;
  }
}

if (form.type === "HAPPY_HOURS") {
  if (!form.start_time || !form.end_time) {
    setError("Start time and end time are required");
    return;
  }

  if (form.discount_mode === "percent") {
    if (Number(form.discount_percent) <= 0 || Number(form.discount_percent) > 100) {
      setError("Discount % must be between 1 and 100");
      return;
    }
  }

  if (form.discount_mode === "amount") {
    if (Number(form.flat_amount) <= 0) {
      setError("Discount amount must be > 0");
      return;
    }
  }
}

setLoading(true);

    setLoading(true);

    try {
      const res = await api.createOffer({
        ...form,
        buy_product_id: form.buy_product_id ? Number(form.buy_product_id) : null,
        free_product_id: form.free_product_id ? Number(form.free_product_id) : null,
        product_id: form.product_id ? Number(form.product_id) : null,
        category_id: form.category_id || null,
        buy_qty: Number(form.buy_qty),
        free_qty: Number(form.free_qty),
        discount_percent: Number(form.discount_percent),
        min_cart_value: Number(form.min_cart_value),
        flat_amount: Number(form.flat_amount),
        min_qty: Number(form.min_qty),
        priority: Number(form.priority),
        usage_limit: Number(form.usage_limit),
        active: form.active ? 1 : 0,
        stackable: form.stackable ? 1 : 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        discount_mode: form.discount_mode || "percent",
      });

      if (res?.success) {
        closeForm();
        await loadOffers();
      } else {
        setError(res?.error || "Failed to create offer");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (offer) => {
    const newActive = offer.active === 1 || offer.is_active === 1 ? 0 : 1;
    await api.toggleOffer?.({ id: offer.id, active: newActive });
    await loadOffers();
  };

  const handleDelete = async (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    await api.deleteOffer(id);
    closeForm();
    await loadOffers();
  };

  const productName = (id) =>
    products.find((p) => Number(p.id) === Number(id))?.name || `Product #${id}`;

  const categoryName = (id) =>
    categories.find((c) => Number(c.id) === Number(id))?.name || `Category #${id}`;

  const offerSummary = (offer) => {
    const type = (offer.type || offer.offer_type || "").toUpperCase();

    if (type === "BXGY") {
      return `Buy ${offer.buy_qty ?? offer.buyQty} × ${productName(offer.buy_product_id ?? offer.buyProductId)} → Get ${offer.free_qty ?? offer.freeQty} × ${productName(offer.free_product_id ?? offer.freeProductId)} FREE`;
    }

    if (type === "PERCENT_DISCOUNT") {
      return `${offer.discount_percent ?? offer.discountPercent}% OFF on ${productName(offer.product_id ?? offer.productId)}`;
    }

    if (type === "FLAT_DISCOUNT") {
      return `₹${offer.flat_amount ?? offer.flatAmount} OFF on orders ≥ ₹${offer.min_cart_value ?? offer.minCartValue}`;
    }

    if (type === "TIERED_DISCOUNT") {
      return `${offer.discount_percent ?? offer.discountPercent}% per set of ${offer.buy_qty ?? offer.buyQty} on ${productName(offer.product_id ?? offer.productId)}`;
    }

    if (type === "CATEGORY_DISCOUNT") {
      return `${offer.discount_percent ?? offer.discountPercent}% OFF on all products in ${categoryName(offer.category_id ?? offer.categoryId)}`;
    }

    if (type === "HAPPY_HOURS") {
      const start = offer.start_time ?? offer.startTime ?? "";
      const end = offer.end_time ?? offer.endTime ?? "";
      const mode = offer.discount_mode ?? offer.discountMode ?? "percent";
      const catId = offer.category_id ?? offer.categoryId;
      const target = catId ? `in ${categoryName(catId)}` : "on all products";
      const discount = mode === "amount"
        ? `₹${offer.flat_amount ?? offer.flatAmount} OFF`
        : `${offer.discount_percent ?? offer.discountPercent}% OFF`;
      return `${discount} ${target} · ${start} – ${end}`;
    }

    return type;
  };

  const card = {
    background: "#fff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    marginBottom: "16px",
  };

  const btn = (bg = "#1976d2", color = "#fff") => ({
    padding: "9px 18px",
    background: bg,
    color,
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  });

  const typeColors = {
    BXGY: { bg: "#ecfdf5", color: "#065f46", label: "BXGY" },
    PERCENT_DISCOUNT: { bg: "#eff6ff", color: "#1e40af", label: "% OFF" },
    FLAT_DISCOUNT: { bg: "#fefce8", color: "#92400e", label: "FLAT" },
    TIERED_DISCOUNT: { bg: "#f5f3ff", color: "#6d28d9", label: "TIERED" },
    CATEGORY_DISCOUNT: { bg: "#fff7ed", color: "#c2410c", label: "CATEGORY" },
  };

  const activeOffers = offers.filter((o) => o.active === 1 || o.is_active === 1);
  const inactiveOffers = offers.filter((o) => o.active !== 1 && o.is_active !== 1);

  const renderOfferCard = (offer, inactive = false) => {
    const type = (offer.type || offer.offer_type || "").toUpperCase();
    const badge = typeColors[type] || { bg: "#f3f4f6", color: "#374151", label: type };

    return (
      <div key={offer.id} style={{ ...card, border: inactive ? "1px solid #e5e7eb" : "1px solid #bbdefb", opacity: inactive ? 0.7 : 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ background: badge.bg, color: badge.color, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700" }}>
                {badge.label}
              </span>

              <span style={{ fontWeight: "700", fontSize: "16px", color: "#111" }}>
                {offer.name}
              </span>

              <span style={{ background: inactive ? "#f1f5f9" : "#dcfce7", color: inactive ? "#64748b" : "#166534", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "600" }}>
                {inactive ? "INACTIVE" : "ACTIVE"}
              </span>
            </div>

            <div style={{ fontSize: "14px", color: "#555", marginBottom: "8px" }}>
              {offerSummary(offer)}
            </div>

            <div style={{ fontSize: "12px", color: "#9ca3af", display: "flex", gap: "16px" }}>
              {offer.start_date && <span>From: {offer.start_date}</span>}
              {offer.end_date && <span>To: {offer.end_date}</span>}
              <span>Used: {offer.usage_count ?? 0}{offer.usage_limit > 0 ? ` / ${offer.usage_limit}` : ""}</span>
              <span>{offer.stackable ? "Stackable" : "Non-stackable"}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
            <button onClick={() => handleToggle(offer)} style={inactive ? btn("#dcfce7", "#166534") : btn("#fef3c7", "#92400e")}>
              {inactive ? "Activate" : "Deactivate"}
            </button>

            <button onClick={() => handleDelete(offer.id)} style={btn("#fef2f2", "#dc2626")}>
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: "100%", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontWeight: "700", color: "#111" }}>Offers & Promotions</h2>

        <div style={{ display: "flex", gap: "10px" }}>
          <button style={btn()} onClick={showForm ? closeForm : openForm}>
            {showForm ? "✕ Cancel" : "+ New Offer"}
          </button>

          <button
            style={btn(showDeactivated ? "#e3f2fd" : "#f1f5f9", showDeactivated ? "#1976d2" : "#374151")}
            onClick={() => setShowDeactivated((p) => !p)}
          >
            {showDeactivated ? "Hide Deactivated" : `Deactivated Offers${inactiveOffers.length > 0 ? ` (${inactiveOffers.length})` : ""}`}
          </button>
        </div>
      </div>

      {showForm && (
        <OfferForm
          key={formKey}
          products={products}
          categories={categories}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {activeOffers.length === 0 && (
            <div style={{ ...card, textAlign: "center", color: "#9ca3af", padding: "40px" }}>
              No active offers yet. Click <strong>+ New Offer</strong> to create one.
            </div>
          )}

          {activeOffers.map((offer) => renderOfferCard(offer, false))}
        </div>

        {showDeactivated && (
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "700", fontSize: "15px", color: "#64748b", marginBottom: "12px", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px" }}>
              Deactivated Offers ({inactiveOffers.length})
            </div>

            {inactiveOffers.length === 0 ? (
              <div style={{ ...card, textAlign: "center", color: "#9ca3af", padding: "30px" }}>
                No deactivated offers.
              </div>
            ) : (
              inactiveOffers.map((offer) => renderOfferCard(offer, true))
            )}
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "28px", width: "360px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px 0", color: "#111" }}>Delete Offer?</h3>
            <p style={{ margin: "0 0 24px 0", color: "#666", fontSize: "14px" }}>
              This cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setConfirmDeleteId(null)} style={btn("#f1f5f9", "#374151")}>
                Cancel
              </button>

              <button onClick={confirmDelete} style={btn("#dc2626")}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
