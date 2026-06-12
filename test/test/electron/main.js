import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startBackend() {
  app.setPath("userData", path.join(app.getPath("appData"), "POS Billing"));
  const userDataPath = app.getPath("userData");
  process.env.USER_DATA_PATH = userDataPath;
  process.env.PORT = "3001";

  if (app.isPackaged) {
    const serverPath = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "server",
      "index.js"
    );
    await import(pathToFileURL(serverPath).href);
  } else {
    await import("../server/index.js");
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL("http://localhost:5173"); // ← Vite in dev
  } else {
    win.loadURL("http://localhost:3001"); // ← Express in prod
  }
}

app.whenReady().then(async () => {
  app.setPath("userData", path.join(app.getPath("appData"), "POS Billing"));
  await startBackend();
  createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── Non-DB IPC ──
ipcMain.handle("save-file", async (event, { buffer, defaultName, filters }) => {
  const { dialog } = await import("electron");
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: filters || [{ name: "Excel Files", extensions: ["xlsx"] }],
  });

  if (canceled || !filePath) return { success: false, cancelled: true };

  const fs = await import("fs");
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return { success: true, filePath };
});

function dbRemovedHandler(channel) {
  return () => {
    throw new Error(
      `DB access moved to backend REST. IPC handler "${channel}" has been removed from Electron.`
    );
  };
}

// ── DB IPC handlers removed (explicit errors so you see what must migrate) ──
ipcMain.handle("add-product", dbRemovedHandler("add-product"));
ipcMain.handle("get-products", dbRemovedHandler("get-products"));
ipcMain.handle("get-categories", dbRemovedHandler("get-categories"));
ipcMain.handle("delete-product", dbRemovedHandler("delete-product"));
ipcMain.handle("create-invoice", dbRemovedHandler("create-invoice"));

ipcMain.handle("get-offers", dbRemovedHandler("get-offers"));
ipcMain.handle("get-all-offers", dbRemovedHandler("get-all-offers"));
ipcMain.handle("create-offer", dbRemovedHandler("create-offer"));
ipcMain.handle("delete-offer", dbRemovedHandler("delete-offer"));
ipcMain.handle("toggle-offer", dbRemovedHandler("toggle-offer"));

ipcMain.handle("get-loyalty-ledger", dbRemovedHandler("get-loyalty-ledger"));
ipcMain.handle("get-loyalty-settings", dbRemovedHandler("get-loyalty-settings"));
ipcMain.handle("get-party-loyalty-points", dbRemovedHandler("get-party-loyalty-points"));

ipcMain.handle("create-purchase-invoice", dbRemovedHandler("create-purchase-invoice"));
ipcMain.handle("get-purchase-invoices", dbRemovedHandler("get-purchase-invoices"));
ipcMain.handle("get-purchase-invoice-details", dbRemovedHandler("get-purchase-invoice-details"));

ipcMain.handle("process-sales-return", dbRemovedHandler("process-sales-return"));
ipcMain.handle("process-purchase-return", dbRemovedHandler("process-purchase-return"));

ipcMain.handle("get-settings", dbRemovedHandler("get-settings"));
ipcMain.handle("save-settings", dbRemovedHandler("save-settings"));

ipcMain.handle("update-product", dbRemovedHandler("update-product"));

ipcMain.handle("get-party-details", dbRemovedHandler("get-party-details"));
ipcMain.handle("delete-party", dbRemovedHandler("delete-party"));
ipcMain.handle("update-party", dbRemovedHandler("update-party"));
ipcMain.handle("create-party", dbRemovedHandler("create-party"));
ipcMain.handle("get-parties", dbRemovedHandler("get-parties"));

ipcMain.handle("get-invoices-with-profit", dbRemovedHandler("get-invoices-with-profit"));
ipcMain.handle("get-invoices", dbRemovedHandler("get-invoices"));
ipcMain.handle("get-party-stats", dbRemovedHandler("get-party-stats"));
ipcMain.handle("get-sales-stats", dbRemovedHandler("get-sales-stats"));
ipcMain.handle("add-invoice-payment", dbRemovedHandler("add-invoice-payment"));

ipcMain.handle("convert-stock", dbRemovedHandler("convert-stock"));
ipcMain.handle("get-invoice-details", dbRemovedHandler("get-invoice-details"));

ipcMain.handle("get-return-refund-info", dbRemovedHandler("get-return-refund-info"));
ipcMain.handle("process-return-refund", dbRemovedHandler("process-return-refund"));

ipcMain.handle("create-credit-note", dbRemovedHandler("create-credit-note"));
ipcMain.handle("get-party-credit-notes", dbRemovedHandler("get-party-credit-notes"));
ipcMain.handle("redeem-credit-note", dbRemovedHandler("redeem-credit-note"));

ipcMain.handle("get-product-by-barcode", dbRemovedHandler("get-product-by-barcode"));
ipcMain.handle("save-product-barcode", dbRemovedHandler("save-product-barcode"));

ipcMain.handle("get-gstr1-data", dbRemovedHandler("get-gstr1-data"));