'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { act, ago, hhmm, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading } from '@/components/ui';

const DS: Record<string, [string, 'amber' | 'blue' | 'green' | 'brand' | 'ink']> = {
  pending: ['בהכנה · ממתין לשליח', 'amber'],
  assigned: ['בהכנה · שליח שובץ', 'blue'],
  ready: ['מוכן לאיסוף שליח', 'green'],
  on_the_way: ['בדרך ללקוח', 'brand'],
  delivered: ['נמסר', 'ink'],
};

export default function DeliveryPage() {
  const { data } = usePoll('delivery');
  if (!data) return <Loading />;
  const deliveries = data.orders.filter((o: any) => o.kind === 'delivery');
  const pickups = data.orders.filter((o: any) => o.kind === 'pickup');
  const active = deliveries.filter((o: any) => o.delivery_status !== 'delivered');
  const cols = [
    { key: 'kitchen', title: '👨‍🍳 במטבח', list: active.filter((o: any) => o.status === 'new') },
    { key: 'ready', title: '✅ מוכן – ממתין לשליח', list: active.filter((o: any) => o.status !== 'new' && o.delivery_status !== 'on_the_way') },
    { key: 'way', title: '🛵 בדרך', list: active.filter((o: any) => o.delivery_status === 'on_the_way') },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader title="משלוחים" subtitle={`${active.length} משלוחים פעילים · ${pickups.filter((p: any) => p.status !== 'done').length} איסופים`}
        right={<Link href="/order" className="hidden rounded-xl bg-brand-500 px-3 py-2 text-sm font-bold text-white sm:block">+ הזמנה חדשה</Link>} />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {data.couriers.map((c: any) => (
            <Card key={c.id} className="flex items-center gap-3 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-xl">🛵</div>
              <div className="flex-1"><div className="font-bold">{c.name}</div><div className="text-xs text-ink-500">{c.vehicle} · {c.phone}</div></div>
              <Badge color={c.active ? 'amber' : 'green'}>{c.active ? `${c.active} משלוחים` : 'פנוי'}</Badge>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {cols.map((col) => (
            <div key={col.key} className="rounded-2xl bg-ink-100/70 p-3">
              <h3 className="mb-2 flex items-center justify-between font-bold">{col.title}<span className="rounded-full bg-white px-2 text-sm">{col.list.length}</span></h3>
              <div className="space-y-2">
                {col.list.length === 0 && <div className="py-6 text-center text-sm text-ink-400">—</div>}
                {col.list.map((o: any) => <DeliveryCard key={o.id} o={o} couriers={data.couriers} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-2 font-bold">🛍️ איסוף עצמי</h3>
            {pickups.length === 0 && <div className="text-sm text-ink-400">אין הזמנות לאיסוף</div>}
            {pickups.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between border-t border-ink-100 py-2 text-sm first:border-0">
                <div><b>#{o.id} {o.customer_name}</b> · {o.items.map((i: any) => i.name).join(', ')}<div className="text-xs text-ink-500">{hhmm(o.created_at)} · {o.phone}</div></div>
                {o.status === 'new' && <Badge color="amber">בהכנה</Badge>}
                {o.status === 'ready' && <Button size="sm" variant="success" onClick={() => act('pickupCollected', { orderId: o.id })}>נאסף ✓</Button>}
                {o.status === 'done' && <Badge>נאסף</Badge>}
              </div>
            ))}
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 font-bold">📦 נמסרו לאחרונה</h3>
            {deliveries.filter((o: any) => o.delivery_status === 'delivered').slice(0, 8).map((o: any) => (
              <div key={o.id} className="flex justify-between border-t border-ink-100 py-2 text-sm first:border-0">
                <span>#{o.id} {o.customer_name} · {o.courier?.name || '—'}</span><span>{money(o.total)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ o, couriers }: { o: any; couriers: any[] }) {
  const st = DS[o.delivery_status] || DS.pending;
  return (
    <Card className="p-3 animate-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold">#{o.id} · {o.customer_name}</div>
          <div className="text-xs text-ink-500">📍 {o.address}</div>
          <div className="text-xs text-ink-500">☎️ {o.phone} · {ago(o.created_at)}</div>
        </div>
        <Badge color={st[1]}>{st[0]}</Badge>
      </div>
      <div className="mt-2 text-sm text-ink-700">{o.items.map((i: any) => `${i.qty}× ${i.name}`).join(' · ')}</div>
      {o.note && <div className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">📝 {o.note}</div>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="input w-auto flex-1 py-1.5"
          value={o.courier_id || ''}
          disabled={o.delivery_status === 'on_the_way'}
          onChange={(e) => act('assignCourier', { orderId: o.id, courierId: Number(e.target.value) }).then(() => toast('השליח שובץ'))}
        >
          <option value="" disabled>שיוך שליח…</option>
          {couriers.map((c) => <option key={c.id} value={c.id}>🛵 {c.name}</option>)}
        </select>
        {o.status !== 'new' && o.delivery_status !== 'on_the_way' && (
          <Button size="sm" disabled={!o.courier_id} onClick={() => act('deliveryStatus', { orderId: o.id, status: 'on_the_way' })}>יצא לדרך 🛵</Button>
        )}
        {o.delivery_status === 'on_the_way' && (
          <Button size="sm" variant="success" onClick={() => act('deliveryStatus', { orderId: o.id, status: 'delivered' }).then(() => toast('המשלוח נמסר 🎉'))}>נמסר ✓</Button>
        )}
        <Link href={`/order/${o.id}`} target="_blank" className="text-xs text-ink-400 underline">מעקב לקוח</Link>
      </div>
    </Card>
  );
}
