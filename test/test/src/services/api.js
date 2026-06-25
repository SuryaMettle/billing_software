// src/services/api.js
import { getToken, clearSession } from "./auth.js";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  // Server PC is unlicensed / trial expired → block app-wide, on every
  // machine (server's own Electron window AND every counter PC), since
  // they all route through this same server. This check runs before the
  // 401 check: an expired license blocks even unauthenticated requests
  // (e.g. the login screen itself), so nobody can log in to a locked shop.
  if (response.status === 402) {
    window.dispatchEvent(new CustomEvent("license:locked", { detail: data }));
    throw new Error(data?.error || "License required.");
  }

  // Token expired or invalid → force logout
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error(data?.error || "Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data;
}

function queryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function downloadFile({ buffer, defaultName }) {
  const bytes = buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer;
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = defaultName || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { success: true };
}

const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (credentials) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) }),

  getMe: () => request("/api/auth/me"),

  changePassword: (data) =>
    request("/api/auth/change-password", { method: "POST", body: JSON.stringify(data) }),

  // ── User Management (admin only) ──────────────────────────────────────────
  getUsers: () => request("/api/users"),

  createUser: (data) =>
    request("/api/users", { method: "POST", body: JSON.stringify(data) }),

  updateUser: (id, data) =>
    request(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteUser: (id) =>
    request(`/api/users/${id}`, { method: "DELETE" }),

  // ── Products ──────────────────────────────────────────────────────────────
  addProduct: (data) =>
    request("/api/products", { method: "POST", body: JSON.stringify(data) }),
  getProducts: () => request("/api/products"),
  getCategories: () => request("/api/categories"),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  updateProduct: (product) =>
    request(`/api/products/${product.id}`, {
      method: "PUT",
      body: JSON.stringify(product)
    }),

  // ── Invoices ──────────────────────────────────────────────────────────────
  createInvoice: (data) =>
    request("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
  getInvoices: () => request("/api/invoices"),
  getInvoiceDetails: (id) => request(`/api/invoices/${id}`),
  getInvoicesWithProfit: () => request("/api/invoices/profit"),
  addInvoicePayment: (data) =>
    request(`/api/invoices/${data.invoice_id}/payments`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // ── Parties ───────────────────────────────────────────────────────────────
  getParties: () => request("/api/parties"),
  createParty: (data) =>
    request("/api/parties", { method: "POST", body: JSON.stringify(data) }),
  deleteParty: (id) => request(`/api/parties/${id}`, { method: "DELETE" }),
  updateParty: (data) =>
    request(`/api/parties/${data.id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),

  getPartyStats: () => request("/api/parties/stats/summary"),
  getSalesStats: () => request("/api/stats/sales"),
  getPartyDetails: (partyId) => request(`/api/parties/${partyId}/details`),

  // ── Purchases ─────────────────────────────────────────────────────────────
  createPurchaseInvoice: (data) =>
    request("/api/purchase-invoices", {
      method: "POST",
      body: JSON.stringify(data)
    }),
  getPurchaseInvoices: () => request("/api/purchase-invoices"),
  getPurchaseInvoiceDetails: (id) => request(`/api/purchase-invoices/${id}`),
  addPurchasePayment: (data) =>
    request(`/api/purchase-invoices/${data.invoice_id}/payments`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings: () => request("/api/settings"),
  saveSettings: (data) =>
    request("/api/settings", { method: "PUT", body: JSON.stringify(data) }),

  // ── Stock ─────────────────────────────────────────────────────────────────
  convertStock: (data) =>
    request("/api/stock/convert", { method: "POST", body: JSON.stringify(data) }),

  // ── Returns ───────────────────────────────────────────────────────────────
  processSalesReturn: (data) =>
    request("/api/sales-returns", { method: "POST", body: JSON.stringify(data) }),
  processPurchaseReturn: (data) =>
    request("/api/purchase-returns", { method: "POST", body: JSON.stringify(data) }),

  // ── Loyalty ───────────────────────────────────────────────────────────────
  getLoyaltyLedger: (partyId) => request(`/api/parties/${partyId}/loyalty-ledger`),
  getLoyaltySettings: () => request("/api/loyalty/settings"),
  getPartyLoyaltyPoints: (partyId) =>
    request(`/api/parties/${partyId}/loyalty-points`),

  // ── Offers ────────────────────────────────────────────────────────────────
  getOffers: () => request("/api/offers"),
  getAllOffers: () => request("/api/offers/all"),
  createOffer: (data) =>
    request("/api/offers", { method: "POST", body: JSON.stringify(data) }),
  deleteOffer: (id) => request(`/api/offers/${id}`, { method: "DELETE" }),
  toggleOffer: ({ id, active }) =>
    request(`/api/offers/${id}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({ active })
    }),

  // ── Refunds / Credit Notes ────────────────────────────────────────────────
  getReturnRefundInfo: (invoiceId) =>
    request(`/api/invoices/${invoiceId}/return-refund-info`),
  processReturnRefund: (data) =>
    request("/api/return-refunds", { method: "POST", body: JSON.stringify(data) }),
  createCreditNote: (data) =>
    request("/api/credit-notes", { method: "POST", body: JSON.stringify(data) }),
  getPartyCreditNotes: (partyId) => request(`/api/parties/${partyId}/credit-notes`),
  redeemCreditNote: (data) =>
    request(`/api/credit-notes/${data.credit_note_id}/redeem`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // ── Barcode ───────────────────────────────────────────────────────────────
  getProductByBarcode: (barcode) =>
    request(`/api/products/barcode/${encodeURIComponent(barcode)}`),
  saveProductBarcode: ({ id, barcode }) =>
    request(`/api/products/${id}/barcode`, {
      method: "PATCH",
      body: JSON.stringify({ barcode })
    }),

  // ── Reports ───────────────────────────────────────────────────────────────
  getGSTR1Data: (data) => request(`/api/reports/gstr1${queryString(data)}`),

  // ── Licensing ─────────────────────────────────────────────────────────────
  getLicenseStatus: () => request("/api/license/status"),

  // ── File ──────────────────────────────────────────────────────────────────
  saveFile: (data) => Promise.resolve(downloadFile(data)),

  // Add to api object:
logout: (data) =>
  request("/api/auth/logout", { method: "POST", body: JSON.stringify(data) }),
getLastSession: () =>
  request("/api/auth/last-session"),

backupDatabase: () => request("/api/backup", { method: "POST" }),

exportExcel: async () => {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/export-excel`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `export_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
},

resetData: (data) =>
  request("/api/admin/reset-data", { method: "POST", body: JSON.stringify(data) }),

// ── Google Drive ──
getDriveStatus: () => request("/api/drive/status"),
driveBackup: () => request("/api/drive/backup", { method: "POST" }),
getDriveBackups: () => request("/api/drive/backups"),
downloadDriveBackup: (fileId) => request(`/api/drive/download/${fileId}`),
saveDriveToken: (data) => request("/api/drive/save-token", { method: "POST", body: JSON.stringify(data) }),
disconnectDrive: () => request("/api/drive/disconnect", { method: "POST" }),

selectiveRestore: (data) =>
  request("/api/admin/selective-restore", { method: "POST", body: JSON.stringify(data) }),

getSalesSummary: (params) => request(`/api/reports/sales-summary${queryString(params)}`),
getTopProducts: (params) => request(`/api/reports/top-products${queryString(params)}`),
getSlowMoving: (params) => request(`/api/reports/slow-moving${queryString(params)}`),
getLowStock: () => request("/api/reports/low-stock"),

// ── Inventory & Product Trend ──
getInventoryReport: () => request("/api/reports/inventory"),
getProductTrend: (id, params) => request(`/api/reports/product-trend/${id}${queryString(params)}`),

};

export default api;