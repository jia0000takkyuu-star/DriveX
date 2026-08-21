const {app,BrowserWindow}=require('electron');
const WEBAPP='https://script.google.com/macros/s/PASTE_YOUR_DEPLOYMENT_ID/exec';
function create(){const win=new BrowserWindow({width:1400,height:900,title:'DriveX'});win.loadURL(WEBAPP);}app.whenReady().then(create);app.on('window-all-closed',()=>{if(process.platform!=='darwin') app.quit();});
