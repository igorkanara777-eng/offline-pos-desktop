// src/renderer.d.ts
export {};

declare global {
  interface Window {
    api: {
      addItem(data: { name: string; price: number; stock: number }): Promise<number>;
      listItems(): Promise<Array<{ id: number; name: string; price: number; stock: number }>>;
    };
  }
}
