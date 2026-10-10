'use client';
import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { act, toast } from '@/lib/client';

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="aetg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7a45" />
          <stop offset="1" stopColor="#ec4310" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#aetg)" />
      <path d="M14 33 L22 14 L30 33" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 26 H26.5" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M33 17 a8 8 0 0 1 0 14" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".9" />
      <path d="M36.5 13.5 a13 13 0 0 1 0 21" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Logo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0" dir="ltr">
      <LogoMark size={size} />
      <span className={`font-black tracking-tight ${light ? 'text-white' : 'text-ink-900'}`} style={{ fontSize: size * 0.58 }}>
        AET <span className="text-brand-500">GO</span>
      </span>
    </Link>
  );
}

export function AppHeader({ title, subtitle, right, dark = false }: { title: string; subtitle?: ReactNode; right?: ReactNode; dark?: boolean }) {
  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur ${dark ? 'bg-ink-950/90 border-ink-800 text-white' : 'bg-white/90 border-ink-100'}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <Logo size={32} light={dark} />
        <div className={`h-7 w-px ${dark ? 'bg-ink-700' : 'bg-ink-200'}`} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold leading-tight sm:text-lg">{title}</h1>
          {subtitle && <div className={`truncate text-xs ${dark ? 'text-ink-300' : 'text-ink-500'}`}>{subtitle}</div>}
        </div>
        {right}
        <ScreenMenu dark={dark} />
      </div>
    </header>
  );
}

export const SCREENS = [
  { href: '/t/5', label: 'שולחן (NFC)', icon: '📱' },
  { href: '/waiter', label: 'טאבלט מלצר', icon: '🧑‍🍳' },
  { href: '/kitchen', label: 'מסך מטבח', icon: '🔥' },
  { href: '/pos', label: 'קופה', icon: '🧾' },
  { href: '/order', label: 'הזמנה אונליין', icon: '🛍️' },
  { href: '/delivery', label: 'משלוחים', icon: '🛵' },
  { href: '/staff', label: 'משמרות', icon: '🕒' },
  { href: '/inventory', label: 'מלאי', icon: '📦' },
  { href: '/club', label: 'מועדון', icon: '💳' },
  { href: '/admin', label: 'לוח מנהל', icon: '📊' },
  { href: '/plan/NOA30', label: 'ארוחה מתוכננת', icon: '🎉' },
];

function ScreenMenu({ dark }: { dark: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`rounded-xl px-3 py-2 text-sm font-medium ${dark ? 'bg-ink-800 hover:bg-ink-700' : 'bg-ink-100 hover:bg-ink-200'}`}
        aria-label="מסכים"
      >
        ☰ <span className="hidden sm:inline">מסכים</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-100 bg-white text-ink-900 shadow-xl">
            <Link href="/" className="block px-4 py-2.5 text-sm font-bold hover:bg-ink-50" onClick={() => setOpen(false)}>🏠 מסך הבית</Link>
            {SCREENS.map((s) => (
              <Link key={s.href} href={s.href} className="block px-4 py-2 text-sm hover:bg-ink-50" onClick={() => setOpen(false)}>
                {s.icon} {s.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-ink-100 bg-white shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

type BtnVariant = 'primary' | 'dark' | 'ghost' | 'outline' | 'success' | 'danger';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/30',
  dark: 'bg-ink-900 text-white hover:bg-ink-800',
  ghost: 'bg-ink-100 text-ink-800 hover:bg-ink-200',
  outline: 'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export function Button({
  children, variant = 'primary', className = '', size = 'md', ...rest
}: { children: ReactNode; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-sm rounded-lg' : size === 'lg' ? 'px-5 py-3.5 text-base rounded-2xl' : 'px-4 py-2.5 text-sm rounded-xl';
  return (
    <button className={`inline-flex items-center justify-center gap-1.5 font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${BTN[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Badge({ children, color = 'ink', className = '' }: { children: ReactNode; color?: 'ink' | 'brand' | 'green' | 'red' | 'amber' | 'blue' | 'purple'; className?: string }) {
  const c = {
    ink: 'bg-ink-100 text-ink-700',
    brand: 'bg-brand-100 text-brand-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-sky-100 text-sky-700',
    purple: 'bg-violet-100 text-violet-700',
  }[color];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${c} ${className}`}>{children}</span>;
}

export function DietTags({ item, small = false }: { item: { vegan: boolean; vegetarian: boolean; gluten_free: boolean; spicy?: boolean; popular?: boolean }; small?: boolean }) {
  const cls = small ? 'text-[10px] px-1.5' : '';
  return (
    <span className="inline-flex flex-wrap gap-1">
      {item.popular && <Badge color="brand" className={cls}>⭐ מומלץ</Badge>}
      {item.vegan ? <Badge color="green" className={cls}>🌱 טבעוני</Badge> : item.vegetarian ? <Badge color="green" className={cls}>🥕 צמחוני</Badge> : null}
      {item.gluten_free && <Badge color="amber" className={cls}>🌾 ללא גלוטן</Badge>}
      {item.spicy && <Badge color="red" className={cls}>🌶️ חריף</Badge>}
    </span>
  );
}

export function Modal({ open, onClose, children, title, wide = false }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-in sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-ink-100 px-2.5 py-1 text-ink-600 hover:bg-ink-200" aria-label="סגור">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string; kind: string }[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((x) => [...x, { id, message, kind }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3200);
    };
    window.addEventListener('aetgo:toast', on);
    return () => window.removeEventListener('aetgo:toast', on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} className={`animate-in rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${t.kind === 'error' ? 'bg-rose-600' : t.kind === 'info' ? 'bg-ink-800' : 'bg-emerald-600'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function ResetDemoButton({ className = '' }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      className={className}
      disabled={busy}
      onClick={async () => {
        if (!confirm('לאפס את כל נתוני הדמו למצב ההתחלה?')) return;
        setBusy(true);
        try {
          await act('reset');
          try { sessionStorage.clear(); } catch { /* ignore */ }
          toast('הדמו אופס ✨');
        } finally {
          setBusy(false);
        }
      }}
    >
      ↺ איפוס דמו
    </Button>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-ink-400">
        <div className="animate-pulse"><LogoMark size={48} /></div>
        <span className="text-sm">טוען…</span>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, accent = false }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white border-transparent' : ''}`}>
      <div className={`text-xs font-medium ${accent ? 'text-white/80' : 'text-ink-500'}`}>{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      {sub && <div className={`mt-0.5 text-xs ${accent ? 'text-white/80' : 'text-ink-500'}`}>{sub}</div>}
    </Card>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-500">🧪 {children}</div>;
}
