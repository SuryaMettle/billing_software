import jsPDF from "jspdf";

const W = 76;
const M = 4;
const CW = W - M * 2;
const BODY_SIZE = 8;
const TITLE_SIZE = 10;
const SECTION_TITLE_SIZE = 7;
const TOTAL_SIZE = 10;
const FOOTER_SIZE = 8;

function calcHeight(items, hasParty) {
  const headerH = 42;
  const billToH = hasParty ? 20 : 0;
  const itemsH = items.length * 14 + 14;
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
  const hasParty = !!invoice.party_name;

  const doc = new jsPDF({ unit: "mm", format: [80, calcHeight(items, hasParty) + 20], orientation: "portrait", compress: true, margins: { top: 5, bottom: 5, left: 0, right: 0 } });
  let y = 4;

  const centerText = (text, yPos, size = BODY_SIZE, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size); doc.setTextColor(0, 0, 0);
    doc.text(String(text), W / 2, yPos, { align: "center" });
  };
  const R = W - M;
  const leftRight = (left, right, yPos, size = BODY_SIZE) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(0, 0, 0);
    doc.text(String(left), M, yPos); doc.text(String(right), R, yPos, { align: "right" });
  };
  const divider = (yPos, dashed = false) => {
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    if (dashed) { let x = M; while (x < R) { doc.line(x, yPos, Math.min(x + 2, R), yPos); x += 4; } }
    else { doc.line(M, yPos, R, yPos); }
  };

  centerText(settings?.business_name || "Business Name", y + 5, TITLE_SIZE, true); y += 8;
  if (settings?.address) {
    const addr = [settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ");
    doc.setFont("helvetica", "normal"); doc.setFontSize(BODY_SIZE); doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(addr, CW);
    doc.text(lines, W / 2, y, { align: "center" }); y += lines.length * 4;
  }
  if (settings?.phone) { centerText(`Ph: ${settings.phone}`, y, BODY_SIZE); y += 4; }
  if (settings?.gstin) { centerText(`GSTIN: ${settings.gstin}`, y, BODY_SIZE, true); y += 4; }

  y += 2; divider(y); y += 4;
  centerText(deliveryCopy ? "** DELIVERY COPY **" : "** TAX INVOICE **", y, SECTION_TITLE_SIZE, true); y += 5;
  divider(y); y += 4;

  const invoiceDate = new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN");
  leftRight(`Invoice: #${invoice.id}`, invoiceDate, y, BODY_SIZE); y += 4;
  if (invoice.payment_mode) { leftRight(`Mode: ${invoice.payment_mode}`, `Status: ${invoice.payment_status || "-"}`, y, BODY_SIZE); y += 4; }

  y += 2; divider(y, true); y += 4;

  // ── Bill To — only if party name exists ──
  if (hasParty) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(SECTION_TITLE_SIZE); doc.setTextColor(0);
    doc.text("BILL TO:", M, y); y += 4;
    doc.setFont("helvetica", "bold"); doc.setFontSize(BODY_SIZE);
    doc.text(invoice.party_name, M, y); y += 4;
    if (invoice.party_phone) { doc.setFont("helvetica", "normal"); doc.setFontSize(BODY_SIZE); doc.text(`Ph: ${invoice.party_phone}`, M, y); y += 4; }
    if (invoice.party_gstin) { doc.setFont("helvetica", "normal"); doc.setFontSize(BODY_SIZE); doc.text(`GSTIN: ${invoice.party_gstin}`, M, y); y += 4; }
    y += 2; divider(y);
  }
  y += 3;

  const COL_QTY = M + 30; const COL_RATE = M + 44; const COL_AMT = R;
  doc.setFont("helvetica", "bold"); doc.setFontSize(BODY_SIZE);
  doc.text("Item", M, y); doc.text("Qty", COL_QTY, y, { align: "center" });
  doc.text("Rate", COL_RATE, y, { align: "center" }); doc.text("Amt", COL_AMT, y, { align: "right" });
  y += 2; divider(y, true); y += 4;

  items.forEach((item) => {
    const rate = Number(item.tax_rate || 0);
    const itemTotal = Number(item.price) * Number(item.quantity);
    const base = itemTotal / (1 + rate / 100);
    const taxAmt = itemTotal - base;
    doc.setFont("helvetica", "normal"); doc.setFontSize(BODY_SIZE);
    const nameLines = doc.splitTextToSize(item.name, 22);
    doc.text(nameLines, M, y);
    doc.text(String(item.quantity), COL_QTY, y, { align: "center" });
    doc.text(Number(item.price).toFixed(0), COL_RATE, y, { align: "center" });
    doc.text(itemTotal.toFixed(2), COL_AMT, y, { align: "right" });
    y += nameLines.length * 3.5;
    if (rate > 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(BODY_SIZE - 1); doc.setTextColor(0);
      if (isSameState) doc.text(`  CGST ${rate / 2}%: ${(taxAmt / 2).toFixed(2)}  SGST ${rate / 2}%: ${(taxAmt / 2).toFixed(2)}`, M, y);
      else doc.text(`  IGST ${rate}%: ${taxAmt.toFixed(2)}`, M, y);
      doc.setTextColor(0); y += 3.5;
    }
    y += 1;
  });

  divider(y); y += 4;
  leftRight("Subtotal:", `Rs.${subtotal.toFixed(2)}`, y, BODY_SIZE); y += 4.5;
  if (isSameState) { leftRight(`CGST:`, `Rs.${(totalTax / 2).toFixed(2)}`, y, BODY_SIZE); y += 4; leftRight(`SGST:`, `Rs.${(totalTax / 2).toFixed(2)}`, y, BODY_SIZE); y += 4; }
  else { leftRight(`IGST:`, `Rs.${totalTax.toFixed(2)}`, y, BODY_SIZE); y += 4; }
  divider(y); y += 4;

  doc.setFont("helvetica", "bold"); doc.setFontSize(TOTAL_SIZE); doc.setTextColor(0);
  doc.text("TOTAL:", M, y); doc.text(`Rs.${total.toFixed(2)}`, R, y, { align: "right" }); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(BODY_SIZE);
  doc.text("Paid:", M, y); doc.text(deliveryCopy ? deliveryBlank : `Rs.${paid.toFixed(2)}`, R, y, { align: "right" }); y += 5;
  if (deliveryCopy || balance > 0) { doc.setFont("helvetica", "bold"); doc.setFontSize(BODY_SIZE); doc.text("Balance Due:", M, y); doc.text(deliveryCopy ? deliveryBlank : `Rs.${balance.toFixed(2)}`, R, y, { align: "right" }); y += 5; }

  divider(y); y += 5;
  centerText("Thank you! Visit again.", y, FOOTER_SIZE, true); y += 5;
  centerText(new Date().toLocaleString("en-IN"), y, BODY_SIZE);

  if (shouldPrint) { const blob = doc.output("blob"); const url = URL.createObjectURL(blob); const win = window.open(url); win.onload = () => win.print(); }
  else { doc.save(`Receipt_${invoice.id}.pdf`); }
}

