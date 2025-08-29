import { contextBridge, ipcRenderer } from "electron";
import type { Product } from "./db";

contextBridge.exposeInMainWorld("api", {
  app: {
    version: () => ipcRenderer.invoke("app:version"),
  },
  products: {
    list: (q?: string) => ipcRenderer.invoke("products:list", q) as Promise<Product[]>,
    create: (p: Omit<Product, "id">) => ipcRenderer.invoke("products:create", p) as Promise<Product>,
    update: (p: Product) => ipcRenderer.invoke("products:update", p) as Promise<Product>,
    remove: (id: number) => ipcRenderer.invoke("products:remove", id) as Promise<void>,
    adjust: (id: number, delta: number) => ipcRenderer.invoke("products:adjust", { id, delta }) as Promise<Product>,
  },
});
