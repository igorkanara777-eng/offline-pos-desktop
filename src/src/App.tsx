import { useEffect, useMemo, useState } from "react";

type Product = {
  id?: number;
  sku: string;
  name: string;
  price: number;
  stock: number;
};

export default function App() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Product>({ sku: "", name: "", price: 0, stock: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);

  const filtered = useMemo(
    () => items.filter(p => (q ? (p.name + p.sku).toLowerCase().includes(q.toLowerCase()) : true)),
    [items, q]
  );

  async function reload() {
    const data = await window.api.products.list(q);
    setItems(data);
  }

  useEffect(() => { reload(); /* on mount */ }, []);
  useEffect(() => { const t = setTimeout(reload, 200); return () => clearTimeout(t); }, [q]);

  function resetForm() {
    setEditingId(null);
    setForm({ sku: "", name: "", price: 0, stock: 0 });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      const updated = await window.api.products.update({ ...form, id: editingId });
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    } else {
      const created = await window.api.products.create(form);
      setItems(prev => [created, ...prev]);
    }
    resetForm();
  }

  async function del(id?: number) {
    if (!id) return;
    if (!confirm("Удалить товар?")) return;
    await window.api.products.remove(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function plus(id?: number) {
    if (!id) return;
    const updated = await window.api.products.adjust(id, 1);
    setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
  }

  async function minus(id?: number) {
    if (!id) return;
    const updated = await window.api.products.adjust(id, -1);
    setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
  }

  function startEdit(p: Product) {
    setEditingId(p.id!);
    setForm({ sku: p.sku, name: p.name, price: p.price, stock: p.stock });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Offline POS — учет товара</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Форма */}
        <form onSubmit={save} className="p-4 rounded-2xl shadow border">
          <h2 className="text-xl font-semibold mb-3">{editingId ? "Редактировать" : "Добавить товар"}</h2>
          <label className="block text-sm mb-1">Артикул (SKU)</label>
          <input className="w-full border rounded px-3 py-2 mb-3"
            value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required />

          <label className="block text-sm mb-1">Наименование</label>
          <input className="w-full border rounded px-3 py-2 mb-3"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />

          <label className="block text-sm mb-1">Цена</label>
          <input type="number" step="0.01" className="w-full border rounded px-3 py-2 mb-3"
            value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value || "0") }))} required />

          <label className="block text-sm mb-1">Остаток</label>
          <input type="number" className="w-full border rounded px-3 py-2 mb-4"
            value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value || "0") }))} required />

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-black text-white" type="submit">
              {editingId ? "Сохранить" : "Добавить"}
            </button>
            {editingId && (
              <button type="button" className="px-4 py-2 rounded border" onClick={resetForm}>Отмена</button>
            )}
          </div>
        </form>

        {/* Поиск + Таблица */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <input
              placeholder="Поиск по названию или SKU…"
              className="w-72 border rounded px-3 py-2"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <span className="text-sm opacity-70">Всего: {filtered.length}</span>
          </div>

          <div className="rounded-2xl overflow-hidden border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Наименование</th>
                  <th className="text-right p-2">Цена</th>
                  <th className="text-right p-2">Остаток</th>
                  <th className="text-right p-2">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{p.id}</td>
                    <td className="p-2">{p.sku}</td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 text-right">{p.price.toFixed(2)}</td>
                    <td className="p-2 text-right">{p.stock}</td>
                    <td className="p-2">
                      <div className="flex gap-2 justify-end">
                        <button className="px-2 py-1 border rounded" onClick={() => minus(p.id)}>-1</button>
                        <button className="px-2 py-1 border rounded" onClick={() => plus(p.id)}>+1</button>
                        <button className="px-2 py-1 border rounded" onClick={() => startEdit(p)}>Ред.</button>
                        <button className="px-2 py-1 border rounded text-red-600" onClick={() => del(p.id)}>Удалить</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center opacity-60">Ничего не найдено</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
