import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import {
  initDb,
  listProducts,
  createProduct,
  updateProduct,
  removeProduct,
  adjustStock,
  type Product,
} from "./db";

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(app.getAppPath(), "electron", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // В проде грузим dist/index.html (его пакуем electron-builder’ом)
  const indexHtml = path.join(app.getAppPath(), "dist", "index.html");
  win.loadFile(indexHtml);

  win.on("closed", () => (win = null));
}

app.whenReady().then(() => {
  initDb();
  createWindow();

  ipcMain.handle("app:version", () => app.getVersion());

  ipcMain.handle("products:list", (_e, q?: string) => listProducts(q ?? ""));
  ipcMain.handle("products:create", (_e, p: Omit<Product, "id">) => createProduct(p as Product));
  ipcMain.handle("products:update", (_e, p: Product) => updateProduct(p));
  ipcMain.handle("products:remove", (_e, id: number) => removeProduct(id));
  ipcMain.handle("products:adjust", (_e, payload: { id: number; delta: number }) =>
    adjustStock(payload.id, payload.delta)
  );
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
