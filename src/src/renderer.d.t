import type { Product } from "../electron/db";

declare global {
  interface Window {
    api: {
      app: { version(): Promise<string> };
      products: {
        list(q?: string): Promise<Product[]>;
        create(p: Omit<Product, "id">): Promise<Product>;
        update(p: Product): Promise<Product>;
        remove(id: number): Promise<void>;
        adjust(id: number, delta: number): Promise<Product>;
      };
    };
  }
}
export {};
