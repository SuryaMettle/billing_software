import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────────────────────────────────
//  MINIMAL A4 — clean whitespace, premium look
// ─────────────────────────────────────────────

export function generateMinimalA4(data, options = {}) {
  const { invoice, items, settings, taxSummary, isSameState, deliveryCopy = false } = data;
  const { shouldPrint = false } = options;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const deliveryBlank = "____________________";

  const ACCENT = [80, 80, 80];
  const LIGHT = [200, 200, 200];

  const drawHeader = (pageNum) => {
    // Left: business name large
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.text(settings?.business_name || "Business", margin, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT);
    const addrParts = [settings?.address, settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", ");
    if (addrParts) doc.text(addrParts, margin, 23);
    const contact = [settings?.phone, settings?.email].filter(Boolean).join("   ");
    if (contact) doc.text(contact, margin, 27);
    if (settings?.gstin) doc.text(`GSTIN: ${settings.gstin}`, margin, 31);

    // Right: invoice label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...ACCENT);
    doc.text(deliveryCopy ? "DELIVERY COPY" : "INVOICE", pageW - margin, 14, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`#${invoice.id}`, pageW - margin, 19, { align: "right" });
    const invoiceDate = new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN");
    doc.text(invoiceDate, pageW - margin, 24, { align: "right" });
    if (invoice.due_date) {
      const due = new Date(invoice.due_date).toLocaleDateString("en-IN");
      doc.text(`Due: ${due}`, pageW - margin, 29, { align: "right" });
    }

    // thin divider
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.5);
    doc.line(margin, 36, pageW - margin, 36);

    doc.setFontSize(7.5);
    doc.setTextColor(...LIGHT);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 8, { align: "right" });
    doc.text("Thank you for your business!", pageW / 2, pageH - 8, { align: "center" });
  };

  drawHeader(1);
  let cursorY = 41;

  // Bill to
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...ACCENT);
  doc.text("BILL TO", margin, cursorY);

  cursorY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(invoice.party_name || "N/A", margin, cursorY);

  cursorY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...ACCENT);
  const details = [
  invoice.party_phone || null,
  invoice.party_address || null,
  [invoice.party_city, invoice.party_state, invoice.party_pincode].filter(Boolean).join(", ") || null,
  invoice.party_gstin ? `GSTIN: ${invoice.party_gstin}` : null,
].filter(Boolean);
  details.forEach(line => { doc.text(line, margin, cursorY); cursorY += 4; });

  cursorY += 4;
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageW - margin, cursorY);
  cursorY += 5;

  const tableColumns = isSameState
    ? ["#", "Item", "HSN", "Qty", "Price", "Taxable", "CGST", "SGST", "Total"]
    : ["#", "Item", "HSN", "Qty", "Price", "Taxable", "IGST", "Total"];

  const tableRows = items.map((item, i) => {
    const rate = Number(item.tax_rate || 0);
    const itemTotal = Number(item.price) * Number(item.quantity);
    const base = itemTotal / (1 + rate / 100);
    const taxAmt = itemTotal - base;
    const half = rate / 2;
    if (isSameState) {
      return [i + 1, item.name, item.hsn_code || "-", item.quantity,
        Number(item.price).toFixed(2), base.toFixed(2),
        `${half}%\n${(taxAmt / 2).toFixed(2)}`, `${half}%\n${(taxAmt / 2).toFixed(2)}`,
        itemTotal.toFixed(2)];
    }
    return [i + 1, item.name, item.hsn_code || "-", item.quantity,
      Number(item.price).toFixed(2), base.toFixed(2),
      `${rate}%\n${taxAmt.toFixed(2)}`, itemTotal.toFixed(2)];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [tableColumns],
    body: tableRows,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [40, 40, 40], valign: "middle" },
    headStyles: { fontStyle: "bold", textColor: [...ACCENT], fontSize: 7.5, cellPadding: { top: 2, bottom: 4 } },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 }, 1: { halign: "left", cellWidth: "auto" },
      2: { halign: "center", cellWidth: 20 }, 3: { halign: "center", cellWidth: 12 },
      4: { halign: "right", cellWidth: 20 }, 5: { halign: "right", cellWidth: 22 },
      6: { halign: "center", cellWidth: 20 },
      ...(isSameState ? { 7: { halign: "center", cellWidth: 20 }, 8: { halign: "right", cellWidth: 22 } } : { 7: { halign: "right", cellWidth: 24 } }),
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    willDrawCell: (hookData) => {
      if (hookData.row.section === "head") {
        doc.setDrawColor(...LIGHT);
        doc.setLineWidth(0.5);
      }
    },
    didDrawPage: () => { const p = doc.internal.getCurrentPageInfo().pageNumber; if (p > 1) drawHeader(p); },
    showHead: "everyPage",
  });

  cursorY = doc.lastAutoTable.finalY + 2;
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageW - margin, cursorY);
  cursorY += 6;

  if (cursorY + 80 > pageH - 20) { doc.addPage(); drawHeader(doc.internal.getCurrentPageInfo().pageNumber); cursorY = 44; }

  // Tax summary
  const taxRows = Object.entries(taxSummary).map(([rate, val]) =>
    isSameState
      ? [`${rate}%`, val.base.toFixed(2), (val.tax / 2).toFixed(2), (val.tax / 2).toFixed(2)]
      : [`${rate}%`, val.base.toFixed(2), val.tax.toFixed(2)]
  );
  const taxCols = isSameState
    ? ["GST Rate", "Taxable", "CGST", "SGST"]
    : ["GST Rate", "Taxable", "IGST"];

  autoTable(doc, {
    startY: cursorY, head: [taxCols], body: taxRows,
    margin: { left: margin, right: pageW / 2 + 4 }, tableWidth: contentW / 2 - 4,
    theme: "plain",
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [...ACCENT] },
    headStyles: { fontStyle: "bold", textColor: [...ACCENT] },
    columnStyles: { 0: { halign: "left" }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    didDrawPage: () => {},
  });

  const taxEndY = doc.lastAutoTable.finalY;
  const boxX = pageW / 2 + 4;
  const boxW = contentW / 2 - 4;

  const totalsData = [
    ["Subtotal", `Rs.${subtotal.toFixed(2)}`],
    ...(isSameState
      ? [["CGST", `Rs.${(totalTax / 2).toFixed(2)}`], ["SGST", `Rs.${(totalTax / 2).toFixed(2)}`]]
      : [["IGST", `Rs.${totalTax.toFixed(2)}`]]),
  ];

  autoTable(doc, {
    startY: cursorY, body: totalsData,
    margin: { left: boxX, right: margin }, tableWidth: boxW,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [60, 60, 60] },
    columnStyles: { 0: { halign: "left" }, 1: { halign: "right" } },
    didDrawPage: () => {},
  });

  const gtY = doc.lastAutoTable.finalY + 2;
  doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.5);
  doc.line(boxX, gtY, boxX + boxW, gtY);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(20, 20, 20);
  doc.text("Total", boxX, gtY + 6);
  doc.text(`Rs.${total.toFixed(2)}`, boxX + boxW, gtY + 6, { align: "right" });
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
  doc.line(boxX, gtY + 8, boxX + boxW, gtY + 8);

  const paidY = gtY + 13;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...ACCENT);
  doc.text("Paid", boxX, paidY);
  doc.text(deliveryCopy ? deliveryBlank : `Rs.${paid.toFixed(2)}`, boxX + boxW, paidY, { align: "right" });

  if (deliveryCopy || balance > 0) {
    doc.setFont("helvetica", "bold"); doc.setTextColor(180, 0, 0);
    doc.text("Balance Due", boxX, paidY + 5);
    doc.text(deliveryCopy ? deliveryBlank : `Rs.${balance.toFixed(2)}`, boxX + boxW, paidY + 5, { align: "right" });
  }

  cursorY = Math.max(taxEndY, paidY + 10) + 14;
  doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageW - margin, cursorY);
  cursorY += 8;

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...ACCENT);
  doc.text(`Payment: ${invoice.payment_mode || "-"}`, margin, cursorY);

  cursorY += 14;
  doc.text("Customer Signature", margin, cursorY);
  doc.setDrawColor(...LIGHT); doc.line(margin, cursorY + 12, margin + 50, cursorY + 12);
  const sigX = pageW - margin - 50;
  doc.text("Authorised by", sigX, cursorY);
  doc.line(sigX, cursorY + 12, pageW - margin, cursorY + 12);
  if (settings?.business_name) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(20, 20, 20);
    doc.text(settings.business_name, pageW - margin, cursorY + 17, { align: "right" });
  }

  if (shouldPrint) {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    win.onload = () => win.print();
  } else {
    doc.save(`Invoice_${invoice.id}.pdf`);
  }
}

