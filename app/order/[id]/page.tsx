'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { hhmm, money, usePoll } from '@/lib/client';
import { AppHeader, Card, Loading } from '@/components/ui';

function orderStage(o: any): number {
  if (o.kind === 'delivery') {
    if (o.delivery_status === 'delivered') return 4;
    if (o.delivery_status === 'on_the_way') return 3;
    if (o.status === 'ready' || o.delivery_status === 'ready') return 2;
    return 1;
  }
  if (o.status === 'done') return 3;
  if (o.status === 'ready') return 2;
  return 1;
}

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = usePoll('order', { id });
  if (!data) return <Loading />;
  const o = data.order;
  if (!o) return <div className="p-10 text-center">הזמנה לא נמצאה</div>;
  const isDel = o.kind === 'delivery';
  const steps = isDel ? ['התקבלה', 'בהכנה', 'מוכנה', 'בדרך אליך', 'נמסרה'] : ['התקבלה', 'בהכנה', 'מוכנה לאיסוף', 'נאספה'];
  const stage = orderStage(o);

  return (
    <div className="min-h-screen">
      <AppHeader title={`הזמנה #${o.id}`} subtitle={`${data.settings.restaurant_name} · ${isDel ? 'משלוח' : 'איסוף עצמי'}`} />
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Card className="p-5 text-center">
          <div className="text-5xl">{['📥', '👨‍🍳', '✅', isDel ? '🛵' : '🛍️', '🎉'][Math.min(stage, 4)]}</div>
          <div className="mt-2 text-2xl font-black">{steps[stage]}</div>
          {isDel && o.courier && <div className="mt-1 text-ink-500">השליח/ה {o.courier.name} ({o.courier.vehicle}) · {o.courier.phone}</div>}
          <div className="mt-5 flex items-center">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div className={`h-1 flex-1 ${i === 0 ? 'invisible' : i <= stage ? 'bg-brand-500' : 'bg-ink-200'}`} />
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i <= stage ? 'bg-brand-500 text-white' : 'bg-ink-200 text-ink-500'}`}>{i < stage ? '✓' : i + 1}</div>
                  <div className={`h-1 flex-1 ${i === steps.length - 1 ? 'invisible' : i < stage ? 'bg-brand-500' : 'bg-ink-200'}`} />
                </div>
                <div className="mt-1 text-[11px] text-ink-500">{s}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-400">העמוד מתעדכן אוטומטית</p>
        </Card>
        <Card className="p-4 text-sm">
          <div className="mb-2 flex justify-between text-ink-500"><span>הוזמן ב-{hhmm(o.created_at)}</span><span>שולם · {money(o.total)}</span></div>
          {o.items.map((i: any) => <div key={i.id} className="flex justify-between py-0.5"><span>{i.qty}× {i.name}</span><span>{money(i.price * i.qty)}</span></div>)}
          {isDel && <div className="mt-2 border-t border-ink-100 pt-2 text-ink-500">📍 {o.address}</div>}
        </Card>
        <div className="text-center text-sm"><Link className="text-brand-600 underline" href="/order">הזמנה חדשה</Link> · <Link className="text-brand-600 underline" href="/delivery">מסך המשלוחים במסעדה ←</Link></div>
      </div>
    </div>
  );
}
