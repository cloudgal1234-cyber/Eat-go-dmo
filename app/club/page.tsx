'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { ago, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Card, Loading, LogoMark, Stat } from '@/components/ui';

const TIERS = [
  { name: 'ברונזה', from: 0, color: 'from-amber-700 to-amber-900', perks: ['נקודה על כל ₪10', '50 נקודות בהצטרפות', 'הטבות SMS בלעדיות'] },
  { name: 'כסף', from: 300, color: 'from-slate-400 to-slate-600', perks: ['כל הטבות ברונזה', 'קינוח מתנה ביום ההולדת', 'עדיפות בהזמנת מקום'] },
  { name: 'זהב', from: 700, color: 'from-yellow-400 to-amber-600', perks: ['כל הטבות כסף', '10% הנחה קבועה', 'מנה ראשונה מתנה ביום נישואין', 'הזמנה לערבי טעימות'] },
];

function FakeQR({ seed }: { seed: number }) {
  const n = 21;
  let s = seed * 9301 + 49297;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) { s = (s * 9301 + 49297) % 233280; cells.push(s / 233280 > 0.5); }
  const finder = (x: number, y: number) => {
    for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      if (x >= fx && x < fx + 7 && y >= fy && y < fy + 7) {
        const dx = x - fx, dy = y - fy;
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
      }
    }
    return -1;
  };
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="h-28 w-28" shapeRendering="crispEdges">
      {Array.from({ length: n * n }, (_, i) => {
        const x = i % n, y = Math.floor(i / n);
        const f = finder(x, y);
        const on = f === -1 ? cells[i] : f === 1;
        return on ? <rect key={i} x={x} y={y} width="1" height="1" fill="#0c0f16" /> : null;
      })}
    </svg>
  );
}

function WalletPass({ m, settings }: { m: any; settings: any }) {
  const tier = TIERS.find((t) => t.name === m.tier) || TIERS[0];
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-b from-ink-900 to-ink-950 text-white shadow-2xl ring-1 ring-black/10">
        <div className="relative px-5 pb-4 pt-5">
          <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-brand-500/40 blur-3xl" />
          <div className="relative flex items-center justify-between" dir="ltr">
            <div className="flex items-center gap-2"><LogoMark size={30} /><span className="text-lg font-black">AET <span className="text-brand-400">GO</span></span></div>
            <div className="text-right"><div className="text-[10px] uppercase tracking-wider text-white/50">POINTS</div><div className="text-2xl font-black">{m.points}</div></div>
          </div>
          <div className="relative mt-6">
            <div className="text-[11px] text-white/50">חבר/ת מועדון · {settings.restaurant_name}</div>
            <div className="text-2xl font-bold">{m.name}</div>
          </div>
        </div>
        <div className={`bg-gradient-to-l ${tier.color} px-5 py-3`}>
          <div className="flex justify-between text-sm">
            <div><div className="text-[10px] text-white/70">דרגה</div><div className="font-bold">{m.tier}</div></div>
            <div><div className="text-[10px] text-white/70">ביקורים</div><div className="font-bold">{m.visits}</div></div>
            <div><div className="text-[10px] text-white/70">חבר/ה מאז</div><div className="font-bold">{new Date(m.joined_at).toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })}</div></div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 bg-ink-950 px-5 py-5">
          <div className="rounded-xl bg-white p-2"><FakeQR seed={m.id} /></div>
          <div className="font-mono text-xs text-white/50" dir="ltr">AETGO-{String(m.id).padStart(6, '0')}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="rounded-xl bg-black py-2.5 text-sm font-semibold text-white" onClick={() => toast('דמו: הכרטיס נוסף ל-Apple Wallet', 'info')}> Add to Apple Wallet</button>
        <button className="rounded-xl border border-ink-200 bg-white py-2.5 text-sm font-semibold" onClick={() => toast('דמו: הכרטיס נוסף ל-Google Wallet', 'info')}>Google Wallet</button>
      </div>
      <p className="mt-2 text-center text-xs text-ink-400">עיצוב בלבד – הכרטיס אינו מונפק בפועל</p>
    </div>
  );
}

