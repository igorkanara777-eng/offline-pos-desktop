// electron/db.ts
import path from "node:path";
import { app } from "electron";
import Database from "better-sqlite3";

export type Product = { id?: number; sku: string; name: string; price: number; stock: number; };

let db: Database.Database;

export function initDb() {
  const dbPath = path.join(app.getPath("userData"), "pos.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
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
