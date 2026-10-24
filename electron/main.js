const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let main = null;
let br = null;          // browser window
let lastUrl = '';
let suppressClose = false;

const isHttp = (u) => /^https?:\/\//i.test(u || '');

function openBrowser(url) {
  if (!isHttp(url)) return;
  if (br && !br.isDestroyed()) { br.loadURL(url); br.focus(); return; }
  lastUrl = url;
  suppressClose = false;
  br = new BrowserWindow({
    width: 1000, height: 720, parent: main, title: 'المتصفح',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const wc = br.webContents;
  wc.on('did-navigate', (_e, u) => { lastUrl = u; });
  wc.on('did-navigate-in-page', (_e, u, isMainFrame) => { if (isMainFrame) lastUrl = u; });
  wc.setWindowOpenHandler(({ url: u }) => { if (isHttp(u)) wc.loadURL(u); return { action: 'deny' }; });

  br.setMenu(Menu.buildFromTemplate([
    { label: 'رجوع', accelerator: 'Alt+Left', click: () => { if (wc.canGoBack()) wc.goBack(); } },
    { label: 'للأمام', accelerator: 'Alt+Right', click: () => { if (wc.canGoForward()) wc.goForward(); } },
    { label: 'تحديث', accelerator: 'CmdOrCtrl+R', click: () => wc.reload() },
    { label: '⬇ حمّل هذا الرابط', accelerator: 'CmdOrCtrl+D', click: () => {
        const u = wc.getURL();
        suppressClose = true;
        br.close();
        if (main && !main.isDestroyed()) { main.webContents.send('download-url', u); main.focus(); }
    } },
    { label: 'إغلاق', accelerator: 'CmdOrCtrl+W', click: () => br.close() },
  ]));

  br.on('closed', () => {
    const u = lastUrl;
    br = null;
    if (!suppressClose && main && !main.isDestroyed()) main.webContents.send('browser-closed', u);
  });
  br.loadURL(url);
}

function createMain() {
  main = new BrowserWindow({
    width: 1000, height: 780, minWidth: 420, minHeight: 600,
    title: 'مكتبتي الصوتية', backgroundColor: '#0D1818',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  main.removeMenu();
  main.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  main.webContents.setWindowOpenHandler(({ url }) => { openBrowser(url); return { action: 'deny' }; });
  main.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); openBrowser(url); } });
  main.on('closed', () => { main = null; });
}

ipcMain.handle('open-browser', (_e, url) => openBrowser(url));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (main) { if (main.isMinimized()) main.restore(); main.focus(); } });
  app.whenReady().then(createMain);
  app.on('window-all-closed', () => app.quit());
}
