// electron/main.ts
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';

// Если где-то в проекте есть своя переменная с именем app (например, express),
// ПЕРЕИМЕНУЙ её (server, expressApp и т.п.), чтобы не конфликтовала с import { app }.

// На Windows первый запуск через squirrel — сразу выходим (создание ярлыков)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (require('electron-squirrel-startup')) app.quit();
} catch { /* no-op */ }

function resolveHtmlPath(): string {
  // Vite dev-server URL прокидывается нами через env (в dev)
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) return devUrl;
  // В проде грузим скомпилированный index.html
  return path.join(__dirname, '../dist/index.html');
}

let mainWin: BrowserWindow | null = null;

async function createWindow() {
  mainWin = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: path.join(process.resourcesPath, 'build', 'icon.png'),
  });

  mainWin.once('ready-to-show', () => {
    if (!mainWin) return;
    mainWin.show();
  });

  const htmlPath = resolveHtmlPath();
  if (htmlPath.startsWith('http')) {
    await mainWin.loadURL(htmlPath);
    // Временный помощник при отладке “белого экрана”
    // mainWin.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWin.loadFile(htmlPath);
  }

  mainWin.on('closed', () => {
    mainWin = null;
  });
}

// Стандартные жизненные циклы
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ----- Пример IPC (оставь если нужно) -----
// ipcMain.handle('ping', () => 'pong');
