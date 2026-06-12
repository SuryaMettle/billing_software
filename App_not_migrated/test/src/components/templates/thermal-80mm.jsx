import jsPDF from "jspdf";

// ─────────────────────────────────────────────
//  THERMAL 80mm — POS receipt printer format
//  Width: 80mm, Height: calculated dynamically
// ─────────────────────────────────────────────

const W = 80;       // paper width mm
const M = 4;        // margin mm
const CW = W - M * 2; // content width

function calcHeight(items) {
  // Estimate height based on content
  const headerH = 42;
  const billToH = 20;
  const itemsH = items.length * 14 + 14; // header + rows
  const taxH = 24;
  const totalsH = 30;
  const footerH = 24;
  return headerH + billToH + itemsH + taxH + totalsH + footerH + 20;
}

export function generateThermal80(data, options = {}) {
  const { invoice, items, settings, taxSummary, isSameState, deliveryCopy = false } = data;
  const { shouldPrint = false } = options;

  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const deliveryBlank = "______";

  const docHeight = calcHeight(items);
  const doc = new jsPDF({ unit: "mm", format: [W, docHeight], orientation: "portrait" });

  let y = 4;

  const centerText = (text, yPos, size = 8, bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    doc.text(String(text), W / 2, yPos, { align: "center" });
  };

  const leftRight = (left, right, yPos, size = 7.5) => {
    doc.setFont("courier", "normal");
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    doc.text(String(left), M, yPos);
    doc.text(String(right), W - M, yPos, { align: "right" });
  };

  const divider = (yPos, dashed = false) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    if (dashed) {
      // Simple dashed line simulation
      let x = M;
      while (x < W - M) {
        doc.line(x, yPos, Math.min(x + 2, W - M), yPos);
        x += 4;
      }
    } else {
      doc.line(M, yPos, W - M, yPos);
    }
  };

  // ── HEADER ──
  centerText(settings?.business_name || "Business Name", y + 5, 10, true);
  y += 8;
  if (settings?.address) {
    const addr = [settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ");
    doc.setFont("courier", "normal"); doc.setFontSize(7); doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(addr, CW);
    doc.text(lines, W / 2, y, { align: "center" });
    y += lines.length * 4;
  }
  if (settings?.phone) { centerText(`Ph: ${settings.phone}`, y, 7); y += 4; }
  if (settings?.gstin) { centerText(`GSTIN: ${settings.gstin}`, y, 7, true); y += 4; }

  y += 2;
  divider(y);
  y += 4;
  centerText(deliveryCopy ? "** DELIVERY COPY **" : "** TAX INVOICE **", y, 8.5, true);
  y += 5;
  divider(y);
  y += 4;

  // Invoice meta
  const invoiceDate = new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN");
  leftRight(`Invoice: #${invoice.id}`, invoiceDate, y, 7);
  y += 4;
  if (invoice.payment_mode) { leftRight(`Mode: ${invoice.payment_mode}`, `Status: ${invoice.payment_status || "-"}`, y, 7); y += 4; }

  y += 2;
  divider(y, true);
  y += 4;

  // Bill to
  doc.setFont("courier", "bold"); doc.setFontSize(7.5); doc.setTextColor(0);
  doc.text("BILL TO:", M, y);
  y += 4;
  doc.setFont("courier", "bold"); doc.setFontSize(8);
  doc.text(invoice.party_name || "Walk-in Customer", M, y);
  y += 4;
  if (invoice.party_phone) {
    doc.setFont("courier", "normal"); doc.setFontSize(7);
    doc.text(`Ph: ${invoice.party_phone}`, M, y); y += 4;
  }

  if (invoice.party_gstin) {
  doc.setFont("courier", "normal"); doc.setFontSize(7);
  doc.text(`GSTIN: ${invoice.party_gstin}`, M, y); y += 4;
}

  y += 2;
  divider(y);
  y += 3;

  // Items header
  doc.setFont("courier", "bold"); doc.setFontSize(7.5);
  doc.text("Item", M, y);
  doc.text("Qty", M + 32, y, { align: "center" });
  doc.text("Rate", M + 43, y, { align: "center" });
  doc.text("Amt", W - M, y, { align: "right" });
  y += 2;
  divider(y, true);
  y += 4;

  // Items rows
  items.forEach((item) => {
    const rate = Number(item.tax_rate || 0);
    const itemTotal = Number(item.price) * Number(item.quantity);
    const base = itemTotal / (1 + rate / 100);
    const taxAmt = itemTotal - base;

    doc.setFont("courier", "normal"); doc.setFontSize(7.5);
    // Item name (may wrap)
    const nameLines = doc.splitTextToSize(item.name, 28);
    doc.text(nameLines, M, y);
    const nameH = nameLines.length * 3.5;

    // Qty / Rate / Total on same line as first line of name
    doc.text(String(item.quantity), M + 32, y, { align: "center" });
    doc.text(Number(item.price).toFixed(0), M + 43, y, { align: "center" });
    doc.text(itemTotal.toFixed(2), W - M, y, { align: "right" });
    y += nameH;

    // Tax line
    if (rate > 0) {
      doc.setFont("courier", "normal"); doc.setFontSize(6.5); doc.setTextColor(100);
      if (isSameState) {
        doc.text(`  CGST ${rate / 2}%: ${(taxAmt / 2).toFixed(2)}  SGST ${rate / 2}%: ${(taxAmt / 2).toFixed(2)}`, M, y);
      } else {
        doc.text(`  IGST ${rate}%: ${taxAmt.toFixed(2)}`, M, y);
      }
      doc.setTextColor(0);
      y += 3.5;
    }
    y += 1;
  });

  divider(y);
  y += 4;

  // Totals
  leftRight("Subtotal:", `Rs.${subtotal.toFixed(2)}`, y, 7.5); y += 4.5;
  if (isSameState) {
    leftRight(`CGST:`, `Rs.${(totalTax / 2).toFixed(2)}`, y, 7); y += 4;
    leftRight(`SGST:`, `Rs.${(totalTax / 2).toFixed(2)}`, y, 7); y += 4;
  } else {
    leftRight(`IGST:`, `Rs.${totalTax.toFixed(2)}`, y, 7); y += 4;
  }

  divider(y);
  y += 4;

  // Grand total — big
  doc.setFont("courier", "bold"); doc.setFontSize(10); doc.setTextColor(0);
  doc.text("TOTAL:", M, y);
  doc.text(`Rs.${total.toFixed(2)}`, W - M, y, { align: "right" });
  y += 6;

  doc.setFont("courier", "normal"); doc.setFontSize(8);
  doc.text("Paid:", M, y);
  doc.text(deliveryCopy ? deliveryBlank : `Rs.${paid.toFixed(2)}`, W - M, y, { align: "right" });
  y += 5;

  if (deliveryCopy || balance > 0) {
    doc.setFont("courier", "bold"); doc.setFontSize(8);
    doc.text("Balance Due:", M, y);
    doc.text(deliveryCopy ? deliveryBlank : `Rs.${balance.toFixed(2)}`, W - M, y, { align: "right" });
    y += 5;
  }

  divider(y);
  y += 5;

  centerText("Thank you! Visit again.", y, 7.5, true);
  y += 5;
  centerText(new Date().toLocaleString("en-IN"), y, 6.5);

  if (shouldPrint) {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    win.onload = () => win.print();
  } else {
    doc.save(`Receipt_${invoice.id}.pdf`);
  }
}

