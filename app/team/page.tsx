'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { act, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading, Modal, Stat } from '@/components/ui';

const ROLES = ['מלצר', 'מלצרית', 'אחראי/ת משמרת', 'שף', 'טבח', 'מארח/ת', 'ברמן', 'שוטף/ת כלים', 'שליח'];
type Form = { id?: number; name: string; role: string; rate: number; phone: string; tables: number[] };
const EMPTY: Form = { name: '', role: 'מלצר', rate: 40, phone: '', tables: [] };

function useOrigin() {
  const [o, setO] = useState('');
  useEffect(() => setO(window.location.origin), []);
  return o;
}

function staffLinks(origin: string, token: string) {
  return { waiter: `${origin}/waiter/${token}`, me: `${origin}/me/${token}` };
}

export default function TeamPage() {
  const { data } = usePoll('team', {}, 4000);
  const origin = useOrigin();
  const [form, setForm] = useState<Form | null>(null);
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  if (!data) return <Loading />;
  const active = data.staff.filter((s: any) => s.active);
  const inactive = data.staff.filter((s: any) => !s.active);

  const save = async () => {
    if (!form) return;
    const payload = { ...form, tables: form.tables.join(',') };
    if (form.id) {
      await act('updateStaff', payload);
      toast('הפרטים עודכנו');
    } else {
      const r = await act('addStaff', payload);
      setCreated({ name: form.name, token: r.token });
    }
    setForm(null);
  };

  return (
    <div className="min-h-screen">
      <AppHeader
        title="ניהול עובדים"
        subtitle="כל עובד/ת מקבל/ת 2 קישורים אישיים: טאבלט מלצר ופאנל אישי"
        right={<Button size="sm" onClick={() => setForm({ ...EMPTY })}>+ הוספת עובד/ת</Button>}
      />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat accent label="עובדים פעילים" value={active.length} />
          <Stat label="במשמרת עכשיו" value={active.filter((s: any) => s.onShift).length} />
          <Stat label="שעות החודש" value={Math.round(active.reduce((t: number, s: any) => t + s.hours, 0))} />
          <Stat label="עלות שכר החודש (ברוטו)" value={money(Math.round(active.reduce((t: number, s: any) => t + s.gross, 0)))} sub={<Link className="underline" href="/admin/payroll">לדף המשכורות ←</Link>} />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((s: any) => <StaffCard key={s.id} s={s} origin={origin} onEdit={() => setForm({ id: s.id, name: s.name, role: s.role, rate: s.rate, phone: s.phone || '', tables: s.tables })} />)}
        </div>

        {inactive.length > 0 && (
          <div>
            <button className="text-sm text-ink-500 underline" onClick={() => setShowInactive(!showInactive)}>{showInactive ? 'הסתרת' : 'הצגת'} עובדים לא פעילים ({inactive.length})</button>
            {showInactive && (
              <div className="mt-2 space-y-1">
                {inactive.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-ink-100">
                    <span>{s.name} · {s.role}</span>
                    <Button size="sm" variant="ghost" onClick={() => act('setStaffActive', { id: s.id, active: true }).then(() => toast(`${s.name} הוחזר/ה לפעילות`))}>החזרה לפעילות</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'עריכת עובד/ת' : 'הוספת עובד/ת'}>
        {form && (
          <div className="space-y-3">
            <div><label className="label">שם</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="שם פרטי או מלא" /></div>
            <div>
              <label className="label">תפקיד</label>
              <input className="input" list="roles" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              <datalist id="roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">שכר לשעה (₪)</label><input type="number" className="input" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></div>
              <div><label className="label">טלפון</label><input className="input" dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="050-0000000" /></div>
            </div>
            <div>
              <label className="label">שולחנות באחריותו/ה (בטאבלט יוצגו רק הם)</label>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                  const on = form.tables.includes(n);
                  return (
                    <button key={n} className={`rounded-lg py-2 text-sm font-bold ${on ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600'}`}
                      onClick={() => setForm({ ...form, tables: on ? form.tables.filter((x) => x !== n) : [...form.tables, n].sort((a, b) => a - b) })}>{n}</button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-ink-400">בלי בחירה = רואה את כל השולחנות</p>
            </div>
            <Button size="lg" className="w-full" disabled={!form.name.trim() || !form.role.trim()} onClick={save}>{form.id ? 'שמירה' : 'הוספה ויצירת קישורים'}</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} title={`🎉 ${created?.name} נוסף/ה`}>
        {created && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600">אלו 2 הקישורים האישיים. שלחו אותם לעובד/ת, ורק הם יראו את המידע שלהם.</p>
            <LinksBlock name={created.name} links={staffLinks(origin, created.token)} />
            <Button className="w-full" variant="dark" onClick={() => setCreated(null)}>סיום</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(() => toast('הקישור הועתק')).catch(() => toast(text, 'info'));
}

function LinksBlock({ name, links, phone }: { name: string; links: { waiter: string; me: string }; phone?: string }) {
  const msg = `היי ${name}! הקישורים האישיים שלך ב-AET GO:\n🧑‍🍳 טאבלט מלצר: ${links.waiter}\n👤 משמרות, שעות ומשכורת: ${links.me}`;
  const wa = `https://wa.me/${phone ? '972' + phone.replace(/\D/g, '').replace(/^0/, '') : ''}?text=${encodeURIComponent(msg)}`;
  return (
    <div className="space-y-2">
      {([['🧑‍🍳 טאבלט מלצר', links.waiter], ['👤 פאנל אישי (משמרות ומשכורת)', links.me]] as const).map(([label, url]) => (
        <div key={url} className="rounded-xl bg-ink-50 p-2.5">
          <div className="mb-1 text-xs font-semibold text-ink-600">{label}</div>
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-mono text-xs text-brand-700 underline" dir="ltr">{url}</a>
            <button className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-semibold ring-1 ring-ink-200" onClick={() => copy(url)}>העתקה</button>
          </div>
        </div>
      ))}
      <a href={wa} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] py-2.5 text-sm font-bold text-white">שליחת שני הקישורים בוואטסאפ</a>
    </div>
  );
}

function StaffCard({ s, origin, onEdit }: { s: any; origin: string; onEdit: () => void }) {
  const [links, setLinks] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: s.color }}>{s.name[0]}</div>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{s.name} {s.onShift && <Badge color="green">● במשמרת</Badge>}</div>
          <div className="text-xs text-ink-500">{s.role} · {money(s.rate)} לשעה {s.phone && <span dir="ltr">· {s.phone}</span>}</div>
        </div>
        <button className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-semibold" onClick={onEdit}>עריכה</button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-ink-50 p-2"><div className="text-ink-500">שולחנות</div><div className="font-bold">{s.tables.length ? s.tables.join(', ') : 'הכל'}</div></div>
        <div className="rounded-lg bg-ink-50 p-2"><div className="text-ink-500">שעות החודש</div><div className="font-bold">{s.hours}</div></div>
        <div className="rounded-lg bg-ink-50 p-2"><div className="text-ink-500">ברוטו עד כה</div><div className="font-bold">{money(Math.round(s.gross))}</div></div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => setLinks(!links)}>🔗 {links ? 'הסתרת קישורים' : 'הקישורים האישיים'}</Button>
        <Button size="sm" variant="ghost" onClick={() => confirm(`להפוך את ${s.name} ללא פעיל/ה? הקישורים שלו/ה יפסיקו לעבוד.`) && act('setStaffActive', { id: s.id, active: false })}>השבתה</Button>
      </div>
      {links && origin && (
        <div className="mt-3 animate-in">
          <LinksBlock name={s.name} phone={s.phone} links={staffLinks(origin, s.token)} />
          <button className="mt-2 text-xs text-ink-400 underline" onClick={() => confirm('ליצור קישורים חדשים? הקישורים הישנים יפסיקו לעבוד.') && act('regenToken', { id: s.id }).then(() => toast('נוצרו קישורים חדשים'))}>
            יצירת קישורים חדשים (ביטול הישנים)
          </button>
        </div>
      )}
    </Card>
  );
}
