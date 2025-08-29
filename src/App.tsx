import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Простое локальное хранилище (localStorage) ---
const DB_KEYS = {
  products: "offline_pos_products_v1",
  sales: "offline_pos_sales_v1",
  stockMoves: "offline_pos_stock_moves_v1",
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    console.error("load error", e);
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    alert("Ошибка сохранения в localStorage. Возможно, не хватает места.");
    console.error("save error", e);
  }
}

// --- Типы ---
export type Product = {
  id: string;
  name: string;
  sku: string; // артикул/штрихкод
  price: number; // цена за единицу
  stock: number; // остаток
  notes?: string;
};

export type CartItem = {
  productId: string;
  qty: number;
  price: number; // цена на момент продажи
};

export type Sale = {
  id: string;
  createdAt: string; // ISO
  items: CartItem[];
  subtotal: number;
  cashReceived: number;
  change: number;
};

export type StockMove = {
  id: string;
  productId: string;
  delta: number; // +приход, -списание/продажа
  reason: "purchase" | "adjust" | "sale";
  createdAt: string; // ISO
  comment?: string;
};

// --- Утилиты ---
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmt = (n: number) => new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(n);
const dtfmt = (iso: string) => new Date(iso).toLocaleString("ru-RU");

// --- Инициализация демо-данных ---
function ensureSeed() {
  const products = load<Product[]>(DB_KEYS.products, []);
  if (products.length === 0) {
    const demo: Product[] = [
      { id: uid(), name: "Кофе зерновой 1 кг", sku: "460700000001", price: 1290, stock: 10 },
      { id: uid(), name: "Чай чёрный 100 пак.", sku: "460700000002", price: 390, stock: 25 },
      { id: uid(), name: "Кружка керамическая", sku: "460700000003", price: 250, stock: 12 },
    ];
    save(DB_KEYS.products, demo);
    save(DB_KEYS.sales, [] as Sale[]);
    save(DB_KEYS.stockMoves, [] as StockMove[]);
  }
}

