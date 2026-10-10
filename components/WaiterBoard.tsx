'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { act, ago, hhmm, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading, Modal } from './ui';

const ST: Record<string, { label: string; card: string; dot: string }> = {
  free: { label: 'פנוי', card: 'bg-white border-ink-200 text-ink-500', dot: 'bg-ink-300' },
  reserved: { label: 'שמור', card: 'bg-violet-50 border-violet-300 text-violet-800', dot: 'bg-violet-500' },
  seated: { label: 'הושבו', card: 'bg-sky-50 border-sky-300 text-sky-900', dot: 'bg-sky-500' },
  kitchen: { label: 'במטבח', card: 'bg-amber-50 border-amber-300 text-amber-900', dot: 'bg-amber-500' },
  ready: { label: 'מוכן להגשה!', card: 'bg-emerald-50 border-emerald-400 text-emerald-900 pulse-ring', dot: 'bg-emerald-500' },
  eating: { label: 'אוכלים', card: 'bg-ink-50 border-ink-300 text-ink-800', dot: 'bg-ink-600' },
  paying: { label: 'בתשלום', card: 'bg-brand-50 border-brand-300 text-brand-800', dot: 'bg-brand-500' },
};

/** Waiter tablet. With a personal `token` it greets the waiter and shows only their tables by default. */
export function WaiterBoard({ token }: { token?: string }) {
  const { data, error } = usePoll('waiter', token ? { k: token } : {});
  const [sel, setSel] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (error && !data) return <div className="p-10 text-center text-rose-600">{error}</div>;
  if (!data) return <Loading />;
  const mine: number[] = data.me?.tables || [];
  const onlyMine = !!data.me && mine.length > 0 && !showAll;
  const visible = (n: number | null) => !onlyMine || (n != null && mine.includes(n));
  const tables = data.tables.filter((t: any) => visible(t.number));
  const alerts = data.alerts.filter((a: any) => visible(a.table_number));
  const selected = data.tables.find((t: any) => t.number === sel);
  const callsByTable = new Set(alerts.map((a: any) => a.table_number));

  return (
    <div className="min-h-screen">
      <AppHeader
        personal={!!token}
        title={data.me ? `טאבלט מלצר · ${data.me.name}` : 'טאבלט מלצר'}
        subtitle={data.me ? (mine.length ? `השולחנות שלך: ${mine.join(', ')}` : 'כל השולחנות') : 'מפת שולחנות · מתעדכן בזמן אמת'}
        right={token ? (
          <div className="flex items-center gap-2">
            {mine.length > 0 && (
              <button className="chip text-xs" onClick={() => setShowAll(!showAll)}>{showAll ? '👤 רק שלי' : '🗺️ כל השולחנות'}</button>
            )}
            <Link href={`/me/${token}`} className="chip text-xs">💰 הפאנל שלי</Link>
          </div>
        ) : undefined}
      />
      {alerts.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-2">
            {alerts.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm ring-1 ring-amber-200 animate-in">
                <span>🙋 {a.message}</span>
                <span className="text-xs text-ink-400">{ago(a.created_at)}</span>
                <button className="rounded-full bg-amber-100 px-2 text-xs font-bold text-amber-800" onClick={() => act('dismissAlert', { id: a.id })}>טופל ✓</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-ink-500">
            {Object.entries(ST).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${v.dot}`} />{v.label}</span>
            ))}
          </div>
          {['פנים', 'מרפסת'].filter((area) => tables.some((t: any) => t.area === area)).map((area) => (
            <div key={area} className="mb-4">
              <h3 className="mb-2 text-sm font-bold text-ink-500">{area}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tables.filter((t: any) => t.area === area).map((t: any) => {
                  const st = ST[t.status];
                  const member = t.detail?.diners.some((d: any) => d.member);
                  return (
                    <button
                      key={t.number}
                      onClick={() => setSel(t.number)}
                      className={`relative flex aspect-[4/3] flex-col justify-between rounded-2xl border-2 p-3 text-right transition hover:shadow-md ${st.card} ${sel === t.number ? 'ring-4 ring-ink-900/15' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-3xl font-black text-ink-900">{t.number}</span>
                        <span className="flex gap-1">
                          {callsByTable.has(t.number) && <span className="animate-bounce text-lg">🙋</span>}
                          {member && <span className="rounded-full bg-ink-900 px-1.5 py-0.5 text-[10px] font-bold text-white">💳 מועדון</span>}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-bold">{st.label}</div>
                        <div className="text-xs opacity-75">
                          {t.detail ? `${money(t.detail.remaining)} · ${Math.floor((Date.now() - t.detail.session.opened_at) / 60000)} דק׳` : t.plan ? hhmm(t.plan.scheduled_at) : `${t.seats} מקומות`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          {selected ? <TablePanel t={selected} menu={data.menu} onClose={() => setSel(null)} /> : (
            <Card className="flex h-64 flex-col items-center justify-center p-6 text-center text-ink-500">
              <div className="text-4xl">👈</div>
              <div className="mt-2">בחרו שולחן כדי לראות הזמנות, חברי מועדון וחשבון</div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TablePanel({ t, menu, onClose }: { t: any; menu: any[]; onClose: () => void }) {
  const [guests, setGuests] = useState(2);
  const [adding, setAdding] = useState(false);
  const d = t.detail;

  if (!d)
    return (
      <Card className="p-5 animate-in">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">שולחן {t.number}</h2>
          <button className="text-ink-400" onClick={onClose}>✕</button>
        </div>
        <p className="text-sm text-ink-500">{t.seats} מקומות · {t.area}</p>
        {t.plan && (
          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-800">
            🗓️ שמור ל<b>{t.plan.title}</b> בשעה {hhmm(t.plan.scheduled_at)} · ההזמנה שולמה מראש ותיכנס למטבח אוטומטית
          </div>
        )}
        <div className="mt-4">
          <div className="label">מספר סועדים</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 8].map((n) => (
              <button key={n} className={`chip flex-1 ${guests === n ? 'chip-on' : ''}`} onClick={() => setGuests(n)}>{n}</button>
            ))}
          </div>
        </div>
        <Button size="lg" className="mt-4 w-full" onClick={() => act('openTable', { table: t.number, guests }).then(() => toast(`שולחן ${t.number} נפתח`))}>
          פתיחת שולחן
        </Button>
        <p className="mt-3 text-center text-xs text-ink-400">או שהסועדים פותחים לבד בנגיעה במדבקת ה-NFC</p>
      </Card>
    );

  const members = d.diners.filter((x: any) => x.member);
  return (
    <div className="space-y-3 animate-in">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">שולחן {t.number} <Badge className="mr-1">{ST[t.status].label}</Badge></h2>
            <p className="text-xs text-ink-500">נפתח {hhmm(d.session.opened_at)} · {d.session.opened_by === 'nfc' ? 'דרך NFC' : 'ע״י מלצר'}</p>
          </div>
          <button className="text-ink-400" onClick={onClose}>✕</button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-ink-500">סועדים:</span>
          <button className="h-7 w-7 rounded-lg bg-ink-100" onClick={() => act('setGuests', { sessionId: d.session.id, guests: Math.max(1, d.divisor - 1) })}>−</button>
          <b>{d.divisor}</b>
          <button className="h-7 w-7 rounded-lg bg-ink-100" onClick={() => act('setGuests', { sessionId: d.session.id, guests: d.divisor + 1 })}>+</button>
          <span className="mr-auto flex flex-wrap gap-1">{d.diners.map((x: any) => <Badge key={x.id} color={x.member ? 'brand' : 'ink'}>📱 {x.name}</Badge>)}</span>
        </div>
      </Card>

      {members.map((x: any) => <MemberCard key={x.id} m={x.member} />)}

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold">הזמנות</h3>
          <Button size="sm" onClick={() => setAdding(true)}>+ הזמנה</Button>
        </div>
        {d.orders.length === 0 && <div className="py-4 text-center text-sm text-ink-400">אין עדיין הזמנות</div>}
        {d.orders.map((o: any) => (
          <div key={o.id} className="border-t border-ink-100 py-2 first:border-0">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>#{o.id} · {hhmm(o.created_at)}</span>
              {o.status === 'new' && <Badge color="amber">במטבח</Badge>}
              {o.status === 'ready' && <Button size="sm" variant="success" onClick={() => act('markServed', { orderId: o.id })}>מוכן → סמן הוגש</Button>}
              {(o.status === 'served' || o.status === 'done') && <Badge>הוגש</Badge>}
            </div>
            {o.items.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between py-0.5 text-sm">
                <span>{i.qty > 1 && `${i.qty}× `}{i.name} <span className="text-xs text-ink-400">· {d.diners.find((x: any) => x.id === i.diner_id)?.name || 'לשולחן'}</span></span>
                <span className="flex items-center gap-2">
                  {money(i.price * i.qty)}
                  {o.status === 'new' && <button className="text-xs text-rose-500" onClick={() => act('removeItem', { itemId: i.id })}>✕</button>}
                </span>
              </div>
            ))}
          </div>
        ))}
      </Card>

      <SplitBill d={d} />
      {adding && <AddOrder table={t.number} diners={d.diners} menu={menu} onClose={() => setAdding(false)} />}
    </div>
  );
}

function MemberCard({ m }: { m: any }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 to-ink-800 p-4 text-white shadow-card animate-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-brand-300">💳 חבר/ת מועדון יושב/ת בשולחן</div>
          <div className="text-lg font-bold">{m.name}</div>
        </div>
        <div className="text-left">
          <Badge color="brand">{m.tier}</Badge>
          <div className="mt-1 text-xs text-ink-300">{m.points} נק׳ · {m.visits} ביקורים</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-sm">
        {m.allergies && <div className="rounded-lg bg-rose-500/20 px-2.5 py-1.5 font-semibold text-rose-200">⚠️ אלרגיות: {m.allergies}</div>}
        {m.events?.map((e: string) => <div key={e} className="rounded-lg bg-amber-400/20 px-2.5 py-1.5 font-semibold text-amber-200">{e}</div>)}
        {m.last_items && <div className="text-ink-200">🍽️ הזמנה קודמת: {m.last_items}</div>}
        {m.notes && <div className="text-ink-300">📝 {m.notes}</div>}
      </div>
    </div>
  );
}

function SplitBill({ d }: { d: any }) {
  const [method, setMethod] = useState('card');
  const [n, setN] = useState(d.divisor);
  const pay = (amount: number, dinerId: number | null, mode: string) =>
    act('pay', { sessionId: d.session.id, dinerId, amount, method, mode, source: 'waiter' }).then((r) =>
      toast(r.closed ? 'החשבון שולם במלואו – השולחן נסגר 🎉' : `נגבו ${money(r.amount)}`));
  const part = Math.round((d.remaining / Math.max(1, n)) * 100) / 100;

  return (
    <Card className="p-4">
      <h3 className="mb-2 font-bold">חשבון ופיצול</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-ink-50 p-2"><div className="text-xs text-ink-500">סה״כ</div><div className="font-bold">{money(d.total)}</div></div>
        <div className="rounded-xl bg-emerald-50 p-2"><div className="text-xs text-emerald-700">שולם</div><div className="font-bold text-emerald-700">{money(d.paid)}</div></div>
        <div className="rounded-xl bg-brand-50 p-2"><div className="text-xs text-brand-700">יתרה</div><div className="font-bold text-brand-700">{money(d.remaining)}</div></div>
      </div>
      <div className="mt-3 flex gap-2">
        {[['card', '💳 אשראי'], ['cash', '💵 מזומן'], ['bit', 'ביט']].map(([k, l]) => (
          <button key={k} className={`chip flex-1 text-xs ${method === k ? 'chip-on' : ''}`} onClick={() => setMethod(k)}>{l}</button>
        ))}
      </div>
      {d.perDiner.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {d.perDiner.map((p: any) => (
            <div key={p.dinerId} className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2 text-sm">
              <div className="flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-ink-500">הזמין {money(p.ordered)} · שילם {money(p.paid)}</div>
              </div>
              <Button size="sm" variant="ghost" disabled={p.mine <= 0} onClick={() => pay(p.mine, p.dinerId, 'mine')}>שלו {money(p.mine)}</Button>
              <Button size="sm" variant="ghost" disabled={p.equal <= 0} onClick={() => pay(p.equal, p.dinerId, 'equal')}>שווה {money(p.equal)}</Button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink-50 p-2 text-sm">
        <span>פיצול שווה ל-</span>
        <input type="number" min={1} className="input w-16 py-1.5 text-center" value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value)))} />
        <span className="flex-1">= {money(part)} לאחד</span>
        <Button size="sm" variant="dark" disabled={d.remaining <= 0} onClick={() => pay(part, null, 'equal')}>גבה חלק</Button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" disabled={d.remaining <= 0} onClick={() => pay(d.remaining, null, 'all')}>גבה את כל היתרה {money(d.remaining)}</Button>
        <Button variant="outline" onClick={() => confirm('לסגור את השולחן?') && act('closeTable', { sessionId: d.session.id })}>סגור</Button>
      </div>
    </Card>
  );
}

function AddOrder({ table, diners, menu, onClose }: { table: number; diners: any[]; menu: any[]; onClose: () => void }) {
  const cats = useMemo(() => Array.from(new Set(menu.map((m) => m.category))), [menu]);
  const [cat, setCat] = useState(cats[0]);
  const [diner, setDiner] = useState<number | null>(null);
  const [lines, setLines] = useState<{ menuItemId: number; qty: number; dinerId: number | null; note?: string }[]>([]);
  const total = lines.reduce((s, l) => s + menu.find((m) => m.id === l.menuItemId).price * l.qty, 0);
  const add = (id: number) => setLines((ls) => {
    const ex = ls.find((l) => l.menuItemId === id && l.dinerId === diner);
    return ex ? ls.map((l) => (l === ex ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { menuItemId: id, qty: 1, dinerId: diner }];
  });
  return (
    <Modal open onClose={onClose} title={`הזמנה לשולחן ${table}`} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-500">על שם:</span>
        <button className={`chip text-xs ${diner === null ? 'chip-on' : ''}`} onClick={() => setDiner(null)}>לשולחן</button>
        {diners.map((x) => <button key={x.id} className={`chip text-xs ${diner === x.id ? 'chip-on' : ''}`} onClick={() => setDiner(x.id)}>{x.name}</button>)}
      </div>
      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        {cats.map((c) => <button key={c} className={`chip ${cat === c ? 'chip-on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {menu.filter((m) => m.category === cat).map((m) => (
          <button key={m.id} onClick={() => add(m.id)} className="rounded-xl border border-ink-100 bg-white p-3 text-right transition hover:border-brand-300 active:scale-[.98]">
            <div className="text-2xl">{m.emoji}</div>
            <div className="text-sm font-semibold leading-tight">{m.name}</div>
            <div className="text-xs text-ink-500">{money(m.price)}{m.allergens.length ? ` · ${m.allergens.join(', ')}` : ''}</div>
          </button>
        ))}
      </div>
      {lines.length > 0 && (
        <div className="mt-4 rounded-xl bg-ink-50 p-3 text-sm">
          {lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between py-0.5">
              <span>{l.qty}× {menu.find((m) => m.id === l.menuItemId).name} <span className="text-xs text-ink-400">· {diners.find((x) => x.id === l.dinerId)?.name || 'לשולחן'}</span></span>
              <button className="text-xs text-rose-500" onClick={() => setLines(lines.filter((_, j) => j !== i))}>הסר</button>
            </div>
          ))}
        </div>
      )}
      <Button size="lg" className="mt-4 w-full" disabled={!lines.length} onClick={() =>
        act('placeOrder', { table, waiter: true, items: lines }).then(() => { toast('נשלח למטבח 🔥'); onClose(); })}>
        שליחה למטבח · {money(total)}
      </Button>
    </Modal>
  );
}
