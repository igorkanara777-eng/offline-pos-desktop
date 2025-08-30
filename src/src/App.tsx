// src/App.tsx
import { useEffect, useState } from 'react';

type Item = { id: number; name: string; price: number; stock: number };

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ name: '', price: '', stock: '' });

  async function refresh() {
    const data = await window.api.listItems();
    setItems(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock || 0);
    if (!name || isNaN(price)) return;

    await window.api.addItem({ name, price, stock });
    setForm({ name: '', price: '', stock: '' });
    refresh();
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Offline POS</h1>

      <form onSubmit={onSubmit} className="grid grid-cols-4 gap-3 max-w-3xl">
        <input
          className="border rounded px-3 py-2 col-span-2"
          placeholder="Название"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Цена"
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Остаток"
          value={form.stock}
          onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
        />
        <button className="bg-green-600 text-white rounded px-4 py-2">Добавить</button>
      </form>

      <table className="min-w-[600px] border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Название</th>
            <th className="p-2 border">Цена</th>
            <th className="p-2 border">Остаток</th>
          </tr>
        </thead>
        <tbody>
          {items.map(row => (
            <tr key={row.id}>
              <td className="p-2 border">{row.id}</td>
              <td className="p-2 border">{row.name}</td>
              <td className="p-2 border">{row.price}</td>
              <td className="p-2 border">{row.stock}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="p-4 text-gray-500" colSpan={4}>
                Пусто. Добавьте первый товар.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
