import { useState } from "react";
import * as XLSX from "xlsx";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const STATE_CODES = {
  "Andaman and Nicobar Islands": "35", "Andhra Pradesh": "37",
  "Arunachal Pradesh": "12", "Assam": "18", "Bihar": "10",
  "Chandigarh": "04", "Chhattisgarh": "22",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  "Delhi": "07", "Goa": "30", "Gujarat": "24", "Haryana": "06",
  "Himachal Pradesh": "02", "Jammu and Kashmir": "01",
  "Jharkhand": "20", "Karnataka": "29", "Kerala": "32",
  "Ladakh": "38", "Lakshadweep": "31", "Madhya Pradesh": "23",
  "Maharashtra": "27", "Manipur": "14", "Meghalaya": "17",
  "Mizoram": "15", "Nagaland": "13", "Odisha": "21",
  "Puducherry": "34", "Punjab": "03", "Rajasthan": "08",
  "Sikkim": "11", "Tamil Nadu": "33", "Telangana": "36",
  "Tripura": "16", "Uttar Pradesh": "09", "Uttarakhand": "05",
  "West Bengal": "19"
};

function getPOS(state) {
  const code = STATE_CODES[state] || "33";
  return `${code}-${state || "Tamil Nadu"}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + (dateStr.includes("UTC") ? "" : " UTC"));
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export default function GSTReports() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const [month, setMonth] = useState(currentMonth);
const [year, setYear] = useState(currentYear);
const [loading, setLoading] = useState(false);
const [toast, setToast] = useState(null);
const [filterType, setFilterType] = useState("month");
const [selectedDate, setSelectedDate] = useState("");  

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) years.push(y);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch data from backend
      const data = await window.api.getGSTR1Data({ filterType, month: month + 1, year, date: selectedDate });

      if (!data || (!data.b2b?.length && !data.b2cs?.length)) {
        showToast("No invoices found for the selected period", "error");
        setLoading(false);
        return;
      }

      // Helper to style a range of cells
const styleHeader = (sheet, row, numCols, startCol = 0) => {
  for (let c = startCol; c < startCol + numCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: row, c });
    if (!sheet[cellRef]) continue;
    sheet[cellRef].s = {
      font: { bold: true },
      alignment: { wrapText: true, vertical: "center", horizontal: "center" },
      fill: { fgColor: { rgb: "D9E1F2" } }
    };
  }
};

      const wb = XLSX.utils.book_new();

      // ── B2B SHEET ──
      const b2bHeaders = [
        "GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number",
        "Invoice date", "Invoice Value", "Place Of Supply",
        "Reverse Charge", "Applicable % of Tax Rate", "Invoice Type",
        "E-Commerce GSTIN", "Rate", "Taxable Value", "Cess Amount"
      ];

      const b2bRows = [];
      for (const inv of data.b2b) {
        for (const rateGroup of inv.rateGroups) {
          b2bRows.push([
            inv.party_gstin,
            inv.party_name,
            String(inv.id),
            formatDate(inv.created_at),
            Number(inv.total).toFixed(2),
            getPOS(inv.party_state),
            "N",
            "",
            "Regular",
            "",
            rateGroup.rate,
            Number(rateGroup.taxableValue).toFixed(2),
            "0"
          ]);
        }
      }

      const b2bSummaryRows = [
        [`Summary For B2B, SEZ, DE (4A, 4B, 6B, 6C)`, "", "", "", "", "", "", "", "", "", "", "", "HELP"],
        [`No. of Recipients`, "", `No. of Invoices`, "", `Total Invoice Value`, "", "", "", "", "", "", `Total Taxable Value`, `Total Cess`],
        [data.b2b.length, "", data.b2b.length, "", data.b2b.reduce((s, i) => s + Number(i.total), 0).toFixed(2), "", "", "", "", "", "", data.b2b.reduce((s, i) => s + i.rateGroups.reduce((rs, r) => rs + r.taxableValue, 0), 0).toFixed(2), "0"],
        [],
        b2bHeaders,
        ...b2bRows
      ];

      const b2bSheet = XLSX.utils.aoa_to_sheet(b2bSummaryRows);
b2bSheet["!cols"] = [
  { wch: 22 }, // GSTIN
  { wch: 20 }, // Receiver Name
  { wch: 16 }, // Invoice Number
  { wch: 14 }, // Invoice Date
  { wch: 14 }, // Invoice Value
  { wch: 20 }, // Place of Supply
  { wch: 14 }, // Reverse Charge
  { wch: 22 }, // Applicable %
  { wch: 14 }, // Invoice Type
  { wch: 18 }, // E-Commerce GSTIN
  { wch: 8 },  // Rate
  { wch: 14 }, // Taxable Value
  { wch: 12 }, // Cess Amount
];
XLSX.utils.book_append_sheet(wb, b2bSheet, "b2b,sez,de");

      // ── B2CS SHEET ──
      const b2csHeaders = [
        "Type", "Place Of Supply", "Applicable % of Tax Rate",
        "Rate", "Taxable Value", "Cess Amount", "E-Commerce GSTIN"
      ];

      // Group b2cs by rate
      const b2csGroups = {};
      for (const inv of data.b2cs) {
        for (const rateGroup of inv.rateGroups) {
          const key = `${rateGroup.rate}`;
          if (!b2csGroups[key]) b2csGroups[key] = { rate: rateGroup.rate, taxableValue: 0 };
          b2csGroups[key].taxableValue += rateGroup.taxableValue;
        }
      }

      const b2csRows = Object.values(b2csGroups).map(g => [
        "OE",
        getPOS(data.settings?.state || "Tamil Nadu"),
        "",
        g.rate,
        Number(g.taxableValue).toFixed(2),
        "0",
        ""
      ]);

      const totalB2CSTaxable = Object.values(b2csGroups).reduce((s, g) => s + g.taxableValue, 0);

      const b2csSummaryRows = [
        [`Summary For B2CS(7)`, "", "", "", "", "", "", "HELP"],
        ["", "", "", "", `Total Taxable  Value`, `Total Cess`],
        ["", "", "", "", totalB2CSTaxable.toFixed(2), "0"],
        b2csHeaders,
        ...b2csRows
      ];

      const b2csSheet = XLSX.utils.aoa_to_sheet(b2csSummaryRows);
b2csSheet["!cols"] = [
  { wch: 6 },  // Type
  { wch: 20 }, // Place of Supply
  { wch: 22 }, // Applicable %
  { wch: 8 },  // Rate
  { wch: 15 }, // Taxable Value
  { wch: 12 }, // Cess Amount
  { wch: 18 }, // E-Commerce GSTIN
];
XLSX.utils.book_append_sheet(wb, b2csSheet, "b2cs");

      // ── HSN SHEET ──
      const hsnHeaders = [
        "HSN", "Description", "UQC", "Total Quantity",
        "Total Value", "Taxable Value", "Integrated Tax Amount",
        "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"
      ];

      const hsnRows = Object.entries(data.hsn).map(([hsn, val]) => [
        hsn || "N/A",
        "",
        "NOS",
        Number(val.quantity).toFixed(2),
        Number(val.total).toFixed(2),
        Number(val.taxableValue).toFixed(2),
        data.isSameState ? "0" : Number(val.taxAmount).toFixed(2),
        data.isSameState ? Number(val.taxAmount / 2).toFixed(2) : "0",
        data.isSameState ? Number(val.taxAmount / 2).toFixed(2) : "0",
        "0"
      ]);

      const hsnSummaryRows = [
        ["HSN-wise summary of outward supplies"],
        [],
        hsnHeaders,
        ...hsnRows
      ];

      const hsnSheet = XLSX.utils.aoa_to_sheet(hsnSummaryRows);
hsnSheet["!cols"] = [
  { wch: 12 }, // HSN
  { wch: 20 }, // Description
  { wch: 8 },  // UQC
  { wch: 14 }, // Total Quantity
  { wch: 14 }, // Total Value
  { wch: 14 }, // Taxable Value
  { wch: 20 }, // Integrated Tax
  { wch: 18 }, // Central Tax
  { wch: 20 }, // State Tax
  { wch: 12 }, // Cess
];
XLSX.utils.book_append_sheet(wb, hsnSheet, "hsn");

      // ── WRITE TO BUFFER ──
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      // ── SAVE VIA ELECTRON DIALOG ──
      const fileName = filterType === "date" ? `GSTR1_${selectedDate}.xlsx`
  : filterType === "month" ? `GSTR1_${MONTHS[month]}_${year}.xlsx`
  : `GSTR1_${year}.xlsx`;
      const result = await window.api.saveFile({
        buffer: Array.from(buffer),
        defaultName: fileName,
        filters: [{ name: "Excel Files", extensions: ["xlsx"] }]
      });

      if (result.success) {
        showToast(`✅ GSTR-1 exported successfully!`);
      } else if (!result.cancelled) {
        showToast("Failed to save file", "error");
      }

    } catch (err) {
      console.error("GSTR1 Export error:", err);
      showToast("Something went wrong: " + err.message, "error");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>

      {toast && (
        <div style={{
          position: "fixed", top: "24px", left: "50%",
          transform: "translateX(-50%)",
          background: toast.type === "error" ? "#d32f2f" : "#2e7d32",
          color: "#fff", padding: "12px 28px", borderRadius: "8px",
          fontSize: "15px", fontWeight: "500", zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)", pointerEvents: "none"
        }}>
          {toast.message}
        </div>
      )}

      <h2 style={{ marginBottom: "6px", fontWeight: "700" }}>GST Reports</h2>
      <p style={{ color: "#666", marginBottom: "30px", fontSize: "14px" }}>
        Export GSTR-1 in the official government Excel format
      </p>

      {/* PERIOD SELECTOR */}
<div style={{
  background: "#fff", borderRadius: "12px", padding: "24px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: "20px"
}}>
  <h3 style={{ marginBottom: "16px", fontSize: "16px" }}>Select Period</h3>

  {/* Filter Type Tabs */}
  <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
    {[
      { value: "date", label: "By Date" },
      { value: "month", label: "By Month" },
      { value: "year", label: "By Year" },
    ].map(opt => (
      <button
        key={opt.value}
        onClick={() => setFilterType(opt.value)}
        style={{
          padding: "8px 20px", borderRadius: "20px", border: "none",
          cursor: "pointer", fontWeight: "600", fontSize: "13px",
          background: filterType === opt.value ? "#1976d2" : "#f0f0f0",
          color: filterType === opt.value ? "#fff" : "#555",
          transition: "all 0.15s"
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>

  <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>

    {filterType === "date" && (
      <div>
        <label style={{ fontSize: "13px", fontWeight: "600", color: "#555", display: "block", marginBottom: "6px" }}>
          Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: "10px 14px", borderRadius: "8px",
            border: "1px solid #ddd", fontSize: "14px"
          }}
        />
      </div>
    )}

    {filterType === "month" && (
      <>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#555", display: "block", marginBottom: "6px" }}>
            Month
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{
              padding: "10px 14px", borderRadius: "8px",
              border: "1px solid #ddd", fontSize: "14px",
              minWidth: "160px", background: "#fff"
            }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#555", display: "block", marginBottom: "6px" }}>
            Year
          </label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              padding: "10px 14px", borderRadius: "8px",
              border: "1px solid #ddd", fontSize: "14px",
              minWidth: "120px", background: "#fff"
            }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </>
    )}

    {filterType === "year" && (
      <div>
        <label style={{ fontSize: "13px", fontWeight: "600", color: "#555", display: "block", marginBottom: "6px" }}>
          Year
        </label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{
            padding: "10px 14px", borderRadius: "8px",
            border: "1px solid #ddd", fontSize: "14px",
            minWidth: "120px", background: "#fff"
          }}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    )}

    {/* Selected period display */}
    <div style={{ marginBottom: "2px" }}>
      <div style={{
        background: "#f0f7ff", border: "1px solid #90caf9",
        borderRadius: "8px", padding: "10px 16px",
        fontSize: "14px", color: "#1565c0", fontWeight: "600"
      }}>
        📅 {filterType === "date" && selectedDate ? selectedDate :
            filterType === "month" ? `${MONTHS[month]} ${year}` :
            `Year ${year}`}
      </div>
    </div>
  </div>
</div>

      {/* WHAT'S INCLUDED */}
      <div style={{
        background: "#fff", borderRadius: "12px", padding: "24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: "20px"
      }}>
        <h3 style={{ marginBottom: "16px", fontSize: "16px" }}>What's Included</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { sheet: "b2b", label: "B2B Invoices", desc: "Sales to parties with GSTIN (registered businesses)", color: "#e3f2fd", text: "#1565c0" },
            { sheet: "b2cs", label: "B2CS Invoices", desc: "Sales to parties without GSTIN (retail customers)", color: "#e8f5e9", text: "#2e7d32" },
            { sheet: "hsn", label: "HSN Summary", desc: "Product-wise tax summary grouped by HSN code", color: "#fff3e0", text: "#e65100" },
          ].map(item => (
            <div key={item.sheet} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px", borderRadius: "8px",
              background: item.color, border: `1px solid ${item.color}`
            }}>
              <span style={{
                background: item.text, color: "#fff",
                padding: "2px 8px", borderRadius: "4px",
                fontSize: "11px", fontWeight: "700", minWidth: "40px",
                textAlign: "center"
              }}>
                {item.sheet}
              </span>
              <div>
                <div style={{ fontWeight: "600", fontSize: "13px", color: item.text }}>{item.label}</div>
                <div style={{ fontSize: "12px", color: "#666" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EXPORT BUTTON */}
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          width: "100%", padding: "14px",
          background: loading ? "#ccc" : "#1976d2",
          color: "#fff", border: "none", borderRadius: "10px",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: "700", fontSize: "16px",
          boxShadow: loading ? "none" : "0 4px 12px rgba(25,118,210,0.3)"
        }}
      >
        {loading ? "⏳ Generating..." : 
  `⬇ Export GSTR-1 — ${
    filterType === "date" ? selectedDate || "Select a date" :
    filterType === "month" ? `${MONTHS[month]} ${year}` :
    `Year ${year}`
  }`
}
      </button>

      <p style={{ textAlign: "center", color: "#999", fontSize: "12px", marginTop: "12px" }}>
        File will be saved in the official GSTR-1 Excel format accepted by the GST portal
      </p>
    </div>
  );
}