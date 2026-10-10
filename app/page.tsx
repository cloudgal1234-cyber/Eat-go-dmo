'use client';
import Link from 'next/link';
import { Logo, ResetDemoButton } from '@/components/ui';

const GROUPS = [
  {
    title: 'חוויית הסועד',
    items: [
      { href: '/t/5', icon: '📱', label: 'עמוד השולחן', desc: 'נגיעה במדבקת NFC: תפריט, הזמנה, חשבון משותף, פיצול ותשלום' },
      { href: '/order', icon: '🛍️', label: 'הזמנה אונליין', desc: 'אתר הזמנות למשלוח ואיסוף עצמי' },
      { href: '/plan/NOA30', icon: '🎉', label: 'ארוחה מתוכננת', desc: 'קישור לקבוצה: כל אחד בוחר ומשלם מראש' },
    ],
  },
  {
    title: 'תפעול',
    items: [
      { href: '/waiter', icon: '🧑‍🍳', label: 'טאבלט מלצר', desc: 'מפת שולחנות, הזמנות, פיצול חשבון וכרטיס חבר מועדון' },
      { href: '/kitchen', icon: '🔥', label: 'מסך מטבח', desc: 'הזמנות לפי זמן, סימון "מוכן"' },
      { href: '/pos', icon: '🧾', label: 'קופה', desc: 'מכירה מהירה, קבלה מדומה וסגירת יום' },
      { href: '/delivery', icon: '🛵', label: 'משלוחים', desc: 'שיוך שליחים וסטטוס משלוח' },
    ],
  },
  {
    title: 'ניהול',
    items: [
      { href: '/admin', icon: '📊', label: 'לוח מנהל', desc: 'מכירות, התראות, "המסעדה ממלאת את עצמה" וצ׳אט בעלים' },
      { href: '/staff', icon: '🕒', label: 'משמרות ונוכחות', desc: 'סידור עבודה, החתמת שעון ודוח שעות' },
      { href: '/team', icon: '👥', label: 'ניהול עובדים', desc: 'הוספת עובדים, ולכל אחד 2 קישורים אישיים: טאבלט מלצר ופאנל אישי' },
      { href: '/admin/payroll', icon: '💰', label: 'משכורות', desc: 'שעות, שעות נוספות, טיפים וברוטו לכל עובד' },
      { href: '/inventory', icon: '📦', label: 'מלאי', desc: 'פריטים, ספקים, הזמנת סחורה והורדה לפי מתכון' },
      { href: '/club', icon: '💳', label: 'מועדון לקוחות', desc: 'חברים, נקודות, הטבות וכרטיס בארנק הדיגיטלי' },
    ],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-brand-700/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-6">
          <div className="flex items-center justify-between">
            <Logo light size={40} />
            <ResetDemoButton className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20" />
          </div>
          <div className="mt-14 max-w-2xl">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200">דמו חי · ביסטרו הנמל</span>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
              מערכת אחת שמנהלת את <span className="text-brand-400">כל המסעדה</span>.
            </h1>
            <p className="mt-4 text-lg text-ink-300">
              מהנגיעה של הסועד במדבקת ה-NFC בשולחן, דרך המטבח והמלצר, ועד הקופה, המלאי והמועדון. הכול מסונכרן בזמן אמת.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/t/5" className="rounded-2xl bg-brand-500 px-5 py-3 font-bold shadow-lg shadow-brand-500/30 hover:bg-brand-600">📱 התחילו מהשולחן</Link>
              <Link href="/admin" className="rounded-2xl bg-white/10 px-5 py-3 font-bold hover:bg-white/20">📊 לוח המנהל</Link>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">{g.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {g.items.map((s) => (
                <Link key={s.href} href={s.href} className="group rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-2xl transition group-hover:bg-brand-100">{s.icon}</div>
                  <div className="mt-3 font-bold">{s.label}</div>
                  <div className="mt-0.5 text-sm text-ink-500">{s.desc}</div>
                  <div className="mt-2 font-mono text-xs text-ink-400" dir="ltr">{s.href}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">מדבקות NFC בשולחנות</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`/t/${n}`} target="_blank" className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-ink-100 bg-white shadow-card hover:border-brand-300">
                <span className="text-xs text-ink-400">שולחן</span>
                <span className="text-2xl font-black">{n}</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-500">💡 כל לשונית בדפדפן היא &quot;טלפון&quot; נפרד. פתחו את אותו שולחן בכמה לשוניות (או בכמה טלפונים באותה רשת) כדי לראות חשבון משותף.</p>
        </section>
      </main>
      <footer className="border-t border-ink-100 py-6 text-center text-xs text-ink-400">
        AET GO · דמו להצגה בלבד – ללא תשלומים אמיתיים, ללא NFC אמיתי וללא חיבור לרשות המסים
      </footer>
    </div>
  );
}
