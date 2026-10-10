'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { act, usePoll } from '@/lib/client';
import { AppHeader, Badge, Button, Card, Loading } from '@/components/ui';

function defaultWhen() {
  const d = new Date(Date.now() + 2 * 3600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export default function PlansPage() {
  const { data } = usePoll('plans', {}, 5000);
  const router = useRouter();
  const [f, setF] = useState({ title: '', host: '', when: defaultWhen(), guests: 6, table: 11 });
  if (!data) return <Loading />;
  return (
    <div className="min-h-screen">
      <AppHeader title="ארוחות מתוכננות" subtitle="קישור לקבוצה – כל אחד בוחר ומשלם מראש" />
      <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <h2 className="text-lg font-bold">🎉 יצירת ארוחה חדשה</h2>
          <div><label className="label">שם האירוע</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="למשל: ארוחת צוות" /></div>
          <div><label className="label">מארגן/ת</label><input className="input" value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 sm:col-span-1"><label className="label">משתתפים</label><input type="number" className="input" value={f.guests} onChange={(e) => setF({ ...f, guests: Number(e.target.value) })} /></div>
            <div className="col-span-3 sm:col-span-2"><label className="label">מועד</label><input type="datetime-local" className="input" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></div>
          </div>
          <Button className="w-full" disabled={!f.title || !f.host} onClick={async () => {
            const r = await act('createPlan', { ...f, when: new Date(f.when).getTime() });
            router.push(`/plan/${r.code}`);
          }}>יצירת קישור לקבוצה</Button>
        </Card>
        <Card className="p-5">
          <h2 className="mb-2 text-lg font-bold">ארוחות קיימות</h2>
          {data.plans.map((p: any) => (
            <Link key={p.code} href={`/plan/${p.code}`} className="flex items-center justify-between border-t border-ink-100 py-2.5 text-sm first:border-0 hover:bg-ink-50">
              <div><b>{p.title}</b><div className="text-xs text-ink-500">{new Date(p.scheduled_at).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })} · {p.count} נרשמו · קוד {p.code}</div></div>
              <Badge color={p.status === 'collecting' ? 'purple' : 'green'}>{p.status === 'collecting' ? 'אוסף הזמנות' : 'נשלח למטבח'}</Badge>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
