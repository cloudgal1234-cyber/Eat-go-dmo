'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { act, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, DietTags, Loading, Modal } from '@/components/ui';
import { PayPanel } from '@/components/pay';

export default function PlanPage() {
  const { code } = useParams<{ code: string }>();
  const { data } = usePoll('plan', { code });
  const [name, setName] = useState('');
  const [dish, setDish] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [joined, setJoined] = useState(false);
  if (!data) return <Loading />;
  const p = data.plan;
  if (!p) return (
    <div className="min-h-screen"><AppHeader title="ארוחה מתוכננת" />
      <div className="p-10 text-center text-ink-500">הקוד {code} לא נמצא. <Link className="text-brand-600 underline" href="/plan">ליצירת ארוחה חדשה</Link></div>
    </div>
  );
  const menu = data.menu.filter((m: any) => m.category !== 'שתייה');
  const chosen = data.menu.find((m: any) => m.id === dish);
  const total = data.participants.reduce((s: number, x: any) => s + x.price, 0);
  const when = new Date(p.scheduled_at);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/plan/${p.code}` : '';
  const open = p.status === 'collecting';

  return (
    <div className="min-h-screen pb-24">
      <AppHeader title="ארוחה מתוכננת" subtitle={`${data.settings.restaurant_name} · קוד ${p.code}`} />
      <div className="bg-gradient-to-l from-violet-600 to-brand-500 text-white">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-sm text-white/80">{p.host} מזמין/ה אותך ל…</div>
          <h2 className="text-3xl font-black">{p.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white/20 px-3 py-1">📅 {when.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="rounded-full bg-white/20 px-3 py-1">🕗 {when.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="rounded-full bg-white/20 px-3 py-1">📍 {data.settings.restaurant_name} · שולחן {p.table_number}</span>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-4xl gap-4 p-4 md:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          {!open ? (
            <Card className="p-6 text-center">
              <div className="text-4xl">👨‍🍳</div>
              <div className="mt-2 text-lg font-bold">ההזמנה נשלחה למטבח!</div>
              <p className="text-sm text-ink-500">כל המנות שולמו מראש ויוגשו לשולחן {p.table_number}. נתראה שם 🎉</p>
              {data.order && <Badge color={data.order.status === 'new' ? 'amber' : 'green'} className="mt-2">{data.order.status === 'new' ? 'בהכנה' : 'מוכן'}</Badge>}
            </Card>
          ) : joined ? (
            <Card className="p-6 text-center animate-in">
              <div className="text-4xl">✅</div>
              <div className="mt-2 text-lg font-bold">נרשמת ושילמת מראש!</div>
              <p className="text-sm text-ink-500">ההזמנה תיכנס למטבח אוטומטית ב-{when.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}, כך שהאוכל יחכה לכם בזמן.</p>
              <Button variant="ghost" className="mt-3" onClick={() => { setJoined(false); setName(''); setDish(null); }}>רישום משתתף/ת נוסף/ת</Button>
            </Card>
          ) : (
            <>
              <Card className="p-4">
                <label className="label">השם שלך</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="איך יקראו לך על הצלחת?" />
              </Card>
              <h3 className="pt-2 font-bold">בחר/י מנה</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {menu.map((m: any) => (
                  <button key={m.id} onClick={() => setDish(m.id)} className={`flex gap-3 rounded-2xl border-2 bg-white p-3 text-right transition ${dish === m.id ? 'border-brand-500 bg-brand-50' : 'border-ink-100'}`}>
                    <span className="text-3xl">{m.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2 font-bold"><span>{m.name}</span><span>{money(m.price)}</span></div>
                      <div className="mt-1"><DietTags item={m} small /></div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="mb-2 font-bold">👥 מי כבר בפנים ({data.participants.length}/{p.guests_expected})</h3>
            <div className="space-y-1.5 text-sm">
              {data.participants.map((x: any) => (
                <div key={x.id} className="flex items-center justify-between">
                  <span>{x.emoji} <b>{x.name}</b> · {x.dish}</span>
                  <Badge color="green">שולם</Badge>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-ink-100 pt-2 text-sm text-ink-500">סה״כ שולם מראש: <b className="text-ink-900">{money(total)}</b></div>
          </Card>
          <Card className="p-4 text-sm">
            <div className="mb-1 font-bold">🔗 שיתוף הקישור לקבוצה</div>
            <div className="truncate rounded-lg bg-ink-50 px-2 py-1.5 font-mono text-xs" dir="ltr">{link}</div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => { navigator.clipboard?.writeText(link); toast('הקישור הועתק'); }}>העתקה</Button>
              <a className="flex flex-1 items-center justify-center rounded-lg bg-[#25d366] px-3 py-1.5 text-sm font-semibold text-white" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`בואו לחגוג איתי! ${p.title} – בחרו מנה ושלמו מראש: ${link}`)}`}>וואטסאפ</a>
            </div>
          </Card>
          {open && (
            <Card className="p-4 text-sm">
              <div className="text-ink-500">🧪 להדגמה: לא צריך לחכות לשעה שנקבעה</div>
              <Button size="sm" variant="dark" className="mt-2 w-full" onClick={() => act('planSendNow', { code: p.code }).then(() => toast('ההזמנה נשלחה למטבח 🔥'))}>שליחה למטבח עכשיו</Button>
            </Card>
          )}
        </div>
      </div>
      {open && !joined && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white p-3">
          <div className="mx-auto max-w-4xl">
            <Button size="lg" className="w-full" disabled={!name.trim() || !dish} onClick={() => setPaying(true)}>
              {chosen ? `תשלום מראש · ${chosen.name} · ${money(chosen.price)}` : 'בחרו שם ומנה'}
            </Button>
          </div>
        </div>
      )}
      <Modal open={paying} onClose={() => setPaying(false)} title="תשלום מראש">
        {chosen && <PayPanel amount={chosen.price} onPaid={async (method) => {
          await act('planJoin', { code: p.code, name: name.trim(), menuItemId: dish, method });
          setTimeout(() => { setPaying(false); setJoined(true); }, 800);
        }} />}
      </Modal>
    </div>
  );
}
