import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateModernA4(data, options = {}) {
  const { invoice, items, settings, taxSummary, isSameState, deliveryCopy = false } = data;
  const { shouldPrint = false } = options;

  const doc = new jsPDF({ unit: "mm", format: [210, 297], compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const deliveryBlank = "____________________";

  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const hasParty = !!invoice.party_name;

  const drawHeader = (pageNum) => {
    doc.setFillColor(25, 118, 210);
    doc.rect(0, 0, pageW, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(25, 118, 210);
    doc.text(settings?.business_name || "Business Name", margin, 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    const addressParts = [settings?.address, settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", ");
    if (addressParts) doc.text(addressParts, margin, 17);
    let contactLine = "";
    if (settings?.phone) contactLine += `Phone: ${settings.phone}`;
    if (settings?.phone && settings?.email) contactLine += "   |   ";
    if (settings?.email) contactLine += `Email: ${settings.email}`;
    if (contactLine) doc.text(contactLine, margin, 21);
    if (settings?.gstin) { doc.setFont("helvetica", "bold"); doc.text(`GSTIN: ${settings.gstin}`, margin, 25); }
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(30, 30, 30);
    doc.text(deliveryCopy ? "DELIVERY COPY" : "TAX INVOICE", pageW - margin, 12, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
    doc.text(`Invoice #: ${invoice.id}`, pageW - margin, 17, { align: "right" });
    const invoiceDate = new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN");
    doc.text(`Date: ${invoiceDate}`, pageW - margin, 21, { align: "right" });
    if (invoice.due_date) { const due = new Date(invoice.due_date).toLocaleDateString("en-IN"); doc.text(`Due Date: ${due}`, pageW - margin, 25, { align: "right" }); }
    const statusColors = { paid: [46, 125, 50], partial: [245, 124, 0], pending: [211, 47, 47] };
    const sc = deliveryCopy ? [245, 124, 0] : statusColors[invoice.payment_status] || [150, 150, 150];
    const statusText = deliveryCopy ? "DELIVERY" : (invoice.payment_status || "").toUpperCase();
    const badgeX = pageW - margin - 18;
    const badgeY = invoice.due_date ? 28 : 24;
    doc.setFillColor(...sc); doc.roundedRect(badgeX, badgeY, 18, 5, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
    doc.text(statusText, badgeX + 9, badgeY + 3.5, { align: "center" });
    doc.setDrawColor(25, 118, 210); doc.setLineWidth(0.5);
    doc.line(margin, 35, pageW - margin, 35);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 6, { align: "right" });
    doc.text("Thank you for your business!", pageW / 2, pageH - 6, { align: "center" });
  };

  drawHeader(1);
  let cursorY = 40;

  // ── Bill To — only if party name exists ──
  if (hasParty) {
    const billToLines = [
      invoice.party_name,
      invoice.party_phone ? `Phone: ${invoice.party_phone}` : null,
      invoice.party_address || null,
      [invoice.party_city, invoice.party_state, invoice.party_pincode].filter(Boolean).join(", ") || null,
      invoice.party_gstin ? `GSTIN: ${invoice.party_gstin}` : null,
    ].filter(Boolean);

    const hasShipping = !!invoice.party_shipping_address;
    const colW = hasShipping ? contentW / 2 - 3 : contentW;
    doc.setFillColor(249, 249, 249); doc.roundedRect(margin, cursorY, colW, 28, 2, 2, "F");
    doc.setDrawColor(220, 220, 220); doc.roundedRect(margin, cursorY, colW, 28, 2, 2, "S");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(25, 118, 210);
    doc.text("Bill To:", margin + 4, cursorY + 6);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
    doc.text(billToLines[0], margin + 4, cursorY + 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
    billToLines.slice(1).forEach((line, i) => doc.text(line, margin + 4, cursorY + 17 + i * 4));

    if (invoice.party_gstin && invoice.party_logo) {
      try {
        const logoY = cursorY + 17 + billToLines.slice(1).length * 4;
        doc.addImage(invoice.party_logo, "PNG", margin + 4, logoY, 30, 10, "", "FAST");
      } catch(e) {}
    }

    if (hasShipping) {
      const shipX = margin + colW + 6;
      const shipLines = [invoice.party_name, invoice.party_shipping_address, [invoice.party_shipping_city, invoice.party_shipping_state, invoice.party_shipping_pincode].filter(Boolean).join(", ") || null].filter(Boolean);
      doc.setFillColor(249, 249, 249); doc.roundedRect(shipX, cursorY, colW, 28, 2, 2, "F");
      doc.setDrawColor(220, 220, 220); doc.roundedRect(shipX, cursorY, colW, 28, 2, 2, "S");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(25, 118, 210);
      doc.text("Ship To:", shipX + 4, cursorY + 6);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      doc.text(shipLines[0], shipX + 4, cursorY + 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
      shipLines.slice(1).forEach((line, i) => doc.text(line, shipX + 4, cursorY + 17 + i * 4));
    }
    cursorY += 32;
  }

  const tableColumns = isSameState
    ? ["#", "Item", "HSN/SAC", "Qty", "Price (Rs.)", "Taxable Amt (Rs.)", "CGST", "SGST", "Total (Rs.)"]
    : ["#", "Item", "HSN/SAC", "Qty", "Price (Rs.)", "Taxable Amt (Rs.)", "IGST", "Total (Rs.)"];
  const tableRows = items.map((item, i) => {
    const rate = Number(item.tax_rate || 0);
    const itemTotal = Number(item.price) * Number(item.quantity);
    const base = itemTotal / (1 + rate / 100);
    const taxAmt = itemTotal - base;
    const half = rate / 2;
    if (isSameState) return [i + 1, item.name, item.hsn_code || "-", item.quantity, Number(item.price).toFixed(2), base.toFixed(2), `${half}%\nRs.${(taxAmt / 2).toFixed(2)}`, `${half}%\nRs.${(taxAmt / 2).toFixed(2)}`, itemTotal.toFixed(2)];
    return [i + 1, item.name, item.hsn_code || "-", item.quantity, Number(item.price).toFixed(2), base.toFixed(2), `${rate}%\nRs.${taxAmt.toFixed(2)}`, itemTotal.toFixed(2)];
  });

  autoTable(doc, {
    startY: cursorY, head: [tableColumns], body: tableRows,
    margin: { left: margin, right: margin }, theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 30, 30], lineColor: [220, 220, 220], lineWidth: 0.3, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [25, 118, 210], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { halign: "center", cellWidth: 10 }, 1: { halign: "left", cellWidth: "auto" }, 2: { halign: "center", cellWidth: 22 }, 3: { halign: "center", cellWidth: 12 }, 4: { halign: "right", cellWidth: 20 }, 5: { halign: "right", cellWidth: 22 }, 6: { halign: "center", cellWidth: 20 }, ...(isSameState ? { 7: { halign: "center", cellWidth: 20 }, 8: { halign: "right", cellWidth: 22 } } : { 7: { halign: "right", cellWidth: 25 } }) },
    alternateRowStyles: { fillColor: [249, 249, 249] },
    didDrawPage: () => { const p = doc.internal.getCurrentPageInfo().pageNumber; if (p > 1) drawHeader(p); },
    showHead: "everyPage",
  });

  cursorY = doc.lastAutoTable.finalY + 8;
  if (cursorY + 80 > pageH - 20) { doc.addPage(); drawHeader(doc.internal.getCurrentPageInfo().pageNumber); cursorY = 42; }

  const taxRows = Object.entries(taxSummary).map(([rate, val]) => isSameState ? [`${rate}%`, val.base.toFixed(2), (val.tax / 2).toFixed(2), (val.tax / 2).toFixed(2)] : [`${rate}%`, val.base.toFixed(2), val.tax.toFixed(2)]);
  const taxCols = isSameState ? ["GST Rate", "Taxable Amt (Rs.)", "CGST (Rs.)", "SGST (Rs.)"] : ["GST Rate", "Taxable Amt (Rs.)", "IGST (Rs.)"];
  autoTable(doc, { startY: cursorY, head: [taxCols], body: taxRows, margin: { left: margin, right: pageW / 2 + 4 }, theme: "grid", tableWidth: contentW / 2 - 4, styles: { fontSize: 8, cellPadding: 2.5, valign: "middle" }, headStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: "bold", halign: "center" }, columnStyles: { 0: { halign: "left" }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } }, didDrawPage: () => {} });

  const taxTableEndY = doc.lastAutoTable.finalY;
  const boxX = pageW / 2 + 4; const boxW = contentW / 2 - 4;
  const totalsData = [["Subtotal (before tax)", `Rs.${subtotal.toFixed(2)}`], ...(isSameState ? [["CGST", `Rs.${(totalTax / 2).toFixed(2)}`], ["SGST", `Rs.${(totalTax / 2).toFixed(2)}`]] : [["IGST", `Rs.${totalTax.toFixed(2)}`]])];
  autoTable(doc, { startY: cursorY, body: totalsData, margin: { left: boxX, right: margin }, tableWidth: boxW, theme: "plain", styles: { fontSize: 9, cellPadding: 2.5, textColor: [60, 60, 60] }, columnStyles: { 0: { halign: "left" }, 1: { halign: "right" } }, didDrawPage: () => {} });

  const gtY = doc.lastAutoTable.finalY + 1;
  doc.setFillColor(46, 125, 50); doc.rect(boxX, gtY, boxW, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text("Grand Total", boxX + 3, gtY + 5.5);
  doc.text(`Rs.${total.toFixed(2)}`, boxX + boxW - 3, gtY + 5.5, { align: "right" });

  const paidY = gtY + 9;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(46, 125, 50);
  doc.text("Paid", boxX + 3, paidY);
  doc.text(deliveryCopy ? deliveryBlank : `Rs.${paid.toFixed(2)}`, boxX + boxW - 3, paidY, { align: "right" });
  if (deliveryCopy || balance > 0) { doc.setTextColor(211, 47, 47); doc.setFont("helvetica", "bold"); doc.text("Balance Due", boxX + 3, paidY + 5); doc.text(deliveryCopy ? deliveryBlank : `Rs.${balance.toFixed(2)}`, boxX + boxW - 3, paidY + 5, { align: "right" }); }

  cursorY = Math.max(taxTableEndY, paidY + 10) + 8;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(100, 100, 100);
  let payInfo = `Payment Mode: ${invoice.payment_mode || "-"}`;
  if (invoice.payment_terms) payInfo += `     Terms: ${invoice.payment_terms.replace("_", " ")}`;
  doc.text(payInfo, margin, cursorY); cursorY += 10;
  doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.4);
  doc.text("Customer Signature", margin, cursorY); doc.line(margin, cursorY + 12, margin + 55, cursorY + 12);
  const sigRightX = pageW - margin - 55;
  doc.text("Authorized Signature", sigRightX, cursorY); doc.line(sigRightX, cursorY + 12, pageW - margin, cursorY + 12);
  if (settings?.business_name) { doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30); doc.text(settings.business_name, pageW - margin, cursorY + 17, { align: "right" }); }

  if (shouldPrint) { const blob = doc.output("blob"); const url = URL.createObjectURL(blob); const win = window.open(url); win.onload = () => win.print(); }
  else { doc.save(`Invoice_${invoice.id}.pdf`); }
}

export function ModernA4Preview({ data, deliveryCopy }) {
  const { invoice, items, settings, taxSummary, isSameState } = data;
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const statusColor = invoice.payment_status === "paid" ? "#2e7d32" : invoice.payment_status === "partial" ? "#f57c00" : "#d32f2f";
  const deliveryBlank = "____________________";
  const hasParty = !!invoice.party_name;

  return (
    <div className="invoice-preview" style={{ width: "210mm", minHeight: "297mm", margin: "24px auto", background: "#fff", padding: "30px 40px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: "13px", color: "#111", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", borderBottom: "2px solid #1976d2", paddingBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#1976d2" }}>{settings?.business_name}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>{[settings?.address, settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", ")}</div>
          {settings?.phone && <div style={{ fontSize: "11px" }}>📞 {settings.phone}</div>}
          {settings?.gstin && <div style={{ fontSize: "11px", fontWeight: "600" }}>GSTIN: {settings.gstin}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: "700", fontSize: "16px" }}>{deliveryCopy ? "DELIVERY COPY" : "TAX INVOICE"}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>Invoice #: {invoice.id}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>Date: {new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN")}</div>
          <span style={{ background: deliveryCopy ? "#f57c00" : statusColor, color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", textTransform: "uppercase" }}>
            {deliveryCopy ? "DELIVERY COPY" : invoice.payment_status}
          </span>
        </div>
      </div>

      {hasParty && (
  <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "12px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", minWidth: "200px" }}>
    <div>
      <div style={{ fontWeight: "600", color: "#1976d2", fontSize: "11px" }}>Bill To:</div>
      <div style={{ fontWeight: "700" }}>{invoice.party_name}</div>
      {invoice.party_phone && <div style={{ fontSize: "12px" }}>📞 {invoice.party_phone}</div>}
      {invoice.party_address && <div style={{ fontSize: "12px", color: "#555" }}>{invoice.party_address}</div>}
      {(invoice.party_city || invoice.party_state) && <div style={{ fontSize: "12px", color: "#555" }}>{[invoice.party_city, invoice.party_state, invoice.party_pincode].filter(Boolean).join(", ")}</div>}
      {invoice.party_gstin && <div style={{ fontSize: "12px", fontWeight: "600" }}>GSTIN: {invoice.party_gstin}</div>}
    </div>
    {invoice.party_gstin && invoice.party_logo && (
      <img src={invoice.party_logo} alt="Customer Logo" style={{
        maxHeight: "70px", maxWidth: "140px", objectFit: "contain",
        border: "1px solid #e0e0e0", borderRadius: "4px",
        padding: "4px", background: "#fff", marginLeft: "12px",
        alignSelf: "center"
      }} />
    )}
  </div>
)}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
        <thead>
          <tr style={{ background: "#1976d2", color: "#fff" }}>
            {["#", "Item", "HSN", "Qty", "Price", "Taxable", isSameState ? "CGST" : "IGST", ...(isSameState ? ["SGST"] : []), "Total"].map((h, i) => (
              <th key={i} style={{ padding: "8px", textAlign: i === 1 ? "left" : "center" }}>{h}</th>
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
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                <td style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #eee" }}>{i + 1}</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{item.name}</td>
                <td style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #eee" }}>{item.hsn_code || "-"}</td>
                <td style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #eee" }}>{item.quantity}</td>
                <td style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #eee" }}>₹{Number(item.price).toFixed(2)}</td>
                <td style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #eee" }}>₹{base.toFixed(2)}</td>
                {isSameState ? (<><td style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #eee" }}>{rate / 2}%<br />₹{(taxAmt / 2).toFixed(2)}</td><td style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #eee" }}>{rate / 2}%<br />₹{(taxAmt / 2).toFixed(2)}</td></>) : (<td style={{ padding: "8px", textAlign: "center", borderBottom: "1px solid #eee" }}>{rate}%<br />₹{taxAmt.toFixed(2)}</td>)}
                <td style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #eee", fontWeight: "600" }}>₹{itemTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
        <div style={{ width: "240px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          {isSameState ? (<><div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>CGST</span><span>₹{(totalTax / 2).toFixed(2)}</span></div><div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>SGST</span><span>₹{(totalTax / 2).toFixed(2)}</span></div></>) : (<div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>IGST</span><span>₹{totalTax.toFixed(2)}</span></div>)}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px", fontWeight: "700", fontSize: "15px", color: "#fff", background: "#2e7d32", borderRadius: "4px", marginTop: "8px" }}><span>Grand Total</span><span>₹{total.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#2e7d32", fontWeight: "600" }}><span>Paid</span><span>{deliveryCopy ? deliveryBlank : `₹${paid.toFixed(2)}`}</span></div>
          {(deliveryCopy || balance > 0) && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#d32f2f", fontWeight: "700" }}><span>Balance Due</span><span>{deliveryCopy ? deliveryBlank : `₹${balance.toFixed(2)}`}</span></div>}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "36px", paddingTop: "8px" }}>
        <div><div style={{ fontSize: "12px", color: "#888", marginBottom: "28px" }}>Customer Signature</div><div style={{ width: "160px", borderTop: "1px solid #aaa" }} /></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: "12px", color: "#888", marginBottom: "28px" }}>Authorized Signature</div><div style={{ width: "160px", borderTop: "1px solid #aaa", paddingTop: "6px" }}>{settings?.business_name && <div style={{ fontSize: "11px", fontWeight: "600", color: "#111", textAlign: "right" }}>{settings.business_name}</div>}</div></div>
      </div>
      <div style={{ textAlign: "center", color: "#999", fontSize: "12px", borderTop: "1px solid #eee", paddingTop: "12px", marginTop: "28px" }}>Thank you for your business!</div>
    </div>
  );
}