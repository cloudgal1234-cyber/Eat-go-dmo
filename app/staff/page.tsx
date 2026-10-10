'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { act, hhmm, money, toast, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading, Modal } from '@/components/ui';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function StaffPage() {
  const { data } = usePoll('staff', {}, 3000);
  const [tab, setTab] = useState<'clock' | 'schedule' | 'report'>('clock');
  if (!data) return <Loading />;
  return (
    <div className="min-h-screen">
      <AppHeader title="משמרות ונוכחות" subtitle={`${data.todayAtt.filter((a: any) => !a.clock_out).length} עובדים במשמרת כעת`} />
      <div className="mx-auto max-w-7xl p-4">
        <div className="mb-4 inline-flex rounded-xl bg-ink-100 p-1 text-sm font-semibold">
          {[['clock', '⏱️ שעון נוכחות'], ['schedule', '🗓️ סידור עבודה'], ['report', '📄 דוח שעות']].map(([k, l]) => (
            <button key={k} className={`rounded-lg px-4 py-2 ${tab === k ? 'bg-white shadow' : 'text-ink-500'}`} onClick={() => setTab(k as any)}>{l}</button>
          ))}
        </div>
        {tab === 'clock' && <Clock data={data} />}
        {tab === 'schedule' && <Schedule data={data} />}
        {tab === 'report' && <Report data={data} />}
      </div>
    </div>
  );
}

function Avatar({ s }: { s: any }) {
  return <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: s.color }}>{s.name[0]}</div>;
}

