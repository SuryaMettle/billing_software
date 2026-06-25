import jsPDF from "jspdf";

const W = 76;
const M = 4;
const M_RIGHT = 6; // extra right-side safety margin — thermal printers commonly clip 1-3mm off the physical edge
const CW = W - M * 2;
// Many thermal printer drivers enforce their own minimum feed length and will pad
// out anything shorter themselves (often at the top, which is the gap you saw).
// Setting our own sane floor means OUR layout controls that padding, not the driver.
const MIN_PAGE_HEIGHT = 80;
const BODY_SIZE = 8;
const TITLE_SIZE = 14;
const SUBTITLE_SIZE = 7.5;
const SECTION_TITLE_SIZE = 7;
const TOTAL_SIZE = 10;
const FOOTER_SIZE = 8;

// Page height is now computed via a two-pass measure-then-draw render (see renderReceipt
// and generateThermal80 below) instead of a fixed estimate — this guarantees zero blank
// space at the top/bottom regardless of invoice length.

// Renders the entire receipt onto the given jsPDF doc, starting at y=4.
// Returns the final y position reached — used both to measure exact content
// height (pass 1, scratch doc) and to do the real draw (pass 2, exact-sized doc).
function renderReceipt(doc, data, deliveryCopy) {
  const { invoice, items, settings, taxSummary, isSameState } = data;
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;
  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;
  const deliveryBlank = "______";
  const hasParty = !!invoice.party_name;

  let y = 4;

  const centerText = (text, yPos, size = BODY_SIZE, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size); doc.setTextColor(0, 0, 0);
    doc.text(String(text), W / 2, yPos, { align: "center" });
  };
  const R = W - M_RIGHT;
  const leftRight = (left, right, yPos, size = BODY_SIZE) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(0, 0, 0);
    doc.text(String(left), M, yPos); doc.text(String(right), R, yPos, { align: "right" });
  };
  const divider = (yPos, dashed = false) => {
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    if (dashed) { let x = M; while (x < R) { doc.line(x, yPos, Math.min(x + 2, R), yPos); x += 4; } }
    else { doc.line(M, yPos, R, yPos); }
  };

  // ── Business Name — large, bold, double-underlined ──
  const bizName = (settings?.business_name || "Business Name").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_SIZE);
  doc.setTextColor(0, 0, 0);
  doc.text(bizName, W / 2, y + 6, { align: "center" });
  doc.setLineWidth(0.6);
  doc.line(M, y + 8.5, R, y + 8.5);
  doc.setLineWidth(0.2);
  doc.line(M, y + 10, R, y + 10);
  y += 13;

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
    const itemTotal = Number(item.price) * Number(item.quantity);
    doc.setFont("helvetica", "normal"); doc.setFontSize(BODY_SIZE);
    const nameLines = doc.splitTextToSize(item.name, 22);
    doc.text(nameLines, M, y);
    doc.text(String(item.quantity), COL_QTY, y, { align: "center" });
    doc.text(Number(item.price).toFixed(0), COL_RATE, y, { align: "center" });
    doc.text(itemTotal.toFixed(2), COL_AMT, y, { align: "right" });
    y += nameLines.length * 3.5;
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

  return y; // final content height reached
}