// ── Thermal React Preview ──
export function Thermal80Preview({ data, deliveryCopy }) {
  const { invoice, items, settings, taxSummary, isSameState } = data;
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const deliveryBlank = "______";

  const row = (label, value, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: bold ? "700" : "400" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <div style={{ width: "80mm", margin: "24px auto", background: "#fff", padding: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", fontSize: "11px", fontFamily: "Courier New, monospace", color: "#000", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "6px" }}>
        <div style={{ fontSize: "15px", fontWeight: "700" }}>{settings?.business_name}</div>
        {settings?.phone && <div style={{ fontSize: "10px" }}>Ph: {settings.phone}</div>}
        {settings?.gstin && <div style={{ fontSize: "10px", fontWeight: "700" }}>GSTIN: {settings.gstin}</div>}
      </div>

      <div style={{ textAlign: "center", fontWeight: "700", borderBottom: "1px solid #000", paddingBottom: "4px", marginBottom: "4px", letterSpacing: "1px" }}>
        {deliveryCopy ? "** DELIVERY COPY **" : "** TAX INVOICE **"}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "4px" }}>
        <span>#{invoice.id}</span>
        <span>{new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN")}</span>
      </div>

      <div style={{ borderTop: "1px dashed #000", paddingTop: "4px", marginBottom: "4px", fontSize: "10px" }}>
        <div style={{ fontWeight: "700" }}>BILL TO: {invoice.party_name}</div>
        {invoice.party_phone && <div>Ph: {invoice.party_phone}</div>}
        {invoice.party_gstin && <div style={{ fontSize: "10px" }}>GSTIN: {invoice.party_gstin}</div>}
      </div>

      <div style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px 0", marginBottom: "2px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: "700" }}>
          <span style={{ width: "42%" }}>Item</span>
          <span style={{ width: "14%", textAlign: "center" }}>Qty</span>
          <span style={{ width: "18%", textAlign: "center" }}>Rate</span>
          <span style={{ width: "22%", textAlign: "right" }}>Amt</span>
        </div>
      </div>

      {items.map((item, i) => {
        const rate = Number(item.tax_rate || 0);
        const itemTotal = Number(item.price) * Number(item.quantity);
        const base = itemTotal / (1 + rate / 100);
        const taxAmt = itemTotal - base;
        return (
          <div key={i} style={{ borderBottom: "1px dashed #ccc", paddingBottom: "3px", marginBottom: "3px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px" }}>
              <span style={{ width: "42%", wordBreak: "break-word" }}>{item.name}</span>
              <span style={{ width: "14%", textAlign: "center" }}>{item.quantity}</span>
              <span style={{ width: "18%", textAlign: "center" }}>{Number(item.price).toFixed(0)}</span>
              <span style={{ width: "22%", textAlign: "right", fontWeight: "600" }}>{itemTotal.toFixed(2)}</span>
            </div>
            {rate > 0 && (
              <div style={{ fontSize: "9px", color: "#666" }}>
                {isSameState ? `CGST ${rate / 2}%: ${(taxAmt / 2).toFixed(2)}  SGST ${rate / 2}%: ${(taxAmt / 2).toFixed(2)}` : `IGST ${rate}%: ${taxAmt.toFixed(2)}`}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ borderTop: "1px solid #000", paddingTop: "4px", marginTop: "2px", fontSize: "10.5px" }}>
        {row("Subtotal:", `Rs.${subtotal.toFixed(2)}`)}
        {isSameState ? (<>{row(`CGST:`, `Rs.${(totalTax / 2).toFixed(2)}`)}{row(`SGST:`, `Rs.${(totalTax / 2).toFixed(2)}`)}</>) : row(`IGST:`, `Rs.${totalTax.toFixed(2)}`)}
      </div>

      <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "4px 0", margin: "4px 0", fontSize: "13px", fontWeight: "700" }}>
        {row("TOTAL:", `Rs.${total.toFixed(2)}`, true)}
      </div>

      <div style={{ fontSize: "10.5px" }}>
        {row("Paid:", deliveryCopy ? deliveryBlank : `Rs.${paid.toFixed(2)}`)}
        {(deliveryCopy || balance > 0) && <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "#c00" }}><span>Balance:</span><span>{deliveryCopy ? deliveryBlank : `Rs.${balance.toFixed(2)}`}</span></div>}
      </div>

      <div style={{ textAlign: "center", borderTop: "1px solid #000", marginTop: "8px", paddingTop: "6px", fontSize: "10px" }}>
        <div style={{ fontWeight: "700" }}>Thank you! Visit again.</div>
        <div style={{ color: "#666" }}>{new Date().toLocaleString("en-IN")}</div>
      </div>
    </div>
  );
}
