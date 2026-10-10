'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { act, ago, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading, Modal, Stat } from '@/components/ui';

const q = (n: number) => String(Math.round(n * 100) / 100);

export default function InventoryPage() {
  const { data } = usePoll('inventory');
  const [ordering, setOrdering] = useState<any>(null);
  const [qty, setQty] = useState(10);
  const [showRecipes, setShowRecipes] = useState(false);
  if (!data) return <Loading />;
  const low = data.items.filter((i: any) => i.qty < i.min_qty);
  const pending = data.purchaseOrders.filter((p: any) => p.status === 'sent');
  const value = data.items.reduce((s: number, i: any) => s + i.qty * i.cost, 0);
  const openOrder = (i: any) => { setOrdering(i); setQty(Math.max(1, Math.ceil(i.min_qty * 2 - i.qty))); };
  const dishes = Array.from(new Set<string>(data.recipes.map((r: any) => r.dish)));

  return (
    <div className="min-h-screen">
      <AppHeader title="מלאי וספקים" subtitle="כל מכירה מורידה מלאי אוטומטית לפי המתכון" />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="פריטים במלאי" value={data.items.length} />
          <Stat label="מלאי נמוך" value={<span className={low.length ? 'text-rose-600' : ''}>{low.length}</span>} sub="מתחת למינימום" />
          <Stat label="הזמנות סחורה פתוחות" value={pending.length} />
          <Stat label="שווי מלאי" value={money(Math.round(value))} />
        </div>
        {low.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <b>⚠️ מלאי נמוך:</b>
            {low.map((i: any) => <button key={i.id} className="rounded-full bg-white px-2.5 py-1 font-semibold ring-1 ring-rose-200 hover:bg-rose-100" onClick={() => openOrder(i)}>{i.name} · הזמנה</button>)}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="bg-ink-50 text-ink-600"><th className="p-3 text-right">פריט</th><th className="p-3 text-right">ספק</th><th className="p-3 text-right">כמות</th><th className="p-3" /></tr></thead>
              <tbody>
                {data.items.map((i: any) => {
                  const isLow = i.qty < i.min_qty;
                  const pct = Math.min(100, (i.qty / (i.min_qty * 3)) * 100);
                  return (
                    <tr key={i.id} className={`border-t border-ink-100 ${isLow ? 'bg-rose-50/50' : ''}`}>
                      <td className="p-3 font-semibold">{i.name} {isLow && <Badge color="red">נמוך</Badge>}</td>
                      <td className="p-3 text-ink-500">{i.supplier}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-ink-100">
                            <div className={`h-full rounded-full ${isLow ? 'bg-rose-500' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="tabular-nums">{q(i.qty)} {i.unit}</span>
                          <span className="text-xs text-ink-400">/ מינ׳ {q(i.min_qty)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-left"><Button size="sm" variant={isLow ? 'primary' : 'ghost'} onClick={() => openOrder(i)}>הזמנה</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="mb-2 font-bold">🚚 הזמנות סחורה</h3>
              <div className="space-y-2">
                {data.purchaseOrders.length === 0 && <div className="text-sm text-ink-400">אין הזמנות</div>}
                {data.purchaseOrders.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-ink-100 p-2.5 text-sm">
                    <div>
                      <div className="font-semibold">{q(p.qty)} {p.unit} {p.item}</div>
                      <div className="text-xs text-ink-500">{p.supplier} · {ago(p.created_at)} {p.source === 'whatsapp' && '· 💬 מהצ׳אט'}</div>
                    </div>
                    {p.status === 'sent'
                      ? <Button size="sm" variant="success" onClick={() => act('receivePO', { id: p.id }).then(() => toast('הסחורה התקבלה והמלאי עודכן'))}>קבלת סחורה</Button>
                      : <Badge color="green">התקבל ✓</Badge>}
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="mb-2 font-bold">🏪 ספקים</h3>
              {data.suppliers.map((s: any) => (
                <div key={s.id} className="flex justify-between border-t border-ink-100 py-2 text-sm first:border-0">
                  <div><b>{s.name}</b><div className="text-xs text-ink-500">{s.category} · איש קשר: {s.contact}</div></div>
                  <div className="text-left text-xs text-ink-500" dir="ltr">{s.phone}<div>{s.lead_days}d</div></div>
                </div>
              ))}
            </Card>
          </div>
        </div>
        <Card className="p-4">
          <button className="flex w-full items-center justify-between font-bold" onClick={() => setShowRecipes(!showRecipes)}>
            <span>📖 מתכונים – כמה כל מנה מורידה מהמלאי</span><span>{showRecipes ? '▲' : '▼'}</span>
          </button>
          {showRecipes && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dishes.map((d) => (
                <div key={d} className="rounded-xl bg-ink-50 p-3 text-sm">
                  <div className="font-semibold">{d}</div>
                  <div className="text-xs text-ink-500">{data.recipes.filter((r: any) => r.dish === d).map((r: any) => `${r.item} ${q(r.qty)} ${r.unit}`).join(' · ')}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Modal open={!!ordering} onClose={() => setOrdering(null)} title="הזמנת סחורה">
        {ordering && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600"><b>{ordering.name}</b> מ<b>{ordering.supplier}</b> · במלאי: {q(ordering.qty)} {ordering.unit}</p>
            <div><label className="label">כמות ({ordering.unit})</label><input type="number" className="input" value={qty} min={1} onChange={(e) => setQty(Number(e.target.value))} /></div>
            <div className="text-sm text-ink-500">עלות משוערת: {money(Math.round(qty * ordering.cost))}</div>
            <Button className="w-full" onClick={() => act('orderStock', { inventoryId: ordering.id, qty }).then(() => { toast('ההזמנה נשלחה לספק (מדומה)'); setOrdering(null); })}>שליחת הזמנה לספק</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
