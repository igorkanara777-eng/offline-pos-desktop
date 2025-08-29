import { getDB } from './db.js';

export function getDailyReport(isoDate) {
  const db = getDB();
  const start = new Date(isoDate + 'T00:00:00');
  const end = new Date(isoDate + 'T23:59:59.999');

  const sales = db.prepare('SELECT id, created_at, subtotal FROM sales WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC')
                  .all(start.toISOString(), end.toISOString());
  const revenue = sales.reduce((s, r) => s + r.subtotal, 0);

  const rows = db.prepare(`
    SELECT si.qty, si.price, si.cost
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.created_at BETWEEN ? AND ?
  `).all(start.toISOString(), end.toISOString());
  const profit = rows.reduce((s, r) => s + r.qty * (r.price - r.cost), 0);

  return { date: isoDate, checks: sales.length, revenue, profit };
}
