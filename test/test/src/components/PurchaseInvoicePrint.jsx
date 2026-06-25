import { useEffect, useState, useRef } from "react";
import { TEMPLATES, DEFAULT_TEMPLATE } from "./templates/index.js";

import api from "../services/api.js";

function PurchaseInvoicePrint({ invoiceId, onBack }) {
  const [data, setData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    api.getPurchaseInvoiceDetails(invoiceId).then(setData);
  }, [invoiceId]);

  if (!data) return <p>Loading...</p>;

  const { invoice, items, settings } = data;

  const templateId = settings?.invoice_template || DEFAULT_TEMPLATE;
  const template = TEMPLATES[templateId] || TEMPLATES[DEFAULT_TEMPLATE];
  const Preview = template.Preview;

  // Purchase invoices: supplier state vs business state for GST type
  const businessState = settings?.state || "";
  const partyState = invoice.party_state || "";
  const isSameState = !partyState || partyState === businessState;

  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paid_amount || 0);
  const balance = total - paid;

  // ── TAX SUMMARY ──────────────────────────────────────────
  const taxSummary = {};
  items.forEach((item) => {
    const rate = Number(item.tax_rate || 0);
    const itemTotal = Number(item.price) * Number(item.quantity);
    const base = itemTotal / (1 + rate / 100);
    const taxAmount = itemTotal - base;
    if (!taxSummary[rate]) taxSummary[rate] = { base: 0, tax: 0 };
    taxSummary[rate].base += base;
    taxSummary[rate].tax += taxAmount;
  });

  const totalTax = Object.values(taxSummary).reduce((s, t) => s + t.tax, 0);
  const subtotal = total - totalTax;

  const templateData = { invoice, items, settings, taxSummary, isSameState };

  // ── DOWNLOAD PDF — uses template's own generatePDF (no html2canvas sizing issues) ──
  const handleDownload = () => {
    if (!template.generatePDF) return;
    setIsGenerating(true);
    try {
      template.generatePDF(templateData, { shouldPrint: false });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF download failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      {/* CONTROLS */}
      <div style={{
        display: "flex", gap: "10px", padding: "14px 24px",
        background: "#f5f5f5", borderBottom: "1px solid #ddd",
        alignItems: "center", flexWrap: "wrap"
      }}>
        <button onClick={onBack} style={{
          padding: "8px 16px", borderRadius: "6px",
          border: "1px solid #ccc", background: "#7c3aed", color: "#fff",
          cursor: "pointer", fontWeight: "600"
        }}>← Back</button>

        <button onClick={handleDownload} disabled={isGenerating} style={{
          padding: "8px 20px", borderRadius: "6px", border: "none",
          background: isGenerating ? "#b39ddb" : "#7c3aed",
          color: "#fff", cursor: isGenerating ? "not-allowed" : "pointer",
          fontWeight: "600"
        }}>
          {isGenerating ? "⏳ Generating..." : "⬇ Download PDF"}
        </button>

        <span style={{
          padding: "4px 12px", borderRadius: "12px", fontSize: "12px",
          fontWeight: "600", background: "#ede7f6", color: "#4527a0"
        }}>
          {template.icon} {template.name} · {template.paperSize}
        </span>

        <span style={{
          padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "600",
          background: isSameState ? "#ede9fe" : "#fff3e0",
          color: isSameState ? "#5b21b6" : "#e65100"
        }}>
          {isSameState ? "CGST + SGST" : "IGST"}
        </span>
      </div>

      

      {/* PREVIEW */}
      <div ref={previewRef}>
        <Preview data={templateData} />
      </div>
    </div>
  );
}

export default PurchaseInvoicePrint;