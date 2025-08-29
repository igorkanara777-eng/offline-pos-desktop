import { initDb } from "./db";
app.whenReady().then(() => {
  initDb();
  // …создание окна
});
