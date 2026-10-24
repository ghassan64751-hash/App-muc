const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  openBrowser: (url) => ipcRenderer.invoke('open-browser', url),
  onBrowserClosed: (cb) => ipcRenderer.on('browser-closed', (_e, u) => cb(u)),
  onDownloadUrl: (cb) => ipcRenderer.on('download-url', (_e, u) => cb(u)),
});
