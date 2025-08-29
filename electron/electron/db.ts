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

  // Немного демо-данных при пустой БД
  const count: { c: number } = db.prepare(`SELECT COUNT(*) as c FROM products`).get();
  if (count.c === 0) {
    const seed = db.prepare(`
      INSERT INTO products (sku, name, price, stock)
      VALUES (@sku, @name, @price, @stock)
    `);
    seed.run({ sku: "SKU-001", name: "Демо товар 1", price: 199.99, stock: 10 });
    seed.run({ sku: "SKU-002", name: "Демо товар 2", price: 349.0, stock: 5 });
  }
}

export function listProducts(query = ""): Product[] {
  const q = `%${query.trim()}%`;
  const stmt = db.prepare(`
    SELECT id, sku, name, price, stock, created_at, updated_at
    FROM products
    WHERE name LIKE ? OR sku LIKE ?
    ORDER BY id DESC
  `);
  return stmt.all(q, q) as Product[];
}

export function createProduct(p: Product): Product {
  const stmt = db.prepare(`
    INSERT INTO products (sku, name, price, stock)
    VALUES (@sku, @name, @price, @stock)
  `);
  const info = stmt.run(p);
  const getOne = db.prepare(`SELECT * FROM products WHERE id = ?`);
  return getOne.get(info.lastInsertRowid) as Product;
}

export function updateProduct(p: Product): Product {
  if (!p.id) throw new Error("id is required");
  const stmt = db.prepare(`
    UPDATE products
       SET sku=@sku, name=@name, price=@price, stock=@stock, updated_at=CURRENT_TIMESTAMP
     WHERE id=@id
  `);
  stmt.run(p);
  const getOne = db.prepare(`SELECT * FROM products WHERE id = ?`);
  return getOne.get(p.id) as Product;
}

export function removeProduct(id: number): void {
  const stmt = db.prepare(`DELETE FROM products WHERE id = ?`);
  stmt.run(id);
}

export function adjustStock(id: number, delta: number): Product {
  const stmt = db.prepare(`
    UPDATE products
       SET stock = stock + @delta, updated_at=CURRENT_TIMESTAMP
     WHERE id=@id
  `);
  stmt.run({ id, delta });
  const getOne = db.prepare(`SELECT * FROM products WHERE id = ?`);
  return getOne.get(id) as Product;
}
