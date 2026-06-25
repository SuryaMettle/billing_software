const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  saveFile: (data) => ipcRenderer.invoke("save-file", data),
  restoreBackup: () => ipcRenderer.invoke("restore-backup"),
  selectiveRestorePickFile: () => ipcRenderer.invoke("selective-restore-pick-file"),
  googleAuthStart: () => ipcRenderer.invoke("google-auth-start"),

  // Thermal printing — sends receipt HTML + exact content height (mm) to the
  // main process, which prints it with a custom page size matching that
  // height exactly, instead of relying on a fixed Windows driver paper preset.
  printThermal: (payload) => ipcRenderer.invoke("print-thermal", payload),

  // Thermal printing via raw ESC/POS bytes — bypasses Chromium's print
  // pipeline entirely. Sends invoice data; main process builds the byte
  // buffer and writes it straight to the printer via Windows RAW spooler.
  printThermalEscPos: (payload) => ipcRenderer.invoke("print-thermal-escpos", payload),

  // Licensing — check trial/license status and submit an activation key.
  getLicenseStatus: () => ipcRenderer.invoke("license-status"),
  activateLicense: (key) => ipcRenderer.invoke("license-activate", { key }),
});
