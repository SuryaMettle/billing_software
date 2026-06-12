import { useEffect, useState, useRef } from "react";
import { TEMPLATES, DEFAULT_TEMPLATE } from "./templates/index.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReactDOMServer from 'react-dom/server';

import api from "../services/api.js";

// Injected once into the page head for physical printing
const PRINT_STYLE = `
  @media print {
    @page { margin: 8mm !important; }
    .invoice-preview { 
      width: 190mm !important; 
      height: auto !important;
      margin: 0 !important; padding: 0 !important;
    }
  }
`;

function InvoicePrint({ invoiceId, onBack, deliveryCopy = false }) {
  const [data, setData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    api.getInvoiceDetails(invoiceId).then(setData);
  }, [invoiceId]);

  if (!data) return <p>Loading...</p>;

  const { invoice, items, settings } = data;

  const templateId = settings?.invoice_template || DEFAULT_TEMPLATE;
  const template = TEMPLATES[templateId] || TEMPLATES[DEFAULT_TEMPLATE];
  const Preview = template.Preview;

  const businessState = settings?.state || "";
  const partyState = invoice.party_state || "";
  const isSameState = !partyState || partyState === businessState;

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

  const templateData = { invoice, items, settings, taxSummary, isSameState, deliveryCopy };

  const handlePrint = () => {
  // For thermal template, use PDF-based printing
  if (templateId === "thermal-80mm") {
    template.generatePDF(templateData, { shouldPrint: true });
    return;
  }

  // For A4 templates use HTML print
  const printContent = previewRef.current?.innerHTML;
  if (!printContent) return;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${invoice.id}</title>
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, sans-serif;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-preview {
            margin: 0 !important;
            box-shadow: none !important;
          }
          @media print {
            @page { margin: 0; size: A4; }
            html, body { margin: 0 !important; padding: 0 !important; }
            .invoice-preview { margin: 0 !important; box-shadow: none !important; }
          }
        </style>
      </head>
      <body>${printContent}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};

  const handleDownload = async () => {
    if (!previewRef.current) return;

    setIsGenerating(true);
    try {
      const element = previewRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, pageHeight));

      const filename = `Invoice_${invoice?.invoiceNumber || invoice?.id || "download"}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

      pdf.save(filename);
    } finally {
      setIsGenerating(false);
    }
  };

  const isSameState2 = isSameState;

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Inject print styles into the page */}
      <style>{PRINT_STYLE}</style>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", gap: "10px", padding: "14px 24px",
        background: "#f5f5f5", borderBottom: "1px solid #ddd",
        alignItems: "center", flexWrap: "wrap",
      }}>
        {deliveryCopy && (
          <span style={{ background: "#fff3e0", color: "#e65100", padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", border: "1px solid #ffcc80" }}>
            📋 Delivery Copy — Payment fields hidden
          </span>
        )}

        <button onClick={onBack} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc", background: "#38b7c0", cursor: "pointer", fontWeight: "600" }}>
          ← Back
        </button>

        <button onClick={handleDownload} style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "#1976d2", color: "#fff", cursor: "pointer", fontWeight: "600" }}>
          ⬇ Download PDF
        </button>

        <button onClick={handlePrint} style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "#2e7d32", color: "#fff", cursor: "pointer", fontWeight: "600" }}>
          🖨️ Print
        </button>

        <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600", background: "#ede7f6", color: "#4527a0" }}>
          {template.icon} {template.name} · {template.paperSize}
        </span>

        <span style={{ padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", background: isSameState2 ? "#e3f2fd" : "#fff3e0", color: isSameState2 ? "#1565c0" : "#e65100" }}>
          {isSameState2 ? "CGST + SGST" : "IGST"}
        </span>
      </div>

      

      {/* ── Preview ── */}
      <div ref={previewRef}>
        <Preview data={templateData} deliveryCopy={deliveryCopy} />
      </div>
    </div>
  );
}

export default InvoicePrint;