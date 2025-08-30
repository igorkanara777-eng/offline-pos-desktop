// electron/db.ts
import path from 'path';
import Database from 'better-sqlite3';
import { app } from 'electron';

let db: Database.Database | null = null;

export async function ensureDb() {
  if (db) return;
  const dbPath = path.join(app.getPath('userData'), 'pos.sqlite');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function addItem(name: string, price: number, stock: number) {
  if (!db) throw new Error('DB not initialized');
  const stmt = db.prepare('INSERT INTO items (name, price, stock) VALUES (?, ?, ?)');
  const info = stmt.run(name, price, stock);
  return info.lastInsertRowid;
}

export function listItems() {
  if (!db) throw new Error('DB not initialized');
  return db.prepare('SELECT id, name, price, stock FROM items ORDER BY id DESC').all();
}

export const listProducts = (q="") =>
  db.prepare(`SELECT * FROM products
              WHERE name LIKE ? OR sku LIKE ?
              ORDER BY id DESC`).all(`%${q}%`, `%${q}%`);

export const createProduct = (p: Product) => {
  const info = db.prepare(
    `INSERT INTO products (sku,name,price,stock) VALUES (@sku,@name,@price,@stock)`
  ).run(p);
  return db.prepare(`SELECT * FROM products WHERE id=?`).get(info.lastInsertRowid) as Product;
};

export const updateProduct = (p: Product) => {
  if (!p.id) throw new Error("id is required");
  db.prepare(
    `UPDATE products SET sku=@sku,name=@name,price=@price,stock=@stock,updated_at=CURRENT_TIMESTAMP WHERE id=@id`
  ).run(p);
  return db.prepare(`SELECT * FROM products WHERE id=?`).get(p.id) as Product;
};

export const removeProduct = (id: number) => {
  db.prepare(`DELETE FROM products WHERE id=?`).run(id);
};
