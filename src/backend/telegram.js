import { getConfig } from './db.js';

export async function sendTelegram(text) {
  const token = getConfig('telegram_token');
  const chatId = getConfig('telegram_chat_id');
  if (!token || !chatId) throw new Error('Не настроен Telegram (token/chat_id)');
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
  if (!res.ok) throw new Error('Ошибка Telegram API: ' + res.status);
}
