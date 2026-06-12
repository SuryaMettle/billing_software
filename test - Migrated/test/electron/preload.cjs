const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Non-DB IPC only
  saveFile: (data) => ipcRenderer.invoke("save-file", data),
});