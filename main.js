const { app, BrowserWindow, dialog } = require('electron');

// DriveX Google Apps Script Web App URL
const WEBAPP = 'https://script.google.com/macros/s/AKfycbw-tJKmw3t8KIhPQ39Gtxv18Z26UZwKCrIoApZpn-3pILdO_zGL8icpvC4J05xWZTc2/exec';

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

  win.loadURL(WEBAPP).catch((error) => {
    dialog.showErrorBox('DriveX 起動エラー', `Webアプリを開けませんでした。\n\n${error.message}`);
  });
}

app.whenReady().then(create);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
