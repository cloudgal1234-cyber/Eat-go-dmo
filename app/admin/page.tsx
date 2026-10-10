'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { act, ago, hhmm, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading, LogoMark, ResetDemoButton, Stat } from '@/components/ui';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function AdminPage() {
  const { data } = usePoll('admin');
  if (!data) return <Loading />;
  const negative = data.alerts.filter((a: any) => a.kind === 'feedback' && !a.seen);

  return (
    <div className="min-h-screen">
      <AppHeader title="לוח מנהל" subtitle={`${data.settings.restaurant_name} · ${new Date(data.now).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}`} right={
        <div className="flex items-center gap-2">
          <Link href="/team" className="chip text-xs">👥 עובדים</Link>
          <Link href="/admin/payroll" className="chip text-xs">💰 משכורות</Link>
          <ResetDemoButton className="hidden lg:inline-flex" />
        </div>
      } />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        {negative.map((a: any) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-rose-600 p-4 text-white shadow-lg animate-in">
            <span className="text-3xl">🚨</span>
            <div className="flex-1"><div className="font-bold">משוב שלילי בזמן אמת</div><div className="text-sm text-white/90">{a.message} · {ago(a.created_at)}</div></div>
            <Button variant="outline" size="sm" className="!border-white/30 !bg-white/10 !text-white" onClick={() => act('dismissAlert', { id: a.id })}>טיפלתי ✓</Button>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat accent label="מכירות היום" value={money(data.sales.total)} sub={`+ ${money(data.sales.tips)} טיפים`} />
          <Stat label="הזמנות" value={data.sales.orders} sub={`${data.sales.transactions} תשלומים`} />
          <Stat label="שולחנות פתוחים" value={`${data.openTables.length}/12`} sub={data.openTables.length ? `שולחנות ${data.openTables.join(', ')} · ${money(data.openTotal)} פתוח` : 'אין'} />
          <Stat label="ממוצע לעסקה" value={money(data.avgCheck)} />
          <Stat label="שביעות רצון היום" value={data.feedback.avg ? `${data.feedback.avg}/5` : '—'} sub={`${data.feedback.count} משובים · ${data.feedback.negative} שליליים`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <FillUp data={data} />
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">מכירות לפי שעה</h3><span className="text-xs text-ink-500">היום</span></div>
              <SalesChart hourly={data.hourly} />
              {data.top.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="text-ink-500">🔥 הכי נמכרות:</span>
                  {data.top.map((t: any) => <Badge key={t.name} color="brand">{t.name} × {t.qty}</Badge>)}
                </div>
              )}
            </Card>
            <Card className="p-4">
              <h3 className="mb-2 font-bold">🔔 התראות</h3>
              <div className="space-y-1.5">
                {data.alerts.length === 0 && <div className="text-sm text-ink-400">אין התראות</div>}
                {data.alerts.map((a: any) => (
                  <div key={a.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${a.seen ? 'text-ink-400' : a.kind === 'feedback' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-900'}`}>
                    <span>{a.kind === 'feedback' ? '😕' : a.kind === 'stock' ? '📦' : 'ℹ️'}</span>
                    <span className="flex-1">{a.message}</span>
                    <span className="text-xs opacity-70">{ago(a.created_at)}</span>
                    {!a.seen && <button className="text-xs underline" onClick={() => act('dismissAlert', { id: a.id })}>סמן כטופל</button>}
                    {a.kind === 'stock' && !a.seen && <Link className="text-xs underline" href="/inventory">למלאי</Link>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <OwnerChat chat={data.chat} />
        </div>
      </div>
    </div>
  );
}

function SalesChart({ hourly }: { hourly: { hour: number; total: number }[] }) {
  const max = Math.max(1, ...hourly.map((h) => h.total));
  const nowH = new Date().getHours();
  return (
    <div className="flex items-end gap-1.5" dir="ltr">
      {hourly.map((h) => (
        <div key={h.hour} className="group flex flex-1 flex-col items-center gap-1">
          <div className="relative flex h-40 w-full items-end">
            <div className={`w-full rounded-t-md transition-all ${h.hour === nowH ? 'bg-brand-500' : 'bg-brand-200 group-hover:bg-brand-300'}`} style={{ height: `${(h.total / max) * 100}%`, minHeight: h.total ? 4 : 0 }} />
            {h.total > 0 && <div className="absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 text-[10px] text-white group-hover:block">{money(h.total)}</div>}
          </div>
          <div className={`text-[10px] ${h.hour === nowH ? 'font-bold text-brand-600' : 'text-ink-400'}`}>{h.hour}</div>
        </div>
      ))}
    </div>
  );
}

const OFFERS = ['🍰 קינוח מתנה עם כל מנה עיקרית', '💸 15% הנחה על כל החשבון בשעתיים הקרובות', '🍷 כוס יין על חשבון הבית'];

function FillUp({ data }: { data: any }) {
  const [radius, setRadius] = useState(2);
  const [offer, setOffer] = useState(OFFERS[0]);
  const [sent, setSent] = useState<number | null>(null);
  const low = data.occupancy < data.typical - 10;
  const count = radius === 1 ? data.nearby.r1 : radius === 2 ? data.nearby.r2 : data.nearby.r3;
  const day = DAYS[new Date(data.now).getDay()];
  const last = data.campaigns[0];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between bg-gradient-to-l from-ink-900 to-ink-800 px-4 py-3 text-white">
        <div><div className="font-bold">✨ המסעדה ממלאת את עצמה</div><div className="text-xs text-ink-300">AET GO משווה את התפוסה לנתונים ההיסטוריים ומציע פעולה</div></div>
        <Badge color={low ? 'red' : 'green'}>{low ? 'תפוסה נמוכה' : 'תפוסה תקינה'}</Badge>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center justify-center">
          <Gauge value={data.occupancy} typical={data.typical} />
          <div className="mt-1 text-center text-xs text-ink-500">עכשיו <b className="text-ink-900">{data.occupancy}%</b> · בדרך כלל ביום {day} ב-{hhmm(data.now).slice(0, 2)}:00 <b className="text-ink-900">{data.typical}%</b></div>
        </div>
        {low ? (
          sent !== null ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-50 p-6 text-center animate-in">
              <div className="text-4xl">📲</div>
              <div className="mt-2 text-lg font-bold text-emerald-800">ההטבה נשלחה ל-{sent} חברי מועדון</div>
              <div className="text-sm text-emerald-700">שליחה מדומה ב-SMS/וואטסאפ · {offer}</div>
              <button className="mt-3 text-xs text-emerald-700 underline" onClick={() => setSent(null)}>שליחה נוספת</button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                התפוסה נמוכה ב-<b>{data.typical - data.occupancy}%</b> מהרגיל. <b>{count} חברי מועדון</b> שאישרו דיוור ומיקום נמצאים כרגע ברדיוס {radius} ק״מ.
                הצעה: לשלוח להם הטבה לזמן מוגבל.
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((r) => <button key={r} className={`chip text-xs ${radius === r ? 'chip-on' : ''}`} onClick={() => setRadius(r)}>📍 עד {r} ק״מ ({r === 1 ? data.nearby.r1 : r === 2 ? data.nearby.r2 : data.nearby.r3})</button>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {OFFERS.map((o) => <button key={o} className={`chip text-xs ${offer === o ? 'chip-on' : ''}`} onClick={() => setOffer(o)}>{o}</button>)}
              </div>
              <div className="rounded-2xl bg-ink-50 p-3">
                <div className="mb-1 text-[11px] text-ink-400">תצוגה מקדימה של ההודעה</div>
                <div className="max-w-sm rounded-2xl rounded-br-md bg-white p-3 text-sm shadow-sm">
                  היי [שם] 👋 אנחנו ממש קרובים אליך! {offer.replace(/^\S+\s/, '')} ב{data.settings.restaurant_name} – בתוקף להיום בלבד. מחכים לך 🧡
                </div>
              </div>
              <Button size="lg" className="w-full" disabled={!count} onClick={async () => {
                const r = await act('sendCampaign', { offer, radius, title: 'מילוי תפוסה' });
                setSent(r.recipients);
                toast(`נשלח ל-${r.recipients} חברים`);
              }}>📣 שליחת ההטבה ל-{count} חברים</Button>
            </div>
          )
        ) : (
          <div className="flex flex-col justify-center text-sm text-ink-600">
            <div className="text-lg font-bold text-emerald-700">👌 התפוסה בהתאם לצפי</div>
            <p>אין צורך בפעולה כרגע. AET GO ימשיך לנטר ויציע הטבה כשהתפוסה תרד.</p>
          </div>
        )}
      </div>
      {last && <div className="border-t border-ink-100 px-4 py-2 text-xs text-ink-500">שליחה אחרונה: {last.offer} · {last.recipients} חברים · {ago(last.created_at)}</div>}
    </Card>
  );
}

function Gauge({ value, typical }: { value: number; typical: number }) {
  const r = 70, c = Math.PI * r;
  const arc = (v: number) => (Math.min(100, v) / 100) * c;
  const angle = Math.PI * (1 - Math.min(100, typical) / 100);
  return (
    <svg viewBox="0 0 180 100" className="w-48">
      <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="#eceef2" strokeWidth="16" strokeLinecap="round" />
      <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke={value < typical - 10 ? '#ff5a1f' : '#10b981'} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${arc(value)} ${c}`} />
      <line x1={90 + Math.cos(angle) * 58} y1={90 - Math.sin(angle) * 58} x2={90 + Math.cos(angle) * 84} y2={90 - Math.sin(angle) * 84} stroke="#161b26" strokeWidth="3" strokeDasharray="3 2" />
      <text x="90" y="82" textAnchor="middle" fontSize="28" fontWeight="900" fill="#161b26">{value}%</text>
    </svg>
  );
}

function OwnerChat({ chat }: { chat: any[] }) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [chat.length]);
  const send = async (t: string) => {
    if (!t.trim()) return;
    setText('');
    await act('ownerChat', { text: t });
  };
  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl shadow-card ring-1 ring-ink-100 lg:sticky lg:top-20">
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <div className="rounded-full bg-white p-1"><LogoMark size={28} /></div>
        <div className="flex-1"><div className="font-bold">AET GO · עוזר לבעלים</div><div className="text-xs text-white/70">מחובר · פקודות קבועות, בלי AI</div></div>
        <span className="text-lg">📞</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-[#efe7dd] p-3" style={{ backgroundImage: 'radial-gradient(#00000008 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
        {chat.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'owner' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm shadow-sm ${m.sender === 'owner' ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white'}`}>
              {m.text}
              <div className="mt-0.5 text-left text-[10px] text-ink-400">{hhmm(m.created_at)} {m.sender === 'owner' && <span className="text-sky-500">✓✓</span>}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto bg-[#f0f2f5] px-2 pt-2">
        {['כמה מכרתי היום', 'מי איחר החודש', 'תזמין 10 עגבניות', 'מה חסר במלאי', 'כמה שולחנות פתוחים'].map((c) => (
          <button key={c} className="shrink-0 rounded-full bg-white px-3 py-1 text-xs shadow-sm" onClick={() => send(c)}>{c}</button>
        ))}
      </div>
      <form className="flex gap-2 bg-[#f0f2f5] p-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input className="flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none" placeholder="הקלד/י הודעה" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white" aria-label="שליחה"><span className="inline-block rotate-180">➤</span></button>
      </form>
    </div>
  );
}
