import { getDB } from './db.js';
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function finalizeSale(cart, cash) {
  const db = getDB();
  const total = cart.reduce((s,i)=> s + i.price*i.qty, 0);
  if (cash < total) throw new Error('Недостаточно наличных');

  const now = new Date().toISOString();
  const saleId = uid();

  const tx = db.transaction(() => {
    for (const it of cart) {
      const p = db.prepare('SELECT stock FROM products WHERE id=?').get(it.productId);
      if (!p) throw new Error('Товар не найден');
      if (p.stock < it.qty) throw new Error('Недостаточно остатка');
    }

    db.prepare('INSERT INTO sales(id,created_at,subtotal,cash_received,`change`) VALUES(?,?,?,?,?)')
      .run(saleId, now, total, cash, cash-total);

    for (const it of cart) {
      const p = db.prepare('SELECT avg_cost FROM products WHERE id=?').get(it.productId);
      const cost = p.avg_cost;
      db.prepare('INSERT INTO sale_items(id,sale_id,product_id,qty,price,cost) VALUES(?,?,?,?,?,?)')
        .run(uid(), saleId, it.productId, it.qty, it.price, cost);
      db.prepare('UPDATE products SET stock = stock - ? WHERE id=?').run(it.qty, it.productId);
      db.prepare('INSERT INTO stock_moves(id,product_id,delta,reason,unit_cost,created_at,comment) VALUES(?,?,?,?,?,?,?)')
        .run(uid(), it.productId, -it.qty, 'sale', cost, now, `Продажа ${saleId}`);
    }
  });
  tx();

  return { saleId, total, change: cash-total };
}
