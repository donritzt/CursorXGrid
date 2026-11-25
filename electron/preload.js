const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cursorXGridDesktop", true);
contextBridge.exposeInMainWorld("cursorXGridUpdates", {
  getState: () => ipcRenderer.invoke("updates:state"),
  download: () => ipcRenderer.invoke("updates:download"),
  install: () => ipcRenderer.invoke("updates:install"),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("updates:changed", listener);
    return () => ipcRenderer.removeListener("updates:changed", listener);
  },
});
