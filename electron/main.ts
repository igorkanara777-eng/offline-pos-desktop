// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

// ─── База данных (better-sqlite3) ───────────────────────────────────────────────
const userDataDir = app.getPath('userData');
const dbDir = path.join(userDataDir, 'data');
const dbPath = path.join(dbDir, 'pos.db');

let db: Database.Database;

function initDb() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  db = new Database(dbPath);

  // Простейшие таблицы для учёта товара
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_moves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);
}

// IPC-методы для рендера (минимальный набор)
function registerIpc() {
  ipcMain.handle('products.list', () => {
    return db.prepare(`SELECT * FROM products ORDER BY id DESC`).all();
  });

  ipcMain.handle('products.add', (_e, payload: { sku: string; name: string; price: number; qty?: number }) => {
    const qty = payload.qty ?? 0;
    const stmt = db.prepare(`INSERT INTO products (sku, name, price, qty) VALUES (?, ?, ?, ?)`);
    const info = stmt.run(payload.sku, payload.name, payload.price, qty);
    return { id: info.lastInsertRowid };
  });

  ipcMain.handle('stock.move', (_e, payload: { productId: number; delta: number }) => {
    const trx = db.transaction((productId: number, delta: number) => {
      db.prepare(`INSERT INTO stock_moves (product_id, delta) VALUES (?, ?)`).run(productId, delta);
      db.prepare(`UPDATE products SET qty = qty + ? WHERE id = ?`).run(delta, productId);
    });
    trx(payload.productId, payload.delta);
    return { ok: true };
  });
}

// ─── Окно ───────────────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js') // ВАЖНО: файл попадает в билд
    }
  });

  if (isDev) {
    // Если в dev запускаете Vite dev-сервер — подставьте URL, либо оставьте файл
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

// ─── Жизненный цикл ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initDb();
  registerIpc();
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