// --- Основной компонент ---
export default function App() {
  const [tab, setTab] = useState<"sale" | "products" | "stock" | "reports" | "backup">("sale");
  const [products, setProducts] = useState<Product[]>(() => load(DB_KEYS.products, []));
  const [sales, setSales] = useState<Sale[]>(() => load(DB_KEYS.sales, []));
  const [moves, setMoves] = useState<StockMove[]>(() => load(DB_KEYS.stockMoves, []));

  useEffect(() => {
    ensureSeed();
    // reload after seed
    setProducts(load(DB_KEYS.products, []));
    setSales(load(DB_KEYS.sales, []));
    setMoves(load(DB_KEYS.stockMoves, []));
  }, []);

  useEffect(() => save(DB_KEYS.products, products), [products]);
  useEffect(() => save(DB_KEYS.sales, sales), [sales]);
  useEffect(() => save(DB_KEYS.stockMoves, moves), [moves]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Локальная касса (Offline POS)</h1>
          <nav className="flex gap-2">
            <TabBtn active={tab === "sale"} onClick={() => setTab("sale")}>Быстрая продажа</TabBtn>
            <TabBtn active={tab === "products"} onClick={() => setTab("products")}>Товары</TabBtn>
            <TabBtn active={tab === "stock"} onClick={() => setTab("stock")}>Приход/Списание</TabBtn>
            <TabBtn active={tab === "reports"} onClick={() => setTab("reports")}>Отчёт</TabBtn>
            <TabBtn active={tab === "backup"} onClick={() => setTab("backup")}>Резерв/Импорт</TabBtn>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "sale" && (
          <SaleScreen products={products} setProducts={setProducts} sales={sales} setSales={setSales} moves={moves} setMoves={setMoves} />
        )}
        {tab === "products" && (
          <ProductsScreen products={products} setProducts={setProducts} />
        )}
        {tab === "stock" && (
          <StockScreen products={products} setProducts={setProducts} moves={moves} setMoves={setMoves} />
        )}
        {tab === "reports" && (
          <ReportsScreen sales={sales} products={products} />
        )}
        {tab === "backup" && (
          <BackupScreen products={products} sales={sales} moves={moves} onImport={(p, s, m) => { setProducts(p); setSales(s); setMoves(m); }} />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-8 text-xs text-slate-500">
        <p>
          Личные офлайн-данные хранятся у вас в браузере (localStorage). Для
          переноса на другой компьютер используйте «Резерв/Импорт». Для
          реальной торговли могут требоваться фискальные требования вашей
          страны. Этот MVP не является фискальным регистратором.
        </p>
      </footer>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm font-medium transition border ${
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-100 border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

// --- Экран: Товары ---
function ProductsScreen({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void; }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)
    );
  }, [products, q]);

  const onSave = (data: Partial<Product>) => {
    if (editing) {
      const updated = products.map(p => p.id === editing.id ? { ...editing, ...data, price: Number(data.price ?? editing.price), stock: Number(data.stock ?? editing.stock) } : p);
      setProducts(updated);
      setEditing(null);
    } else {
      const prod: Product = {
        id: uid(),
        name: (data.name ?? "Новый товар").toString(),
        sku: (data.sku ?? "").toString(),
        price: Number(data.price ?? 0),
        stock: Number(data.stock ?? 0),
        notes: (data.notes ?? "").toString(),
      };
      setProducts([prod, ...products]);
    }
  };

  const onDelete = (id: string) => {
    if (confirm("Удалить товар?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="bg-white rounded-2xl shadow p-4 border border-slate-200">
        <div className="flex items-center gap-2">
          <input
            className="w-full border rounded-xl px-3 py-2"
            placeholder="Поиск по названию или штрихкоду"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <button className="px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={() => setEditing({ id: "", name: "", sku: "", price: 0, stock: 0 })}>+ Добавить</button>
        </div>
        <div className="mt-4 divide-y">
          {list.map(p => (
            <div key={p.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-slate-500">ШК: {p.sku || "—"} • Остаток: {p.stock} • {fmt(p.price)}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-lg border" onClick={() => setEditing(p)}>Изменить</button>
                <button className="px-3 py-1 rounded-lg border" onClick={() => onDelete(p.id)}>Удалить</button>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="py-8 text-center text-slate-500">Ничего не найдено</div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 border border-slate-200">
        <h3 className="font-semibold mb-3">{editing ? "Редактировать" : "Добавить товар"}</h3>
        <ProductForm initial={editing ?? undefined} onCancel={() => setEditing(null)} onSave={onSave} />
        <div className="text-xs text-slate-500 mt-4">
          Подсказка: USB-сканер штрихкодов в режиме клавиатуры будет вводить код в любое поле ввода.
        </div>
      </div>
    </div>
  );
}

function ProductForm({ initial, onSave, onCancel }: { initial?: Product; onSave: (p: Partial<Product>) => void; onCancel?: () => void; }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  useEffect(() => {
    setName(initial?.name ?? "");
    setSku(initial?.sku ?? "");
    setPrice(initial?.price ?? 0);
    setStock(initial?.stock ?? 0);
    setNotes(initial?.notes ?? "");
  }, [initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Введите название");
    onSave({ name, sku, price: Number(price), stock: Number(stock), notes });
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <input className="border rounded-xl px-3 py-2" placeholder="Название" value={name} onChange={e => setName(e.target.value)} />
      <input className="border rounded-xl px-3 py-2" placeholder="Штрихкод / артикул" value={sku} onChange={e => setSku(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded-xl px-3 py-2" type="number" step="0.01" placeholder="Цена" value={price} onChange={e => setPrice(Number(e.target.value))} />
        <input className="border rounded-xl px-3 py-2" type="number" placeholder="Остаток" value={stock} onChange={e => setStock(Number(e.target.value))} />
      </div>
      <textarea className="border rounded-xl px-3 py-2" placeholder="Заметки" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white">Сохранить</button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border">Отмена</button>}
      </div>
    </form>
  );
}

// --- Экран: Быстрая продажа ---
function SaleScreen({ products, setProducts, sales, setSales, moves, setMoves }: { products: Product[]; setProducts: (p: Product[]) => void; sales: Sale[]; setSales: (s: Sale[]) => void; moves: StockMove[]; setMoves: (m: StockMove[]) => void; }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cash, setCash] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 30);
  }, [products, query]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [{ productId: p.id, qty: 1, price: p.price }, ...prev];
    });
  };

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const change = Math.max(0, cash - total);

  const finalize = () => {
    if (cart.length === 0) return alert("Корзина пуста");
    if (cash < total) return alert("Недостаточно наличных");

    // Проверка остатков
    for (const item of cart) {
      const p = products.find(pp => pp.id === item.productId)!;
      if (p.stock < item.qty) return alert(`Недостаточно остатка для «${p.name}»`);
    }

    // Сохранить продажу
    const sale: Sale = {
      id: uid(),
      createdAt: new Date().toISOString(),
      items: cart,
      subtotal: total,
      cashReceived: cash,
      change,
    };
    setSales([sale, ...sales]);

    // Списать остатки + записать движения
    const updated = products.map(p => {
      const item = cart.find(ci => ci.productId === p.id);
      return item ? { ...p, stock: p.stock - item.qty } : p;
    });
    setProducts(updated);

    const newMoves: StockMove[] = cart.map(ci => ({
      id: uid(),
      productId: ci.productId,
      delta: -ci.qty,
      reason: "sale",
      createdAt: new Date().toISOString(),
      comment: `Продажа ${sale.id}`,
    }));
    setMoves([...newMoves, ...moves]);

    // Печать чека
    printReceipt(sale, products);

    // Очистка
    setCart([]);
    setCash(0);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="bg-white rounded-2xl shadow p-4 border border-slate-200">
        <div className="flex gap-2 mb-3">
          <input ref={inputRef} className="w-full border rounded-xl px-3 py-2" placeholder="Поиск / скан штрихкода" value={query} onChange={e => setQuery(e.target.value)} />
          <button className="px-3 py-2 rounded-xl border" onClick={() => setQuery("")}>Очистить</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-auto">
          {filtered.map(p => (
            <button key={p.id} className="text-left border rounded-xl p-3 hover:bg-slate-50" onClick={() => addToCart(p)}>
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-xs text-slate-500">ШК: {p.sku || "—"}</div>
              <div className="text-sm mt-1">{fmt(p.price)} • Остаток: {p.stock}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 border border-slate-200 flex flex-col">
        <h3 className="font-semibold mb-2">Корзина</h3>
        <div className="flex-1 overflow-auto divide-y">
          {cart.map((ci, idx) => {
            const p = products.find(pp => pp.id === ci.productId)!;
            return (
              <div key={idx} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p?.name || "Товар"}</div>
                  <div className="text-xs text-slate-500">{fmt(ci.price)} × {ci.qty} = {fmt(ci.price * ci.qty)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="px-2 py-1 border rounded-lg" onClick={() => setCart(cart => cart.map(x => x === ci ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>−</button>
                  <input className="w-16 text-center border rounded-lg py-1" type="number" value={ci.qty} onChange={e => setCart(cart => cart.map(x => x === ci ? { ...x, qty: Math.max(1, Number(e.target.value)||1) } : x))} />
                  <button className="px-2 py-1 border rounded-lg" onClick={() => setCart(cart => cart.map(x => x === ci ? { ...x, qty: x.qty + 1 } : x))}>+</button>
                  <button className="ml-2 px-2 py-1 border rounded-lg" onClick={() => setCart(cart.filter(x => x !== ci))}>Удалить</button>
                </div>
              </div>
            );
          })}
          {cart.length === 0 && <div className="py-10 text-center text-slate-500">Корзина пуста</div>}
        </div>
        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Итого</span>
            <span>{fmt(total)}</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input className="border rounded-xl px-3 py-2 w-40" type="number" placeholder="Наличные" value={cash} onChange={e => setCash(Number(e.target.value)||0)} />
            <div className="text-sm text-slate-500">Сдача: <strong>{fmt(change)}</strong></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-50" disabled={cart.length===0} onClick={finalize}>Пробить чек</button>
            <button className="px-4 py-2 rounded-xl border" onClick={() => setCart([])}>Очистить корзину</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function printReceipt(sale: Sale, products: Product[]) {
  const lines: string[] = [];
  lines.push("Локальная касса");
  lines.push("Чек № " + sale.id);
  lines.push(dtfmt(sale.createdAt));
  lines.push("---------------------------");
  for (const it of sale.items) {
    const p = products.find(pp => pp.id === it.productId);
    const sum = (it.qty * it.price).toFixed(2);
    lines.push(`${p?.name || "Товар"} x${it.qty} — ${sum}`);
  }
  lines.push("---------------------------");
  lines.push("Итого: " + sale.subtotal.toFixed(2));
  lines.push("Оплачено: " + sale.cashReceived.toFixed(2));
  lines.push("Сдача: " + sale.change.toFixed(2));
  lines.push("Спасибо за покупку!");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Чек ${sale.id}</title>
    <style>
      body{font:14px/1.3 monospace;margin:0;padding:16px}
      .ticket{width:260px}
      @media print { body{margin:0} }
    </style>
  </head><body><div class="ticket">${lines.map(l => `<div>${escapeHtml(l)}</div>`).join("")}</div>
    <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),200)};<\/script>
  </body></html>`;

  const w = window.open("", "_blank", "width=320,height=600");
  if (w) {
    w.document.write(html);
    w.document.close();
  } else {
    alert("Разрешите всплывающие окна для печати чека.");
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Экран: Приход/Списание ---
function StockScreen({ products, setProducts, moves, setMoves }: { products: Product[]; setProducts: (p: Product[]) => void; moves: StockMove[]; setMoves: (m: StockMove[]) => void; }) {
  const [productId, setProductId] = useState<string>(products[0]?.id || "");
  const [delta, setDelta] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].id);
  }, [products, productId]);

  const apply = () => {
    const p = products.find(x => x.id === productId);
    if (!p) return alert("Выберите товар");
    if (!delta) return alert("Укажите количество (может быть отрицательным)");
    const updated = products.map(x => x.id === productId ? { ...x, stock: x.stock + delta } : x);
    setProducts(updated);
    const move: StockMove = { id: uid(), productId, delta, reason: "adjust", createdAt: new Date().toISOString(), comment };
    setMoves([move, ...moves]);
    setDelta(0);
    setComment("");
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 border border-slate-200 max-w-xl">
      <div className="grid gap-3">
        <select className="border rounded-xl px-3 py-2" value={productId} onChange={e => setProductId(e.target.value)}>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} (ост: {p.stock})</option>)}
        </select>
        <input className="border rounded-xl px-3 py-2" type="number" placeholder="Кол-во (например, 10 или -3)" value={delta} onChange={e => setDelta(Number(e.target.value)||0)} />
        <input className="border rounded-xl px-3 py-2" placeholder="Комментарий (необязательно)" value={comment} onChange={e => setComment(e.target.value)} />
        <button className="px-4 py-2 rounded-xl bg-slate-900 text-white" onClick={apply}>Применить</button>
      </div>
      <div className="mt-6">
        <h3 className="font-semibold mb-2">История движений</h3>
        <div className="max-h-[50vh] overflow-auto divide-y text-sm">
          {moves.map(m => {
            const p = products.find(x => x.id === m.productId);
            return (
              <div key={m.id} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p?.name || m.productId}</div>
                  <div className="text-xs text-slate-500">{dtfmt(m.createdAt)} • {m.reason} {m.comment ? `• ${m.comment}` : ""}</div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-sm ${m.delta>=0?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}`}>{m.delta>0?`+${m.delta}`:m.delta}</div>
              </div>
            );
          })}
          {moves.length === 0 && <div className="py-8 text-center text-slate-500">Пока нет движений</div>}
        </div>
      </div>
    </div>
  );
}

// --- Экран: Отчёты ---
function ReportsScreen({ sales, products }: { sales: Sale[]; products: Product[]; }) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const filtered = useMemo(() => {
    const f = from ? new Date(from).getTime() : -Infinity;
    const t = to ? new Date(to).getTime() + 24*60*60*1000 : Infinity; // включительно
    return sales.filter(s => {
      const d = new Date(s.createdAt).getTime();
      return d >= f && d < t;
    });
  }, [sales, from, to]);

  const total = filtered.reduce((sum, s) => sum + s.subtotal, 0);

  // ТОП товаров
  const topMap = new Map<string, number>();
  for (const s of filtered) {
    for (const it of s.items) {
      topMap.set(it.productId, (topMap.get(it.productId) || 0) + it.qty);
    }
  }
  const top = [...topMap.entries()].sort((a,b) => b[1]-a[1]).slice(0, 10);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="bg-white rounded-2xl shadow p-4 border border-slate-200">
        <h3 className="font-semibold mb-3">Продажи за период</h3>
        <div className="flex gap-2 mb-3">
          <input type="date" className="border rounded-xl px-3 py-2" value={from} onChange={e => setFrom(e.target.value)} />
          <input type="date" className="border rounded-xl px-3 py-2" value={to} onChange={e => setTo(e.target.value)} />
          <button className="px-3 py-2 rounded-xl border" onClick={() => { setFrom(""); setTo(""); }}>Сброс</button>
        </div>
        <div className="text-lg font-bold">Итого: {fmt(total)}</div>
        <div className="mt-4 max-h-[50vh] overflow-auto divide-y text-sm">
          {filtered.map(s => (
            <div key={s.id} className="py-2">
              <div className="font-medium">Чек {s.id.slice(-6)} — {fmt(s.subtotal)}</div>
              <div className="text-xs text-slate-500">{dtfmt(s.createdAt)} • позиций: {s.items.length}</div>
            </div>
          ))}
          {filtered.length===0 && <div className="py-8 text-center text-slate-500">Нет продаж</div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 border border-slate-200">
        <h3 className="font-semibold mb-3">ТОП-10 товаров по количеству</h3>
        <div className="divide-y text-sm max-h-[60vh] overflow-auto">
          {top.map(([pid, qty]) => {
            const p = products.find(x => x.id === pid);
            return (
              <div key={pid} className="py-2 flex items-center justify-between">
                <div className="truncate">{p?.name || pid}</div>
                <div className="font-semibold">{qty}</div>
              </div>
            );
          })}
          {top.length===0 && <div className="py-8 text-center text-slate-500">Нет данных</div>}
        </div>
      </div>
    </div>
  );
}

