const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  addProduct: (data) => ipcRenderer.invoke("add-product", data),
  getProducts: () => ipcRenderer.invoke("get-products"),
  getCategories: () => ipcRenderer.invoke("get-categories"),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
  updateProduct: (product) => ipcRenderer.invoke("update-product", product),

  createInvoice: (data) => ipcRenderer.invoke("create-invoice", data),
  getInvoices: () => ipcRenderer.invoke("get-invoices"),
  getInvoiceDetails: (id) => ipcRenderer.invoke("get-invoice-details", id),
  getInvoicesWithProfit: () => ipcRenderer.invoke("get-invoices-with-profit"),
  addInvoicePayment: (data) => ipcRenderer.invoke("add-invoice-payment", data),

  getParties: () => ipcRenderer.invoke("get-parties"),
  createParty: (data) => ipcRenderer.invoke("create-party", data),
  deleteParty: (id) => ipcRenderer.invoke("delete-party", id),
  updateParty: (data) => ipcRenderer.invoke("update-party", data),

  getPartyStats: () => ipcRenderer.invoke("get-party-stats"),
  getSalesStats: () => ipcRenderer.invoke("get-sales-stats"),

  getPartyDetails: (partyId) => ipcRenderer.invoke("get-party-details", partyId),

  createPurchaseInvoice: (data) => ipcRenderer.invoke("create-purchase-invoice", data),
  getPurchaseInvoices: () => ipcRenderer.invoke("get-purchase-invoices"),
  getPurchaseInvoiceDetails: (id) => ipcRenderer.invoke("get-purchase-invoice-details", id),
  addPurchasePayment: (data) => ipcRenderer.invoke("add-purchase-payment", data),

  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (data) => ipcRenderer.invoke("save-settings", data),

  convertStock: (data) => ipcRenderer.invoke("convert-stock", data),

  processSalesReturn: (data) => ipcRenderer.invoke("process-sales-return", data),
  processPurchaseReturn: (data) => ipcRenderer.invoke("process-purchase-return", data),

  getLoyaltyLedger: (partyId) => ipcRenderer.invoke("get-loyalty-ledger", partyId),
  getLoyaltySettings: () => ipcRenderer.invoke("get-loyalty-settings"),
  getPartyLoyaltyPoints: (partyId) => ipcRenderer.invoke("get-party-loyalty-points", partyId),

  // ── OFFERS ──
  getOffers: () => ipcRenderer.invoke("get-offers"),
  getAllOffers: () => ipcRenderer.invoke("get-all-offers"),       
  createOffer: (data) => ipcRenderer.invoke("create-offer", data),
  deleteOffer: (id) => ipcRenderer.invoke("delete-offer", id),
  toggleOffer: (data) => ipcRenderer.invoke("toggle-offer", data),

  getReturnRefundInfo: (invoiceId) => ipcRenderer.invoke("get-return-refund-info", invoiceId),
  processReturnRefund: (data) => ipcRenderer.invoke("process-return-refund", data),
  createCreditNote: (data) => ipcRenderer.invoke("create-credit-note", data),
  getPartyCreditNotes: (partyId) => ipcRenderer.invoke("get-party-credit-notes", partyId),
  redeemCreditNote: (data) => ipcRenderer.invoke("redeem-credit-note", data),

  getProductByBarcode: (barcode) => ipcRenderer.invoke("get-product-by-barcode", barcode),
  saveProductBarcode: (data) => ipcRenderer.invoke("save-product-barcode", data),

  getGSTR1Data: (data) => ipcRenderer.invoke("get-gstr1-data", data),
  saveFile: (data) => ipcRenderer.invoke("save-file", data),
});
