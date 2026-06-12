import { useState, useEffect } from "react";

function CreateParty({ onBack, editingParty }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    type: "customer",
    address: "",
    city: "",
    state: "",
    pincode: "",
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingPincode: "",
    openingBalance: "",
    balanceType: "collect",
    gstin: ""
  });

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: "success"|"error" }

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

  const smallInput = {
    width: "180px",
    padding: "8px",
    fontSize: "13px"
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (!form.name || !form.phone) {
        showToast("Name & Phone required", "error");
        return;
      }

      if (form.phone.length !== 10) {
        showToast("Phone must be 10 digits", "error");
        return;
      }

      let balance = Number(form.openingBalance || 0);
      if (form.balanceType === "pay") balance = -balance;

      if (editingParty) {
        await window.api.updateParty({
  id: editingParty.id,
  name: form.name,
  phone: form.phone,
  email: form.email,
  type: form.type,
  address: form.address,
  city: form.city,
  state: form.state,
  pincode: form.pincode,
  gstin: form.gstin, 
  shipping_address: sameAsBilling ? form.address : form.shippingAddress,
  shipping_city: sameAsBilling ? form.city : form.shippingCity,
  shipping_state: sameAsBilling ? form.state : form.shippingState,
  shipping_pincode: sameAsBilling ? form.pincode : form.shippingPincode,
  balance
});
        showToast("Party Updated ✅");
      } else {
        await window.api.createParty({
  name: form.name,
  phone: form.phone,
  type: form.type,
  address: form.address,
  city: form.city,
  state: form.state,
  pincode: form.pincode,
  gstin: form.gstin, 
  shipping_address: sameAsBilling ? form.address : form.shippingAddress,
  shipping_city: sameAsBilling ? form.city : form.shippingCity,
  shipping_state: sameAsBilling ? form.state : form.shippingState,
  shipping_pincode: sameAsBilling ? form.pincode : form.shippingPincode,
  balance
});
        showToast("Party Created ✅");
      }

      setSameAsBilling(false);
      setShowAddressModal(false);
      setShowShippingModal(false);

      // Small delay so the toast is visible before navigating back
      setTimeout(() => {
        onBack();
      }, 800);

    } catch (err) {
      console.error("ERROR:", err);
      showToast("Something went wrong", "error");
    }
  };

  const handleSaveAndNew = async () => {
    try {
      if (editingParty) {
        showToast("Cannot use Save & New while editing", "error");
        return;
      }

      if (!form.name || !form.phone) {
        showToast("Name & Phone required", "error");
        return;
      }

      if (form.phone.length !== 10) {
        showToast("Phone must be 10 digits", "error");
        return;
      }

      let balance = Number(form.openingBalance || 0);
      if (form.balanceType === "pay") balance = -balance;

      await window.api.createParty({
        name: form.name,
        phone: form.phone,
        type: form.type,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        gstin: form.gstin,
        balance
      });

      setForm({
        name: "",
        phone: "",
        email: "",
        type: "customer",
        address: "",
        city: "",
        state: "",
        pincode: "",
        shippingAddress: "",
        shippingCity: "",
        shippingState: "",
        shippingPincode: "",
        openingBalance: "",
        balanceType: "collect"
      });

      setSameAsBilling(false);
      setShowAddressModal(false);
      setShowShippingModal(false);

      showToast("Saved! Add next party 👉");

    } catch (err) {
      console.error("ERROR:", err);
      showToast("Something went wrong", "error");
    }
  };

  useEffect(() => {
    if (editingParty) {
      setForm({
        name: editingParty.name || "",
        phone: editingParty.phone || "",
        email: editingParty.email || "",
        type: editingParty.type || "customer",
        address: editingParty.address || "",
        city: editingParty.city || "",
        state: editingParty.state || "",
        pincode: editingParty.pincode || "",
        gstin: editingParty.gstin || "",
        shippingAddress: "",
        shippingCity: "",
        shippingState: "",
        shippingPincode: "",
        openingBalance: Math.abs(editingParty.balance || 0),
        balanceType: editingParty.balance >= 0 ? "collect" : "pay",
        gstin: editingParty.gstin || "" 
      });
    } else {
      setForm({
        name: "",
        phone: "",
        email: "",
        type: "customer",
        address: "",
        city: "",
        state: "",
        pincode: "",
        shippingAddress: "",
        shippingCity: "",
        shippingState: "",
        shippingPincode: "",
        openingBalance: "",
        balanceType: "collect"
      });
    }
  }, [editingParty]);

  return (
    <>
      {/* ✅ TOAST NOTIFICATION - replaces all alert() calls */}
      {toast && (
        <div
          style={{
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
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ padding: "25px", maxWidth: "900px", margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "20px" }}>
          <button onClick={onBack}>← Back</button>
          <h2 style={{ marginTop: "10px" }}>
            {editingParty ? "Edit Party" : "Create Party"}
          </h2>
        </div>

        {/* CARD */}
        <div style={{
  width: "100%",
  maxWidth: "100%",
  marginLeft: "0px",   
  background: "#fff",
  borderRadius: "12px",
  padding: "30px",     
  boxShadow: "0 6px 20px rgba(0,0,0,0.08)"
}}>

          {/* BASIC INFO */}
          <h3 style={{ marginBottom: "15px" }}>Basic Details</h3>

          {/* ROW 1 — Name, Phone, Email */}
<div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
  <input
    placeholder="Party Name *"
    value={form.name}
    onChange={(e) => handleChange("name", e.target.value)}
    style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
  />
  <input
    placeholder="Phone Number *"
    value={form.phone}
    onChange={(e) => {
      const value = e.target.value.replace(/\D/g, "");
      if (value.length <= 10) handleChange("phone", value);
    }}
    style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
  />
  <input
    placeholder="Email"
    value={form.email}
    onChange={(e) => handleChange("email", e.target.value)}
    style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
  />
</div>

{/* ROW 2 — GSTIN, PAN, State */}
<div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
  <input
    placeholder="GSTIN"
    value={form.gstin}
    onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
    style={{ flex: 1, padding: "10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #ccc" }}
  />
  <input
    placeholder="PAN"
    style={{ flex: 1, padding: "10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #ccc" }}
  />
  <select
    value={form.state}
    onChange={(e) => handleChange("state", e.target.value)}
    style={{ flex: 1, padding: "10px", fontSize: "13px", borderRadius: "6px", border: "1px solid #ccc" }}
  >
    <option value="">Select State</option>
    {indianStates.map((s, i) => (
      <option key={i} value={s}>{s}</option>
    ))}
  </select>
</div>

{/* ROW 3 — Opening Balance */}
<div style={{ display: "flex", gap: "12px", marginBottom: "15px", alignItems: "center" }}>
  <label style={{ fontWeight: "500", whiteSpace: "nowrap" }}>Opening Balance:</label>
  
  {/* Amount + Dropdown stacked vertically */}
  <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "280px" }}>
    <input
      placeholder="Amount"
      value={form.openingBalance}
      onChange={(e) => handleChange("openingBalance", e.target.value)}
      style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
    />
    <select
      value={form.balanceType}
      onChange={(e) => handleChange("balanceType", e.target.value)}
      style={{ padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
    >
      <option value="collect">To Collect</option>
      <option value="pay">To Pay</option>
    </select>
  </div>
</div>

          <div style={{ marginBottom: "15px" }}>
            <select
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
              style={inputStyle}
            >
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>

          {/* ADDRESS */}
          <div style={{
            display: "flex",
            gap: "40px",
            marginTop: "20px",
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginLeft: "-20px"
          }}>

            {/* BILLING */}
            <div style={{ flex: 1, minWidth: "350px" }}>
              <label>Billing Address</label>
              <div
                onClick={() => setShowAddressModal(true)}
                style={{
                  width: "100%",
                  minHeight: "60px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "12px",
                  cursor: "pointer",
                  background: "#fff"
                }}
              >
                {form.address
                  ? `${form.address}, ${form.city}, ${form.state} - ${form.pincode}`
                  : "Enter billing address"}
              </div>
            </div>

            {/* SHIPPING */}
            <div style={{ flex: 1, minWidth: "350px" }}>
              <label>Shipping Address</label>
              <div
                onClick={() => !sameAsBilling && setShowShippingModal(true)}
                style={{
                  width: "100%",
                  minHeight: "60px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "12px",
                  cursor: sameAsBilling ? "not-allowed" : "pointer",
                  background: sameAsBilling ? "#f5f5f5" : "#fff"
                }}
              >
                {form.shippingAddress
                  ? `${form.shippingAddress}, ${form.shippingCity}, ${form.shippingState} - ${form.shippingPincode}`
                  : "Enter shipping address"}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ marginBottom: "6px", fontSize: "15px" }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSameAsBilling(checked);
                        if (checked) {
                          setForm(prev => ({
                            ...prev,
                            shippingAddress: prev.address,
                            shippingCity: prev.city,
                            shippingState: prev.state,
                            shippingPincode: prev.pincode
                          }));
                        }
                      }}
                    />
                    {" "}Same as Billing Address
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div style={{ marginTop: "25px", textAlign: "right" }}>
            <button
              onClick={handleSaveAndNew}
              style={{
                padding: "10px 20px",
                background: "#43a047",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                marginRight: "10px"
              }}
            >
              Save & New
            </button>

            <button
              onClick={handleSave}
              style={{
                padding: "10px 20px",
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Save Party
            </button>
          </div>
        </div>
      </div>

      {/* BILLING ADDRESS MODAL */}
      {showAddressModal && (
        <div
          onClick={() => setShowAddressModal(false)}
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100%", height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex", justifyContent: "center", alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "400px", background: "#fff", borderRadius: "10px", padding: "20px" }}
          >
            <h3>Billing Address</h3>
            <input placeholder="Address" value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }} />
            <input placeholder="City" value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }} />
            <select
  value={form.state}
  onChange={(e) => handleChange("state", e.target.value)}
  style={{ width: "100%", marginBottom: "10px", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
>
  <option value="">Select State</option>
  {indianStates.map((s, i) => (
    <option key={i} value={s}>{s}</option>
  ))}
</select>
            <input
  type="text"
  inputMode="numeric"
  placeholder="Pincode"
  value={form.pincode}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      handleChange("pincode", value);
    }
  }}
  style={{ width: "100%", marginBottom: "15px" }}