// --- Экран: Резерв/Импорт ---
function BackupScreen({ products, sales, moves, onImport }: { products: Product[]; sales: Sale[]; moves: StockMove[]; onImport: (p: Product[], s: Sale[], m: StockMove[]) => void; }) {
  const exportData = () => {
    const data = { products, sales, moves };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `offline-pos-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const json = JSON.parse(String(fr.result));
        if (!json || !Array.isArray(json.products) || !Array.isArray(json.sales) || !Array.isArray(json.moves)) {
          throw new Error("Неверный формат файла");
        }
        onImport(json.products, json.sales, json.moves);
        alert("Импорт выполнен");
      } catch (e:any) {
        alert("Ошибка импорта: " + e.message);
      }
    };
    fr.readAsText(file);
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 border border-slate-200 max-w-xl grid gap-3">
      <button className="px-4 py-2 rounded-xl bg-slate-900 text-white" onClick={exportData}>Экспортировать резервную копию (.json)</button>
      <label className="block">
        <span className="block mb-2">Импортировать из файла (.json)</span>
        <input type="file" accept="application/json" onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); }} />
      </label>
      <p className="text-xs text-slate-500">
        Совет: для серьёзной нагрузки лучше хранить данные в SQLite. Эту веб-версию можно затем упаковать в
        настольное приложение (Tauri/Electron) и заменить localStorage на SQLite.
      </p>
    </div>
  );
}
