'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { act, money, toast, usePoll, useDeviceId } from '@/lib/client';
import { answer, SUGGESTIONS, type MenuItem } from '@/lib/chatbot';
import { Badge, Button, DietTags, Loading, Logo, LogoMark, Modal } from '@/components/ui';
import { PayPanel } from '@/components/pay';
import { MiniWalletCard } from '@/components/wallet';

type CartLine = { menuItemId: number; qty: number; note?: string };

const STATUS: Record<string, [string, 'amber' | 'green' | 'ink' | 'blue']> = {
  new: ['בהכנה 🔥', 'amber'],
  ready: ['מוכן – בדרך אליך', 'green'],
  served: ['הוגש', 'ink'],
  done: ['הוגש', 'ink'],
};

export default function TablePage() {
  const params = useParams<{ table: string }>();
  const table = Number(params.table);
  const device = useDeviceId();
  const { data, error } = usePoll('table', { table, device });
  const [tab, setTab] = useState<'menu' | 'bill' | 'chat'>('menu');
  const [cart, setCart] = useState<CartLine[]>([]);

  if (error && !data) return <Centered><div className="text-rose-600">{error}</div></Centered>;
  if (!data) return <Loading />;

  if (!data.session) {
    if (data.closedRecently) return <ThankYou name={data.closedRecently.name} settings={data.settings} table={table} />;
    return <Welcome table={table} device={device!} settings={data.settings} diners={0} />;
  }
  if (!data.me) return <Welcome table={table} device={device!} settings={data.settings} diners={data.bill.diners.length} />;

  const menu: MenuItem[] = data.menu;
  const add = (id: number, qty = 1, note?: string) => {
    setCart((c) => {
      const ex = c.find((l) => l.menuItemId === id && !l.note && !note);
      if (ex) return c.map((l) => (l === ex ? { ...l, qty: l.qty + qty } : l));
      return [...c, { menuItemId: id, qty, note }];
    });
    toast(`${menu.find((m) => m.id === id)?.name} נוסף לסל`, 'info');
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-ink-50 pb-28">
      <TableHeader data={data} table={table} />
      {tab === 'menu' && <MenuView menu={menu} onAdd={add} myAllergies={data.me.member?.allergies || ''} />}
      {tab === 'bill' && <BillView data={data} />}
      {tab === 'chat' && <ChatView menu={menu} settings={data.settings} table={table} onAdd={add} />}
      {tab === 'menu' && cart.length > 0 && <CartBar cart={cart} setCart={setCart} menu={menu} table={table} device={device!} />}
      <BottomNav tab={tab} setTab={setTab} billCount={data.bill.orders.length} remaining={data.bill.remaining} />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-6 text-center">{children}</div>;
}

/* ------------------------------------------------------------------ welcome (NFC tap) */

function Welcome({ table, device, settings, diners }: { table: number; device: string; settings: any; diners: number }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink-950 text-white">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />
      <div className="relative flex justify-center pt-8"><Logo light size={36} /></div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="pulse-ring mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-brand-500 text-4xl">📲</div>
        <div className="text-sm font-semibold text-brand-300">זוהתה נגיעה במדבקת NFC</div>
        <h1 className="mt-2 text-3xl font-black">{settings.restaurant_name}</h1>
        <div className="mt-1 text-lg text-ink-300">שולחן {table}</div>
        {diners > 0 && <div className="mt-3 rounded-full bg-white/10 px-3 py-1 text-sm">👥 {diners} סועדים כבר מחוברים לשולחן</div>}
        <div className="mt-8 w-full max-w-xs space-y-3">
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-center text-white outline-none placeholder:text-ink-400 focus:border-brand-400"
            placeholder="איך קוראים לך? (לא חובה)"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            size="lg"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await act('joinTable', { table, deviceId: device, name }); } finally { setBusy(false); }
            }}
          >
            {diners > 0 ? 'הצטרפות לשולחן' : 'פתיחת השולחן'} ←
          </Button>
        </div>
        <p className="mt-6 max-w-xs text-xs text-ink-400">מזמינים, משלמים ומפצלים חשבון ישירות מהטלפון. בלי אפליקציה ובלי להמתין לחשבון.</p>
      </div>
    </div>
  );
}

