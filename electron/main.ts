import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { startScheduler, updateSchedule } from '../src/backend/scheduler.js';
import { getDB, setConfig } from '../src/backend/db.js';
import { getDailyReport } from '../src/backend/reporting.js';
import { sendTelegram } from '../src/backend/telegram.js';
import { autoUpdater } from 'electron-updater';

let win = null;

async function createWindow() {
  win = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  const url = process.env['VITE_DEV_SERVER_URL'] || 'file://' + path.join(app.getAppPath(), 'dist/index.html');
  await win.loadURL(url);
}

function setupAutoUpdate() {
  try { autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true; autoUpdater.checkForUpdatesAndNotify(); } catch {}
}

app.whenReady().then(async () => {
  getDB();
  startScheduler({ hour: 21, minute: 30, tz: 'Europe/Warsaw' });
  setupAutoUpdate();
  await createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('save-config', (_evt, cfg) => {
  if (cfg.telegramToken !== undefined) setConfig('telegram_token', String(cfg.telegramToken));
  if (cfg.telegramChatId !== undefined) setConfig('telegram_chat_id', String(cfg.telegramChatId));
  if (cfg.currency !== undefined) setConfig('currency', String(cfg.currency));
  return true;
});
ipcMain.handle('update-schedule', (_evt, { hour, minute, tz }) => { updateSchedule({ hour, minute, tz }); return true; });
ipcMain.handle('send-daily-report-now', async () => {
  const iso = new Date().toISOString().slice(0,10);
  const r = getDailyReport(iso);
  const row = getDB().prepare('SELECT value FROM config WHERE key="currency"').get();
  const currency = (row && row.value) || 'PLN';
  const fmt = (n)=> new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format(n);
  await sendTelegram(`📊 <b>Итоги за ${r.date}</b>\nЧеков: <b>${r.checks}</b>\nВыручка: <b>${fmt(r.revenue)}</b>\nПрибыль: <b>${fmt(r.profit)}</b>`);
  return true;
});
