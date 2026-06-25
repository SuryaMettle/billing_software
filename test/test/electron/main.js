import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import { checkAccess, saveLicenseKey, validateLicenseKey } from "./license.js";
import { getMachineId } from "./machineId.js";
import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, ".env")
    : path.join(__dirname, "../.env"),
});

async function startBackend() {
  app.setPath("userData", path.join(app.getPath("appData"), "POS Billing"));
  const userDataPath = app.getPath("userData");
  process.env.USER_DATA_PATH = userDataPath;
  process.env.PORT = "3001";
  process.env.DIST_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'dist')
  : path.join(__dirname, '../dist');

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

  Menu.setApplicationMenu(null);

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL("http://localhost:5173"); // ← Vite in dev
  } else {
    win.loadURL("http://localhost:3001"); // ← Express in prod
  }
}

app.whenReady().then(async () => {
  app.setPath("userData", path.join(app.getPath("appData"), "POS Billing"));

  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
    });
  }

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

// ── Licensing ──
// Full 3-marker reconciliation (file + registry + SQLite) happens on the
// Express server side, which has direct DB access and is the actual gate
// for both the Electron window and any counter PCs hitting it over HTTP.
// These IPC handlers let the local Electron renderer check/display status
// and submit a key without going through HTTP.
ipcMain.handle("license-status", async () => {
  return checkAccess(null);
});

ipcMain.handle("license-activate", async (event, { key }) => {
  const machineId = getMachineId();
  if (!validateLicenseKey(key)) {
    return { success: false, error: "Invalid license key for this machine." };
  }
  saveLicenseKey(key);
  return { success: true, machineId };
});

// ── Thermal printing (RP 3220 star / 80mm roll) ──
// Prints the already-rendered receipt PDF (sized exactly to its real
// content height in mm by thermal-80mm.jsx) silently, with an explicit
// pageSize override — bypassing the OS print dialog and the Windows
// driver's own paper-size presets entirely. This is what actually
// fixes gap-at-top, not the PDF's own page height in isolation.
ipcMain.handle("print-thermal", async (event, { pdfDataUrl, widthMm = 80, heightMm, deviceName }) => {
  if (!pdfDataUrl) return { success: false, error: "No receipt PDF provided" };
  if (!heightMm || heightMm <= 0) return { success: false, error: "Invalid receipt height" };

  let printWin = null;
  try {
    printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
      },
    });

    await printWin.loadURL(pdfDataUrl);
    // Electron's built-in PDF viewer can fire 'did-finish-load' for the
    // wrapper page slightly before the embedded PDF plugin has finished
    // rendering — a short pause here avoids printing a blank/partial page.
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const printers = await printWin.webContents.getPrintersAsync();
      const target = printers.find((p) => p.name === (deviceName || "RP 3220 star"));
      console.log("print-thermal: target printer info:", JSON.stringify(target, null, 2));
    } catch (e) {
      console.log("print-thermal: could not query printers list:", e.message);
    }

    const pageSize = {
      width: Math.round(widthMm * 1000),
      height: Math.round(heightMm * 1000),
    };

    const printOptions = {
      silent: true,
      deviceName: deviceName || "RP 3220 star",
      pageSize,
      margins: { marginType: "none" },
      printBackground: true,
      landscape: false,
      scaleFactor: 100,
      copies: 1,
      collate: false,
      pagesPerSheet: 1,
    };
    console.log("print-thermal: sending print options:", JSON.stringify(printOptions, null, 2));

    const result = await new Promise((resolve) => {
      printWin.webContents.print(printOptions, (success, errorType) => {
        resolve({ success, errorType });
      });
    });

    console.log("print-thermal: result:", result);

    if (!result.success) {
      return { success: false, error: result.errorType || "Print failed" };
    }
    return { success: true };
  } catch (e) {
    console.error("print-thermal failed:", e);
    return { success: false, error: e.message || "Print failed" };
  } finally {
    if (printWin && !printWin.isDestroyed()) {
      printWin.destroy();
    }
  }
});

function dbRemovedHandler(channel) {
  return () => {
    throw new Error(
      `DB access moved to backend REST. IPC handler "${channel}" has been removed from Electron.`
    );
  };
}

ipcMain.handle("restore-backup", async () => {
  const userDataPath = app.getPath("userData");
  const backupsDir = path.join(userDataPath, "Backups");

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select backup file to restore",
    defaultPath: backupsDir,
    filters: [{ name: "Database Files", extensions: ["db"] }],
    properties: ["openFile"],
  });

  if (canceled || !filePaths.length) {
    return { success: false, cancelled: true };
  }

  const selectedPath = filePaths[0];
  const dbPath = path.join(userDataPath, "billing.db");

  try {
    const header = Buffer.alloc(16);
    const fd = fs.openSync(selectedPath, "r");
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);

    if (header.toString("utf8", 0, 15) !== "SQLite format 3") {
      return { success: false, error: "Selected file is not a valid database backup." };
    }

    const safetyPath = path.join(userDataPath, `pre-restore-backup_${Date.now()}.db`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyPath);
    }

    const { closeDatabase } = await import("./database.js");
    closeDatabase();

    fs.copyFileSync(selectedPath, dbPath);

    app.relaunch();
    app.exit(0);

    return { success: true };
  } catch (e) {
    console.error("Restore failed:", e);
    return { success: false, error: e.message || "Restore failed" };
  }
});

ipcMain.handle("selective-restore-pick-file", async () => {
  const userDataPath = app.getPath("userData");
  const backupsDir = path.join(userDataPath, "Backups");

  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select backup file for selective restore",
    defaultPath: backupsDir,
    filters: [{ name: "Database Files", extensions: ["db"] }],
    properties: ["openFile"],
  });

  if (canceled || !filePaths.length) return { cancelled: true };
  return { success: true, filePath: filePaths[0] };
});

// ── Google Drive OAuth ──
ipcMain.handle("google-auth-start", async () => {
  const { google } = await import("googleapis");
  const { protocol, BrowserWindow } = await import("electron");

  return new Promise((resolve) => {
   const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3001/api/oauth/callback"
);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/userinfo.email"
      ],
      prompt: "consent",
    });

    // Store resolver globally so the Express route can call it
    global.pendingOAuthResolve = async (code) => {
      global.pendingOAuthResolve = null;
      try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();
        resolve({
          success: true,
          refreshToken: tokens.refresh_token,
          email: data.email,
        });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    };

    // Timeout after 10 minutes
    setTimeout(() => {
      if (global.pendingOAuthResolve) {
        global.pendingOAuthResolve = null;
        resolve({ success: false, error: "Authentication timed out" });
      }
    }, 10 * 60 * 1000);

    import("electron").then(({ shell }) => {
  shell.openExternal(authUrl);
});
  });
});

ipcMain.handle("google-auth-exchange", async (event, { code }) => {
  const { google } = await import("googleapis");

  const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    return {
      success: true,
      refreshToken: tokens.refresh_token,
      email: data.email,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

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