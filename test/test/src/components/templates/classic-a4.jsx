import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateClassicA4(data, options = {}) {
  const { invoice, items, settings, taxSummary, isSameState, deliveryCopy = false } = data;
  const { shouldPrint = false } = options;

  const doc = new jsPDF({ unit: "mm", format: [210, 297], compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const deliveryBlank = "____________________";
  const hasParty = !!invoice.party_name;

  const drawHeader = (pageNum) => {
    doc.setDrawColor(0); doc.setLineWidth(1.2);
    doc.line(margin, 8, pageW - margin, 8); doc.setLineWidth(0.4);
    doc.line(margin, 10, pageW - margin, 10);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(0, 0, 0);
if (settings?.logo) {
  try {
    const ext = settings.logo.startsWith("data:image/png") ? "PNG"
               : settings.logo.startsWith("data:image/svg") ? "SVG"
               : "JPEG";
    doc.addImage(settings.logo, ext, pageW / 2 - 15, 8, 30, 12, "", "FAST");
    doc.text(settings?.business_name || "Business Name", pageW / 2, 24, { align: "center" });
  } catch (e) {
    doc.text(settings?.business_name || "Business Name", pageW / 2, 18, { align: "center" });
  }
} else {
  doc.text(settings?.business_name || "Business Name", pageW / 2, 18, { align: "center" });
}
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const addressParts = [settings?.address, settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", ");
    if (addressParts) doc.text(addressParts, pageW / 2, 23, { align: "center" });
    let contactLine = [settings?.phone ? `Ph: ${settings.phone}` : null, settings?.email ? `Email: ${settings.email}` : null].filter(Boolean).join("   |   ");
    if (contactLine) doc.text(contactLine, pageW / 2, 27, { align: "center" });
    if (settings?.gstin) { doc.setFont("helvetica", "bold"); doc.text(`GSTIN: ${settings.gstin}`, pageW / 2, 31, { align: "center" }); }
    doc.setLineWidth(0.4); doc.line(margin, 34, pageW - margin, 34);
    doc.setLineWidth(1.2); doc.line(margin, 36, pageW - margin, 36);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(deliveryCopy ? "DELIVERY COPY" : "TAX INVOICE", pageW / 2, 43, { align: "center" });
    doc.setLineWidth(0.4); doc.line(margin, 45, pageW - margin, 45);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    const invoiceDate = new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN");
    doc.text(`Invoice No: ${invoice.id}`, margin, 51);
    doc.text(`Date: ${invoiceDate}`, pageW - margin, 51, { align: "right" });
    if (invoice.due_date) { const due = new Date(invoice.due_date).toLocaleDateString("en-IN"); doc.text(`Payment Terms: ${(invoice.payment_terms || "").replace("_", " ")}`, margin, 56); doc.text(`Due Date: ${due}`, pageW - margin, 56, { align: "right" }); }
    doc.setLineWidth(0.4); doc.line(margin, 59, pageW - margin, 59);
    doc.setFontSize(8); doc.setTextColor(100);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 6, { align: "right" });
    doc.text("Thank you for your business!", pageW / 2, pageH - 6, { align: "center" });
    doc.setTextColor(0);
  };

  drawHeader(1);
  let cursorY = 63;

  // ── Bill To — only if party name exists ──
  if (hasParty) {
    const hasShipping = !!invoice.party_shipping_address;
    const colW = hasShipping ? contentW / 2 - 3 : contentW;
    const boxH = 30;
    doc.setDrawColor(0); doc.setLineWidth(0.4);
    doc.rect(margin, cursorY, colW, boxH);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(0);
    doc.text("BILL TO:", margin + 3, cursorY + 6);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
    doc.text(invoice.party_name, margin + 3, cursorY + 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    let billY = cursorY + 17;
    if (invoice.party_phone) { doc.text(`Phone: ${invoice.party_phone}`, margin + 3, billY); billY += 4; }
    if (invoice.party_address) { doc.text(invoice.party_address, margin + 3, billY); billY += 4; }
    const cityLine = [invoice.party_city, invoice.party_state, invoice.party_pincode].filter(Boolean).join(", ");
    if (cityLine) doc.text(cityLine, margin + 3, billY);
    if (invoice.party_gstin) doc.text(`GSTIN: ${invoice.party_gstin}`, margin + 3, billY + 4);
    if (invoice.party_gstin && invoice.party_logo) {
      try {
        doc.addImage(invoice.party_logo, "PNG", margin + 3, billY + 6, 28, 10, "", "FAST");
      } catch(e) {}
    }
    if (hasShipping) {
      const shipX = margin + colW + 6;
      doc.rect(shipX, cursorY, colW, boxH);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text("SHIP TO:", shipX + 3, cursorY + 6);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.text(invoice.party_name, shipX + 3, cursorY + 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      let shipY = cursorY + 17;
      if (invoice.party_shipping_address) { doc.text(invoice.party_shipping_address, shipX + 3, shipY); shipY += 4; }
      const sl = [invoice.party_shipping_city, invoice.party_shipping_state, invoice.party_shipping_pincode].filter(Boolean).join(", ");
      if (sl) doc.text(sl, shipX + 3, shipY);
    }
    cursorY += boxH + 4;
  }

  const tableColumns = isSameState ? ["#", "Description of Goods", "HSN/SAC", "Qty", "Rate (Rs.)", "Taxable (Rs.)", "CGST", "SGST", "Total (Rs.)"] : ["#", "Description of Goods", "HSN/SAC", "Qty", "Rate (Rs.)", "Taxable (Rs.)", "IGST", "Total (Rs.)"];
  const tableRows = items.map((item, i) => {
    const rate = Number(item.tax_rate || 0);
    const itemTotal = Number(item.price) * Number(item.quantity);
    const base = itemTotal / (1 + rate / 100);
    const taxAmt = itemTotal - base;
    const half = rate / 2;
    if (isSameState) return [i + 1, item.name, item.hsn_code || "-", item.quantity, Number(item.price).toFixed(2), base.toFixed(2), `${half}%\n${(taxAmt / 2).toFixed(2)}`, `${half}%\n${(taxAmt / 2).toFixed(2)}`, itemTotal.toFixed(2)];
    return [i + 1, item.name, item.hsn_code || "-", item.quantity, Number(item.price).toFixed(2), base.toFixed(2), `${rate}%\n${taxAmt.toFixed(2)}`, itemTotal.toFixed(2)];
  });

  autoTable(doc, { startY: cursorY, head: [tableColumns], body: tableRows, margin: { left: margin, right: margin }, theme: "grid", styles: { fontSize: 8.5, cellPadding: 3, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.3, valign: "middle" }, headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: "bold", halign: "center", lineColor: [0,0,0], lineWidth: 0.4 }, columnStyles: { 0: { halign: "center", cellWidth: 10 }, 1: { halign: "left", cellWidth: "auto" }, 2: { halign: "center", cellWidth: 20 }, 3: { halign: "center", cellWidth: 12 }, 4: { halign: "right", cellWidth: 20 }, 5: { halign: "right", cellWidth: 22 }, 6: { halign: "center", cellWidth: 20 }, ...(isSameState ? { 7: { halign: "center", cellWidth: 20 }, 8: { halign: "right", cellWidth: 22 } } : { 7: { halign: "right", cellWidth: 24 } }) }, didDrawPage: () => { const p = doc.internal.getCurrentPageInfo().pageNumber; if (p > 1) drawHeader(p); }, showHead: "everyPage" });

  cursorY = doc.lastAutoTable.finalY + 4;
  if (cursorY + 80 > pageH - 20) { doc.addPage(); drawHeader(doc.internal.getCurrentPageInfo().pageNumber); cursorY = 65; }

  const taxRows = Object.entries(taxSummary).map(([rate, val]) => isSameState ? [`${rate}%`, val.base.toFixed(2), (val.tax / 2).toFixed(2), (val.tax / 2).toFixed(2)] : [`${rate}%`, val.base.toFixed(2), val.tax.toFixed(2)]);
  const taxCols = isSameState ? ["GST Rate", "Taxable (Rs.)", "CGST (Rs.)", "SGST (Rs.)"] : ["GST Rate", "Taxable (Rs.)", "IGST (Rs.)"];
  autoTable(doc, { startY: cursorY, head: [taxCols], body: taxRows, margin: { left: margin, right: pageW / 2 + 4 }, tableWidth: contentW / 2 - 4, theme: "grid", styles: { fontSize: 8, cellPadding: 2.5, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.3 }, headStyles: { fillColor: [240,240,240], textColor: [0,0,0], fontStyle: "bold", halign: "center", lineColor: [0,0,0] }, columnStyles: { 0: { halign: "left" }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } }, didDrawPage: () => {} });

  const taxEndY = doc.lastAutoTable.finalY;
  const boxX = pageW / 2 + 4; const boxW = contentW / 2 - 4;
  const totalsData = [["Subtotal (before tax)", `Rs.${subtotal.toFixed(2)}`], ...(isSameState ? [["CGST", `Rs.${(totalTax / 2).toFixed(2)}`], ["SGST", `Rs.${(totalTax / 2).toFixed(2)}`]] : [["IGST", `Rs.${totalTax.toFixed(2)}`]])];
  autoTable(doc, { startY: cursorY, body: totalsData, margin: { left: boxX, right: margin }, tableWidth: boxW, theme: "grid", styles: { fontSize: 9, cellPadding: 2.5, textColor: [0,0,0], lineColor: [0,0,0], lineWidth: 0.3 }, columnStyles: { 0: { halign: "left" }, 1: { halign: "right" } }, didDrawPage: () => {} });

  const gtY = doc.lastAutoTable.finalY;
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.rect(boxX, gtY, boxW, 9);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0);
  doc.text("GRAND TOTAL", boxX + 3, gtY + 6); doc.text(`Rs.${total.toFixed(2)}`, boxX + boxW - 3, gtY + 6, { align: "right" });
  const paidY = gtY + 12;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Paid: ${deliveryCopy ? deliveryBlank : `Rs.${paid.toFixed(2)}`}`, boxX + 3, paidY);
  if (deliveryCopy || balance > 0) { doc.setFont("helvetica", "bold"); doc.text(`Balance Due: ${deliveryCopy ? deliveryBlank : `Rs.${balance.toFixed(2)}`}`, boxX + 3, paidY + 5); }

  cursorY = Math.max(taxEndY, paidY + 12) + 10;
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(margin, cursorY, pageW - margin, cursorY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  doc.text(`Payment Mode: ${invoice.payment_mode || "-"}`, margin, cursorY + 6);
  cursorY += 14;
  doc.text("Customer Signature", margin, cursorY); doc.line(margin, cursorY + 14, margin + 55, cursorY + 14);
  const sigX = pageW - margin - 55;
  doc.text("Authorised Signatory", sigX, cursorY); doc.line(sigX, cursorY + 14, pageW - margin, cursorY + 14);
  if (settings?.business_name) { doc.setFont("helvetica", "bold"); doc.text(settings.business_name, pageW - margin, cursorY + 19, { align: "right" }); }
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(margin, cursorY + 24, pageW - margin, cursorY + 24);
  doc.setLineWidth(1.2); doc.line(margin, cursorY + 26, pageW - margin, cursorY + 26);

  if (shouldPrint) { const blob = doc.output("blob"); const url = URL.createObjectURL(blob); const win = window.open(url); win.onload = () => win.print(); }
  else { doc.save(`Invoice_${invoice.id}.pdf`); }
}

export function ClassicA4Preview({ data, deliveryCopy }) {
  const { invoice, items, settings, taxSummary, isSameState } = data;
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const deliveryBlank = "____________________";
  const border = "2px solid #000";
  const hasParty = !!invoice.party_name;

  return (
    <div className="invoice-preview" style={{ width: "210mm", minHeight: "297mm", margin: "24px auto", background: "#fff", padding: "20px 30px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: "12px", color: "#000", boxSizing: "border-box", fontFamily: "serif" }}>
      <div style={{ borderTop: "3px solid #000", borderBottom: "1px solid #000", paddingBottom: "8px", marginBottom: "4px", textAlign: "center" }}>
        {settings?.logo && (
  <img
    src={settings.logo}
    alt="Logo"
    style={{
      height: 56, maxWidth: 140, objectFit: "contain",
      marginTop: 8, marginBottom: 4, display: "block", margin: "8px auto 4px",
    }}
  />
)}
<div style={{ fontSize: "22px", fontWeight: "700", marginTop: "8px" }}>{settings?.business_name || "Business Name"}</div>
        <div style={{ fontSize: "11px" }}>{[settings?.address, settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", ")}</div>
        {settings?.phone && <div style={{ fontSize: "11px" }}>Ph: {settings.phone}</div>}
        {settings?.gstin && <div style={{ fontSize: "11px", fontWeight: "700" }}>GSTIN: {settings.gstin}</div>}
      </div>
      <div style={{ borderTop: "1px solid #000", borderBottom: "3px solid #000", textAlign: "center", padding: "4px 0", fontWeight: "700", fontSize: "13px", letterSpacing: "2px" }}>{deliveryCopy ? "DELIVERY COPY" : "TAX INVOICE"}</div>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #000", padding: "6px 0", marginBottom: "8px" }}>
        <span>Invoice #: <strong>{invoice.id}</strong></span>
        <span>Date: <strong>{new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN")}</strong></span>
      </div>

      {hasParty && (
  <div style={{ border, padding: "8px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div>
      <div style={{ fontWeight: "700", borderBottom: "1px solid #000", marginBottom: "4px" }}>BILL TO:</div>
      <div style={{ fontWeight: "700" }}>{invoice.party_name}</div>
      {invoice.party_phone && <div>{invoice.party_phone}</div>}
      {invoice.party_address && <div style={{ color: "#444" }}>{invoice.party_address}</div>}
      {invoice.party_gstin && <div style={{ fontWeight: "700" }}>GSTIN: {invoice.party_gstin}</div>}
    </div>
    {invoice.party_gstin && invoice.party_logo && (
      <img src={invoice.party_logo} alt="Customer Logo" style={{
        maxHeight: "70px", maxWidth: "140px", objectFit: "contain",
        border: "1px solid #000", padding: "4px",
        background: "#fff", marginLeft: "12px",
        alignSelf: "center"
      }} />
    )}
  </div>
)}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "16px", border }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            {["#", "Item Description", "HSN", "Qty", "Rate", "Taxable", isSameState ? "CGST" : "IGST", ...(isSameState ? ["SGST"] : []), "Total"].map((h, i) => (
              <th key={i} style={{ padding: "6px", textAlign: i === 1 ? "left" : "center", border }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const rate = Number(item.tax_rate || 0);
            const itemTotal = Number(item.price) * Number(item.quantity);
            const base = itemTotal / (1 + rate / 100);
            const taxAmt = itemTotal - base;
            return (
              <tr key={i}>
                <td style={{ padding: "6px", textAlign: "center", border }}>{i + 1}</td>
                <td style={{ padding: "6px", border }}>{item.name}</td>
                <td style={{ padding: "6px", textAlign: "center", border }}>{item.hsn_code || "-"}</td>
                <td style={{ padding: "6px", textAlign: "center", border }}>{item.quantity}</td>
                <td style={{ padding: "6px", textAlign: "right", border }}>₹{Number(item.price).toFixed(2)}</td>
                <td style={{ padding: "6px", textAlign: "right", border }}>₹{base.toFixed(2)}</td>
                {isSameState ? (<><td style={{ padding: "6px", textAlign: "center", border }}>{rate / 2}%<br />₹{(taxAmt / 2).toFixed(2)}</td><td style={{ padding: "6px", textAlign: "center", border }}>{rate / 2}%<br />₹{(taxAmt / 2).toFixed(2)}</td></>) : (<td style={{ padding: "6px", textAlign: "center", border }}>{rate}%<br />₹{taxAmt.toFixed(2)}</td>)}
                <td style={{ padding: "6px", textAlign: "right", border, fontWeight: "700" }}>₹{itemTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "220px", border, fontSize: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderBottom: "1px solid #000" }}><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          {isSameState ? (<><div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderBottom: "1px solid #000" }}><span>CGST</span><span>₹{(totalTax / 2).toFixed(2)}</span></div><div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderBottom: "1px solid #000" }}><span>SGST</span><span>₹{(totalTax / 2).toFixed(2)}</span></div></>) : (<div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderBottom: "1px solid #000" }}><span>IGST</span><span>₹{totalTax.toFixed(2)}</span></div>)}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", fontWeight: "700", fontSize: "13px", borderBottom: "1px solid #000" }}><span>GRAND TOTAL</span><span>₹{total.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px" }}><span>Paid</span><span>{deliveryCopy ? deliveryBlank : `₹${paid.toFixed(2)}`}</span></div>
          {(deliveryCopy || balance > 0) && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", fontWeight: "700", color: "#c00" }}><span>Balance Due</span><span>{deliveryCopy ? deliveryBlank : `₹${balance.toFixed(2)}`}</span></div>}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", borderTop: "1px solid #000", paddingTop: "8px" }}>
        <div><div style={{ fontSize: "11px", color: "#666" }}>Customer Signature</div><div style={{ width: "140px", borderTop: "1px solid #000", marginTop: "28px" }} /></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: "11px", color: "#666" }}>Authorised Signatory</div><div style={{ width: "140px", borderTop: "1px solid #000", marginTop: "28px", paddingTop: "4px" }}><div style={{ fontSize: "11px", fontWeight: "700" }}>{settings?.business_name}</div></div></div>
      </div>
    </div>
  );
}