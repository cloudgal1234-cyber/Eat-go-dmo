'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { act, hhmm, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading, Stat } from '@/components/ui';

const monthName = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
};
const h = (n: number) => (Math.round(n * 10) / 10).toString();

export default function PayrollPage() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data } = usePoll('payroll', month ? { month } : {}, 5000);
  const [open, setOpen] = useState<number | null>(null);
  if (!data) return <Loading />;
  const rows = data.rows;
  const paidCount = rows.filter((r: any) => r.paid).length;

  const csv = () => {
    const head = ['שם', 'תפקיד', 'שכר לשעה', 'משמרות', 'שעות', 'שעות רגילות', 'נוספות 125%', 'נוספות 150%', 'שכר בסיס', 'תוספת נוספות', 'טיפים', 'ברוטו', 'איחורים', 'שולם'];
    const lines = rows.map((r: any) => [r.name, r.role, r.rate, r.shifts, r.hours, r.regularHours, r.ot125Hours, r.ot150Hours, r.basePay, r.overtimePay, r.tips, r.gross, r.lates, r.paid ? 'כן' : 'לא']);
    const blob = new Blob(['﻿' + [head, ...lines].map((l) => l.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aetgo-payroll-${data.month}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen">
      <AppHeader title="משכורות" subtitle={`${monthName(data.month)} · חישוב אוטומטי מהשעון`} right={<Link href="/team" className="chip hidden text-xs sm:block">👥 ניהול עובדים</Link>} />
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {data.months.map((m: string) => (
            <button key={m} className={`chip ${data.month === m ? 'chip-on' : ''}`} onClick={() => setMonth(m)}>{monthName(m)}</button>
          ))}
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={csv}>⬇ ייצוא לרואה החשבון (CSV)</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat accent label="סה״כ ברוטו" value={money(Math.round(data.totals.gross))} sub={`${rows.length} עובדים`} />
          <Stat label="שעות עבודה" value={Math.round(data.totals.hours)} />
          <Stat label="שעות נוספות (עלות)" value={money(Math.round(data.totals.overtimePay))} />
          <Stat label="קופת טיפים" value={money(Math.round(data.tipsPool))} sub="מתחלקת בין המלצרים לפי שעות" />
          <Stat label="שולמו" value={`${paidCount}/${rows.length}`} />
        </div>

        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-ink-50 text-xs text-ink-600">
                <th className="p-3 text-right">עובד/ת</th><th className="p-3">משמרות</th><th className="p-3">שעות</th><th className="p-3">נוספות</th>
                <th className="p-3">שכר בסיס</th><th className="p-3">תוספת נוספות</th><th className="p-3">טיפים</th><th className="p-3">ברוטו</th><th className="p-3">איחורים</th><th className="p-3">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <Fragment key={r.staffId}>
                  <tr className="cursor-pointer border-t border-ink-100 text-center hover:bg-ink-50" onClick={() => setOpen(open === r.staffId ? null : r.staffId)}>
                    <td className="p-3 text-right">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                        <div><b>{r.name}</b>{!r.active && <Badge className="mr-1">לא פעיל</Badge>}<div className="text-xs text-ink-500">{r.role} · {money(r.rate)}/ש׳</div></div>
                      </div>
                    </td>
                    <td className="p-3">{r.shifts}</td>
                    <td className="p-3">{h(r.hours)}</td>
                    <td className="p-3 text-xs">{r.ot125Hours + r.ot150Hours > 0 ? `${h(r.ot125Hours + r.ot150Hours)} ש׳` : '—'}</td>
                    <td className="p-3">{money(Math.round(r.basePay))}</td>
                    <td className="p-3">{money(Math.round(r.overtimePay))}</td>
                    <td className="p-3">{r.tips ? money(Math.round(r.tips)) : '—'}</td>
                    <td className="p-3 text-base font-black">{money(Math.round(r.gross))}</td>
                    <td className="p-3">{r.lates ? <Badge color="red">{r.lates}</Badge> : '—'}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      {r.paid ? (
                        <button className="text-xs" title="ביטול סימון" onClick={() => act('markPaid', { staffId: r.staffId, month: data.month, paid: false })}>
                          <Badge color="green">שולם ✓ {new Date(r.paid.paid_at).toLocaleDateString('he-IL')}</Badge>
                        </button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={r.gross <= 0} onClick={() => act('markPaid', { staffId: r.staffId, month: data.month, paid: true, amount: r.gross }).then(() => toast(`המשכורת של ${r.name} סומנה כשולמה (מדומה)`))}>סמן כשולם</Button>
                      )}
                    </td>
                  </tr>
                  {open === r.staffId && (
                    <tr className="bg-ink-50/60">
                      <td colSpan={10} className="p-3">
                        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                          {r.records.length === 0 && <div className="text-ink-400">אין משמרות בחודש זה</div>}
                          {r.records.map((x: any) => (
                            <div key={x.id} className="flex justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs ring-1 ring-ink-100">
                              <span>{new Date(x.clock_in).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })} · <span dir="ltr">{hhmm(x.clock_in)}–{x.open ? '…' : hhmm(x.clock_out)}</span>{x.late_min > 0 && <b className="text-rose-600"> +{x.late_min}′</b>}</span>
                              <span>{h(x.hours)} ש׳ · {money(Math.round(x.pay))}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              <tr className="border-t-2 border-ink-200 bg-ink-50 text-center font-bold">
                <td className="p-3 text-right">סה״כ</td><td /><td className="p-3">{h(data.totals.hours)}</td><td />
                <td className="p-3">{money(Math.round(data.totals.basePay))}</td><td className="p-3">{money(Math.round(data.totals.overtimePay))}</td>
                <td className="p-3">{money(Math.round(data.totals.tips))}</td><td className="p-3 text-base">{money(Math.round(data.totals.gross))}</td><td /><td />
              </tr>
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-ink-500">
          📐 החישוב: 8 השעות הראשונות במשמרת בשכר רגיל, שעתיים נוספות ב-125% ומעבר לכך 150%. קופת הטיפים של החודש מתחלקת בין מלצרים ואחראי משמרת לפי שעות העבודה.
          זה חישוב ברוטו מדומה לצורכי הדגמה, בלי ניכויים, מס הכנסה וביטוח לאומי.
        </p>
      </div>
    </div>
  );
}
