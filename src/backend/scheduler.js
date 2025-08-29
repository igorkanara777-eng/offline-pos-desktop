import cron from 'node-cron';
import { getDailyReport } from './reporting.js';
import { sendTelegram } from './telegram.js';
import { getDB } from './db.js';

let currentTask = null;

export function startScheduler(opts) {
  if (currentTask) currentTask.stop();
  const { hour, minute, tz } = opts;
  const cronExpr = `${minute} ${hour} * * *`;
  currentTask = cron.schedule(cronExpr, async () => {
    try {
      const now = new Date();
      const isoDay = now.toISOString().slice(0,10);
      const r = getDailyReport(isoDay);
      const row = getDB().prepare('SELECT value FROM config WHERE key="currency"').get();
      const currency = (row && row.value) || 'PLN';
      const fmt = (n)=> new Intl.NumberFormat('ru-RU',{style:'currency',currency}).format(n);
      const text = `📊 <b>Итоги за ${r.date}</b>\nЧеков: <b>${r.checks}</b>\nВыручка: <b>${fmt(r.revenue)}</b>\nПрибыль: <b>${fmt(r.profit)}</b>`;
      await sendTelegram(text);
      console.log('Daily report sent');
    } catch (e) { console.error('Daily report error', e); }
  }, { timezone: tz });
}
export function updateSchedule(opts) { startScheduler(opts); }
