'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { act, hhmm, METHODS, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Button, Card, Loading, Modal } from '@/components/ui';

const VAT = 0.18;

export default function PosPage() {
  const { data } = usePoll('pos', {}, 4000);
  const [cat, setCat] = useState<string | null>(null);
  const [cart, setCart] = useState<{ menuItemId: number; qty: number }[]>([]);
  const [kitchen, setKitchen] = useState(true);
  const [receipt, setReceipt] = useState<any>(null);
  const [zOpen, setZOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const cats = useMemo(() => (data ? Array.from(new Set<string>(data.menu.map((m: any) => m.category))) : []), [data]);
  if (!data) return <Loading />;
  const current = cat ?? cats[0];
  const byId = new Map<number, any>(data.menu.map((m: any) => [m.id, m]));
  const total = cart.reduce((s, l) => s + byId.get(l.menuItemId).price * l.qty, 0);
  const add = (id: number) => setCart((c) => (c.find((l) => l.menuItemId === id) ? c.map((l) => (l.menuItemId === id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { menuItemId: id, qty: 1 }]));
  const sell = async (method: string) => {
    setBusy(true);
    try {
      const r = await act('posSale', { items: cart, method, sendToKitchen: kitchen });
      setReceipt({ ...r.receipt, method });
      setCart([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader
        title="קופה"
        subtitle={`משמרת מ-${hhmm(data.shift.from)} · ${data.shift.transactions} עסקאות`}
        right={<div className="hidden text-left sm:block"><div className="text-xs text-ink-500">מכירות מאז סגירה</div><div className="font-black">{money(data.shift.total)}</div></div>}
      />
      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
            {cats.map((c) => <button key={c} className={`chip ${current === c ? 'chip-on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {data.menu.filter((m: any) => m.category === current).map((m: any) => (
              <button key={m.id} onClick={() => add(m.id)} className="flex flex-col items-start rounded-2xl border border-ink-100 bg-white p-4 text-right shadow-card transition hover:border-brand-300 active:scale-[.97]">
                <span className="text-3xl">{m.emoji}</span>
                <span className="mt-2 font-bold leading-tight">{m.name}</span>
                <span className="mt-1 text-lg font-black text-brand-600">{money(m.price)}</span>
              </button>
            ))}
          </div>
          <Card className="mt-6 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">קבלות אחרונות</h3>
              <Button variant="dark" size="sm" onClick={() => setZOpen(true)}>🔒 סגירת יום (Z)</Button>
            </div>
            <div className="divide-y divide-ink-100 text-sm">
              {data.receipts.length === 0 && <div className="py-3 text-ink-400">אין עדיין מכירות בקופה</div>}
              {data.receipts.map((r: any) => (
                <button key={r.id} className="flex w-full items-center justify-between py-2 text-right hover:bg-ink-50" onClick={() => setReceipt({ ...r, method: r.pay_method })}>
                  <span>#{r.id} · {hhmm(r.created_at)} · {r.items.map((i: any) => i.name).join(', ')}</span>
                  <span className="font-semibold">{money(r.total)}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex flex-col p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start">
          <h2 className="mb-2 text-lg font-bold">מכירה מהירה</h2>
          <div className="min-h-[120px] flex-1 divide-y divide-ink-100 overflow-y-auto">
            {cart.length === 0 && <div className="py-10 text-center text-sm text-ink-400">הקישו על מנה כדי להוסיף</div>}
            {cart.map((l) => {
              const m = byId.get(l.menuItemId);
              return (
                <div key={l.menuItemId} className="flex items-center gap-2 py-2">
                  <span className="flex-1 text-sm font-semibold">{m.name}</span>
                  <button className="h-7 w-7 rounded-lg bg-ink-100" onClick={() => setCart(cart.map((x) => (x === l ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0))}>−</button>
                  <span className="w-5 text-center font-bold">{l.qty}</span>
                  <button className="h-7 w-7 rounded-lg bg-ink-100" onClick={() => add(l.menuItemId)}>+</button>
                  <span className="w-14 text-left font-semibold">{money(m.price * l.qty)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 border-t border-ink-100 pt-3">
            <div className="flex justify-between text-sm text-ink-500"><span>מתוכו מע״מ 18%</span><span>{money(total - total / (1 + VAT))}</span></div>
            <div className="flex justify-between text-2xl font-black"><span>סה״כ</span><span>{money(total)}</span></div>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-500" checked={kitchen} onChange={(e) => setKitchen(e.target.checked)} /> שליחה למסך המטבח</label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="lg" variant="success" disabled={!cart.length || busy} onClick={() => sell('cash')}>💵 מזומן</Button>
              <Button size="lg" variant="dark" disabled={!cart.length || busy} onClick={() => sell('card')}>💳 אשראי</Button>
              <Button variant="outline" disabled={!cart.length || busy} onClick={() => sell('apple')}> Pay / G Pay</Button>
              <Button variant="outline" disabled={!cart.length || busy} onClick={() => sell('bit')}>ביט</Button>
            </div>
            {cart.length > 0 && <button className="mt-2 w-full text-sm text-ink-400" onClick={() => setCart([])}>ניקוי</button>}
          </div>
        </Card>
      </div>

      {receipt && <Receipt r={receipt} settings={data.settings} onClose={() => setReceipt(null)} />}
      {zOpen && <ZReport shift={data.shift} closures={data.closures} onClose={() => setZOpen(false)} />}
    </div>
  );
}

function Receipt({ r, settings, onClose }: { r: any; settings: any; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="קבלה">
      <div className="mx-auto max-w-xs bg-[repeating-linear-gradient(0deg,#fff,#fff_23px,#fafafa_24px)] px-5 py-6 font-mono text-sm shadow-inner ring-1 ring-ink-100">
        <div className="text-center">
          <div className="text-base font-bold">{settings.restaurant_name}</div>
          <div className="text-xs">{settings.address}</div>
          <div className="text-xs">ע.מ. 000000000 (דמו)</div>
          <div className="mt-2 text-xs">קבלה מס׳ {String(r.id).padStart(5, '0')}</div>
          <div className="text-xs">{new Date(r.created_at).toLocaleString('he-IL')}</div>
        </div>
        <div className="my-3 border-t border-dashed border-ink-300" />
        {r.items.map((i: any) => (
          <div key={i.id} className="flex justify-between"><span>{i.qty}× {i.name}</span><span>{(i.price * i.qty).toFixed(2)}</span></div>
        ))}
        <div className="my-3 border-t border-dashed border-ink-300" />
        <div className="flex justify-between text-xs"><span>לפני מע״מ</span><span>{(r.total / (1 + VAT)).toFixed(2)}</span></div>
        <div className="flex justify-between text-xs"><span>מע״מ 18%</span><span>{(r.total - r.total / (1 + VAT)).toFixed(2)}</span></div>
        <div className="mt-1 flex justify-between text-base font-bold"><span>סה״כ</span><span>₪{r.total.toFixed(2)}</span></div>
        <div className="mt-1 flex justify-between text-xs"><span>אמצעי תשלום</span><span>{METHODS[r.method] || r.method}</span></div>
        <div className="my-3 border-t border-dashed border-ink-300" />
        <div className="text-center text-[11px]">*** קבלה מדומה – אינה מסמך חשבונאי ***</div>
        <div className="mt-1 text-center text-[11px]">Powered by AET GO</div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => window.print()}>🖨️ הדפסה</Button>
        <Button className="flex-1" onClick={() => { toast('הקבלה נשלחה ב-SMS (מדומה)'); onClose(); }}>📲 שליחה ב-SMS</Button>
      </div>
    </Modal>
  );
}

function ZReport({ shift, closures, onClose }: { shift: any; closures: any[]; onClose: () => void }) {
  const [done, setDone] = useState<any>(null);
  const s = done || { ...shift, by_method: shift.byMethod };
  const bm = done ? done.by_method : shift.byMethod;
  return (
    <Modal open onClose={onClose} title={done ? '✅ היום נסגר – דוח Z' : 'סגירת יום – דוח X'}>
      <div className="space-y-2 rounded-2xl bg-ink-50 p-4 text-sm">
        <div className="flex justify-between"><span>מתאריך</span><span>{new Date(done ? done.from_ts : shift.from).toLocaleString('he-IL')}</span></div>
        <div className="flex justify-between"><span>הזמנות</span><b>{done ? done.orders_count : shift.orders}</b></div>
        <div className="flex justify-between"><span>עסקאות</span><b>{s.transactions}</b></div>
        {Object.entries(bm || {}).map(([k, v]) => (
          <div key={k} className="flex justify-between text-ink-600"><span>{METHODS[k] || k}</span><span>{money(v as number)}</span></div>
        ))}
        <div className="flex justify-between text-ink-600"><span>טיפים</span><span>{money(s.tips || 0)}</span></div>
        <div className="flex justify-between border-t border-ink-200 pt-2 text-lg font-black"><span>סה״כ מכירות</span><span>{money(done ? done.total : shift.total)}</span></div>
      </div>
      {!done ? (
        <Button size="lg" variant="dark" className="mt-4 w-full" onClick={async () => { const r = await act('closeDay'); setDone(r.closure); }}>
          אישור וסגירת יום
        </Button>
      ) : (
        <p className="mt-3 text-center text-sm text-ink-500">הדוח נשמר. מונה המשמרת התאפס. (ללא דיווח אמיתי לרשות המסים)</p>
      )}
      {closures.length > 0 && !done && (
        <div className="mt-4 text-xs text-ink-500">
          <div className="mb-1 font-semibold">סגירות קודמות</div>
          {closures.map((c) => <div key={c.id} className="flex justify-between"><span>{new Date(c.closed_at).toLocaleString('he-IL')}</span><span>{money(c.total)}</span></div>)}
        </div>
      )}
    </Modal>
  );
}
