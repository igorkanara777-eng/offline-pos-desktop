// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ensureDb, addItem, listItems } from './db';

let win: BrowserWindow | null = null;

function getIndexHtml() {
  // В пакете __dirname = resources/app.asar/electron
  // dist лежит рядом: resources/app.asar/dist/index.html
  return path.join(__dirname, '..', 'dist', 'index.html');
}

async function createWindow() {
  await ensureDb();

  win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // В проде грузим файл из dist
  await win.loadFile(getIndexHtml());
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/** IPC для учёта товара */
ipcMain.handle('items:add', (_evt, data: { name: string; price: number; stock: number }) => {
  return addItem(data.name, data.price, data.stock);
});

ipcMain.handle('items:list', () => {
  return listItems();
});