function ThankYou({ name, settings, table }: { name: string; settings: any; table: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-brand-50 px-6 text-center">
      <LogoMark size={56} />
      <div className="mt-6 text-5xl">🎉</div>
      <h1 className="mt-3 text-2xl font-black">תודה {name}!</h1>
      <p className="mt-2 text-ink-600">החשבון של שולחן {table} שולם במלואו והשולחן נסגר.</p>
      <p className="text-ink-500">מקווים לראות אותך שוב ב{settings.restaurant_name}.</p>
      <div className="mt-8 text-xs text-ink-400">Powered by AET GO</div>
    </div>
  );
}

/* ------------------------------------------------------------------ header */

function TableHeader({ data, table }: { data: any; table: number }) {
  const [club, setClub] = useState(false);
  const member = data.me.member;
  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Logo size={26} />
        <div className="min-w-0 flex-1 border-r border-ink-200 pr-2">
          <div className="truncate text-sm font-bold">{data.settings.restaurant_name}</div>
          <div className="truncate text-xs text-ink-500">שולחן {table} · 👥 {data.bill.diners.length} · {data.me.name}</div>
        </div>
        <button
          onClick={() => setClub(true)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${member ? 'bg-ink-900 text-white' : 'bg-brand-500 text-white'}`}
        >
          {member ? `💳 ${member.points}` : '💳 מועדון'}
        </button>
        <button
          onClick={() => act('callWaiter', { table }).then(() => toast('המלצר קיבל קריאה 🙋'))}
          className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1.5 text-xs font-bold"
          aria-label="קריאה למלצר"
        >
          🙋
        </button>
      </div>
      <ClubModal open={club} onClose={() => setClub(false)} me={data.me} />
    </header>
  );
}

function ClubModal({ open, onClose, me }: { open: boolean; onClose: () => void; me: any }) {
  const [mode, setMode] = useState<'join' | 'login'>('join');
  const [name, setName] = useState(me.name?.startsWith('סועד') ? '' : me.name);
  const [phone, setPhone] = useState('');
  const [marketing, setMarketing] = useState(true);
  const [location, setLocation] = useState(true);
  const [busy, setBusy] = useState(false);
  const member = me.member;

  if (member)
    return (
      <Modal open={open} onClose={onClose} title="כרטיס המועדון שלך">
        <MiniWalletCard member={member} />
        {member.allergies && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">⚠️ רגישויות שמורות: {member.allergies} – המטבח והמלצר רואים אותן אוטומטית.</div>}
        {member.events?.length > 0 && <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{member.events.join(' · ')} – מחכה לך הפתעה 🎁</div>}
        <p className="mt-3 text-center text-xs text-ink-500">צוברים נקודה על כל ₪10. הנקודות יתעדכנו בסגירת החשבון.</p>
      </Modal>
    );

  const submit = async () => {
    setBusy(true);
    try {
      const r = await act('joinClub', { dinerId: me.id, name: name || me.name, phone, marketing: mode === 'join' && marketing, location: mode === 'join' && location });
      toast(r.welcome ? 'ברוך הבא למועדון! קיבלת 50 נקודות 🎁' : `שלום ${r.member.name}! זיהינו אותך 👋`);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="מועדון AET GO">
      <div className="mb-4 flex rounded-xl bg-ink-100 p-1 text-sm font-semibold">
        <button className={`flex-1 rounded-lg py-2 ${mode === 'join' ? 'bg-white shadow' : 'text-ink-500'}`} onClick={() => setMode('join')}>הצטרפות</button>
        <button className={`flex-1 rounded-lg py-2 ${mode === 'login' ? 'bg-white shadow' : 'text-ink-500'}`} onClick={() => setMode('login')}>כבר חבר/ה</button>
      </div>
      {mode === 'join' ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white">
            <div className="text-lg font-black">50 נקודות מתנה בהצטרפות 🎁</div>
            <div className="text-sm text-white/85">קינוח ביום ההולדת · הטבות לחברים · בלי כרטיסיות</div>
          </div>
          <div><label className="label">שם</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="שם מלא" /></div>
          <div><label className="label">טלפון</label><input className="input" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" /></div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-brand-500" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> אני מאשר/ת קבלת דיוור והטבות ב-SMS ובוואטסאפ</label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-brand-500" checked={location} onChange={(e) => setLocation(e.target.checked)} /> אני מאשר/ת שימוש במיקום לקבלת הטבות כשאני בסביבה</label>
          <Button size="lg" className="w-full" disabled={busy || !phone} onClick={submit}>הצטרפות בלחיצה אחת</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div><label className="label">מספר טלפון</label><input className="input" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" /></div>
          <p className="text-xs text-ink-500">לדמו: 050-1234567 (דנה) · 052-7654321 (יוסי)</p>
          <Button size="lg" className="w-full" disabled={busy || !phone} onClick={submit}>הזדהות</Button>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ menu */

function MenuView({ menu, onAdd, myAllergies }: { menu: MenuItem[]; onAdd: (id: number, qty?: number, note?: string) => void; myAllergies: string }) {
  const warn = (m: MenuItem) => m.allergens.filter((a) => myAllergies.includes(a));
  const cats = useMemo(() => Array.from(new Set(menu.map((m) => m.category))), [menu]);
  const [filter, setFilter] = useState<string[]>([]);
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const toggle = (f: string) => setFilter((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]));
  const items = menu.filter((m) =>
    (!filter.includes('vegan') || m.vegan) && (!filter.includes('veg') || m.vegetarian) && (!filter.includes('gf') || m.gluten_free) && (!filter.includes('nuts') || !m.allergens.some((a) => a === 'אגוזים' || a === 'בוטנים')));

  return (
    <div>
      <div className="sticky top-[57px] z-20 space-y-2 bg-ink-50/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {cats.map((c) => (
            <a key={c} href={`#cat-${c}`} className="chip">{c}</a>
          ))}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {[['vegan', '🌱 טבעוני'], ['veg', '🥕 צמחוני'], ['gf', '🌾 ללא גלוטן'], ['nuts', '🥜 ללא אגוזים']].map(([k, l]) => (
            <button key={k} className={`chip text-xs ${filter.includes(k) ? 'chip-on' : ''}`} onClick={() => toggle(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="space-y-6 px-4 pt-2">
        {cats.map((c) => {
          const list = items.filter((m) => m.category === c);
          if (!list.length) return null;
          return (
            <section key={c} id={`cat-${c}`} className="scroll-mt-36">
              <h2 className="mb-2 text-lg font-extrabold">{c}</h2>
              <div className="space-y-2">
                {list.map((m) => (
                  <div key={m.id} className="flex gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-card" onClick={() => setDetail(m)}>
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-ink-100 text-4xl">{m.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold leading-tight">{m.name}</div>
                        <div className="font-extrabold">{money(m.price)}</div>
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-ink-500">{m.description}</div>
                      {warn(m).length > 0 && <div className="mt-1 text-xs font-bold text-rose-600">⚠️ מכיל {warn(m).join(', ')} – רשום אצלך כאלרגיה</div>}
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <DietTags item={m} small />
                        <button
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white shadow-md shadow-brand-500/30"
                          onClick={(e) => { e.stopPropagation(); onAdd(m.id); }}
                          aria-label="הוסף"
                        >+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <DishModal item={detail} onClose={() => setDetail(null)} onAdd={onAdd} />
    </div>
  );
}

function DishModal({ item, onClose, onAdd }: { item: MenuItem | null; onClose: () => void; onAdd: (id: number, qty?: number, note?: string) => void }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  useEffect(() => { setQty(1); setNote(''); }, [item]);
  if (!item) return null;
  return (
    <Modal open onClose={onClose} title={item.name}>
      <div className="flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-ink-100 text-7xl">{item.emoji}</div>
      <p className="mt-3 text-ink-600">{item.description}</p>
      <div className="mt-2"><DietTags item={item} /></div>
      <div className="mt-3 rounded-xl bg-ink-50 p-3 text-sm"><b>רכיבים:</b> {item.ingredients}</div>
      <div className={`mt-2 rounded-xl p-3 text-sm ${item.allergens.length ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
        <b>אלרגנים:</b> {item.allergens.length ? item.allergens.join(', ') : 'ללא אלרגנים מוכרים'}
      </div>
      <input className="input mt-3" placeholder="הערה למטבח (למשל: בלי בצל)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-ink-100 px-2 py-1.5">
          <button className="h-8 w-8 rounded-lg bg-white font-bold" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span className="w-4 text-center font-bold">{qty}</span>
          <button className="h-8 w-8 rounded-lg bg-white font-bold" onClick={() => setQty(qty + 1)}>+</button>
        </div>
        <Button size="lg" className="flex-1" onClick={() => { onAdd(item.id, qty, note.trim() || undefined); onClose(); }}>
          הוספה · {money(item.price * qty)}
        </Button>
      </div>
    </Modal>
  );
}

function CartBar({ cart, setCart, menu, table, device }: { cart: CartLine[]; setCart: (c: CartLine[]) => void; menu: MenuItem[]; table: number; device: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const byId = new Map(menu.map((m) => [m.id, m]));
  const total = cart.reduce((s, l) => s + (byId.get(l.menuItemId)?.price || 0) * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const send = async () => {
    setBusy(true);
    try {
      await act('placeOrder', { table, deviceId: device, items: cart });
      setCart([]);
      setOpen(false);
      toast('ההזמנה נשלחה למטבח 🔥');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="fixed inset-x-0 bottom-[72px] z-30 mx-auto max-w-2xl px-4">
        <button onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-2xl bg-ink-900 px-4 py-3.5 text-white shadow-2xl animate-in">
          <span className="flex items-center gap-2 font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs">{count}</span> הסל שלי</span>
          <span className="font-bold">{money(total)} · לשליחה ←</span>
        </button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="הסל שלי">
        <div className="divide-y divide-ink-100">
          {cart.map((l, i) => {
            const m = byId.get(l.menuItemId)!;
            return (
              <div key={i} className="flex items-center gap-3 py-3">
                <span className="text-2xl">{m.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold">{m.name}</div>
                  {l.note && <div className="text-xs text-ink-500">📝 {l.note}</div>}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-ink-100 px-1.5 py-1">
                  <button className="h-6 w-6 rounded bg-white" onClick={() => setCart(cart.map((x, j) => (j === i ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0))}>−</button>
                  <span className="w-3 text-center text-sm font-bold">{l.qty}</span>
                  <button className="h-6 w-6 rounded bg-white" onClick={() => setCart(cart.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                </div>
                <div className="w-14 text-left font-bold">{money(m.price * l.qty)}</div>
              </div>
            );
          })}
        </div>
        <Button size="lg" className="mt-4 w-full" disabled={busy} onClick={send}>שליחה למטבח · {money(total)}</Button>
        <p className="mt-2 text-center text-xs text-ink-500">המנות יירשמו על שמך בחשבון המשותף של השולחן</p>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ bill & payment */

function BillView({ data }: { data: any }) {
  const bill = data.bill;
  const meId = data.me.id;
  const [paying, setPaying] = useState(false);
  const dinerName = (id: number | null) => (id == null ? 'לשולחן' : id === meId ? 'אני' : bill.diners.find((d: any) => d.id === id)?.name || '—');
  const pctPaid = bill.total ? Math.min(100, (bill.paid / bill.total) * 100) : 0;

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="rounded-3xl bg-ink-900 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between text-sm text-ink-300"><span>חשבון משותף · שולחן {data.table.number}</span><span>👥 {bill.diners.length}</span></div>
        <div className="mt-2 flex items-end justify-between">
          <div><div className="text-xs text-ink-400">יתרה לתשלום</div><div className="text-4xl font-black">{money(bill.remaining)}</div></div>
          <div className="text-left text-sm text-ink-300"><div>סה״כ {money(bill.total)}</div><div>שולם {money(bill.paid)}</div></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pctPaid}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bill.perDiner.map((d: any) => (
            <span key={d.dinerId} className={`rounded-full px-2.5 py-1 text-xs ${d.paid > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-ink-200'}`}>
              {d.dinerId === meId ? 'אני' : d.name} {d.paid > 0 ? `✓ ${money(d.paid)}` : ''}
            </span>
          ))}
        </div>
      </div>

      {bill.orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">עוד לא הוזמן כלום. התפריט מחכה 🙂</div>
      ) : (
        bill.orders.map((o: any) => (
          <div key={o.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-ink-500">הזמנה #{o.id} · {new Date(o.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
              <Badge color={STATUS[o.status]?.[1] || 'ink'}>{STATUS[o.status]?.[0] || o.status}</Badge>
            </div>
            {o.items.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between py-1 text-sm">
                <span>{i.qty > 1 && `${i.qty}× `}{i.name} <span className={`text-xs ${i.diner_id === meId ? 'font-bold text-brand-600' : 'text-ink-400'}`}>· {dinerName(i.diner_id)}</span></span>
                <span className="font-semibold">{money(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
        ))
      )}

      {bill.remaining > 0 && (
        <Button size="lg" className="w-full" onClick={() => setPaying(true)}>לתשלום ←</Button>
      )}
      {paying && <PayFlow data={data} onClose={() => setPaying(false)} />}
    </div>
  );
}

const FACES = [
  { score: 1, e: '😡', l: 'גרוע' },
  { score: 2, e: '😕', l: 'לא משהו' },
  { score: 3, e: '😐', l: 'בסדר' },
  { score: 4, e: '🙂', l: 'טוב' },
  { score: 5, e: '😍', l: 'מעולה' },
];

function PayFlow({ data, onClose }: { data: any; onClose: () => void }) {
  const bill = data.bill;
  const me = data.me;
  const mine = bill.perDiner.find((d: any) => d.dinerId === me.id) || { mine: 0, equal: 0 };
  const [step, setStep] = useState<'feedback' | 'feedback-bad' | 'feedback-good' | 'amount' | 'pay' | 'done'>(me.feedback ? 'amount' : 'feedback');
  const [mode, setMode] = useState<'mine' | 'equal' | 'all'>(mine.mine > 0 ? 'mine' : 'equal');
  const [tipPct, setTipPct] = useState(12);
  const [comment, setComment] = useState('');
  const [closed, setClosed] = useState(false);
  const amountRef = useRef(0);

  const amounts = { mine: mine.mine, equal: mine.equal, all: bill.remaining };
  const amount = amounts[mode];
  const tip = Math.round(amount * tipPct) / 100;
  amountRef.current = amount;

  const sendFeedback = async (score: number) => {
    if (score <= 2) {
      setStep('feedback-bad');
      await act('feedback', { sessionId: bill.session.id, dinerId: me.id, score });
    } else {
      await act('feedback', { sessionId: bill.session.id, dinerId: me.id, score });
      setStep(score >= 4 ? 'feedback-good' : 'amount');
    }
  };

  return (
    <Modal open onClose={onClose} title={step.startsWith('feedback') ? 'רגע לפני התשלום…' : step === 'done' ? 'תודה!' : 'תשלום'}>
      {step === 'feedback' && (
        <div className="text-center">
          <p className="mb-4 text-ink-600">איך הייתה החוויה שלך היום?</p>
          <div className="flex justify-between gap-1">
            {FACES.map((f) => (
              <button key={f.score} onClick={() => sendFeedback(f.score)} className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-3 transition hover:bg-ink-50 active:scale-95">
                <span className="text-4xl">{f.e}</span>
                <span className="text-[11px] text-ink-500">{f.l}</span>
              </button>
            ))}
          </div>
          <button className="mt-4 text-sm text-ink-400" onClick={() => setStep('amount')}>דילוג</button>
        </div>
      )}
      {step === 'feedback-bad' && (
        <div className="space-y-3 text-center">
          <div className="text-4xl">🙏</div>
          <p className="font-semibold">מצטערים לשמוע. מנהל המשמרת קיבל הודעה ויגיע לשולחן.</p>
          <textarea className="input" rows={3} placeholder="רוצה לספר מה לא היה בסדר? (לא חובה)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button size="lg" className="w-full" onClick={async () => {
            if (comment.trim()) await act('callWaiter', { table: data.table.number, message: `משוב: "${comment.trim()}"` });
            setStep('amount');
          }}>המשך לתשלום</Button>
        </div>
      )}
      {step === 'feedback-good' && (
        <div className="space-y-3 text-center">
          <div className="text-5xl">🤩</div>
          <p className="font-semibold">איזה כיף לשמוע! נשמח אם תספר/י גם לאחרים</p>
          <a href={data.settings.google_review_url} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white py-3.5 font-bold">
            <span className="text-lg font-black"><span className="text-[#4285F4]">G</span></span> כתיבת ביקורת בגוגל ⭐⭐⭐⭐⭐
          </a>
          <Button size="lg" variant="dark" className="w-full" onClick={() => setStep('amount')}>המשך לתשלום</Button>
        </div>
      )}
      {step === 'amount' && (
        <div className="space-y-3">
          <p className="text-sm text-ink-600">כמה {me.name === 'אני' ? '' : 'את/ה'} משלם/ת?</p>
          {([
            ['mine', 'מה שהזמנתי', mine.mine, 'רק המנות שנרשמו על שמך'],
            ['equal', 'חלק שווה', mine.equal, `${money(bill.equalShare)} לכל אחד/ת (${bill.divisor} סועדים)`],
            ['all', 'כל היתרה', bill.remaining, 'מזמינים את כל השולחן 😎'],
          ] as const).map(([k, l, v, sub]) => (
            <button key={k} disabled={v <= 0} onClick={() => setMode(k)}
              className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-right transition disabled:opacity-40 ${mode === k ? 'border-brand-500 bg-brand-50' : 'border-ink-100'}`}>
              <div><div className="font-bold">{l}</div><div className="text-xs text-ink-500">{sub}</div></div>
              <div className="text-xl font-black">{money(v)}</div>
            </button>
          ))}
          <div>
            <div className="mb-1.5 text-sm text-ink-600">טיפ לצוות</div>
            <div className="flex gap-2">
              {[0, 10, 12, 15].map((p) => (
                <button key={p} onClick={() => setTipPct(p)} className={`chip flex-1 ${tipPct === p ? 'chip-on' : ''}`}>{p ? `${p}%` : 'בלי'}</button>
              ))}
            </div>
          </div>
          <Button size="lg" className="w-full" disabled={amount <= 0} onClick={() => setStep('pay')}>
            לתשלום {money(amount + tip)}
          </Button>
        </div>
      )}
      {step === 'pay' && (
        <div>
          <div className="mb-4 rounded-2xl bg-ink-50 p-3 text-sm">
            <div className="flex justify-between"><span>סכום</span><span>{money(amount)}</span></div>
            <div className="flex justify-between text-ink-500"><span>טיפ ({tipPct}%)</span><span>{money(tip)}</span></div>
            <div className="mt-1 flex justify-between border-t border-ink-200 pt-1 font-bold"><span>סה״כ</span><span>{money(amount + tip)}</span></div>
          </div>
          <PayPanel amount={amount + tip} onPaid={async (method) => {
            const r = await act('pay', { sessionId: bill.session.id, dinerId: me.id, amount: amountRef.current, tip, method, mode });
            setClosed(r.closed);
            setTimeout(() => setStep('done'), 900);
          }} />
        </div>
      )}
      {step === 'done' && (
        <div className="space-y-3 py-4 text-center">
          <div className="text-5xl">{closed ? '🎉' : '✅'}</div>
          <div className="text-lg font-bold">{closed ? 'החשבון שולם במלואו – השולחן נסגר' : 'התשלום התקבל'}</div>
          {!closed && <p className="text-sm text-ink-500">נותרה יתרה של שאר הסועדים. אפשר לעקוב בלשונית החשבון.</p>}
          {me.member && <p className="text-sm text-brand-600">💳 הנקודות יתווספו לכרטיס המועדון שלך</p>}
          <Button variant="dark" className="w-full" onClick={onClose}>סגירה</Button>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ chatbot */

type Msg = { from: 'me' | 'bot'; text: string; items?: MenuItem[] };

function ChatView({ menu, settings, table, onAdd }: { menu: MenuItem[]; settings: any; table: number; onAdd: (id: number) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'bot', text: `היי! אני העוזר הדיגיטלי של ${settings.restaurant_name} 🤖\nאני עונה רק מתוך הנתונים של המסעדה: מנות, רכיבים, אלרגנים, טבעוני/צמחוני, מחירים, כשרות, שעות וחניה.` },
  ]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs]);

  const ask = (q: string) => {
    if (!q.trim()) return;
    const a = answer(q, menu, settings);
    setMsgs((m) => [...m, { from: 'me', text: q }, { from: 'bot', text: a.text, items: a.items }]);
    setText('');
    if (a.unknown) act('callWaiter', { table, message: `שאלה מהעוזר הדיגיטלי: "${q}"` }).catch(() => {});
  };

  return (
    <div className="flex flex-col px-4 pt-4">
      <div className="space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'me' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.from === 'me' ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-white'}`}>
              {m.text}
              {m.items && m.items.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 rounded-xl bg-ink-50 p-2 text-ink-900">
                      <span className="text-xl">{it.emoji}</span>
                      <div className="min-w-0 flex-1"><div className="truncate font-semibold">{it.name}</div><div className="text-xs text-ink-500">{money(it.price)}{it.allergens.length ? ` · ${it.allergens.join(', ')}` : ''}</div></div>
                      <button className="rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white" onClick={() => onAdd(it.id)}>+ הוסף</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {SUGGESTIONS.map((s) => <button key={s} className="chip shrink-0 text-xs" onClick={() => ask(s)}>{s}</button>)}
      </div>
      <form className="sticky bottom-[76px] mt-2 flex gap-2 bg-ink-50 py-2" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <input className="input flex-1" placeholder="שאלו אותי משהו…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit">שליחה</Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ nav */

function BottomNav({ tab, setTab, billCount, remaining }: { tab: string; setTab: (t: 'menu' | 'bill' | 'chat') => void; billCount: number; remaining: number }) {
  const items = [
    { k: 'menu', l: 'תפריט', i: '🍽️' },
    { k: 'bill', l: remaining > 0 ? `חשבון · ${money(remaining)}` : 'חשבון', i: '🧾', badge: billCount },
    { k: 'chat', l: 'שאלו אותנו', i: '💬' },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-2xl border-t border-ink-100 bg-white pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => (
        <button key={it.k} onClick={() => setTab(it.k)} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${tab === it.k ? 'text-brand-600' : 'text-ink-500'}`}>
          <span className="text-xl">{it.i}</span>
          {it.l}
          {tab === it.k && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-brand-500" />}
        </button>
      ))}
    </nav>
  );
}
