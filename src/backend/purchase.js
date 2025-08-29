import { getDB } from './db.js';
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function addPurchase(productId, qty, unitCost, comment) {
  const db = getDB();
  const now = new Date().toISOString();
  const p = db.prepare('SELECT stock, avg_cost FROM products WHERE id=?').get(productId);
  const newStock = p.stock + qty;
  const newAvg = newStock > 0 ? ((p.avg_cost * p.stock) + (unitCost * qty)) / newStock : unitCost;
  const tx = db.transaction(() => {
    db.prepare('UPDATE products SET stock=?, avg_cost=? WHERE id=?').run(newStock, newAvg, productId);
    db.prepare('INSERT INTO stock_moves(id,product_id,delta,reason,unit_cost,created_at,comment) VALUES(?,?,?,?,?,?,?)')
      .run(uid(), productId, qty, 'purchase', unitCost, now, comment || 'Приход');
  });
  tx();
}
