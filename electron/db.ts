// electron/db.ts
import path from "node:path";
import { app } from "electron";
import Database from "better-sqlite3";

export type Product = {
  id?: number;
  sku: string;
  name: string;
  price: number;
  stock: number;
  created_at?: string;
  updated_at?: string;
};

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
  const { c } = db.prepare(`SELECT COUNT(*) as c FROM products`).get() as { c: number };
  if (c === 0) {
    const ins = db.prepare(`INSERT INTO products (sku,name,price,stock) VALUES (@sku,@name,@price,@stock)`);
    ins.run({ sku: "SKU-001", name: "Демо товар 1", price: 199.99, stock: 10 });
    ins.run({ sku: "SKU-002", name: "Демо товар 2", price: 349, stock: 5 });
  }
}

export function listProducts(q = "") {
  const like = `%${q.trim()}%`;
  return db.prepare(
    `SELECT id,sku,name,price,stock,created_at,updated_at
     FROM products
     WHERE name LIKE ? OR sku LIKE ?
     ORDER BY id DESC`
  ).all(like, like) as Product[];
}

export function createProduct(p: Product) {
  const info = db.prepare(
    `INSERT INTO products (sku,name,price,stock) VALUES (@sku,@name,@price,@stock)`
  ).run(p);
  return db.prepare(`SELECT * FROM products WHERE id=?`).get(info.lastInsertRowid) as Product;
}

export function updateProduct(p: Product) {
  if (!p.id) throw new Error("id is required");
  db.prepare(
    `UPDATE products SET sku=@sku,name=@name,price=@price,stock=@stock,updated_at=CURRENT_TIMESTAMP WHERE id=@id`
  ).run(p);
  return db.prepare(`SELECT * FROM products WHERE id=?`).get(p.id) as Product;
}

export function removeProduct(id: number) {
  db.prepare(`DELETE FROM products WHERE id=?`).run(id);
}

export function adjustStock(id: number, delta: number) {
  db.prepare(`UPDATE products SET stock=stock+@delta,updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({ id, delta });
  return db.prepare(`SELECT * FROM products WHERE id=?`).get(id) as Product;
}