export async function generateThermal80(data, options = {}) {
  const { invoice, items, settings } = data;
  const { shouldPrint = false } = options;
  const deliveryCopy = data.deliveryCopy || false;

  // Pass 1 — measure: render onto an oversized scratch doc just to find the real final y.
  const scratch = new jsPDF({ unit: "mm", format: [80, 1000], orientation: "portrait", compress: true });
  const measuredY = renderReceipt(scratch, data, deliveryCopy);
  const exactHeight = Math.max(measuredY + 6, MIN_PAGE_HEIGHT);

  // Pass 2 — draw: create the doc at the exact height and render for real.
  const doc = new jsPDF({ unit: "mm", format: [80, exactHeight], orientation: "portrait", compress: true, margins: { top: 5, bottom: 5, left: 0, right: 0 } });
  renderReceipt(doc, data, deliveryCopy);

  if (shouldPrint) {
    // Preferred path: silent native print through Electron's main process,
    // with an explicit pageSize matching exactHeight. This is the only path
    // that actually controls what the printer driver does — it bypasses the
    // OS print dialog and any fixed paper-length preset the driver defaults to.
    if (typeof window !== "undefined" && window.api?.printThermal) {
      const pdfDataUrl = doc.output("datauristring");
      const result = await window.api.printThermal({
        pdfDataUrl,
        widthMm: 80,
        heightMm: exactHeight,
        deviceName: settings?.thermal_printer_name || "RP 3220 star",
      });
      if (!result?.success) {
        throw new Error(result?.error || "Native print failed");
      }
      return;
    }

    // Fallback for non-Electron contexts only (e.g. testing in a plain
    // browser tab). Page size here is NOT guaranteed — it's whatever the
    // OS print dialog / driver default happens to be.
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    if (!win) {
      throw new Error("Popup blocked — please allow popups for this site to print.");
    }
    win.onload = () => win.print();
  }
  else { doc.save(`Receipt_${invoice.id}.pdf`); }
}

// Native print entry point — used by index.js as `printNative` for direct printing without saving a file
// Must return { success, error } since InvoicePrint.jsx checks result.success before showing an error.
export async function printThermal80(data) {
  try {
    await generateThermal80(data, { shouldPrint: true });
    return { success: true };
  } catch (err) {
    console.error("printThermal80 error:", err);
    return { success: false, error: err?.message || String(err) };
  }
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
  const totalSize = "11px";
  const hasParty = !!invoice.party_name;

  const row = (label, value, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontWeight: bold ? "700" : "400", fontSize: body }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <div style={{ width: "80mm", maxWidth: "80mm", height: "auto", margin: 0, padding: "4mm", background: "#fff", boxShadow: "none", fontSize: "10px", fontFamily: "Helvetica, Arial, sans-serif", color: "#000", boxSizing: "border-box" }}>

      {/* ── Company Name Header ── */}
      <div style={{ textAlign: "center", paddingBottom: "6px", marginBottom: "6px" }}>
        <div style={{
          fontSize: "18px",
          fontWeight: "900",
          letterSpacing: "2px",
          textTransform: "uppercase",
          lineHeight: 1.2,
          marginBottom: "4px",
        }}>
          {settings?.business_name}
        </div>
        {/* double underline */}
        <div style={{ borderBottom: "2.5px solid #000", marginBottom: "2px" }} />
        <div style={{ borderBottom: "1px solid #000", marginBottom: "6px" }} />

        {settings?.address && (
          <div style={{ fontSize: body }}>
            {[settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ")}
          </div>
        )}
        {settings?.phone && <div style={{ fontSize: body }}>Ph: {settings.phone}</div>}
        {settings?.gstin && <div style={{ fontSize: body, fontWeight: "700" }}>GSTIN: {settings.gstin}</div>}
      </div>

      <div style={{ textAlign: "center", fontWeight: "700", fontSize: "10px", borderBottom: "1px solid #000", paddingBottom: "4px", marginBottom: "4px", letterSpacing: "1px" }}>
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
        const itemTotal = Number(item.price) * Number(item.quantity);
        return (
          <div key={i} style={{ borderBottom: "1px solid #000", paddingBottom: "3px", marginBottom: "3px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: body }}>
              <span style={{ width: "38%", wordBreak: "break-word" }}>{item.name}</span>
              <span style={{ width: "14%", textAlign: "center" }}>{item.quantity}</span>
              <span style={{ width: "20%", textAlign: "center" }}>{Number(item.price).toFixed(0)}</span>
              <span style={{ width: "24%", textAlign: "right", fontWeight: "600" }}>{itemTotal.toFixed(2)}</span>
            </div>
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