export function MinimalA4Preview({ data, deliveryCopy }) {
  const { invoice, items, settings, taxSummary, isSameState } = data;
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const deliveryBlank = "____________________";
  const accent = "#666";
  const light = "#ddd";

  return (
    <div style={{ width: "210mm", minHeight: "297mm", margin: "24px auto", background: "#fff", padding: "36px 48px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: "12px", color: "#222", boxSizing: "border-box", fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", paddingBottom: "16px", borderBottom: `1px solid ${light}` }}>
        <div>
          <div style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px" }}>{settings?.business_name}</div>
          <div style={{ fontSize: "11px", color: accent, marginTop: "4px" }}>{[settings?.address, settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", ")}</div>
          {settings?.phone && <div style={{ fontSize: "11px", color: accent }}>{settings.phone}</div>}
          {settings?.gstin && <div style={{ fontSize: "11px", color: accent }}>GSTIN: {settings.gstin}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: accent, textTransform: "uppercase" }}>{deliveryCopy ? "Delivery Copy" : "Invoice"}</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#111" }}>#{invoice.id}</div>
          <div style={{ fontSize: "11px", color: accent }}>{new Date(invoice.created_at + " UTC").toLocaleDateString("en-IN")}</div>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
  <div style={{ fontSize: "10px", fontWeight: "700", color: accent, letterSpacing: "1.5px", marginBottom: "4px" }}>BILL TO</div>
  <div style={{ fontWeight: "700", fontSize: "14px" }}>{invoice.party_name}</div>
  {invoice.party_phone && <div style={{ color: accent, fontSize: "11px" }}>{invoice.party_phone}</div>}
  {invoice.party_address && <div style={{ color: accent, fontSize: "11px" }}>{invoice.party_address}</div>}
  {invoice.party_gstin && <div style={{ color: accent, fontSize: "11px", fontWeight: "600" }}>GSTIN: {invoice.party_gstin}</div>}
</div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: "16px" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${light}`, color: accent, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {["#", "Item", "HSN", "Qty", "Price", "Taxable", isSameState ? "CGST" : "IGST", ...(isSameState ? ["SGST"] : []), "Total"].map((h, i) => (
              <th key={i} style={{ padding: "6px 4px", textAlign: i === 1 ? "left" : "center", fontWeight: "600" }}>{h}</th>
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
              <tr key={i} style={{ borderBottom: `1px solid ${light}`, background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "8px 4px", textAlign: "center", color: accent }}>{i + 1}</td>
                <td style={{ padding: "8px 4px" }}>{item.name}</td>
                <td style={{ padding: "8px 4px", textAlign: "center", color: accent }}>{item.hsn_code || "-"}</td>
                <td style={{ padding: "8px 4px", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>₹{Number(item.price).toFixed(2)}</td>
                <td style={{ padding: "8px 4px", textAlign: "right" }}>₹{base.toFixed(2)}</td>
                {isSameState ? (
                  <><td style={{ padding: "8px 4px", textAlign: "center", color: accent }}>{rate / 2}%<br />₹{(taxAmt / 2).toFixed(2)}</td>
                  <td style={{ padding: "8px 4px", textAlign: "center", color: accent }}>{rate / 2}%<br />₹{(taxAmt / 2).toFixed(2)}</td></>
                ) : (
                  <td style={{ padding: "8px 4px", textAlign: "center", color: accent }}>{rate}%<br />₹{taxAmt.toFixed(2)}</td>
                )}
                <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: "600" }}>₹{itemTotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: "220px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: accent, fontSize: "11px" }}><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          {isSameState ? (<><div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: accent, fontSize: "11px" }}><span>CGST</span><span>₹{(totalTax / 2).toFixed(2)}</span></div><div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: accent, fontSize: "11px" }}><span>SGST</span><span>₹{(totalTax / 2).toFixed(2)}</span></div></>) : (<div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: accent, fontSize: "11px" }}><span>IGST</span><span>₹{totalTax.toFixed(2)}</span></div>)}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontWeight: "700", fontSize: "15px", borderTop: `2px solid #222`, marginTop: "4px" }}><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: accent, fontSize: "11px" }}><span>Paid</span><span>{deliveryCopy ? deliveryBlank : `₹${paid.toFixed(2)}`}</span></div>
          {(deliveryCopy || balance > 0) && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#c00", fontWeight: "700" }}><span>Balance Due</span><span>{deliveryCopy ? deliveryBlank : `₹${balance.toFixed(2)}`}</span></div>}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "48px", paddingTop: "12px", borderTop: `1px solid ${light}` }}>
        <div><div style={{ fontSize: "11px", color: accent, marginBottom: "28px" }}>Customer Signature</div><div style={{ width: "130px", borderTop: `1px solid ${light}` }} /></div>
        <div style={{ textAlign: "right" }}><div style={{ fontSize: "11px", color: accent, marginBottom: "28px" }}>Authorised by</div><div style={{ width: "130px", borderTop: `1px solid ${light}`, paddingTop: "4px" }}><div style={{ fontSize: "11px", fontWeight: "600" }}>{settings?.business_name}</div></div></div>
      </div>
    </div>
  );
}
