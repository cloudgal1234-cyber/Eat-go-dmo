'use client';
import { useState } from 'react';
import { Button } from './ui';
import { money } from '@/lib/client';

const OPTIONS = [
  { id: 'apple', label: 'Apple Pay', cls: 'bg-black text-white', icon: '' },
  { id: 'google', label: 'Google Pay', cls: 'bg-white text-ink-900 border border-ink-200', icon: 'G' },
  { id: 'bit', label: 'ביט', cls: 'bg-[#16b7c4] text-white', icon: 'bit' },
  { id: 'card', label: 'כרטיס אשראי', cls: 'bg-ink-900 text-white', icon: '💳' },
];

/** Simulated payment: choose a method → fake processing → success. No real charge. */
export function PayPanel({ amount, onPaid, extraMethods = [] }: { amount: number; onPaid: (method: string) => Promise<void> | void; extraMethods?: { id: string; label: string }[] }) {
  const [method, setMethod] = useState<string | null>(null);
  const [stage, setStage] = useState<'choose' | 'card' | 'processing' | 'done'>('choose');

  const go = async (m: string) => {
    setMethod(m);
    if (m === 'card') return setStage('card');
    await process(m);
  };
  const process = async (m: string) => {
    setStage('processing');
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await onPaid(m);
      setStage('done');
    } catch {
      setStage('choose');
    }
  };

  if (stage === 'processing')
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-500" />
        <div className="font-semibold">מעבד תשלום {money(amount)}…</div>
        <div className="text-xs text-ink-400">תשלום מדומה – לא מתבצע חיוב אמיתי</div>
      </div>
    );
  if (stage === 'done')
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center animate-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
        <div className="text-lg font-bold">התשלום אושר</div>
        <div className="text-sm text-ink-500">{money(amount)} · {OPTIONS.find((o) => o.id === method)?.label || extraMethods.find((o) => o.id === method)?.label}</div>
      </div>
    );
  if (stage === 'card')
    return (
      <div className="space-y-3 animate-in">
        <div className="rounded-2xl bg-gradient-to-br from-ink-800 to-ink-950 p-4 text-white" dir="ltr">
          <div className="text-xs opacity-60">DEMO CARD</div>
          <div className="mt-6 font-mono text-lg tracking-widest">4580 •••• •••• 1234</div>
          <div className="mt-2 flex justify-between text-xs opacity-70"><span>ISRAEL ISRAELI</span><span>12/29</span></div>
        </div>
        <Button size="lg" className="w-full" onClick={() => process('card')}>שלם {money(amount)}</Button>
        <button className="w-full text-sm text-ink-500" onClick={() => setStage('choose')}>חזרה</button>
      </div>
    );
  return (
    <div className="space-y-2">
      {OPTIONS.map((o) => (
        <button key={o.id} onClick={() => go(o.id)} className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold transition active:scale-[.98] ${o.cls}`}>
          <span className="font-black">{o.icon}</span> {o.label}
        </button>
      ))}
      {extraMethods.map((o) => (
        <button key={o.id} onClick={() => go(o.id)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white py-3.5 text-base font-bold">
          {o.label}
        </button>
      ))}
      <p className="pt-1 text-center text-[11px] text-ink-400">🔒 תשלום מדומה לצורכי הדגמה בלבד</p>
    </div>
  );
}
