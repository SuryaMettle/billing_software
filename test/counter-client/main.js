import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let configPath;

function getConfig() {
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConfig(serverUrl) {
  fs.writeFileSync(configPath, JSON.stringify({ serverUrl }, null, 2));
}

function buildMenu() {
  const template = [
    {
      label: "Settings",
      submenu: [
        {
          label: "Change Server IP",
          click: () => {
            showSetupScreen();
          },
        },
        { type: "separator" },
        {
          label: "Reload",
          accelerator: "F5",
          click: () => {
            loadApp();
          },
        },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showSetupScreen() {
  const config = getConfig();
  mainWindow.loadFile(path.join(__dirname, "setup.html"));
  mainWindow.webContents.once("did-finish-load", () => {
    if (config && config.serverUrl) {
      mainWindow.webContents.send("prefill-ip", config.serverUrl);
    }
  });
}

function showErrorScreen(message) {
  mainWindow.loadFile(path.join(__dirname, "error.html"));
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow.webContents.send("connection-error", message);
  });
}

function loadApp() {
  const config = getConfig();
  if (!config || !config.serverUrl) {
    showSetupScreen();
    return;
  }

  mainWindow.loadURL(config.serverUrl).catch(() => {
    showErrorScreen(config.serverUrl);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  mainWindow.maximize();
  mainWindow.show();

  // If the page itself fails to load (server unreachable), show error screen
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    // Ignore failures for our own local setup/error pages
    if (validatedURL && validatedURL.startsWith("file://")) return;
    const config = getConfig();
    showErrorScreen(config ? config.serverUrl : validatedURL);
  });

  const config = getConfig();
  if (config && config.serverUrl) {
    loadApp();
  } else {
    showSetupScreen();
  }
}

app.whenReady().then(() => {
  configPath = path.join(app.getPath("userData"), "config.json");
  buildMenu();
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

// IPC: renderer (setup.html) submits an IP/URL
ipcMain.on("save-server-url", (event, serverUrl) => {
  saveConfig(serverUrl);
  loadApp();
});

// IPC: renderer (error.html) requests retry
ipcMain.on("retry-connection", () => {
  loadApp();
});

// IPC: renderer (error.html / setup.html) requests opening setup screen
ipcMain.on("open-setup", () => {
  showSetupScreen();
});