export function Thermal80Preview({ data, deliveryCopy }) {
  const { invoice, items, settings, taxSummary, isSameState } = data;
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const deliveryBlank = "______";
  const body = "10px";
  const title = "13px";
  const sectionTitle = "10px";
  const totalSize = "11px";
  const hasParty = !!invoice.party_name;

  const row = (label, value, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: bold ? "700" : "400", fontSize: body }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <div style={{ width: "80mm", maxWidth: "80mm", height: "auto", margin: 0, padding: "4mm", background: "#fff", boxShadow: "none", fontSize: "10px", fontFamily: "Helvetica, Arial, sans-serif", color: "#000", boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "6px" }}>
        <div style={{ fontSize: title, fontWeight: "700" }}>{settings?.business_name}</div>
        {settings?.address && <div style={{ fontSize: body }}>{[settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ")}</div>}
        {settings?.phone && <div style={{ fontSize: body }}>Ph: {settings.phone}</div>}
        {settings?.gstin && <div style={{ fontSize: body, fontWeight: "700" }}>GSTIN: {settings.gstin}</div>}
      </div>

      <div style={{ textAlign: "center", fontWeight: "700", fontSize: sectionTitle, borderBottom: "1px solid #000", paddingBottom: "4px", marginBottom: "4px", letterSpacing: "1px" }}>
        {deliveryCopy ? "** DELIVERY COPY **" : "** TAX INVOICE **"}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: body, marginBottom: "4px" }}>
        <span>#{invoice.id}</span>
        <span>{new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN")}</span>
      </div>

      {invoice.payment_mode && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: body, marginBottom: "4px" }}>
          <span>Mode: {invoice.payment_mode}</span>
          <span>Status: {invoice.payment_status || "-"}</span>
        </div>
      )}

      {hasParty && (
        <div style={{ borderTop: "1px dashed #000", paddingTop: "4px", marginBottom: "4px", fontSize: body }}>
          <div style={{ fontWeight: "700" }}>BILL TO: {invoice.party_name}</div>
          {invoice.party_phone && <div>Ph: {invoice.party_phone}</div>}
          {invoice.party_gstin && <div>GSTIN: {invoice.party_gstin}</div>}
        </div>
      )}

      <div style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", padding: "3px 0", marginBottom: "2px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: body, fontWeight: "700" }}>
          <span style={{ width: "38%" }}>Item</span>
          <span style={{ width: "14%", textAlign: "center" }}>Qty</span>
          <span style={{ width: "20%", textAlign: "center" }}>Rate</span>
          <span style={{ width: "24%", textAlign: "right" }}>Amt</span>
        </div>
      </div>

      {items.map((item, i) => {
        const rate = Number(item.tax_rate || 0);
        const itemTotal = Number(item.price) * Number(item.quantity);
        const base = itemTotal / (1 + rate / 100);
        const taxAmt = itemTotal - base;
        return (
          <div key={i} style={{ borderBottom: "1px solid #000", paddingBottom: "3px", marginBottom: "3px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: body }}>
              <span style={{ width: "38%", wordBreak: "break-word" }}>{item.name}</span>
              <span style={{ width: "14%", textAlign: "center" }}>{item.quantity}</span>
              <span style={{ width: "20%", textAlign: "center" }}>{Number(item.price).toFixed(0)}</span>
              <span style={{ width: "24%", textAlign: "right", fontWeight: "600" }}>{itemTotal.toFixed(2)}</span>
            </div>
            {rate > 0 && (
              <div style={{ fontSize: "9px", color: "#000" }}>
                {isSameState ? `CGST ${rate / 2}%: ${(taxAmt / 2).toFixed(2)}  SGST ${rate / 2}%: ${(taxAmt / 2).toFixed(2)}` : `IGST ${rate}%: ${taxAmt.toFixed(2)}`}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ borderTop: "1px solid #000", paddingTop: "4px", marginTop: "2px" }}>
        {row("Subtotal:", `Rs.${subtotal.toFixed(2)}`)}
        {isSameState ? (<>{row(`CGST:`, `Rs.${(totalTax / 2).toFixed(2)}`)}{row(`SGST:`, `Rs.${(totalTax / 2).toFixed(2)}`)}</>) : row(`IGST:`, `Rs.${totalTax.toFixed(2)}`)}
      </div>

      <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", padding: "4px 0", margin: "4px 0", fontSize: totalSize, fontWeight: "700" }}>
        {row("TOTAL:", `Rs.${total.toFixed(2)}`, true)}
      </div>

      <div style={{ fontSize: body }}>
        {row("Paid:", deliveryCopy ? deliveryBlank : `Rs.${paid.toFixed(2)}`)}
        {(deliveryCopy || balance > 0) && (
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "#c00", fontSize: body }}>
            <span>Balance:</span><span>{deliveryCopy ? deliveryBlank : `Rs.${balance.toFixed(2)}`}</span>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", borderTop: "1px solid #000", marginTop: "8px", paddingTop: "6px", fontSize: body }}>
        <div style={{ fontWeight: "700" }}>Thank you! Visit again.</div>
        <div style={{ color: "#000" }}>{new Date().toLocaleString("en-IN")}</div>
      </div>
    </div>
  );
}