/>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setShowAddressModal(false)}>Cancel</button>
              <button onClick={() => setShowAddressModal(false)} style={{ background: "#1976d2" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* SHIPPING ADDRESS MODAL */}
      {showShippingModal && (
        <div
          onClick={() => setShowShippingModal(false)}
          style={{
            position: "fixed", top: 0, left: 0,
            width: "100%", height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex", justifyContent: "center", alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "400px", background: "#fff", borderRadius: "10px", padding: "20px" }}
          >
            <h3>Shipping Address</h3>
            <input placeholder="Address" value={form.shippingAddress}
              onChange={(e) => handleChange("shippingAddress", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }} />
            <input placeholder="City" value={form.shippingCity}
              onChange={(e) => handleChange("shippingCity", e.target.value)}
              style={{ width: "100%", marginBottom: "10px" }} />
            <select
  value={form.shippingState}
  onChange={(e) => handleChange("shippingState", e.target.value)}
  style={{ width: "100%", marginBottom: "10px", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
>
  <option value="">Select State</option>
  {indianStates.map((s, i) => (
    <option key={i} value={s}>{s}</option>
  ))}
</select>
            <input
  type="text"
  inputMode="numeric"
  placeholder="Pincode"
  value={form.shippingPincode}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      handleChange("shippingPincode", value);
    }
  }}
  style={{ width: "100%", marginBottom: "15px" }}
/>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setShowShippingModal(false)}>Cancel</button>
              <button onClick={() => setShowShippingModal(false)} style={{ background: "#1976d2" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle = {
  flex: 1,
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc"
};

export default CreateParty;
