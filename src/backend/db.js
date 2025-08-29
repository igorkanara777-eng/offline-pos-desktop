import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let db;

export function getDB() {
  if (db) return db;
  const dir = path.join(os.homedir(), 'AppData', 'Roaming', 'Offline POS');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'offline-pos.sqlite');
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT,
      price REAL NOT NULL DEFAULT 0,
      avg_cost REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      image TEXT,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS sales(
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      subtotal REAL NOT NULL,
      cash_received REAL NOT NULL,
      change REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sale_items(
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_moves(
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      unit_cost REAL,
      created_at TEXT NOT NULL,
      comment TEXT
    );
    CREATE TABLE IF NOT EXISTS config(
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function setConfig(key, value) {
  getDB().prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
}
export function getConfig(key) {
  const row = getDB().prepare('SELECT value FROM config WHERE key=?').get(key);
  return row && row.value ? row.value : null;
}
