'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { act, hhmm, toast, usePoll } from '@/lib/client';
import { AppHeader, Loading } from '@/components/ui';

const KIND_LABEL: Record<string, string> = {
  table: 'שולחן',
  pos: 'קופה',
  delivery: 'משלוח',
  pickup: 'איסוף עצמי',
  plan: 'ארוחה מתוכננת',
};

function source(o: any) {
  if (o.kind === 'table') return `שולחן ${o.table_number}`;
  if (o.kind === 'plan') return `🎉 ${o.customer_name} · שולחן ${o.table_number}`;
  if (o.kind === 'delivery') return `🛵 משלוח · ${o.customer_name}`;
  if (o.kind === 'pickup') return `🛍️ איסוף · ${o.customer_name}`;
  return '🧾 קופה';
}

export default function KitchenPage() {
  const { data } = usePoll('kitchen');
  if (!data) return <div className="min-h-screen bg-ink-950"><Loading /></div>;
  const now = data.now;

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <AppHeader
        dark
        title="מסך מטבח"
        subtitle={`${data.active.length} הזמנות פתוחות · מתעדכן בזמן אמת`}
        right={<div className="hidden font-mono text-2xl font-bold tabular-nums sm:block">{hhmm(now)}</div>}
      />
      {data.upcoming.length > 0 && (
        <div className="border-b border-ink-800 bg-ink-900 px-4 py-2 text-sm text-ink-300">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-1">
            {data.upcoming.map((p: any) => (
              <span key={p.code}>🗓️ מתוכנן: <b className="text-white">{p.title}</b> · {new Date(p.scheduled_at).toLocaleString('he-IL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · {p.count} מנות שולמו · ייכנס אוטומטית בשעה שנקבעה</span>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div>
          {data.active.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-ink-700 text-ink-400">
              <div className="text-5xl">✨</div>
              <div className="mt-2">אין הזמנות פתוחות. זמן לנקות את הפס.</div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.active.map((o: any) => {
                const mins = Math.floor((now - o.created_at) / 60000);
                const tone = mins >= 20 ? 'bg-rose-600' : mins >= 10 ? 'bg-amber-500' : 'bg-emerald-600';
                return (
                  <div key={o.id} className="flex flex-col overflow-hidden rounded-2xl bg-ink-900 ring-1 ring-ink-800 animate-in">
                    <div className={`flex items-center justify-between px-4 py-2.5 ${tone}`}>
                      <span className="font-bold">{source(o)}</span>
                      <span className="font-mono font-bold tabular-nums">{mins}:{String(Math.floor(((now - o.created_at) / 1000) % 60)).padStart(2, '0')}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 pt-2 text-xs text-ink-400">
                      <span>#{o.id} · {hhmm(o.created_at)}</span>
                      <span>{KIND_LABEL[o.kind]}</span>
                    </div>
                    <div className="flex-1 space-y-1.5 px-4 py-3">
                      {o.items.map((i: any) => (
                        <div key={i.id}>
                          <div className="flex gap-2 text-lg font-semibold"><span className="min-w-[2ch] text-brand-400">{i.qty}×</span>{i.name}</div>
                          {i.note && <div className="mr-7 rounded-md bg-amber-400/15 px-2 py-0.5 text-sm text-amber-300">📝 {i.note}</div>}
                        </div>
                      ))}
                      {o.note && o.kind !== 'plan' && <div className="rounded-md bg-amber-400/15 px-2 py-1 text-sm text-amber-300">📝 {o.note}</div>}
                      {o.kind === 'plan' && o.note && <div className="text-xs text-ink-400">משתתפים: {o.note}</div>}
                      {o.allergies?.map((a: any, k: number) => (
                        <div key={k} className="rounded-md bg-rose-500/20 px-2 py-1 text-sm font-semibold text-rose-300">⚠️ אלרגיה – {a.name}: {a.allergies}</div>
                      ))}
                    </div>
                    <button
                      className="m-3 mt-0 rounded-xl bg-emerald-500 py-3.5 text-lg font-bold text-white transition hover:bg-emerald-400 active:scale-[.98]"
                      onClick={() => act('markReady', { orderId: o.id }).then(() => toast(`הזמנה #${o.id} מוכנה ✅`))}
                    >
                      ✓ מוכן
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <aside className="rounded-2xl bg-ink-900 p-4 ring-1 ring-ink-800">
          <h2 className="mb-3 font-bold text-ink-200">מוכנות לאחרונה</h2>
          <div className="space-y-2">
            {data.ready.length === 0 && <div className="text-sm text-ink-500">—</div>}
            {data.ready.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl bg-ink-800 px-3 py-2 text-sm">
                <div>
                  <div className="font-semibold">{source(o)}</div>
                  <div className="text-xs text-ink-400">#{o.id} · {o.status === 'ready' ? 'ממתין להגשה/איסוף' : 'יצא'} · {o.ready_at ? hhmm(o.ready_at) : ''}</div>
                </div>
                {o.status === 'ready' && (
                  <button className="text-xs text-ink-400 underline" onClick={() => act('undoReady', { orderId: o.id })}>החזר</button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