export default function ClubPage() {
  const { data } = usePoll('club', {}, 4000);
  const [sel, setSel] = useState<number>(1);
  const [search, setSearch] = useState('');
  if (!data) return <Loading />;
  const members = data.members;
  const m = members.find((x: any) => x.id === sel) || members[0];
  const filtered = members.filter((x: any) => !search || x.name.includes(search) || x.phone.includes(search));

  return (
    <div className="min-h-screen">
      <AppHeader title="מועדון לקוחות" subtitle="חברים, נקודות והטבות" />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="חברי מועדון" value={members.length} accent />
          <Stat label="אישרו דיוור" value={members.filter((x: any) => x.marketing).length} sub={`${members.filter((x: any) => x.marketing && x.location).length} עם מיקום`} />
          <Stat label="חברי זהב" value={members.filter((x: any) => x.tier === 'זהב').length} />
          <Stat label="אירועים השבוע" value={members.filter((x: any) => x.events.length).length} sub="ימי הולדת ונישואין" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 p-3">
              <input className="input" placeholder="חיפוש לפי שם או טלפון…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="max-h-[640px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-50 text-ink-600"><tr><th className="p-2.5 text-right">חבר/ה</th><th className="p-2.5">דרגה</th><th className="p-2.5">נקודות</th><th className="hidden p-2.5 sm:table-cell">ביקורים</th><th className="hidden p-2.5 md:table-cell">הערות</th></tr></thead>
                <tbody>
                  {filtered.map((x: any) => (
                    <tr key={x.id} onClick={() => setSel(x.id)} className={`cursor-pointer border-t border-ink-100 text-center hover:bg-ink-50 ${x.id === m.id ? 'bg-brand-50' : ''}`}>
                      <td className="p-2.5 text-right">
                        <div className="font-semibold">{x.name}</div>
                        <div className="text-xs text-ink-500" dir="ltr" style={{ textAlign: 'right' }}>{x.phone}</div>
                      </td>
                      <td className="p-2.5"><Badge color={x.tier === 'זהב' ? 'amber' : x.tier === 'כסף' ? 'blue' : 'ink'}>{x.tier}</Badge></td>
                      <td className="p-2.5 font-bold">{x.points}</td>
                      <td className="hidden p-2.5 sm:table-cell">{x.visits}</td>
                      <td className="hidden p-2.5 md:table-cell">
                        <div className="flex flex-wrap justify-center gap-1">
                          {x.events.map((e: string) => <Badge key={e} color="amber">{e}</Badge>)}
                          {x.allergies && <Badge color="red">⚠️ {x.allergies}</Badge>}
                          {x.marketing ? <span title="אישר דיוור">📩</span> : null}
                          {x.location ? <span title="אישר מיקום">📍</span> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="space-y-4">
            <WalletPass m={m} settings={data.settings} />
            <Card className="p-4 text-sm">
              <h3 className="mb-2 font-bold">פרטי חבר/ה</h3>
              <div className="space-y-1 text-ink-600">
                {m.allergies && <div>⚠️ אלרגיות: <b className="text-rose-600">{m.allergies}</b></div>}
                {m.last_items && <div>🍽️ הזמנה אחרונה: {m.last_items}</div>}
                {m.notes && <div>📝 {m.notes}</div>}
                <div>📩 דיוור: {m.marketing ? 'מאושר' : 'לא מאושר'} · 📍 מיקום: {m.location ? `מאושר (${m.distance_km} ק״מ מהמסעדה)` : 'לא מאושר'}</div>
              </div>
            </Card>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {TIERS.map((t) => (
            <Card key={t.name} className="overflow-hidden p-0">
              <div className={`bg-gradient-to-l ${t.color} px-4 py-3 text-white`}><div className="text-lg font-black">{t.name}</div><div className="text-xs text-white/80">מ-{t.from} נקודות</div></div>
              <ul className="space-y-1 p-4 text-sm">{t.perks.map((p) => <li key={p}>✓ {p}</li>)}</ul>
            </Card>
          ))}
        </div>
        {data.campaigns.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-2 font-bold">📣 הטבות שנשלחו</h3>
            {data.campaigns.map((c: any) => (
              <div key={c.id} className="flex justify-between border-t border-ink-100 py-2 text-sm first:border-0">
                <span>{c.offer}</span><span className="text-ink-500">{c.recipients} חברים · עד {c.radius} ק״מ · {ago(c.created_at)}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
