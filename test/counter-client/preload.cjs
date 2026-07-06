const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("counterClient", {
  saveServerUrl: (url) => ipcRenderer.send("save-server-url", url),
  retryConnection: () => ipcRenderer.send("retry-connection"),
  openSetup: () => ipcRenderer.send("open-setup"),
  onPrefillIp: (callback) =>
    ipcRenderer.on("prefill-ip", (event, url) => callback(url)),
  onConnectionError: (callback) =>
    ipcRenderer.on("connection-error", (event, url) => callback(url)),
});