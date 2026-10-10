'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { act, money, usePoll } from '@/lib/client';
import { AppHeader, Button, Card, DietTags, Loading, Modal } from '@/components/ui';
import { PayPanel } from '@/components/pay';

const DELIVERY_FEE = 15;

export default function OrderPage() {
  const { data } = usePoll('order', {}, 10000);
  const router = useRouter();
  const [type, setType] = useState<'delivery' | 'pickup'>('delivery');
  const [cart, setCart] = useState<{ menuItemId: number; qty: number }[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [step, setStep] = useState<'details' | 'pay'>('details');
  const cats = useMemo(() => (data ? Array.from(new Set<string>(data.menu.map((m: any) => m.category))) : []), [data]);
  if (!data) return <Loading />;

  const byId = new Map<number, any>(data.menu.map((m: any) => [m.id, m]));
  const sub = cart.reduce((s, l) => s + byId.get(l.menuItemId).price * l.qty, 0);
  const total = sub + (type === 'delivery' ? DELIVERY_FEE : 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const add = (id: number, d = 1) => setCart((c) => {
    const ex = c.find((l) => l.menuItemId === id);
    if (!ex) return d > 0 ? [...c, { menuItemId: id, qty: 1 }] : c;
    return c.map((l) => (l === ex ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0);
  });
  const qtyOf = (id: number) => cart.find((l) => l.menuItemId === id)?.qty || 0;
  const valid = form.name && form.phone && (type === 'pickup' || form.address);

  const CartBody = (
    <>
      <div className="mb-3 flex rounded-xl bg-ink-100 p-1 text-sm font-semibold">
        <button className={`flex-1 rounded-lg py-2 ${type === 'delivery' ? 'bg-white shadow' : 'text-ink-500'}`} onClick={() => setType('delivery')}>🛵 משלוח</button>
        <button className={`flex-1 rounded-lg py-2 ${type === 'pickup' ? 'bg-white shadow' : 'text-ink-500'}`} onClick={() => setType('pickup')}>🛍️ איסוף עצמי</button>
      </div>
      {cart.length === 0 ? <div className="py-8 text-center text-sm text-ink-400">הסל ריק</div> : (
        <div className="divide-y divide-ink-100 text-sm">
          {cart.map((l) => {
            const m = byId.get(l.menuItemId);
            return <div key={l.menuItemId} className="flex justify-between py-2"><span>{l.qty}× {m.name}</span><span>{money(m.price * l.qty)}</span></div>;
          })}
          {type === 'delivery' && <div className="flex justify-between py-2 text-ink-500"><span>דמי משלוח</span><span>{money(DELIVERY_FEE)}</span></div>}
          <div className="flex justify-between py-2 text-lg font-black"><span>סה״כ</span><span>{money(total)}</span></div>
        </div>
      )}
      <Button size="lg" className="mt-3 w-full" disabled={!cart.length} onClick={() => { setStep('details'); setCheckout(true); }}>להזמנה · {money(total)}</Button>
      <p className="mt-2 text-center text-xs text-ink-500">{type === 'delivery' ? '⏱️ זמן משלוח משוער: 35–45 דק׳' : '⏱️ מוכן לאיסוף תוך 20 דק׳'}</p>
    </>
  );

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <AppHeader title="הזמנה אונליין" subtitle={`${data.settings.restaurant_name} · משלוחים ואיסוף עצמי`} />
      <div className="bg-gradient-to-l from-brand-500 to-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="text-3xl font-black">{data.settings.restaurant_name} עד הבית 🛵</h2>
          <p className="mt-1 text-white/85">{data.settings.address} · {data.settings.phone}</p>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {cats.map((c) => (
            <section key={c}>
              <h3 className="mb-2 text-xl font-extrabold">{c}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.menu.filter((m: any) => m.category === c).map((m: any) => (
                  <Card key={m.id} className="flex gap-3 p-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-ink-100 text-4xl">{m.emoji}</div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="font-bold">{m.name}</div>
                      <div className="line-clamp-1 text-xs text-ink-500">{m.description}</div>
                      <div className="mt-1"><DietTags item={m} small /></div>
                      <div className="mt-auto flex items-center justify-between pt-1">
                        <span className="font-extrabold">{money(m.price)}</span>
                        {qtyOf(m.id) ? (
                          <span className="flex items-center gap-2 rounded-full bg-ink-100 px-1 py-0.5">
                            <button className="h-7 w-7 rounded-full bg-white font-bold" onClick={() => add(m.id, -1)}>−</button>
                            <b className="text-sm">{qtyOf(m.id)}</b>
                            <button className="h-7 w-7 rounded-full bg-brand-500 font-bold text-white" onClick={() => add(m.id)}>+</button>
                          </span>
                        ) : (
                          <button className="rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-white" onClick={() => add(m.id)}>הוספה</button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
        <aside className="hidden lg:block">
          <Card className="sticky top-20 p-4"><h3 className="mb-3 text-lg font-bold">ההזמנה שלי</h3>{CartBody}</Card>
        </aside>
      </div>
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white p-3 lg:hidden">
          <Button size="lg" className="w-full" onClick={() => { setStep('details'); setCheckout(true); }}>{count} פריטים · להזמנה {money(total)}</Button>
        </div>
      )}
      <Modal open={checkout} onClose={() => setCheckout(false)} title={step === 'details' ? 'פרטי הזמנה' : 'תשלום'}>
        {step === 'details' ? (
          <div className="space-y-3">
            <div className="flex rounded-xl bg-ink-100 p-1 text-sm font-semibold">
              <button className={`flex-1 rounded-lg py-2 ${type === 'delivery' ? 'bg-white shadow' : 'text-ink-500'}`} onClick={() => setType('delivery')}>🛵 משלוח</button>
              <button className={`flex-1 rounded-lg py-2 ${type === 'pickup' ? 'bg-white shadow' : 'text-ink-500'}`} onClick={() => setType('pickup')}>🛍️ איסוף עצמי</button>
            </div>
            <div><label className="label">שם</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">טלפון</label><input className="input" dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            {type === 'delivery' && <div><label className="label">כתובת למשלוח</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="רחוב, מספר, דירה, עיר" /></div>}
            <div><label className="label">הערות</label><input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="למשל: בלי בצל, קוד לבניין" /></div>
            <button className="text-xs text-brand-600 underline" onClick={() => setForm({ name: 'ישראל ישראלי', phone: '050-5556677', address: 'אבן גבירול 30, תל אביב', note: '' })}>מילוי פרטי דמו</button>
            <Button size="lg" className="w-full" disabled={!valid} onClick={() => setStep('pay')}>המשך לתשלום · {money(total)}</Button>
          </div>
        ) : (
          <PayPanel amount={total} onPaid={async (method) => {
            const r = await act('onlineOrder', { orderType: type, ...form, items: cart, method });
            setTimeout(() => router.push(`/order/${r.orderId}`), 700);
          }} />
        )}
      </Modal>
    </div>
  );
}
