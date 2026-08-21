const { app, BrowserWindow, dialog } = require('electron');

// DriveX Google Apps Script Web App URL
// Replace this with the URL ending in /exec from your Apps Script deployment.
const WEBAPP = process.env.DRIVEX_WEBAPP_URL || 'PASTE_YOUR_DEPLOYMENT_URL_HERE';

function create() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'DriveX',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!WEBAPP || WEBAPP.includes('PASTE_YOUR_DEPLOYMENT_URL_HERE')) {
    dialog.showErrorBox(
      'DriveX の接続先が未設定です',
      'main.js の WEBAPP に、Google Apps Script のWebアプリURL（/exec）を設定してください。'
    );
    return;
  }

  win.loadURL(WEBAPP);
}

app.whenReady().then(create);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
