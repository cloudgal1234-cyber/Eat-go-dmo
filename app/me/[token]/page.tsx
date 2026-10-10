'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { act, hhmm, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading } from '@/components/ui';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const monthName = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
};
const h = (n: number) => (Math.round(n * 10) / 10).toString();

export default function MyPanel() {
  const { token } = useParams<{ token: string }>();
  const { data, error } = usePoll('me', { k: token }, 3000);
  if (error && !data) return <div className="flex min-h-screen items-center justify-center p-6 text-center text-rose-600">{error}</div>;
  if (!data) return <Loading />;
  const { me, open, current: cur, previous: prev } = data;
  const today = new Date(data.now).getDay();
  const isWaiter = /מלצר|אחראי/.test(me.role);

  const clock = async () => {
    const r = await act('clock', { staffId: me.id });
    toast(r.action === 'in' ? `נכנסת למשמרת${r.late ? ` (איחור ${r.late} דק׳)` : ''} 👋` : 'יצאת מהמשמרת. תודה! 🙏', r.late ? 'info' : 'ok');
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-10">
      <AppHeader personal title={`שלום ${me.name} 👋`} subtitle={`${me.role} · ${data.settings.restaurant_name}`} />
      <div className="space-y-4 p-4">
        {/* Clock */}
        <Card className={`overflow-hidden p-0 ${open ? 'ring-2 ring-emerald-400' : ''}`}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-500">שעון נוכחות</div>
                <div className="text-lg font-bold">{open ? `במשמרת מ-${hhmm(open.clock_in)}` : 'לא במשמרת'}</div>
                <div className="text-xs text-ink-500">משמרת היום: {data.todayShift ? <span dir="ltr">{data.todayShift.start}–{data.todayShift.end}</span> : 'אין'}</div>
              </div>
              {open && <div className="text-left"><div className="text-xs text-ink-500">עד עכשיו</div><div className="font-mono text-2xl font-black tabular-nums">{h((data.now - open.clock_in) / 3600000)} ש׳</div></div>}
            </div>
            {open?.late_min > 0 && <div className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-sm text-rose-700">נרשם איחור של {open.late_min} דק׳</div>}
          </div>
          <button onClick={clock} className={`w-full py-4 text-lg font-bold text-white transition active:scale-[.99] ${open ? 'bg-ink-900' : 'bg-emerald-600'}`}>
            {open ? '⏹ החתמת יציאה' : '▶ החתמת כניסה'}
          </button>
        </Card>

        {isWaiter && (
          <Link href={`/waiter/${token}`} className="flex items-center justify-between rounded-2xl bg-brand-500 px-4 py-3.5 font-bold text-white shadow-lg shadow-brand-500/25">
            <span>🧑‍🍳 טאבלט המלצר שלי{me.tables.length ? ` · שולחנות ${me.tables.join(', ')}` : ''}</span><span>←</span>
          </Link>
        )}

        {/* Salary */}
        {cur && (
          <Card className="overflow-hidden p-0">
            <div className="bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white">
              <div className="flex items-center justify-between text-sm text-ink-300">
                <span>משכורת {monthName(data.month)}</span>
                {cur.paid ? <Badge color="green">שולם ✓</Badge> : <Badge color="amber">מצטבר</Badge>}
              </div>
              <div className="mt-1 text-4xl font-black">{money(Math.round(cur.gross))}</div>
              <div className="text-xs text-ink-400">ברוטו משוער עד היום · {cur.shifts} משמרות · {h(cur.hours)} שעות</div>
            </div>
            <div className="divide-y divide-ink-100 px-4 text-sm">
              <Row label={`שעות רגילות (${h(cur.regularHours)} × ${money(cur.rate)})`} value={money(Math.round(cur.basePay))} />
              <Row label={cur.ot125Hours + cur.ot150Hours > 0 ? `שעות נוספות (${h(cur.ot125Hours + cur.ot150Hours)} ש׳ ב-125%/150%)` : 'שעות נוספות'} value={cur.overtimePay > 0 ? money(Math.round(cur.overtimePay)) : 'אין'} />
              <Row label={cur.tipEligible ? 'חלקך בטיפים (לפי שעות)' : 'טיפים'} value={money(Math.round(cur.tips))} />
              <Row label="איחורים החודש" value={cur.lates ? `${cur.lates} (${cur.lateMinutes} דק׳)` : 'אין 👏'} warn={cur.lates > 0} />
            </div>
            <p className="px-4 pb-3 text-[11px] text-ink-400">חישוב מדומה לצורכי הדגמה. לא כולל ניכויים, מס הכנסה וביטוח לאומי.</p>
          </Card>
        )}

        {/* Schedule */}
        <Card className="p-4">
          <h3 className="mb-2 font-bold">🗓️ סידור העבודה שלי השבוע</h3>
          <div className="space-y-1.5">
            {DAYS.map((d, i) => {
              const sh = data.shifts.filter((x: any) => x.weekday === i);
              return (
                <div key={d} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${i === today ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-ink-50'}`}>
                  <span className={i === today ? 'font-bold text-brand-700' : ''}>{d}{i === today && ' (היום)'}</span>
                  <span className="flex gap-1">{sh.length ? sh.map((x: any) => <Badge key={x.id} color="ink"><span dir="ltr">{x.start}–{x.end}</span></Badge>) : <span className="text-ink-400">חופש</span>}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Attendance log */}
        {cur && (
          <Card className="p-4">
            <h3 className="mb-2 font-bold">⏱️ דוח נוכחות החודש</h3>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-xs text-ink-500"><tr><th className="py-1.5 text-right">תאריך</th><th>כניסה–יציאה</th><th>שעות</th><th>שכר</th></tr></thead>
                <tbody>
                  {[...cur.records].reverse().map((r: any) => (
                    <tr key={r.id} className="border-t border-ink-100 text-center">
                      <td className="py-1.5 text-right">{new Date(r.clock_in).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })}</td>
                      <td dir="ltr">{hhmm(r.clock_in)}–{r.open ? '…' : hhmm(r.clock_out)} {r.late_min > 0 && <span className="text-xs font-bold text-rose-600">+{r.late_min}′</span>}</td>
                      <td>{h(r.hours)}</td>
                      <td>{money(Math.round(r.pay))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {prev && prev.shifts > 0 && (
          <Card className="flex items-center justify-between p-4 text-sm">
            <div><div className="font-bold">{monthName(data.prevMonth)}</div><div className="text-xs text-ink-500">{prev.shifts} משמרות · {h(prev.hours)} שעות · טיפים {money(Math.round(prev.tips))}</div></div>
            <div className="text-left"><div className="text-lg font-black">{money(Math.round(prev.gross))}</div>{prev.paid ? <Badge color="green">שולם ✓</Badge> : <Badge color="amber">ממתין לתשלום</Badge>}</div>
          </Card>
        )}
        <p className="text-center text-xs text-ink-400">🔒 קישור אישי. אל תעביר/י אותו לאחרים.</p>
      </div>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return <div className="flex justify-between py-2"><span className="text-ink-600">{label}</span><span className={`font-semibold ${warn ? 'text-rose-600' : ''}`}>{value}</span></div>;
}
