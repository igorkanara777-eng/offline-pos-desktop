// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  addItem: (data: { name: string; price: number; stock: number }) =>
    ipcRenderer.invoke('items:add', data),
  listItems: () => ipcRenderer.invoke('items:list'),
});
