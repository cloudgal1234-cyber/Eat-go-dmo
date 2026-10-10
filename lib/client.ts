'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Polls /api/state every `ms` (default 2s) – keeps all screens in sync in real time. */
export function usePoll<T = any>(view: string, params: Record<string, string | number | undefined> = {}, ms = 2000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qs = new URLSearchParams({ view, ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])) }).toString();
  const qsRef = useRef(qs);
  qsRef.current = qs;
  const enabled = !Object.values(params).some((v) => v === undefined);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/state?${qsRef.current}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'שגיאה');
      setData(json);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(refresh, ms);
    const onAct = () => refresh();
    window.addEventListener('aetgo:action', onAct);
    return () => {
      clearInterval(id);
      window.removeEventListener('aetgo:action', onAct);
    };
  }, [qs, ms, enabled, refresh]);

  return { data, error, refresh };
}

export async function act<R = any>(type: string, payload: Record<string, any> = {}): Promise<R> {
  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, type }),
  });
  const json = await res.json();
  if (!res.ok) {
    toast(json.error || 'שגיאה', 'error');
    throw new Error(json.error);
  }
  window.dispatchEvent(new Event('aetgo:action'));
  return json;
}

export function toast(message: string, kind: 'ok' | 'error' | 'info' = 'ok') {
  window.dispatchEvent(new CustomEvent('aetgo:toast', { detail: { message, kind } }));
}

export function useDeviceId() {
  const [id, setId] = useState<string | undefined>(undefined);
  useEffect(() => {
    let v: string | null = null;
    try {
      v = sessionStorage.getItem('aetgo-device');
      if (!v) {
        v = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('aetgo-device', v);
      }
    } catch {
      v = Math.random().toString(36).slice(2);
    }
    setId(v);
  }, []);
  return id;
}

export const money = (n: number) =>
  `₪${(Math.round(n * 100) / 100).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const hhmm = (ts: number) => new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

export const ago = (ts: number, now = Date.now()) => {
  const m = Math.max(0, Math.floor((now - ts) / 60000));
  if (m < 1) return 'עכשיו';
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  return `לפני ${h} ש׳ ${m % 60 ? `${m % 60} דק׳` : ''}`;
};

export const METHODS: Record<string, string> = {
  card: 'כרטיס אשראי',
  apple: 'Apple Pay',
  google: 'Google Pay',
  bit: 'ביט',
  cash: 'מזומן',
  prepaid: 'שולם מראש',
};