function Clock({ data }: { data: any }) {
  const wd = new Date(data.now).getDay();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {data.staff.map((s: any) => {
        const open = data.todayAtt.find((a: any) => a.staff_id === s.id && !a.clock_out);
        const done = data.todayAtt.filter((a: any) => a.staff_id === s.id && a.clock_out);
        const shift = data.shifts.find((x: any) => x.staff_id === s.id && x.weekday === wd);
        return (
          <Card key={s.id} className={`p-4 ${open ? 'ring-2 ring-emerald-400' : ''}`}>
            <div className="flex items-center gap-3">
              <Avatar s={s} />
              <div className="flex-1"><div className="font-bold">{s.name}</div><div className="text-xs text-ink-500">{s.role}</div></div>
              {open ? <Badge color="green">● במשמרת</Badge> : <Badge>לא במשמרת</Badge>}
            </div>
            <div className="mt-3 space-y-0.5 text-xs text-ink-500">
              <div>משמרת היום: {shift ? `${shift.start}–${shift.end}` : 'אין'}</div>
              {open && <div>נכנס/ה ב-{hhmm(open.clock_in)} {open.late_min > 0 && <span className="font-bold text-rose-600">· איחור {open.late_min} דק׳</span>}</div>}
              {done.map((a: any) => <div key={a.id}>{hhmm(a.clock_in)}–{hhmm(a.clock_out)}</div>)}
            </div>
            <Button
              className="mt-3 w-full"
              variant={open ? 'outline' : 'success'}
              onClick={async () => {
                const r = await act('clock', { staffId: s.id });
                toast(r.action === 'in' ? `${s.name} נכנס/ה למשמרת${r.late ? ` (איחור ${r.late} דק׳)` : ''}` : `${s.name} יצא/ה מהמשמרת`, r.late ? 'info' : 'ok');
              }}
            >
              {open ? '⏹ החתמת יציאה' : '▶ החתמת כניסה'}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

function Schedule({ data }: { data: any }) {
  const [adding, setAdding] = useState<{ staffId: number; weekday: number } | null>(null);
  const [start, setStart] = useState('17:00');
  const [end, setEnd] = useState('23:00');
  const today = new Date(data.now).getDay();
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="bg-ink-50 text-ink-600">
            <th className="p-3 text-right">עובד/ת</th>
            {DAYS.map((d, i) => <th key={d} className={`p-3 ${i === today ? 'bg-brand-50 text-brand-700' : ''}`}>{d}{i === today && ' (היום)'}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.staff.map((s: any) => (
            <tr key={s.id} className="border-t border-ink-100">
              <td className="p-3"><div className="font-bold">{s.name}</div><div className="text-xs text-ink-500">{s.role}</div></td>
              {DAYS.map((_, wd) => (
                <td key={wd} className={`p-1.5 align-top ${wd === today ? 'bg-brand-50/50' : ''}`}>
                  <div className="space-y-1">
                    {data.shifts.filter((x: any) => x.staff_id === s.id && x.weekday === wd).map((x: any) => (
                      <div key={x.id} className="group flex items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold text-white" style={{ background: s.color }}>
                        <span dir="ltr">{x.start}–{x.end}</span>
                        <button className="opacity-60 hover:opacity-100" onClick={() => act('removeShift', { id: x.id })}>✕</button>
                      </div>
                    ))}
                    <button className="w-full rounded-lg border border-dashed border-ink-200 py-0.5 text-xs text-ink-400 hover:border-ink-400" onClick={() => setAdding({ staffId: s.id, weekday: wd })}>+</button>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={!!adding} onClose={() => setAdding(null)} title="הוספת משמרת">
        {adding && (
          <div className="space-y-3">
            <p className="text-sm text-ink-600">{data.staff.find((s: any) => s.id === adding.staffId)?.name} · יום {DAYS[adding.weekday]}</p>
            <div className="flex gap-2">
              {[['11:00', '17:00', 'בוקר'], ['17:00', '23:00', 'ערב'], ['11:00', '23:00', 'כפולה']].map(([a, b, l]) => (
                <button key={l} className={`chip flex-1 ${start === a && end === b ? 'chip-on' : ''}`} onClick={() => { setStart(a); setEnd(b); }}>{l}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="label">התחלה</label><input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div className="flex-1"><label className="label">סיום</label><input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
            <Button className="w-full" onClick={() => act('addShift', { ...adding, start, end }).then(() => setAdding(null))}>שמירה</Button>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function Report({ data }: { data: any }) {
  const month = new Date(data.now).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const tot = data.report.reduce((a: any, r: any) => ({ hours: a.hours + r.hours, pay: a.pay + r.pay, lates: a.lates + r.lates }), { hours: 0, pay: 0, lates: 0 });
  const csv = () => {
    const rows = [['שם', 'תפקיד', 'משמרות', 'שעות', 'איחורים', 'דקות איחור', 'עלות'], ...data.report.map((r: any) => [r.name, r.role, r.shifts, r.hours, r.lates, r.lateMinutes, r.pay])];
    const blob = new Blob(['﻿' + rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aetgo-hours.csv';
    a.click();
  };
  return (
    <Card className="overflow-x-auto p-0">
      <div className="flex items-center justify-between p-4">
        <h3 className="font-bold">דוח שעות · {month}</h3>
        <Button size="sm" variant="outline" onClick={csv}>⬇ ייצוא לאקסל (CSV)</Button>
      </div>
      <table className="w-full min-w-[640px] text-sm">
        <thead><tr className="bg-ink-50 text-ink-600"><th className="p-3 text-right">עובד/ת</th><th className="p-3">משמרות</th><th className="p-3">שעות</th><th className="p-3">איחורים</th><th className="p-3">עלות שכר משוערת</th></tr></thead>
        <tbody>
          {data.report.map((r: any) => (
            <tr key={r.staffId} className="border-t border-ink-100 text-center">
              <td className="p-3 text-right"><b>{r.name}</b> <span className="text-xs text-ink-500">· {r.role}</span></td>
              <td className="p-3">{r.shifts}</td>
              <td className="p-3 font-semibold">{r.hours}</td>
              <td className="p-3">{r.lates ? <Badge color="red">{r.lates} ({r.lateMinutes} דק׳)</Badge> : <Badge color="green">0</Badge>}</td>
              <td className="p-3">{money(r.pay)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-ink-200 bg-ink-50 text-center font-bold">
            <td className="p-3 text-right">סה״כ</td><td /><td className="p-3">{Math.round(tot.hours * 10) / 10}</td><td className="p-3">{tot.lates}</td><td className="p-3">{money(tot.pay)}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
