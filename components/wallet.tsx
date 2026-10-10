'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogoMark } from './ui';

export function MiniWalletCard({ member }: { member: any }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 p-5 text-white shadow-xl">
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-brand-500/40 blur-2xl" />
      <div className="relative flex items-center justify-between" dir="ltr">
        <div className="flex items-center gap-2"><LogoMark size={28} /><span className="font-black">AET <span className="text-brand-400">GO</span></span></div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{member.tier}</span>
      </div>
      <div className="relative mt-6 text-xs text-white/60">חבר/ת מועדון</div>
      <div className="relative text-xl font-bold">{member.name}</div>
      <div className="relative mt-3 flex items-end justify-between">
        <div><div className="text-xs text-white/60">נקודות</div><div className="text-3xl font-black">{member.points}</div></div>
        <div className="text-xs text-white/50" dir="ltr">#{String(member.id).padStart(6, '0')}</div>
      </div>
    </div>
  );
}

